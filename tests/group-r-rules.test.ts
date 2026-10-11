import { describe, expect, it } from "vitest";
import {
  snapshotCatalog,
  resolveEvent,
  registeredCatalog,
  suspendEvent,
  validateRegistration,
  reviseRegistration,
  transitionRegistration,
  approvedEntries,
  emptyEditionFromConfiguration,
  previewCsv,
  previewRows,
  currentRevision,
} from "../packages/registration/src/index.js";
import {
  athlete,
  registry,
  registration,
  nodes,
  ids,
  clock,
} from "./group-r-fixtures.js";
const stateWith = (count = 2) => ({
  ...registry(),
  athletes: Array.from({ length: count }, (_, i) => athlete(`a${i + 1}`)),
});
const errors = (
  state: ReturnType<typeof registry>,
  r: ReturnType<typeof registration>,
  phase: "draft" | "submit" | "approve" = "submit",
) => validateRegistration(state, r, phase).errors.map((e) => e.code);
describe("R01 versioned catalogue", () => {
  it("inherits rules, preserves codes/order and deep freezes a detached snapshot", () => {
    const source = nodes(),
      s = snapshotCatalog("snapshot", ids.edition, 1, source);
    source[0]!.rules.schoolQuota = 99;
    expect(resolveEvent(s, ids.event).rules.schoolQuota).toBe(2);
    expect(s.nodes[0]!.code).toBe("sport-test");
    expect(Object.isFrozen(s.nodes[0]!.rules)).toBe(true);
  });
  it.each(["duplicate", "cycle", "missing", "quota", "unknown", "range"])(
    "rejects malformed catalogue %s",
    (kind) => {
      const n = nodes();
      if (kind === "duplicate") n[1]!.code = n[0]!.code;
      if (kind === "cycle") {
        n[0]!.kind = "group";
        n[0]!.parentId = n[1]!.id;
      }
      if (kind === "missing") n[1]!.parentId = "missing";
      if (kind === "quota") n[0]!.rules.schoolQuota = -1;
      if (kind === "unknown") Object.assign(n[0]!.rules, { surprise: 1 });
      if (kind === "range") n[1]!.rules.minAge = 99;
      expect(() => snapshotCatalog("s", ids.edition, 1, n)).toThrow();
    },
  );
  it("keeps registered suspended events and ancestors in edition catalogue", () => {
    const s = suspendEvent(registry().catalog, ids.event);
    expect(resolveEvent(s, ids.event).active).toBe(false);
    expect(
      registeredCatalog(s, [
        { editionId: ids.edition, eventId: ids.event },
      ]).map((n) => n.code),
    ).toEqual(["sport-test", "event-test"]);
  });
  it("clones selected configuration with new technical IDs and no participant data", () => {
    const source = stateWith();
    source.registrations = [registration("r", "a1")];
    const clone = emptyEditionFromConfiguration(source, {
      editionId: "new-edition",
      snapshotId: "new-snapshot",
      year: 2027,
      deadline: "2027-10-11T00:00:00Z",
      schoolCodes: {},
    });
    expect(clone.registrationOpen).toBe(false);
    expect(clone.athletes).toEqual([]);
    expect(clone.registrations).toEqual([]);
    expect(
      clone.catalog.nodes.every(
        (n) => !source.catalog.nodes.some((p) => p.id === n.id),
      ),
    ).toBe(true);
    expect(clone.catalog.nodes.map((n) => n.code)).toEqual(
      source.catalog.nodes.map((n) => n.code),
    );
    expect(source.athletes).toHaveLength(2);
  });
});
describe("R04 configuration-driven validation", () => {
  it("accepts correct gender and uses year-minus-birth-year age warnings without blocking", () => {
    const s = stateWith();
    s.athletes = [{ ...s.athletes[0]!, birthYear: 2000, grade: 99 }];
    const result = validateRegistration(s, registration("r", "a1"), "submit");
    expect(result.valid).toBe(true);
    expect(result.warnings.map((e) => e.code)).toContain("AGE_WARNING");
  });
  it("blocks gender, wrong school, wrong edition, suspended content and unconfigured quotas", () => {
    const s = stateWith();
    s.athletes = [athlete("a1", "female")];
    expect(errors(s, registration("r", "a1"))).toContain("GENDER");
    s.athletes = [{ ...athlete("a1"), schoolId: "other" }];
    expect(errors(s, registration("r", "a1"))).toContain("ATHLETE_SCOPE");
    expect(
      errors(s, { ...registration("r", "a1"), editionId: "other" }),
    ).toContain("SCOPE_MISMATCH");
    s.catalog = suspendEvent(s.catalog, ids.event);
    expect(errors(s, registration("r", "a1"))).toContain("EVENT_SUSPENDED");
    const n = nodes();
    delete n[0]!.rules.schoolQuota;
    s.catalog = snapshotCatalog("s", ids.edition, 1, n);
    expect(errors(s, registration("r", "a1"))).toContain("RULE_NOT_CONFIGURED");
  });
  it("warns pending original profile on submit and blocks approval", () => {
    const s = stateWith();
    s.athletes = [{ ...athlete("a1"), profileStatus: "pending" }];
    expect(errors(s, registration("r", "a1"))).not.toContain("PROFILE_PENDING");
    expect(errors(s, registration("r", "a1"), "approve")).toContain(
      "PROFILE_PENDING",
    );
  });
  it("blocks a third sport from submitted or approved reservations", () => {
    const s = stateWith();
    const n = nodes();
    for (let i = 2; i <= 3; i++)
      n.push(
        { ...n[0]!, id: `s${i}`, code: `s${i}` },
        { ...n[1]!, id: `e${i}`, code: `e${i}`, parentId: `s${i}` },
      );
    s.catalog = snapshotCatalog("s", ids.edition, 1, n);
    s.registrations = [
      registration("r1", "a1"),
      registration("r2", "a1", "e2"),
    ].map((r) => ({
      ...r,
      revisions: r.revisions.map((v) => ({
        ...v,
        status: "submitted" as const,
      })),
    }));
    expect(errors(s, registration("r3", "a1", "e3"))).toContain("THIRD_SPORT");
  });
  it("blocks two forms using configured category limits without sport-name inference", () => {
    const s = stateWith(),
      n = nodes();
    n[0]!.rules.categoryLimits = { combat: 1, forms: 1 };
    n[1]!.category = "forms";
    n.push({ ...n[1]!, id: "second-form", code: "second-form" });
    s.catalog = snapshotCatalog("s", ids.edition, 1, n);
    const first = registration("first", "a1");
    s.registrations = [
      {
        ...first,
        revisions: first.revisions.map((v) => ({ ...v, status: "submitted" })),
      },
    ];
    expect(errors(s, registration("second", "a1", "second-form"))).toContain(
      "CATEGORY_LIMIT",
    );
  });
  it("counts reserved entries, never applies fixture school/athlete totals as quotas", () => {
    const s = stateWith(4);
    s.registrations = [registration("r1", "a1"), registration("r2", "a2")].map(
      (r) => ({
        ...r,
        revisions: r.revisions.map((v) => ({
          ...v,
          status: "submitted" as const,
        })),
      }),
    );
    expect(errors(s, registration("r3", "a3"))).toContain("SCHOOL_QUOTA");
    expect(
      errors({ ...s, registrations: [] }, registration("r3", "a3")),
    ).not.toContain("SCHOOL_QUOTA");
  });
});
describe("R05 teams and mixed structure", () => {
  function teamState(count: number) {
    const s = stateWith(count),
      n = nodes();
    n[1]!.participantKind = "team";
    n[1]!.rules = {
      gender: "mixed",
      minMembers: 8,
      maxMembers: 12,
      minEachSex: 4,
      maxEachSex: 6,
    };
    s.catalog = snapshotCatalog("s", ids.edition, 1, n);
    s.athletes = s.athletes.map((a, i) => ({
      ...a,
      sex: i < count / 2 ? "male" : "female",
    }));
    s.teams = [
      {
        id: "team",
        editionId: ids.edition,
        schoolId: ids.school,
        eventId: ids.event,
        name: "Đội tổng hợp",
        memberIds: s.athletes.map((a) => a.id),
      },
    ];
    const r = {
      ...registration("r", "unused"),
      revisions: [
        {
          id: "rev",
          version: 1,
          status: "draft" as const,
          participant: { kind: "team" as const, teamId: "team" },
        },
      ],
    };
    return { s, r };
  }
  it.each([8, 10, 12])("accepts configured mixed team of %i", (count) => {
    const { s, r } = teamState(count);
    expect(errors(s, r)).toEqual([]);
  });
  it.each([7, 13])(
    "keeps incomplete/oversized %i as draft warnings but blocks submit",
    (count) => {
      const { s, r } = teamState(count);
      expect(
        validateRegistration(s, r, "draft").warnings.length,
      ).toBeGreaterThan(0);
      expect(errors(s, r)).toContain("TEAM_SIZE");
    },
  );
  it("blocks unbalanced sexes and duplicate members", () => {
    const { s, r } = teamState(8);
    s.athletes = s.athletes.map((a) => ({ ...a, sex: "male" }));
    expect(errors(s, r)).toContain("TEAM_GENDER_COUNT");
    s.teams = [{ ...s.teams[0]!, memberIds: ["a1", "a1"] }];
    expect(errors(s, r)).toContain("TEAM_SCOPE");
  });
  it("requires individual same-sport registration when configured, warning only for drafts", () => {
    const { s, r } = teamState(8);
    const n = s.catalog.nodes.map((n) => structuredClone(n));
    n[1]!.rules.requireIndividual = true;
    s.catalog = snapshotCatalog("s", ids.edition, 1, n);
    expect(errors(s, r)).toContain("INDIVIDUAL_REQUIRED");
    expect(errors(s, r, "draft")).not.toContain("INDIVIDUAL_REQUIRED");
  });
});
describe("R06 immutable revisions and approved C10 roster", () => {
  it("preserves old approved participant while edit is pending/returned, then switches only on approval", () => {
    const s = stateWith();
    let r = registration("r", "a1");
    r = transitionRegistration(s, r, "submit", 1, clock());
    r = transitionRegistration(s, r, "approve", 2, clock());
    const approvedId = r.approvedRevisionId;
    const approvedVersion = r.version;
    r = reviseRegistration(
      r,
      "new-revision",
      { kind: "athlete", athleteId: "a2" },
      approvedVersion,
    );
    s.registrations = [r];
    expect(approvedEntries(s, ids.event)[0]!.id).toBe("a1");
    r = transitionRegistration(s, r, "submit", r.version, clock());
    r = transitionRegistration(
      s,
      r,
      "return",
      r.version,
      clock(),
      "Cần rà soát",
    );
    expect(r.approvedRevisionId).toBe(approvedId);
    r = transitionRegistration(s, r, "submit", r.version, clock());
    r = transitionRegistration(s, r, "approve", r.version, clock());
    s.registrations = [r];
    expect(approvedEntries(s, ids.event)[0]!.id).toBe("a2");
    expect(r.revisions[0]!.participant).toEqual({
      kind: "athlete",
      athleteId: "a1",
    });
    expect(currentRevision(r).version).toBe(r.version);
  });
  it("blocks stale versions, edits awaiting review, return without reason and overdue submissions", () => {
    const s = stateWith(),
      r = registration("r", "a1");
    expect(() =>
      reviseRegistration(r, "next", { kind: "athlete", athleteId: "a2" }, 99),
    ).toThrow();
    const sent = transitionRegistration(s, r, "submit", 1, clock());
    expect(() =>
      reviseRegistration(
        sent,
        "next",
        { kind: "athlete", athleteId: "a2" },
        sent.version,
      ),
    ).toThrow();
    expect(() =>
      transitionRegistration(s, sent, "return", sent.version, clock()),
    ).toThrow();
    expect(() =>
      transitionRegistration(
        s,
        r,
        "submit",
        1,
        new Date("2026-11-01T00:00:00Z"),
      ),
    ).toThrow();
  });
});
describe("R03 CSV / normalized spreadsheet preview", () => {
  it("supports BOM, quoted commas, newlines, escaped quotes and preserves student-code zeros", () => {
    const rows = previewCsv(
      '\uFEFFstudent_code,name,sex,birth_year,grade\r\n001,"VĐV, tổng hợp ""A""\nnhóm",male,2014,6\r\n',
      ids.school,
      [],
    );
    expect(rows[0]!.errors).toEqual([]);
    expect(rows[0]!.studentCode).toBe("001");
    expect(rows[0]!.name).toContain('"A"');
  });
  it("masks identity, never returns raw CCCD and resolves existing IDs only inside the selected school", () => {
    const identity = "000000000123";
    const existing = [
      {
        ...athlete("s"),
        id: "private-student",
        schoolId: "other",
        studentCode: "001",
      },
    ];
    const rows = previewCsv(
      `student_code,name,sex,birth_year,grade,cccd\n001,Test,male,2014,6,${identity}`,
      ids.school,
      existing,
    );
    expect(rows[0]!.existingStudentId).toBe(null);
    expect(JSON.stringify(rows)).not.toContain(identity);
    expect(rows[0]!.identityMask).toBe("********0123");
  });
  it("rejects malformed quotes/headers and flags duplicate codes, invalid fields and row widths", () => {
    expect(() =>
      previewCsv('student_code,name\n1,"bad', ids.school, []),
    ).toThrow();
    expect(() =>
      previewCsv("student_code,name\n1,Test", ids.school, []),
    ).toThrow();
    const rows = previewRows(
      [
        ["student_code", "name", "sex", "birth_year", "grade"],
        ["001", "T", "invalid", "x", "0"],
        ["001", "T", "male", "2014", "6", "extra"],
      ],
      ids.school,
      [],
    );
    expect(rows[0]!.errors).toContain("SEX");
    expect(rows[1]!.errors).toContain("DUPLICATE_STUDENT_CODE");
    expect(rows[1]!.errors).toContain("COLUMN_COUNT");
  });
});
