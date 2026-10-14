import { randomBytes, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  executeRegistration,
  sealIdentity,
  openIdentity,
  identityView,
  validReferees,
  canViewFile,
  canUploadMatchEvidence,
  approvedEntries,
  athleteDto,
  registrationDto,
  RegistrationError,
} from "../packages/registration/src/index.js";
import {
  registry,
  athlete,
  registration,
  ids,
  nodes,
  TestRegistryStore,
  command,
  clock,
  schoolActor,
  adminActor,
} from "./group-r-fixtures.js";
import { snapshotCatalog } from "../packages/registration/src/catalog.js";
describe("R02/R06/R10 trusted transactional commands", () => {
  it("creates empty-master profile directly, creates scoped athlete code and one logical folder request", async () => {
    const store = new TestRegistryStore();
    const profile = await executeRegistration(
      store,
      command({
        type: "propose-student",
        schoolId: ids.school,
        studentCode: "001",
        name: "VĐV tổng hợp",
        sex: "male",
        birthYear: 2014,
        grade: 6,
      }),
      clock,
    );
    expect(store.state.students[0]!.profileStatus).toBe("approved");
    const c = command(
      {
        type: "create-athlete",
        schoolId: ids.school,
        studentId: profile.resourceId,
      },
      store.state.version,
    );
    const first = await executeRegistration(store, c, clock);
    const retry = await executeRegistration(store, c, clock);
    expect(retry).toEqual(first);
    expect(store.state.athletes).toHaveLength(1);
    expect(store.state.athletes[0]!.athleteCode).toBe("01.001");
    expect(
      store.events.filter(
        (e) => (e as { type: string }).type === "athlete.folder.requested",
      ),
    ).toHaveLength(1);
    await expect(
      executeRegistration(
        store,
        command(c.operation, store.state.version),
        clock,
      ),
    ).rejects.toMatchObject({ code: "DUPLICATE_ATHLETE" });
  });
  it("holds new original profile for admin approval when the commune master list exists", async () => {
    const state = registry();
    state.masterListPresent = true;
    const store = new TestRegistryStore(state);
    const p = await executeRegistration(
      store,
      command({
        type: "propose-student",
        schoolId: ids.school,
        studentCode: "001",
        name: "Test",
        sex: "male",
        birthYear: 2014,
        grade: 6,
      }),
      clock,
    );
    expect(store.state.students[0]!.profileStatus).toBe("pending");
    await expect(
      executeRegistration(
        store,
        command(
          { type: "approve-profile", studentId: p.resourceId },
          store.state.version,
        ),
        clock,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await executeRegistration(
      store,
      command(
        { type: "approve-profile", studentId: p.resourceId },
        store.state.version,
        adminActor.id,
      ),
      clock,
    );
    expect(store.state.students[0]!.profileStatus).toBe("approved");
  });
  it("rejects unapproved actors, cross-school body IDs and current revocation on cached responses", async () => {
    const state = registry();
    state.athletes = [athlete("a")];
    const store = new TestRegistryStore(state);
    const c = command({
      type: "create-registration",
      schoolId: ids.school,
      eventId: ids.event,
      participant: { kind: "athlete", athleteId: "a" },
    });
    await executeRegistration(store, c, clock);
    store.actors = store.actors.map((a) => ({ ...a, approved: false }));
    await expect(executeRegistration(store, c, clock)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    store.actors = [schoolActor, adminActor];
    await expect(
      executeRegistration(
        store,
        command(
          { ...c.operation, schoolId: "other" } as typeof c.operation,
          store.state.version,
        ),
        clock,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("rejects reused receipt keys with changed payload", async () => {
    const store = new TestRegistryStore();
    const c = command({
      type: "propose-student",
      schoolId: ids.school,
      studentCode: "001",
      name: "Test",
      sex: "male",
      birthYear: 2014,
      grade: 6,
    });
    await executeRegistration(store, c, clock);
    await expect(
      executeRegistration(
        store,
        {
          ...c,
          operation: { ...c.operation, name: "Changed" } as typeof c.operation,
        },
        clock,
      ),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it.each(["save", "audit", "enqueue", "receipt"])(
    "rolls back state, sequence, audit, outbox and receipt at %s failure",
    async (step) => {
      const state = registry();
      state.students = [{ ...athlete("a"), id: "student" }];
      const store = new TestRegistryStore(state);
      store.failAt = step;
      await expect(
        executeRegistration(
          store,
          command({
            type: "create-athlete",
            schoolId: ids.school,
            studentId: "student",
          }),
          clock,
        ),
      ).rejects.toThrow();
      expect(store.state).toEqual(state);
      expect(store.sequence).toBe(0);
      expect(store.audits).toEqual([]);
      expect(store.events).toEqual([]);
      expect(store.receipts.size).toBe(0);
    },
  );
  it("serializes two distinct registrations competing for final school quota: exactly one submit succeeds", async () => {
    const state = registry(),
      n = nodes();
    n[0]!.rules.schoolQuota = 1;
    state.catalog = snapshotCatalog("s", ids.edition, 1, n);
    state.athletes = [athlete("a1"), athlete("a2")];
    state.registrations = [registration("r1", "a1"), registration("r2", "a2")];
    const store = new TestRegistryStore(state);
    const results = await Promise.allSettled(
      ["r1", "r2"].map((registrationId) =>
        executeRegistration(
          store,
          command({ type: "submit", registrationId }),
          clock,
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(
      rejected?.status === "rejected" &&
        rejected.reason instanceof RegistrationError &&
        rejected.reason.code,
    ).toBe("SCHOOL_QUOTA");
    expect(
      store.state.registrations.filter(
        (r) => r.revisions.at(-1)!.status === "submitted",
      ),
    ).toHaveLength(1);
  });
  it("allocates distinct codes for simultaneous creates with explicit optimistic retries", async () => {
    const state = registry();
    state.students = Array.from({ length: 12 }, (_, i) => ({
      ...athlete(String(i)),
      id: `s${i}`,
    }));
    const store = new TestRegistryStore(state);
    await Promise.all(
      state.students.map(async (student) => {
        for (let attempt = 0; attempt < 20; attempt++) {
          try {
            return await executeRegistration(
              store,
              command(
                {
                  type: "create-athlete",
                  schoolId: ids.school,
                  studentId: student.id,
                },
                store.state.version,
              ),
              clock,
            );
          } catch (e) {
            if (
              !(e instanceof RegistrationError) ||
              e.code !== "VERSION_CONFLICT"
            )
              throw e;
          }
        }
        throw new Error("retry budget exhausted");
      }),
    );
    expect(store.state.athletes).toHaveLength(12);
    expect(new Set(store.state.athletes.map((a) => a.athleteCode)).size).toBe(
      12,
    );
    expect(store.sequence).toBe(12);
  });
  it("cannot approve a registration as school, and checks real deadline at server command time", async () => {
    const state = registry();
    state.athletes = [athlete("a")];
    state.registrations = [registration("r", "a")];
    const store = new TestRegistryStore(state);
    await executeRegistration(
      store,
      command({ type: "submit", registrationId: "r" }),
      clock,
    );
    await expect(
      executeRegistration(
        store,
        command({ type: "approve", registrationId: "r" }, 2),
        clock,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await executeRegistration(
      store,
      command({ type: "approve", registrationId: "r" }, 2, adminActor.id),
      clock,
    );
    expect(approvedEntries(store.state, ids.event)[0]!.id).toBe("a");
    const lateStore = new TestRegistryStore(state);
    await expect(
      executeRegistration(
        lateStore,
        command({ type: "submit", registrationId: "r" }),
        () => new Date("2026-11-01T00:00:00Z"),
      ),
    ).rejects.toMatchObject({ code: "REGISTRATION_CLOSED" });
  });
  it("revises a team via a new immutable team snapshot, preserving approved membership", async () => {
    const state = registry(),
      n = nodes();
    n[1]!.participantKind = "team";
    n[1]!.rules = { gender: "male", minMembers: 2, maxMembers: 2 };
    state.catalog = snapshotCatalog("s", ids.edition, 1, n);
    state.athletes = [athlete("a1"), athlete("a2"), athlete("a3")];
    state.teams = [
      {
        id: "team",
        editionId: ids.edition,
        schoolId: ids.school,
        eventId: ids.event,
        name: "Đội thử",
        memberIds: ["a1", "a2"],
      },
    ];
    state.registrations = [
      {
        ...registration("r", "none"),
        version: 3,
        approvedRevisionId: "approved",
        revisions: [
          {
            id: "approved",
            version: 3,
            status: "approved",
            participant: { kind: "team", teamId: "team" },
          },
        ],
      },
    ];
    const store = new TestRegistryStore(state);
    await executeRegistration(
      store,
      command(
        {
          type: "revise-team",
          registrationId: "r",
          memberIds: ["a1", "a3"],
          reason: "Đề nghị HLV",
        },
        3,
      ),
      clock,
    );
    expect(store.state.teams[0]!.memberIds).toEqual(["a1", "a2"]);
    expect(store.state.teams[1]!.memberIds).toEqual(["a1", "a3"]);
    expect(approvedEntries(store.state, ids.event)[0]!.personIds).toEqual([
      "student-a1",
      "student-a2",
    ]);
  });
  it("creates API projections without private data", () => {
    const a = { ...athlete(randomUUID()), studentId: randomUUID() };
    const dto = athleteDto(a);
    expect(dto.school_id).toBe(ids.school);
    expect(dto).not.toHaveProperty("birthYear");
    expect(dto).not.toHaveProperty("sex");
    const r = registration(randomUUID(), a.id);
    r.revisions = [{ ...r.revisions[0]!, id: randomUUID() }];
    expect(registrationDto(r).current_revision.participant).toEqual({
      kind: "athlete",
      athlete_id: a.id,
    });
  });
});
describe("R03 encrypted identity and R08/R09 access rules", () => {
  const scope = {
    editionId: ids.edition,
    schoolId: ids.school,
    studentId: "student-test",
  };
  it("encrypts with random IV and binds ciphertext to school/student/edition and key version", () => {
    const key = randomBytes(32),
      identity = "000000000123",
      sealed = sealIdentity(identity, key, "test-key", scope);
    expect(JSON.stringify(sealed)).not.toContain(identity);
    expect(openIdentity(sealed, key, "test-key", scope)).toBe(identity);
    expect(sealIdentity(identity, key, "test-key", scope).ciphertext).not.toBe(
      sealed.ciphertext,
    );
    for (const changed of [
      { ...scope, editionId: "other" },
      { ...scope, schoolId: "other" },
      { ...scope, studentId: "other" },
    ])
      expect(() => openIdentity(sealed, key, "test-key", changed)).toThrow();
    expect(() => openIdentity(sealed, key, "wrong-key", scope)).toThrow();
    expect(() =>
      openIdentity(
        { ...sealed, tag: randomBytes(16).toString("base64") },
        key,
        "test-key",
        scope,
      ),
    ).toThrow();
  });
  it("shows full identity to the registering school and admin, rejects a foreign school", () => {
    const key = randomBytes(32),
      viewScope = { ...scope, sportIds: ["sport-a"] },
      sealed = sealIdentity("001000000123", key, "test-key", scope);
    expect(identityView(schoolActor, viewScope, sealed, key, "test-key")).toBe(
      "001000000123",
    );
    expect(identityView(adminActor, viewScope, sealed, key, "test-key")).toBe(
      "001000000123",
    );
    expect(() =>
      identityView(
        schoolActor,
        { ...viewScope, schoolId: "other" },
        sealed,
        key,
        "test-key",
      ),
    ).toThrow();
  });
  it("enforces approved checklist and same-school conflict; deduplicates referees", () => {
    const referee = {
      id: "ref",
      approved: true,
      schoolId: "other",
      assignments: [
        {
          editionId: ids.edition,
          role: "referee" as const,
          sportId: ids.sport,
          eventIds: [ids.event],
        },
      ],
    };
    const row = {
      eventId: ids.event,
      sportId: ids.sport,
      participantSchoolIds: [ids.school],
      requiredReferees: 2,
    };
    expect(validReferees(ids.edition, row, [referee, referee]).sufficient).toBe(
      false,
    );
    expect(
      validReferees(ids.edition, { ...row, requiredReferees: 1 }, [
        { ...referee, schoolId: ids.school },
      ]).eligibleIds,
    ).toEqual([]);
    expect(
      validReferees(ids.edition, { ...row, eventId: "unticked" }, [referee])
        .eligibleIds,
    ).toEqual([]);
  });
  it("separates file viewing from uploading and blocks foreign edition/unrelated schools", () => {
    const file = {
      id: "file",
      editionId: ids.edition,
      athleteIds: ["a"],
      matchId: "match",
      participantSchoolIds: [ids.school],
      sportId: ids.sport,
      eventId: ids.event,
    };
    expect(canViewFile(schoolActor, file)).toBe(true);
    expect(canUploadMatchEvidence(schoolActor, file)).toBe(false);
    expect(
      canViewFile(schoolActor, { ...file, participantSchoolIds: ["other"] }),
    ).toBe(false);
    expect(canViewFile(adminActor, { ...file, editionId: "other" })).toBe(
      false,
    );
    const leader = {
      id: "leader",
      approved: true,
      schoolId: ids.school,
      assignments: [
        { editionId: ids.edition, role: "leader" as const, sportId: ids.sport },
      ],
    };
    expect(canViewFile(leader, file)).toBe(true);
    expect(canUploadMatchEvidence(leader, file)).toBe(false);
  });
});
it("R/C rejects corrupted approved references rather than silently omitting entrants", () => {
  const state = registry();
  state.athletes = [athlete("a")];
  state.registrations = [
    { ...registration("r", "a"), approvedRevisionId: "missing" },
  ];
  expect(() => approvedEntries(state, ids.event)).toThrow();
  state.registrations = [
    {
      ...registration("r", "a"),
      approvedRevisionId: "rev-r",
      revisions: [
        {
          id: "rev-r",
          version: 1,
          status: "approved",
          participant: { kind: "athlete", athleteId: "a" },
        },
      ],
    },
  ];
  state.athletes = [{ ...athlete("a"), editionId: "other" }];
  expect(() => approvedEntries(state, ids.event)).toThrow();
});
it("R10 serializes concurrent submissions in two new sports so the third sport cannot be reserved", async () => {
  const state = registry(),
    n = nodes();
  for (let i = 2; i <= 3; i++)
    n.push(
      { ...n[0]!, id: `sport-${i}`, code: `SPORT-${i}` },
      {
        ...n[1]!,
        id: `event-${i}`,
        code: `EVENT-${i}`,
        parentId: `sport-${i}`,
      },
    );
  state.catalog = snapshotCatalog("s", ids.edition, 1, n);
  state.athletes = [athlete("a")];
  const first = registration("r1", "a");
  state.registrations = [
    {
      ...first,
      approvedRevisionId: "rev-r1",
      revisions: [
        {
          id: "rev-r1",
          version: 1,
          status: "approved",
          participant: { kind: "athlete", athleteId: "a" },
        },
      ],
    },
    registration("r2", "a", "event-2"),
    registration("r3", "a", "event-3"),
  ];
  const store = new TestRegistryStore(state);
  const results = await Promise.allSettled(
    ["r2", "r3"].map((registrationId) =>
      executeRegistration(
        store,
        command({ type: "submit", registrationId }),
        clock,
      ),
    ),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(
    results.some(
      (r) => r.status === "rejected" && r.reason.code === "THIRD_SPORT",
    ),
  ).toBe(true);
});
