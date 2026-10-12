import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  allRoundPoints,
  awardEvent,
  participationCounts,
  type Participation,
} from "../packages/results/src/index.js";
import { CursorCodec } from "../packages/foundation/src/index.js";
import {
  approvedEntries,
  snapshotCatalog,
} from "../packages/registration/src/index.js";
import {
  proposeSchedule,
  scheduleConflicts,
  type ScheduleTask,
} from "../packages/competition/src/index.js";
import {
  athlete,
  ids,
  nodes,
  registration,
  registry,
} from "./group-r-fixtures.js";

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
  requiredEventIds: ["event"],
  actuallyPlayedEventIds: ["event"],
  organizerCancelledEventIds: [],
};
const penalty = {
  id: "p",
  schoolId: "s",
  block: "secondary",
  sportId: "football",
  points: 10,
  waived: false,
  reason: "Synthetic",
  decidedBy: "leader",
};
const parties = (): Participation[] =>
  ["a", "b", "c"].map((id) => ({
    id,
    eventId: "event",
    schoolId: id,
    status: "active",
    playedMatchIds: [],
    performed: true,
    validAchievement: true,
    history: [],
  }));
const awardContext = {
  kind: "individual" as const,
  registered: 3,
  approved: 3,
  bronzeMatchCancelled: false,
};
const scope = {
  actorId: "actor",
  editionId: "edition",
  operation: "list",
  filters: {},
};
const task = (
  id: string,
  venueIds: string[],
  dependsOnIds: string[] = [],
): ScheduleTask => ({
  id,
  eventId: "event",
  sportId: "sport",
  participantPersonIds: [`person-${id}`],
  refereePersonIds: [],
  restMinutes: 0,
  dependsOnIds,
  durationMinutes: 30,
  venueIds,
});
const window = {
  start: "2026-10-12T08:00:00.000Z",
  end: "2026-10-12T08:30:00.000Z",
};

describe("M-01 penalty and coefficients", () => {
  it.each(["false", "true", 0, 1, null, undefined])(
    "rejects nonboolean waived %s",
    (waived) => {
      expect(() =>
        allRoundPoints(
          [standing],
          [{ ...penalty, waived } as never],
          [mandatory],
        ),
      ).toThrow("boolean");
    },
  );
  it("preserves deduction, waiver decision and normal sport coefficient", () => {
    expect(allRoundPoints([standing], [penalty], [mandatory])[0]!.total).toBe(
      23,
    );
    const waived = { ...penalty, waived: true };
    const row = allRoundPoints([standing], [waived], [mandatory])[0]!;
    expect(row.total).toBe(33);
    expect(row.penalties).toEqual([waived]);
    expect(
      allRoundPoints([{ ...standing, sportKind: "other" }], [], [mandatory])[0]!
        .total,
    ).toBe(11);
    expect(() =>
      allRoundPoints(
        [{ ...standing, sportKind: "typo" } as never],
        [],
        [mandatory],
      ),
    ).toThrow("Hạng môn");
  });
});
describe("M-02 real participation evidence", () => {
  it.each(
    [[""], ["  "], [null], [42], ["match", "match"]].map((playedMatchIds) => ({
      playedMatchIds,
    })),
  )(
    "rejects corrupt match references %j before awards",
    ({ playedMatchIds }) => {
      const all = parties().map(
        (p) => ({ ...p, performed: false, playedMatchIds }) as never,
      );
      expect(() => awardEvent(all, ["a", "b", "c"], awardContext)).toThrow(
        "chứng cứ",
      );
    },
  );
  it("preserves valid performed and played records, counts no evidence as zero", () => {
    expect(awardEvent(parties(), ["a", "b", "c"], awardContext).status).toBe(
      "resolved",
    );
    const all = parties().map((p) => ({
      ...p,
      performed: false,
      playedMatchIds: ["match"],
    }));
    expect(participationCounts(all, 3, 3).actual).toBe(3);
    expect(
      participationCounts(
        all.map((p) => ({ ...p, playedMatchIds: [] })),
        3,
        3,
      ).actual,
    ).toBe(0);
  });
  it.each(["performed", "validAchievement", "status"])(
    "rejects invalid %s",
    (field) => {
      expect(() =>
        participationCounts(
          parties().map((p) => ({ ...p, [field]: "false" }) as never),
          3,
          3,
        ),
      ).toThrow("chứng cứ");
    },
  );
});
function teamState(memberIds: string[]) {
  const state = registry();
  const catalogNodes = nodes();
  catalogNodes[1] = {
    ...catalogNodes[1]!,
    participantKind: "team",
    rules: { minMembers: 2, maxMembers: 2 },
  };
  state.catalog = snapshotCatalog(
    "team-snapshot",
    ids.edition,
    1,
    catalogNodes,
  );
  state.athletes = [athlete("a"), athlete("b"), athlete("c")];
  state.teams = [
    {
      id: "team",
      editionId: ids.edition,
      schoolId: ids.school,
      eventId: ids.event,
      name: "Team",
      memberIds,
    },
  ];
  const r = registration("r", "a");
  r.approvedRevisionId = r.revisions[0]!.id;
  r.revisions = [
    {
      ...r.revisions[0]!,
      status: "approved",
      participant: { kind: "team", teamId: "team" },
    },
  ];
  state.registrations = [r];
  return state;
}
describe("M-03 approved roster team size", () => {
  it.each(
    [[], ["a"], ["a", "b", "c"], ["a", "a"], ["a", "missing"]].map(
      (members) => ({ members }),
    ),
  )("blocks invalid team %j", ({ members }) => {
    expect(() => approvedEntries(teamState(members), ids.event)).toThrow(
      "Đội duyệt",
    );
  });
  it("exports valid approved membership while ignoring a pending replacement", () => {
    const state = teamState(["a", "b"]);
    const r = state.registrations[0]!;
    r.revisions = [
      ...r.revisions,
      {
        id: "pending",
        version: 2,
        status: "submitted",
        participant: { kind: "athlete", athleteId: "c" },
      },
    ];
    expect(approvedEntries(state, ids.event)[0]!.personIds).toEqual([
      "student-a",
      "student-b",
    ]);
  });
  it("does not prohibit empty draft teams", () => {
    const state = teamState([]);
    state.registrations[0]!.approvedRevisionId = null;
    expect(approvedEntries(state, ids.event)).toEqual([]);
  });
});
describe("M-04 cursor clocks", () => {
  it.each([NaN, Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid clock %s in both directions",
    (now) => {
      const codec = new CursorCodec(randomBytes(32), 100);
      const token = codec.encode("last", scope, 1000);
      expect(() => codec.encode("last", scope, now)).toThrow();
      expect(() => codec.decode(token, scope, now)).toThrow();
    },
  );
  it("rejects expiry overflow; exact expiry and binding checks remain enforced", () => {
    const codec = new CursorCodec(randomBytes(32), 100);
    expect(() =>
      codec.encode("last", scope, Number.MAX_SAFE_INTEGER - 99),
    ).toThrow();
    const token = codec.encode("last", scope, 1000);
    expect(codec.decode(token, scope, 1099)).toBe("last");
    expect(() => codec.decode(token, scope, 1100)).toThrow();
    expect(() =>
      codec.decode(token, { ...scope, actorId: "other" }, 1000),
    ).toThrow();
  });
});
describe("M-05 constrained-first scheduling", () => {
  it.each([false, true])(
    "finds the feasible scarce-venue schedule regardless of input order %s",
    (reverse) => {
      const tasks = [task("flex", ["A", "B"]), task("fixed", ["A"])];
      const before = structuredClone(tasks);
      const result = proposeSchedule(
        reverse ? [...tasks].reverse() : tasks,
        [],
        window,
      );
      expect(result.find((x) => x.id === "fixed")!.venueId).toBe("A");
      expect(result.find((x) => x.id === "flex")!.venueId).toBe("B");
      expect(scheduleConflicts(result)).toEqual([]);
      expect(tasks).toEqual(before);
    },
  );
  it("still respects dependencies, occupancy and rest time", () => {
    const first = task("first", ["A"]);
    const next = {
      ...task("next", ["A"], ["first"]),
      participantPersonIds: first.participantPersonIds,
      restMinutes: 10,
    };
    const result = proposeSchedule([next, first], [], {
      ...window,
      end: "2026-10-12T10:00:00.000Z",
    });
    expect(result[1]!.start).toBe("2026-10-12T08:40:00.000Z");
    expect(scheduleConflicts(result)).toEqual([]);
    expect(() => proposeSchedule([task("x", ["A"])], result, window)).toThrow(
      "Không tìm được",
    );
  });
});
