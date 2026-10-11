import { describe, expect, it } from "vitest";
import {
  drawFromApproved,
  type CompetitionTransaction,
  type CompetitionSnapshot,
  type ApprovedEntry,
} from "../packages/competition/src/index.js";
import { roster, random, snapshot } from "./group-c-fixtures.js";
class Store {
  state: { event: CompetitionSnapshot; audits: number; events: number } = {
    event: { ...snapshot(3), entrants: [], draw: null },
    audits: 0,
    events: 0,
  };
  entries: ApprovedEntry[] = roster(6).map((e) => ({
    ...e,
    eventId: "event-a",
    editionId: "edition-a",
    approvedRevisionId: "approved-revision",
  }));
  permission = true;
  failure = "";
  async transaction<T>(
    run: (tx: CompetitionTransaction) => Promise<T>,
  ): Promise<T> {
    const draft = structuredClone(this.state);
    const result = await run({
      canManage: async () => this.permission,
      event: async () => draft.event,
      approvedEntries: async () => this.entries,
      save: async (event, expected) => {
        if (draft.event.version !== expected) throw new Error("CAS failure");
        draft.event = event;
      },
      audit: async () => {
        if (this.failure === "audit") throw new Error();
        draft.audits++;
      },
      enqueue: async () => {
        if (this.failure === "outbox") throw new Error();
        draft.events++;
      },
    });
    this.state = draft;
    return result;
  }
}
const input = {
  actorId: "leader-a",
  editionId: "edition-a",
  eventId: "event-a",
  baseVersion: 1,
};
describe("C10 authoritative approved-roster port integration, test adapter only", () => {
  it("uses approved entries and writes draw/audit/outbox together", async () => {
    const store = new Store();
    const result = await drawFromApproved(store, input, { random: random(10) });
    expect(result.draw?.format).toBe("knockout");
    expect(result.entrants).toHaveLength(6);
    expect(store.state).toMatchObject({ audits: 1, events: 1 });
    expect(result.entrants[0]).not.toHaveProperty("approvedRevisionId");
  });
  it.each([
    "permission",
    "edition",
    "entryScope",
    "approval",
    "locked",
    "version",
    "schoolCount",
  ])("rejects %s before writing", async (condition) => {
    const store = new Store();
    let command = input;
    if (condition === "permission") store.permission = false;
    if (condition === "edition") command = { ...input, editionId: "edition-b" };
    if (condition === "entryScope") store.entries[0]!.eventId = "other";
    if (condition === "approval") store.entries[0]!.approvedRevisionId = "";
    if (condition === "locked") store.state.event.status = "draw_confirmed";
    if (condition === "version") command = { ...input, baseVersion: 2 };
    if (condition === "schoolCount")
      store.entries = store.entries.map((e) => ({
        ...e,
        schoolId: "only-one-school",
      }));
    await expect(drawFromApproved(store, command)).rejects.toThrow();
    expect(store.state.event.draw).toBeNull();
    expect(store.state.audits).toBe(0);
    expect(store.state.events).toBe(0);
  });
  it.each(["audit", "outbox"])(
    "rolls back all test-adapter writes when %s fails",
    async (step) => {
      const store = new Store();
      store.failure = step;
      await expect(drawFromApproved(store, input)).rejects.toThrow();
      expect(store.state.event.version).toBe(1);
      expect(store.state.event.draw).toBeNull();
      expect(store.state.audits).toBe(0);
    },
  );
});

import {
  transferFromOfficial,
  createDraw,
  type WeightClass,
  type WeightTransferTransaction,
  type OfficialWeightRecord,
} from "../packages/competition/src/index.js";
class TransferStore {
  state: {
    classes: Map<string, WeightClass>;
    moved: number;
    archives: number;
    invalidated: readonly string[];
    events: number;
  };
  allow = true;
  failure = "";
  weight: OfficialWeightRecord | null = {
    id: "official-weigh-in",
    eventId: "source",
    editionId: "edition-a",
    entrantId: "e1",
    kg: "41.0",
  };
  constructor() {
    const source = snapshot(6, "source");
    const destination = snapshot(5, "destination");
    source.approvedRoster = source.entrants.map((e) => ({
      entrantId: e.id,
      revisionId: "source-approval",
    }));
    destination.entrants = roster(5, 4, "d");
    destination.draw = createDraw(
      "destination",
      destination.entrants,
      "individual_combat",
    );
    this.state = {
      classes: new Map([
        [
          "source",
          {
            snapshot: source,
            sportCode: "vovinam",
            transferGroupId: "combat-group-a",
            index: 0,
            lowerKg: "41",
            upperKg: "44",
            schoolQuota: 3,
          },
        ],
        [
          "destination",
          {
            snapshot: destination,
            sportCode: "vovinam",
            transferGroupId: "combat-group-a",
            index: 1,
            lowerKg: "44",
            upperKg: "47",
            schoolQuota: 3,
          },
        ],
      ]),
      moved: 0,
      archives: 0,
      invalidated: [],
      events: 0,
    };
  }
  async transaction<T>(
    run: (tx: WeightTransferTransaction) => Promise<T>,
  ): Promise<T> {
    const draft = structuredClone(this.state);
    const fail = (step: string) => {
      if (this.failure === step) throw new Error("test failure");
    };
    const result = await run({
      canManage: async () => this.allow,
      weightClass: async (id) => draft.classes.get(id)!,
      officialWeight: async () => this.weight,
      moveRegistration: async () => {
        fail("registration");
        draft.moved++;
        return { approvedRevisionId: "target-approval" };
      },
      save: async (value, expected) => {
        fail(value.eventId);
        const target = draft.classes.get(value.eventId)!;
        if (target.snapshot.version !== expected) throw new Error("CAS");
        target.snapshot = value;
      },
      archive: async () => {
        fail("archive");
        draft.archives++;
      },
      invalidateSchedules: async (ids) => {
        fail("schedule");
        draft.invalidated = ids;
      },
      enqueue: async () => {
        fail("outbox");
        draft.events++;
      },
    });
    this.state = draft;
    return result;
  }
}
const transferInput = {
  actorId: "leader-a",
  editionId: "edition-a",
  sourceEventId: "source",
  destinationEventId: "destination",
  entrantId: "e1",
  sourceVersion: 1,
  destinationVersion: 1,
  reason: "Quyết định thử",
};
describe("C05/C10 transfer port reads official records and commits two classes", () => {
  it("moves approved registration, preserves audit history, invalidates both schedules in the test adapter", async () => {
    const store = new TransferStore();
    const result = await transferFromOfficial(store, transferInput);
    expect(result.source.draw?.format).toBe("round_robin");
    expect(result.destination.draw?.format).toBe("knockout");
    expect(store.state).toMatchObject({
      moved: 1,
      archives: 1,
      events: 1,
      invalidated: ["source", "destination"],
    });
    expect(
      result.source.approvedRoster?.some((ref) => ref.entrantId === "e1"),
    ).toBe(false);
    expect(result.destination.approvedRoster).toContainEqual({
      entrantId: "e1",
      revisionId: "target-approval",
    });
  });
  it.each(["permission", "weightMissing", "weightScope", "edition"])(
    "refuses untrusted %s before any state change",
    async (condition) => {
      const store = new TransferStore();
      let command = transferInput;
      if (condition === "permission") store.allow = false;
      if (condition === "weightMissing") store.weight = null;
      if (condition === "weightScope") store.weight!.entrantId = "someone-else";
      if (condition === "edition") command = { ...command, editionId: "other" };
      await expect(transferFromOfficial(store, command)).rejects.toThrow();
      expect(store.state.moved).toBe(0);
      expect(store.state.classes.get("source")!.snapshot.entrants).toHaveLength(
        6,
      );
    },
  );
  it.each(["registration", "destination", "archive", "schedule", "outbox"])(
    "rolls back BOTH classes and registration when %s fails",
    async (step) => {
      const store = new TransferStore();
      store.failure = step;
      await expect(
        transferFromOfficial(store, transferInput),
      ).rejects.toThrow();
      expect(store.state.moved).toBe(0);
      expect(store.state.archives).toBe(0);
      expect(store.state.events).toBe(0);
      expect(store.state.classes.get("source")!.snapshot.version).toBe(1);
      expect(store.state.classes.get("destination")!.snapshot.version).toBe(1);
      expect(store.state.classes.get("source")!.snapshot.entrants).toHaveLength(
        6,
      );
      expect(
        store.state.classes.get("destination")!.snapshot.entrants,
      ).toHaveLength(5);
    },
  );
});
