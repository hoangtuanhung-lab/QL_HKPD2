import { describe, expect, it } from "vitest";
import {
  transferWeight,
  weightTenths,
  createDraw,
  scheduleConflicts,
  proposeSchedule,
  reviseSchedule,
  assignLanes,
  validateLanes,
  type WeightClass,
  type TransferRequest,
  type ScheduleItem,
  type ScheduleTask,
} from "../packages/competition/src/index.js";
import { roster, random, snapshot } from "./group-c-fixtures.js";
function classes(
  sourceCount = 6,
  destinationCount = 5,
): [WeightClass, WeightClass] {
  const source = snapshot(sourceCount, "source");
  const destination = snapshot(destinationCount, "destination");
  destination.entrants = roster(destinationCount, 4, "d");
  destination.draw = createDraw(
    "destination",
    destination.entrants,
    "individual_combat",
    { random: random(4) },
  );
  return [
    {
      snapshot: source,
      sportCode: "vovinam",
      transferGroupId: "combat-group-a",
      index: 0,
      lowerKg: "41.0",
      upperKg: "44.0",
      schoolQuota: 3,
    },
    {
      snapshot: destination,
      sportCode: "vovinam",
      transferGroupId: "combat-group-a",
      index: 1,
      lowerKg: "44.0",
      upperKg: "47.0",
      schoolQuota: 3,
    },
  ];
}
const request: TransferRequest = {
  entrantId: "e1",
  sourceVersion: 1,
  destinationVersion: 1,
  officialKg: "41.0",
  officialWeightVerified: true,
  leaderConfirmed: true,
  reason: "Quyết định chuyển hạng thử",
};
describe("C05 weight transfer final rules", () => {
  it("rebuilds BOTH 6→5 and 5→6, preserves old snapshots, invalidates both schedules", () => {
    const [source, destination] = classes();
    source.snapshot.status = "draw_confirmed";
    destination.snapshot.status = "draw_confirmed";
    const result = transferWeight(source, destination, request, {
      random: random(8),
    });
    expect(result.source.draw?.format).toBe("round_robin");
    expect(result.destination.draw?.format).toBe("knockout");
    expect(result.source.entrants).toHaveLength(5);
    expect(result.destination.entrants).toHaveLength(6);
    expect(result.source.status).toBe("draft");
    expect(result.destination.status).toBe("draft");
    expect(result.archive.source).toEqual(source.snapshot);
    expect(result.archive.destination).toEqual(destination.snapshot);
    expect(result.invalidatedEventIds).toEqual(["source", "destination"]);
    expect(source.snapshot.entrants).toHaveLength(6);
    expect(destination.snapshot.entrants).toHaveLength(5);
  });
  it.each(["source", "destination"])(
    "refuses transfer when %s has actually started, without silently assigning disqualification",
    (which) => {
      const [source, destination] = classes();
      (which === "source" ? source : destination).snapshot.startedAt =
        "2026-10-23T01:00:00.000Z";
      expect(() => transferWeight(source, destination, request)).toThrow(
        "bắt đầu",
      );
      expect(source.snapshot.entrants).toHaveLength(6);
    },
  );
  it("scheduled future time is not actual start; locked draws may be rebuilt only through this exception", () => {
    const [source, destination] = classes();
    source.snapshot.status = "draw_confirmed";
    destination.snapshot.status = "draw_confirmed";
    expect(transferWeight(source, destination, request).source.status).toBe(
      "draft",
    );
  });
  it("uses integer tenths: exact 3 kg allowed, 3.1 kg refused", () => {
    const [source, destination] = classes();
    expect(weightTenths("41.1")).toBe(411);
    expect(
      transferWeight(source, destination, request).destination.entrants,
    ).toHaveLength(6);
    expect(() =>
      transferWeight(source, destination, { ...request, officialKg: "40.9" }),
    ).toThrow("3 kg");
    expect(() =>
      transferWeight(source, destination, { ...request, officialKg: "47.1" }),
    ).toThrow();
    expect(() => weightTenths("41.01")).toThrow();
    expect(() => weightTenths("0")).toThrow();
  });
  it("supports a zero lower boundary and an open upper weight class", () => {
    const [source, destination] = classes();
    source.lowerKg = "0";
    destination.upperKg = null;
    expect(
      transferWeight(source, destination, { ...request, officialKg: "60.0" })
        .destination.entrants,
    ).toHaveLength(6);
  });
  it("requires official weighing and leader decision", () => {
    const [source, destination] = classes();
    for (const input of [
      { ...request, officialWeightVerified: false },
      { ...request, leaderConfirmed: false },
      { ...request, reason: " " },
    ])
      expect(() => transferWeight(source, destination, input)).toThrow(
        "tổ trưởng",
      );
  });
  it("checks adjacent class, edition, sport, quota and both versions", () => {
    let [source, destination] = classes();
    destination.transferGroupId = "other-sex-or-age-group";
    expect(() => transferWeight(source, destination, request)).toThrow();
    [source, destination] = classes();
    destination.index = 2;
    expect(() => transferWeight(source, destination, request)).toThrow(
      "liền kề",
    );
    [source, destination] = classes();
    destination.snapshot.editionId = "other";
    expect(() => transferWeight(source, destination, request)).toThrow();
    [source, destination] = classes();
    destination.snapshot.sportId = "other";
    expect(() => transferWeight(source, destination, request)).toThrow();
    [source, destination] = classes();
    destination.schoolQuota = 2;
    expect(() => transferWeight(source, destination, request)).toThrow(
      "hết suất",
    );
    [source, destination] = classes();
    expect(() =>
      transferWeight(source, destination, {
        ...request,
        destinationVersion: 2,
      }),
    ).toThrow("Phiên bản");
    expect(() =>
      transferWeight(source, destination, { ...request, sourceVersion: 2 }),
    ).toThrow("Phiên bản");
  });
  it("cancels a source that drops below three entrants", () => {
    const [source, destination] = classes(3, 3);
    const result = transferWeight(source, destination, request);
    expect(result.source.status).toBe("cancelled");
    expect(result.source.draw).toBeNull();
    expect(result.archive.source.entrants).toHaveLength(3);
  });
  it("cancels for insufficient schools even when five entrants remain", () => {
    const [source, destination] = classes();
    source.snapshot.entrants = source.snapshot.entrants.map((e, i) => ({
      ...e,
      schoolId: i === 0 ? "school-0" : "school-1",
    }));
    source.snapshot.draw = createDraw(
      "source",
      source.snapshot.entrants,
      "individual_combat",
    );
    expect(transferWeight(source, destination, request).source.status).toBe(
      "cancelled",
    );
  });
});
const time = (hour: number, minute = 0) =>
  `2026-10-23T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`;
function item(id = "m1"): ScheduleItem {
  return {
    id,
    eventId: "event-a",
    sportId: "sport-a",
    venueId: "venue-a",
    start: time(1),
    end: time(1, 20),
    participantPersonIds: ["p1", "p2"],
    refereePersonIds: ["r1"],
    restMinutes: 10,
    dependsOnIds: [],
  };
}
describe("C04 global schedule conflicts and proposals", () => {
  it("detects venue/person conflicts across sports, including referee-as-participant", () => {
    const first = item();
    const second = {
      ...item("m2"),
      eventId: "event-b",
      sportId: "sport-b",
      participantPersonIds: ["r1", "p3"],
      refereePersonIds: ["r2"],
    };
    expect(
      scheduleConflicts([first, second])
        .map((c) => c.kind)
        .sort(),
    ).toEqual(["person", "venue"]);
  });
  it("handles exact boundary, configured rest, and distinct venues independently", () => {
    const first = item();
    const second = {
      ...item("m2"),
      venueId: "venue-b",
      start: time(1, 20),
      end: time(1, 40),
    };
    expect(scheduleConflicts([first, second]).map((c) => c.kind)).toEqual([
      "rest",
    ]);
    expect(
      scheduleConflicts([
        first,
        { ...second, start: time(1, 30), end: time(1, 50) },
      ]),
    ).toEqual([]);
    expect(
      scheduleConflicts([
        first,
        { ...second, participantPersonIds: ["p3"], refereePersonIds: ["r2"] },
      ]),
    ).toEqual([]);
  });
  it("checks predecessors, missing references, invalid time and duplicate IDs", () => {
    expect(
      scheduleConflicts([{ ...item(), dependsOnIds: ["missing"] }])[0]?.kind,
    ).toBe("dependency");
    expect(() => scheduleConflicts([item(), item()])).toThrow("trùng");
    expect(() =>
      scheduleConflicts([{ ...item(), start: "2026-02-30T01:00:00.000Z" }]),
    ).toThrow();
    expect(() => scheduleConflicts([{ ...item(), end: time(0) }])).toThrow();
  });
  it("proposes a conflict-free schedule even if dependencies are submitted out of order", () => {
    const task = (id: string, dependsOnIds: string[]): ScheduleTask => ({
      id,
      eventId: "event-a",
      sportId: "sport-a",
      participantPersonIds: ["p1", "p2"],
      refereePersonIds: ["r1"],
      restMinutes: 10,
      dependsOnIds,
      durationMinutes: 20,
      venueIds: ["venue-a", "venue-b"],
    });
    const proposal = proposeSchedule(
      [task("final", ["semi"]), task("semi", [])],
      [item()],
      { start: time(1), end: time(4) },
    );
    expect(proposal.map((p) => p.id)).toEqual(["semi", "final"]);
    expect(scheduleConflicts([item(), ...proposal])).toEqual([]);
    expect(proposal[0]!.start).toBe(time(1, 30));
    expect(proposal[1]!.start).toBe(time(2));
  });
  it("refuses exhausted windows, missing predecessors and dependency cycles", () => {
    const task: ScheduleTask = {
      ...item("new"),
      venueIds: ["venue-a"],
      durationMinutes: 20,
    };
    expect(() =>
      proposeSchedule([task], [item()], { start: time(1), end: time(1, 30) }),
    ).toThrow("Không tìm");
    expect(() =>
      proposeSchedule([{ ...task, dependsOnIds: ["missing"] }], [], {
        start: time(1),
        end: time(4),
      }),
    ).toThrow("phụ thuộc");
    expect(() =>
      proposeSchedule(
        [
          { ...task, id: "a", dependsOnIds: ["b"] },
          { ...task, id: "b", dependsOnIds: ["a"] },
        ],
        [],
        { start: time(1), end: time(4) },
      ),
    ).toThrow("phụ thuộc");
  });
  it("requires fresh version and emits a notification intent for a valid revision", () => {
    const old = { version: 3, items: [item()] };
    const revised = reviseSchedule(old, 3, [
      { ...item(), venueId: "new-venue" },
    ]);
    expect(revised.snapshot.version).toBe(4);
    expect(revised.notification.changedItemIds).toEqual(["m1"]);
    expect(() => reviseSchedule(old, 2, [item()])).toThrow("Phiên bản");
    expect(() => reviseSchedule(old, 3, [item(), item("m2")])).toThrow(
      "xung đột",
    );
  });
});
describe("C08 lanes and heats", () => {
  it("assigns every entrant once, splits heats, permits validated leader edits", () => {
    const entrants = ["a", "b", "c", "d", "e"];
    const lanes = assignLanes(entrants, 2);
    expect(lanes.map((row) => [row.heat, row.lane])).toEqual([
      [1, 1],
      [1, 2],
      [2, 1],
      [2, 2],
      [3, 1],
    ]);
    expect(() => validateLanes(entrants, lanes, 2)).not.toThrow();
    expect(() =>
      validateLanes(
        entrants,
        lanes.map((row) => (row.entrantId === "e" ? { ...row, heat: 4 } : row)),
        2,
      ),
    ).not.toThrow();
  });
  it("rejects duplicate/missing entrants, duplicate lanes and out-of-range lanes", () => {
    expect(() => assignLanes(["a", "a"], 2)).toThrow();
    expect(() => assignLanes(["a"], 0)).toThrow();
    expect(() =>
      validateLanes(
        ["a", "b"],
        [
          { entrantId: "a", heat: 1, lane: 1 },
          { entrantId: "b", heat: 1, lane: 1 },
        ],
        2,
      ),
    ).toThrow("Trùng");
    expect(() =>
      validateLanes(["a", "b"], [{ entrantId: "a", heat: 1, lane: 1 }], 2),
    ).toThrow("đủ");
  });
});
