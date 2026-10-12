import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import {
  rankRoundRobin,
  finalizePublication,
  invalidatePublication,
  publicResults,
  changeParticipation,
  submitPreview,
  confirmPreview,
} from "@hkpd/results";
import { maskIdentity, previewCsv } from "@hkpd/registration";
import { match, score, ids, clock } from "./group-k-fixtures.js";
const entrants = ["a", "b", "c"].map((id) => ({ id, schoolId: id }));
const games = [
  ["a", "b"],
  ["a", "c"],
  ["b", "c"],
].map(([left, right], i) => ({
  id: `m${i}`,
  left: left!,
  right: right!,
  leftScore: 2,
  rightScore: 0,
  confirmed: true,
}));
it("N-01 same ID for different confirmed pairs is rejected", () => {
  expect(() =>
    rankRoundRobin(
      entrants,
      games.map((g) => ({ ...g, id: "duplicate" })),
      { sport: "football" },
    ),
  ).toThrow();
});
it("N-01 pending rows are excluded and unique confirmed IDs still resolve", () => {
  expect(
    rankRoundRobin(entrants, [...games, { ...games[0]!, confirmed: false }], {
      sport: "football",
    }).status,
  ).toBe("resolved");
});
const publication = () => ({
  id: "publication",
  editionId: ids.edition,
  version: 1,
  status: "provisional" as const,
  sourceVersions: { [ids.match]: 1 },
});
const ready = { allResultsConfirmed: true, rankingsResolved: true };
it.each([0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])(
  "N-02 rejects invalid official source %s",
  (version) => {
    const p = { ...publication(), sourceVersions: { [ids.match]: version } };
    expect(() => finalizePublication(p, p.sourceVersions, 1, ready)).toThrow();
    expect(p.status).toBe("provisional");
  },
);
it.each([0, -1, NaN, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1])(
  "N-02 cannot increment unsafe aggregate version %s",
  (version) => {
    const p = { ...publication(), version };
    expect(() =>
      finalizePublication(p, p.sourceVersions, version, ready),
    ).toThrow();
    expect(() => invalidatePublication(p, ids.match, 2)).toThrow();
  },
);
it("N-02 valid source max and duplicate delivery at terminal version remain readable", () => {
  const p = {
    ...publication(),
    sourceVersions: { [ids.match]: Number.MAX_SAFE_INTEGER },
  };
  expect(finalizePublication(p, p.sourceVersions, 1, ready).status).toBe(
    "finalized",
  );
  expect(
    invalidatePublication(
      { ...p, version: Number.MAX_SAFE_INTEGER },
      ids.match,
      Number.MAX_SAFE_INTEGER,
    ).version,
  ).toBe(Number.MAX_SAFE_INTEGER);
});
it("N-02 current sources invalid while old sources valid are rejected", () => {
  expect(() =>
    finalizePublication(publication(), { [ids.match]: 0 }, 1, ready),
  ).toThrow();
  expect(() =>
    finalizePublication(publication(), { [" "]: 1 }, 1, ready),
  ).toThrow();
});
it("N-02 public projection rejects a corrupt finalized publication", () => {
  const m = match(),
    s = submitPreview(m, score(), ids.ref, clock(), randomUUID());
  const sub = s.submissions[0]!;
  const confirmed = confirmPreview(
    s,
    { submission_id: sub.id, submission_version: 1, base_official_version: 0 },
    ids.leader,
    clock(),
    randomUUID(),
  );
  expect(() =>
    publicResults(
      { ...publication(), version: 0, status: "finalized" },
      confirmed.official!,
      {},
    ),
  ).toThrow();
});
const party = () => ({
  id: "a",
  eventId: "e",
  schoolId: "s",
  status: "active" as const,
  playedMatchIds: [],
  performed: false,
  validAchievement: false,
  history: [],
});
const context = {
  eventId: "e",
  format: "knockout" as const,
  editionLocked: false,
  downstreamHasSavedResult: false,
  previouslyEliminated: false,
  actorId: "leader",
  reason: "Synthetic decision",
  at: clock().toISOString(),
};
it("N-03 unknown next/current statuses and format are rejected without mutating history", () => {
  const p = party();
  expect(() => changeParticipation(p, "typo" as never, context)).toThrow();
  expect(() =>
    changeParticipation({ ...p, status: "typo" as never }, "active", context),
  ).toThrow();
  expect(() =>
    changeParticipation(p, "absent", { ...context, format: "typo" as never }),
  ).toThrow();
  expect(p.history).toEqual([]);
});
it.each(["excused", "absent", "disqualified"] as const)(
  "N-03 valid transition to %s still keeps audit history",
  (next) => {
    const p = party();
    const r = changeParticipation(p, next, context);
    expect(r.status).toBe(next);
    expect(r.history[0]?.from).toBe("active");
    expect(changeParticipation(r, "active", context).status).toBe("active");
    expect(p.status).toBe("active");
  },
);
it.each([
  "1",
  "12",
  "123",
  "1234",
  "abcd",
  "not-an-identity",
  "12345678901",
  "1234567890123",
])("N-04 malformed input is fully masked (%s)", (value) => {
  expect(maskIdentity(value)).toBe("*".repeat(value.length));
  const r = previewCsv(
    `student_code,name,sex,birth_year,grade,cccd\nA,Synthetic,male,2014,6,${value}`,
    "school",
    [],
  )[0]!;
  expect(r.errors).toContain("IDENTITY_FORMAT");
  expect(r.identityMask).not.toContain(value);
});
it("N-04 valid12 shows only last4 and blank has no value", () => {
  expect(maskIdentity("000000001234")).toBe("********1234");
  expect(maskIdentity("")).toBe("");
  expect(
    previewCsv(
      "student_code,name,sex,birth_year,grade,cccd\nA,Synthetic,male,2014,6,",
      "s",
      [],
    )[0]?.identityMask,
  ).toBeNull();
});
it.each(["athlete", "team"] as const)(
  "N-05 rejects unknown nested %s field before save",
  (kind) => {
    const m = match();
    const payload = score();
    if (kind === "team") {
      m.participantKeys = [`team:${ids.athleteA}`, `team:${ids.athleteB}`];
      payload.entries = payload.entries.map((e, i) => ({
        ...e,
        participant: {
          kind: "team",
          team_id: i === 0 ? ids.athleteA : ids.athleteB,
        },
      })) as never;
    }
    Object.assign(payload.entries[0]!.participant, {
      private_note: "synthetic",
    });
    expect(() =>
      submitPreview(m, payload, ids.ref, clock(), randomUUID()),
    ).toThrow();
    expect(m.submissions).toHaveLength(0);
  },
);
it("N-05 valid team payload is preserved exactly", () => {
  const m = match();
  m.participantKeys = [`team:${ids.athleteA}`, `team:${ids.athleteB}`];
  const payload = {
    ...score(),
    entries: score().entries.map((e, i) => ({
      ...e,
      participant: {
        kind: "team" as const,
        team_id: i === 0 ? ids.athleteA : ids.athleteB,
      },
    })),
  };
  expect(
    submitPreview(m, payload, ids.ref, clock(), randomUUID()).submissions[0]
      ?.payload,
  ).toEqual(payload);
});
it("N-05 unknown set fields and malformed nested rows are rejected", () => {
  const m = match();
  m.rule = { ...m.rule, kind: "sets", maxSets: 3 };
  const payload = {
    ...score(),
    entries: score().entries.map((e, i) => ({
      ...e,
      value: {
        kind: "sets" as const,
        sets: [
          {
            scored: i === 0 ? 21 : 10,
            conceded: i === 0 ? 10 : 21,
            private_note: "synthetic",
          },
        ],
      },
    })),
  };
  expect(() =>
    submitPreview(m, payload, ids.ref, clock(), randomUUID()),
  ).toThrow();
  expect(() =>
    submitPreview(
      match(),
      { ...score(), entries: [null] as never },
      ids.ref,
      clock(),
      randomUUID(),
    ),
  ).toThrow();
});
it("N-05 revalidates nested fields in persisted pending data before confirmation", () => {
  const submitted = structuredClone(
    submitPreview(match(), score(), ids.ref, clock(), randomUUID()),
  );
  const s = submitted.submissions[0]!;
  Object.assign(s.payload.entries[0]!.participant, {
    private_note: "synthetic",
  });
  expect(() =>
    confirmPreview(
      submitted,
      { submission_id: s.id, submission_version: 1, base_official_version: 0 },
      ids.leader,
      clock(),
      randomUUID(),
    ),
  ).toThrow();
  expect(submitted.official).toBeNull();
});
