import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  allRoundPoints,
  confirmPreview,
  publicResults,
  submitPreview,
  type Payload,
} from "../packages/results/src/index.js";
import { assertSubmission } from "../packages/offline/src/index.js";
import { contractValidators } from "../scripts/contracts-schema.mjs";
import { match, ids, clock } from "./group-k-fixtures.js";
const validators = contractValidators(
  JSON.parse(readFileSync("docs/api/core.openapi.json", "utf8")),
);
const standing = {
  schoolId: "s",
  block: "secondary",
  sportId: "football",
  sportKind: "football" as const,
  rank: 1,
};
const mandatory = {
  schoolId: "s",
  block: "secondary",
  requiredEventIds: ["e"],
  actuallyPlayedEventIds: ["e"],
  organizerCancelledEventIds: [],
};
describe("LOG-02/03 qualification references and immutable penalty ledger", () => {
  it.each([
    "requiredEventIds",
    "actuallyPlayedEventIds",
    "organizerCancelledEventIds",
  ])("rejects blank %s", (field) => {
    for (const refs of [[""], [" "], [null], undefined, new Array(1)]) {
      expect(() =>
        allRoundPoints(
          [standing],
          [],
          [{ ...mandatory, [field]: refs } as never],
        ),
      ).toThrow();
    }
  });
  it("preserves valid played/cancelled eligibility and isolates decisions from input mutation", () => {
    const penalty = {
      id: "penalty",
      schoolId: "s",
      block: "secondary",
      sportId: "football",
      points: 10,
      waived: false,
      reason: "Synthetic",
      decidedBy: "leader",
    };
    const rows = allRoundPoints([standing], [penalty], [mandatory]);
    penalty.waived = true;
    penalty.points = 0;
    expect(rows[0]!.penalty).toBe(10);
    expect(rows[0]!.total).toBe(23);
    expect(rows[0]!.penalties[0]).toMatchObject({ waived: false, points: 10 });
    expect(Object.isFrozen(rows[0]!.penalties[0])).toBe(true);
    expect(
      allRoundPoints(
        [standing],
        [],
        [
          {
            ...mandatory,
            actuallyPlayedEventIds: [],
            organizerCancelledEventIds: ["e"],
          },
        ],
      )[0]!.eligible,
    ).toBe(true);
    expect(
      allRoundPoints(
        [standing],
        [],
        [{ ...mandatory, actuallyPlayedEventIds: [] }],
      )[0]!.eligible,
    ).toBe(false);
    expect(
      allRoundPoints(
        [standing],
        [],
        [{ ...mandatory, actuallyPlayedEventIds: ["e", "e"] }],
      )[0]!.eligible,
    ).toBe(true);
  });
});
function decimalPayload(
  kind: "time" | "distance" | "points",
  value: string,
): Payload {
  return {
    rule_snapshot_id: ids.rule,
    file_ids: [],
    entries: [ids.athleteA, ids.athleteB].map((id) => ({
      participant: { kind: "athlete", athlete_id: id },
      value:
        kind === "time"
          ? { kind, seconds: value }
          : kind === "distance"
            ? { kind, metres: value }
            : { kind, points: value },
    })),
  };
}
describe("MOD-01 decimal parity across core, A03 and offline", () => {
  it.each(["time", "distance", "points"] as const)(
    "rejects leading zeros in %s without normalizing accepted command identity",
    (kind) => {
      const m = { ...match(), rule: { ...match().rule, kind, precision: 3 } };
      for (const value of ["01.230", "00", "-01.230"]) {
        const payload = decimalPayload(kind, value);
        expect(() =>
          submitPreview(m, payload, ids.ref, clock(), randomUUID()),
        ).toThrow();
        expect(validators.ResultPayload!(payload)).toBe(false);
        expect(() =>
          assertSubmission({
            operation_id: randomUUID(),
            base_version: 1,
            assignment_snapshot_id: randomUUID(),
            submission: { match_id: m.id, base_official_version: 0, payload },
          }),
        ).toThrow();
      }
      const payload = decimalPayload(kind, "1.230");
      expect(validators.ResultPayload!(payload)).toBe(true);
      expect(
        submitPreview(m, payload, ids.ref, clock(), randomUUID())
          .submissions[0]!.payload,
      ).toEqual(payload);
    },
  );
});
describe("MOD-03 sparse set rows cannot become official", () => {
  it("rejects holes at submit and persisted-pending confirmation, preserving valid sets", () => {
    const m = {
      ...match(),
      rule: { ...match().rule, kind: "sets" as const, maxSets: 5 },
    };
    const payload: Payload = {
      rule_snapshot_id: ids.rule,
      file_ids: [],
      entries: [ids.athleteA, ids.athleteB].map((id, i) => ({
        participant: { kind: "athlete", athlete_id: id },
        value: {
          kind: "sets",
          sets: [{ scored: i ? 9 : 11, conceded: i ? 11 : 9 }],
        },
      })),
    };
    const pending = submitPreview(m, payload, ids.ref, clock(), randomUUID());
    const corrupted = structuredClone(pending);
    corrupted.submissions[0]!.payload.entries.forEach((entry) => {
      if (entry.value.kind === "sets") entry.value.sets = new Array(1);
    });
    expect(() =>
      submitPreview(
        m,
        corrupted.submissions[0]!.payload,
        ids.ref,
        clock(),
        randomUUID(),
      ),
    ).toThrow();
    const confirmation = {
      submission_id: pending.submissions[0]!.id,
      submission_version: 1,
      base_official_version: 0,
    };
    expect(() =>
      confirmPreview(
        corrupted,
        confirmation,
        ids.leader,
        clock(),
        randomUUID(),
      ),
    ).toThrow();
    expect(
      confirmPreview(pending, confirmation, ids.leader, clock(), randomUUID())
        .official!.payload,
    ).toEqual(payload);
  });
});
describe("MOD-02 team public DTO whitelist", () => {
  it("publishes confirmed team results conforming to the additive contract without athlete codes or members", () => {
    const teamIds = [randomUUID(), randomUUID()];
    const m = {
      ...match(),
      participantKeys: teamIds.map((id) => `team:${id}`),
    };
    const payload: Payload = {
      rule_snapshot_id: ids.rule,
      file_ids: [],
      entries: teamIds.map((id, i) => ({
        participant: { kind: "team", team_id: id },
        value: { kind: "score", scored: i ? 1 : 2, conceded: i ? 2 : 1 },
      })),
    };
    const pending = submitPreview(m, payload, ids.ref, clock(), randomUUID());
    const official = confirmPreview(
      pending,
      {
        submission_id: pending.submissions[0]!.id,
        submission_version: 1,
        base_official_version: 0,
      },
      ids.leader,
      clock(),
      randomUUID(),
    ).official!;
    const publication = {
      id: randomUUID(),
      editionId: m.editionId,
      version: 1,
      status: "finalized" as const,
      sourceVersions: { [m.id]: 1 },
    };
    const labels = Object.fromEntries(
      teamIds.map((id) => [
        id,
        {
          kind: "team" as const,
          eventLabel: "Synthetic",
          displayName: "Team",
          schoolLabel: "School",
          member_ids: ["private"],
          cccd: "private",
        },
      ]),
    );
    const rows = publicResults(publication, official, labels);
    expect(rows).toHaveLength(2);
    rows.forEach((row) => {
      expect(validators.PublicResult!(row)).toBe(true);
      expect(row).not.toHaveProperty("athlete_code");
    });
    expect(JSON.stringify(rows)).not.toContain("private");
    expect(
      publicResults(
        { ...publication, status: "provisional" },
        official,
        labels,
      ),
    ).toEqual([]);
    expect(() =>
      publicResults(
        publication,
        official,
        Object.fromEntries(
          teamIds.map((id) => [
            id,
            {
              eventLabel: "Synthetic",
              athleteCode: "01.001",
              displayName: "Wrong",
              schoolLabel: "School",
            },
          ]),
        ),
      ),
    ).toThrow("Đội cần nhãn");
    expect(
      validators.PublicResult!({ ...rows[0], athlete_code: "01.001" }),
    ).toBe(false);
    expect(
      validators.PublicResult!({ ...rows[0], file_ids: [randomUUID()] }),
    ).toBe(false);
  });
  it.each(["time", "distance", "points"] as const)(
    "keeps old athlete public fixtures valid for %s",
    (kind) => {
      const m = { ...match(), rule: { ...match().rule, kind, precision: 3 } };
      const pending = submitPreview(
        m,
        decimalPayload(kind, "1.230"),
        ids.ref,
        clock(),
        randomUUID(),
      );
      const official = confirmPreview(
        pending,
        {
          submission_id: pending.submissions[0]!.id,
          submission_version: 1,
          base_official_version: 0,
        },
        ids.leader,
        clock(),
        randomUUID(),
      ).official!;
      const rows = publicResults(
        {
          id: randomUUID(),
          editionId: m.editionId,
          version: 1,
          status: "finalized",
          sourceVersions: { [m.id]: 1 },
        },
        official,
        Object.fromEntries(
          [ids.athleteA, ids.athleteB].map((id) => [
            id,
            {
              eventLabel: "Synthetic",
              athleteCode: "01.001",
              displayName: "Athlete",
              schoolLabel: "School",
            },
          ]),
        ),
      );
      rows.forEach((row) => {
        expect(validators.PublicResult!(row)).toBe(true);
        expect(row).toHaveProperty("athlete_code");
      });
    },
  );
});
