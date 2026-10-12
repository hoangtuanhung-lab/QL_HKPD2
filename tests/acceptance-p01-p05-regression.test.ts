import { describe, expect, it } from "vitest";
import {
  drawFromApproved,
  transferFromOfficial,
  type CompetitionTransaction,
  type WeightTransferTransaction,
  type WeightClass,
} from "../packages/competition/src/index.js";
import {
  deliver,
  type DeliveryTransaction,
  type Event,
} from "../packages/foundation/src/index.js";
import {
  reviseRegistration,
  transitionRegistration,
} from "../packages/registration/src/index.js";
import {
  finalizePublication,
  publicResults,
  publicValue,
  type Publication,
  type Official,
  type Value,
} from "../packages/results/src/index.js";
import { roster, snapshot } from "./group-c-fixtures.js";
import { athlete, registration, registry } from "./group-r-fixtures.js";

function gate() {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { wait, release };
}
describe("P-01 command snapshot before authorization await", () => {
  it("uses original draw scope, actor, version and seeds despite caller mutation", async () => {
    const pause = gate(),
      checked: string[][] = [],
      writes: unknown[] = [];
    const input = {
      actorId: "leader",
      editionId: "edition-a",
      eventId: "event-a",
      baseVersion: 1,
    };
    const options = {
      seedIds: ["e1", "e2"],
      avoidSameSchool: false,
      random: () => 0,
    };
    const store = {
      transaction: <T>(run: (tx: CompetitionTransaction) => Promise<T>) =>
        run({
          canManage: async (...args) => {
            checked.push(args);
            await pause.wait;
            return args[0] === "leader" && args[2] === "event-a";
          },
          event: async (eventId) => {
            expect(eventId).toBe("event-a");
            return snapshot(6, eventId);
          },
          approvedEntries: async (eventId) =>
            roster(6).map((e) => ({
              ...e,
              editionId: "edition-a",
              eventId,
              approvedRevisionId: `revision-${e.id}`,
            })),
          save: async (value, expected) => {
            expect(expected).toBe(1);
            writes.push(value.eventId);
          },
          audit: async (value) => {
            writes.push(value.actorId);
          },
          enqueue: async (value) => {
            writes.push(value.eventId);
          },
        }),
    };
    const result = drawFromApproved(store, input, options);
    Object.assign(input, {
      actorId: "other",
      editionId: "other",
      eventId: "other",
      baseVersion: 99,
    });
    options.seedIds.splice(0, 2, "foreign");
    options.random = () => {
      throw new Error("mutated callback");
    };
    pause.release();
    const saved = await result;
    expect(checked).toEqual([["leader", "edition-a", "event-a"]]);
    expect(writes).toEqual(["event-a", "leader", "event-a"]);
    expect(saved.draw!.seedIds).toEqual(["e1", "e2"]);
  });
  it("does not let a denied caller change actor to obtain permission", async () => {
    const pause = gate();
    let writes = 0;
    const input = {
      actorId: "denied",
      editionId: "edition-a",
      eventId: "event-a",
      baseVersion: 1,
    };
    const store = {
      transaction: <T>(run: (tx: CompetitionTransaction) => Promise<T>) =>
        run({
          canManage: async (actor) => {
            await pause.wait;
            return actor === "leader";
          },
          event: async () => snapshot(3),
          approvedEntries: async () => [],
          save: async () => {
            writes++;
          },
          audit: async () => {},
          enqueue: async () => {},
        }),
    };
    const result = drawFromApproved(store, input);
    const rejected = expect(result).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    input.actorId = "leader";
    pause.release();
    await rejected;
    expect(writes).toBe(0);
  });
  it("captures the whole official transfer command across both permissions and writes", async () => {
    const pause = gate(),
      permissions: string[][] = [],
      moves: unknown[] = [],
      archives: unknown[] = [],
      saved: string[] = [];
    const input = {
      actorId: "leader",
      editionId: "edition-a",
      sourceEventId: "source",
      destinationEventId: "destination",
      entrantId: "e1",
      sourceVersion: 1,
      destinationVersion: 1,
      reason: "Original reason",
    };
    const source: WeightClass = {
      snapshot: snapshot(3, "source"),
      sportCode: "vovinam",
      transferGroupId: "group",
      index: 0,
      lowerKg: "41",
      upperKg: "44",
      schoolQuota: 3,
    };
    const destination: WeightClass = {
      ...source,
      snapshot: {
        ...snapshot(3, "destination"),
        entrants: roster(3, 4, "d"),
        draw: null,
      },
      index: 1,
      lowerKg: "44",
      upperKg: "47",
    };
    const store = {
      transaction: <T>(run: (tx: WeightTransferTransaction) => Promise<T>) =>
        run({
          canManage: async (...args) => {
            permissions.push(args);
            await pause.wait;
            return (
              args[0] === "leader" &&
              ["source", "destination"].includes(args[2]!)
            );
          },
          weightClass: async (eventId) => {
            expect(["source", "destination"]).toContain(eventId);
            return eventId === "source" ? source : destination;
          },
          officialWeight: async (eventId, entrantId) => {
            expect([eventId, entrantId]).toEqual(["source", "e1"]);
            return {
              id: "weight",
              editionId: "edition-a",
              eventId,
              entrantId,
              kg: "41",
            };
          },
          save: async (value, expected) => {
            expect(expected).toBe(1);
            saved.push(value.eventId);
          },
          moveRegistration: async (value) => {
            moves.push(value);
            return { approvedRevisionId: "new-approval" };
          },
          archive: async (value) => {
            archives.push(value);
          },
          invalidateSchedules: async (values) => {
            expect(values).toEqual(["source", "destination"]);
          },
          enqueue: async (value) => {
            expect(value.editionId).toBe("edition-a");
          },
        }),
    };
    const result = transferFromOfficial(store, input, { random: () => 0 });
    Object.assign(input, {
      actorId: "other",
      editionId: "other",
      sourceEventId: "other-source",
      destinationEventId: "other-target",
      entrantId: "other-athlete",
      sourceVersion: 9,
      destinationVersion: 9,
      reason: "Changed",
    });
    pause.release();
    const outcome = await result;
    expect(permissions).toEqual([
      ["leader", "edition-a", "source"],
      ["leader", "edition-a", "destination"],
    ]);
    expect(saved).toEqual(["source", "destination"]);
    expect(moves).toEqual([
      {
        actorId: "leader",
        entrantId: "e1",
        sourceEventId: "source",
        destinationEventId: "destination",
        reason: "Original reason",
      },
    ]);
    expect(archives[0]).toMatchObject({
      actorId: "leader",
      entrantId: "e1",
      reason: "Original reason",
    });
    expect(outcome.destination.approvedRoster).toContainEqual({
      entrantId: "e1",
      revisionId: "new-approval",
    });
  });
});

describe("P-02 event identity remains stable across delivery awaits", () => {
  it("handles and marks the checked original event once, even when caller changes all fields", async () => {
    const pause = gate(),
      processed = new Set<string>(),
      checked: string[] = [],
      handled: Event[] = [];
    const store = {
      transaction: <T>(run: (tx: DeliveryTransaction) => Promise<T>) =>
        run({
          hasProcessed: async (_consumer, id) => {
            checked.push(id);
            await pause.wait;
            return processed.has(id);
          },
          markProcessed: async (_consumer, id) => {
            processed.add(id);
          },
        }),
    };
    const event = {
      id: "original",
      editionId: "edition",
      resourceId: "match",
      type: "Synthetic",
      version: 1,
    };
    const original = structuredClone(event);
    const receive = async (_tx: DeliveryTransaction, value: Event) => {
      expect(Object.isFrozen(value)).toBe(true);
      handled.push(structuredClone(value));
    };
    const result = deliver(store, "consumer", event, receive);
    Object.assign(event, {
      id: "changed",
      editionId: "other",
      resourceId: "other",
      type: "Changed",
      version: 2,
    });
    pause.release();
    expect(await result).toBe("processed");
    expect(handled).toEqual([original]);
    expect([...processed]).toEqual(["original"]);
    expect(await deliver(store, "consumer", original, receive)).toBe(
      "duplicate",
    );
    expect(handled).toHaveLength(1);
    expect(checked).toEqual(["original", "original"]);
  });
  it("rejects handler mutation without marking a mismatched event processed", async () => {
    const marked: string[] = [];
    const store = {
      transaction: <T>(run: (tx: DeliveryTransaction) => Promise<T>) =>
        run({
          hasProcessed: async () => false,
          markProcessed: async (_c, id) => {
            marked.push(id);
          },
        }),
    };
    await expect(
      deliver(
        store,
        "consumer",
        {
          id: "original",
          editionId: "edition",
          resourceId: "match",
          type: "Synthetic",
          version: 1,
        },
        async (_tx, event) => {
          event.id = "changed";
        },
      ),
    ).rejects.toThrow(TypeError);
    expect(marked).toEqual([]);
  });
});

describe("P-03 registration CAS versions", () => {
  it.each([
    -1,
    0,
    0.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER + 1,
  ])(
    "rejects matching invalid actual/expected %s in both mutation helpers",
    (version) => {
      const r = registration("r", "a");
      r.version = version;
      const before = structuredClone(r);
      expect(() =>
        reviseRegistration(
          r,
          "next",
          { kind: "athlete", athleteId: "a" },
          version,
        ),
      ).toThrow("phiên bản");
      expect(() =>
        transitionRegistration(
          registry(),
          r,
          "submit",
          version,
          new Date("2026-10-12T00:00:00Z"),
        ),
      ).toThrow("phiên bản");
      expect(r).toEqual(before);
    },
  );
  it("retains valid revise/submit/approve/return and stale CAS behavior", () => {
    const state = registry();
    state.athletes = [athlete("a")];
    const r = registration("r", "a");
    state.registrations = [r];
    const now = new Date("2026-10-12T00:00:00Z");
    const revised = reviseRegistration(
      r,
      "next",
      { kind: "athlete", athleteId: "a" },
      1,
    );
    const submitted = transitionRegistration(state, revised, "submit", 2, now);
    expect(submitted.version).toBe(3);
    expect(
      transitionRegistration(state, submitted, "approve", 3, now)
        .approvedRevisionId,
    ).toBe("next");
    expect(
      transitionRegistration(
        state,
        submitted,
        "return",
        3,
        now,
        "Review",
      ).revisions.at(-1)!.status,
    ).toBe("returned");
    expect(() =>
      reviseRegistration(r, "next", { kind: "athlete", athleteId: "a" }, 2),
    ).toThrow("phiên bản");
    const terminal = { ...r, version: Number.MAX_SAFE_INTEGER - 1 };
    expect(
      reviseRegistration(
        terminal,
        "next",
        { kind: "athlete", athleteId: "a" },
        terminal.version,
      ).version,
    ).toBe(Number.MAX_SAFE_INTEGER);
  });
});

const publication: Publication = {
  id: "publication",
  editionId: "edition",
  version: 1,
  status: "provisional",
  sourceVersions: { match: 1 },
};
describe("P-04 publication requires true boolean readiness", () => {
  it.each(["false", "true", 1, 0, null, undefined, false])(
    "rejects readiness field %s even when the other is true",
    (value) => {
      for (const field of ["rankingsResolved", "allResultsConfirmed"]) {
        expect(() =>
          finalizePublication(publication, { match: 1 }, 1, {
            rankingsResolved: true,
            allResultsConfirmed: true,
            [field]: value,
          } as never),
        ).toThrow("Chưa đủ");
      }
      expect(publication.status).toBe("provisional");
    },
  );
  it("requires both flags and preserves source/version guards", () => {
    expect(() =>
      finalizePublication(publication, { match: 1 }, 1, null as never),
    ).toThrow("Chưa đủ");
    expect(
      finalizePublication(publication, { match: 1 }, 1, {
        rankingsResolved: true,
        allResultsConfirmed: true,
      }).status,
    ).toBe("finalized");
    expect(() =>
      finalizePublication(publication, { match: 2 }, 1, {
        rankingsResolved: true,
        allResultsConfirmed: true,
      }),
    ).toThrow("Nguồn bảng");
  });
});
const official = (value: Value): Official => ({
  id: "official",
  edition_id: "edition",
  match_id: "match",
  version: 1,
  submission_id: "submission",
  submission_version: 1,
  confirmed_by: "leader",
  confirmed_at: "2026-10-12T00:00:00.000Z",
  payload: {
    rule_snapshot_id: "rule",
    entries: [
      { participant: { kind: "athlete", athlete_id: "athlete" }, value },
    ],
    file_ids: [],
  },
});
const labels = {
  athlete: {
    eventLabel: "Synthetic",
    athleteCode: "01.001",
    displayName: "Synthetic",
    schoolLabel: "Synthetic",
  },
};
describe("P-05 public value fails closed", () => {
  it.each([
    { kind: "unsupported" },
    null,
    undefined,
    [],
    { kind: "sets", sets: [] },
    { kind: "sets", sets: [null] },
    { kind: "score", scored: -1, conceded: 0 },
    { kind: "time" },
  ])("rejects malformed persisted public value %j", (value) => {
    expect(() =>
      publicResults(
        { ...publication, status: "finalized" },
        official(value as never),
        labels,
      ),
    ).toThrow();
  });
  it("rejects sparse sets instead of emitting holes", () => {
    expect(() =>
      publicValue({ kind: "sets", sets: new Array(1) } as never),
    ).toThrow("Dòng hiệp");
  });
  it.each([
    { kind: "time", seconds: "12.340" },
    { kind: "distance", metres: "5.010" },
    { kind: "points", points: "-0.50" },
    { kind: "score", scored: 2, conceded: 1 },
    { kind: "sets", sets: [{ scored: 11, conceded: 9 }] },
    { kind: "cards", yellow: 1, red: 0 },
    { kind: "external_rank", rank: 1 },
  ] satisfies Value[])(
    "preserves supported value $kind and excludes private extra fields",
    (value) => {
      const stored = { ...value, secret: "must-not-leak" };
      const rows = publicResults(
        { ...publication, status: "finalized" },
        official(stored),
        labels,
      );
      expect(rows[0]!.value).toEqual(value);
      expect(JSON.stringify(rows)).not.toContain("must-not-leak");
      expect(JSON.parse(JSON.stringify(rows))[0]).toHaveProperty("value");
    },
  );
});
