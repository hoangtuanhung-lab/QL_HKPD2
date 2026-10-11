import { describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import {
  allowed,
  executeCommand,
  deliver,
  CursorCodec,
  pageLimit,
  problem,
  type Actor,
  type Scope,
  type Command,
  type CommandStore,
  type CommandTransaction,
  type Audit,
  type Event,
  type Receipt,
  type DeliveryTransaction,
} from "../packages/foundation/src/index.js";
const actor: Actor = {
  id: "test-actor",
  approved: true,
  schoolId: "school-a",
  assignments: [
    { editionId: "edition-a", role: "school", schoolId: "school-a" },
    {
      editionId: "edition-a",
      role: "referee",
      sportId: "sport-a",
      eventIds: ["event-a"],
    },
    { editionId: "edition-a", role: "leader", sportId: "sport-b" },
  ],
};
const schoolScope: Scope = { editionId: "edition-a", schoolId: "school-a" };
const sportScope: Scope = {
  editionId: "edition-a",
  sportId: "sport-a",
  eventId: "event-a",
  participantSchoolIds: ["school-b"],
};
describe("B03/B08 policy matrix", () => {
  it.each([
    ["own school", actor, "school.write", schoolScope, true],
    [
      "other school",
      actor,
      "school.write",
      { ...schoolScope, schoolId: "school-b" },
      false,
    ],
    [
      "other edition",
      actor,
      "school.write",
      { ...schoolScope, editionId: "edition-b" },
      false,
    ],
    [
      "pending",
      { ...actor, approved: false },
      "school.write",
      schoolScope,
      false,
    ],
    ["anonymous", null, "school.write", schoolScope, false],
    ["assigned row", actor, "result.submit", sportScope, true],
    [
      "other sport",
      actor,
      "result.submit",
      { ...sportScope, sportId: "sport-b" },
      false,
    ],
    [
      "other event",
      actor,
      "result.submit",
      { ...sportScope, eventId: "event-b" },
      false,
    ],
    [
      "same school row",
      actor,
      "result.submit",
      { ...sportScope, participantSchoolIds: ["school-b", "school-a"] },
      false,
    ],
    [
      "unknown participants",
      actor,
      "result.submit",
      { ...sportScope, participantSchoolIds: undefined },
      false,
    ],
    [
      "leader same school",
      actor,
      "result.confirm",
      { ...sportScope, sportId: "sport-b", participantSchoolIds: ["school-a"] },
      true,
    ],
    ["referee cannot confirm", actor, "result.confirm", sportScope, false],
    [
      "leader cannot submit",
      actor,
      "result.submit",
      { ...sportScope, sportId: "sport-b" },
      false,
    ],
    [
      "no global admin",
      { ...actor, assignments: [{ editionId: "edition-a", role: "admin" }] },
      "result.submit",
      sportScope,
      false,
    ],
  ] as const)("%s", (_name, user, action, scope, result) =>
    expect(allowed(user, action, scope)).toBe(result),
  );
});
// Test-only serial transaction adapter. Not production persistence or proof of SQL locking.
class MemoryStore implements CommandStore {
  state = {
    version: 1,
    writes: 0,
    receipts: new Map<string, Receipt>(),
    audits: [] as Audit[],
    events: [] as Event[],
  };
  currentActor: Actor | null = actor;
  scope = schoolScope;
  failAt = "";
  private tail: Promise<unknown> = Promise.resolve();
  transaction<T>(run: (tx: CommandTransaction) => Promise<T>): Promise<T> {
    const pending = this.tail.then(async () => {
      const draft = structuredClone(this.state);
      const fail = (step: string) => {
        if (this.failAt === step) throw new Error("private database detail");
      };
      const result = await run({
        actor: async () => this.currentActor,
        target: async () => ({
          id: "resource-a",
          version: draft.version,
          scope: this.scope,
        }),
        receipt: async (key) => draft.receipts.get(key) ?? null,
        apply: async (_command, version) => {
          draft.writes++;
          draft.version = version;
          return { version };
        },
        audit: async (record) => {
          fail("audit");
          draft.audits.push(record);
        },
        enqueue: async (event) => {
          fail("outbox");
          draft.events.push(event);
        },
        saveReceipt: async (key, value) => {
          fail("receipt");
          draft.receipts.set(key, value);
        },
      });
      this.state = draft;
      return result;
    });
    this.tail = pending.catch(() => undefined);
    return pending;
  }
}
function command(): Command {
  return {
    actor,
    action: "school.write",
    editionId: "edition-a",
    method: "POST",
    path: "/registrations/test",
    key: randomUUID(),
    baseVersion: 1,
    payload: { a: 1, b: "01.012" },
  };
}
describe("B04/B05 command transaction orchestration", () => {
  it("replays canonical payload without incrementing version or duplicating audit/event", async () => {
    const store = new MemoryStore();
    const input = command();
    const first = await executeCommand(store, input);
    expect(
      await executeCommand(store, { ...input, payload: { b: "01.012", a: 1 } }),
    ).toEqual(first);
    expect(store.state.writes).toBe(1);
    expect(store.state.audits).toHaveLength(1);
    expect(store.state.events).toHaveLength(1);
  });
  it("rejects same key with changed data", async () => {
    const store = new MemoryStore();
    const input = command();
    await executeCommand(store, input);
    await expect(
      executeCommand(store, { ...input, payload: { a: 2 } }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("rejects revoked permission before replay", async () => {
    const store = new MemoryStore();
    const input = command();
    await executeCommand(store, input);
    store.currentActor = { ...actor, approved: false };
    await expect(executeCommand(store, input)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("checks authoritative scope instead of trusting body/actor assignments", async () => {
    const store = new MemoryStore();
    store.scope = { ...schoolScope, schoolId: "school-b" };
    await expect(executeCommand(store, command())).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(store.state.writes).toBe(0);
  });
  it("rejects target from another edition", async () => {
    const store = new MemoryStore();
    store.scope = { ...schoolScope, editionId: "edition-b" };
    await expect(executeCommand(store, command())).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("serializes concurrent repeats in the test adapter", async () => {
    const store = new MemoryStore();
    const input = command();
    expect(
      await Promise.all([
        executeCommand(store, input),
        executeCommand(store, input),
      ]),
    ).toEqual([{ version: 2 }, { version: 2 }]);
    expect(store.state.writes).toBe(1);
  });
  it("only one concurrent distinct command can use a version", async () => {
    const store = new MemoryStore();
    const results = await Promise.allSettled([
      executeCommand(store, command()),
      executeCommand(store, command()),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(store.state.writes).toBe(1);
    const failed = results.find((result) => result.status === "rejected");
    expect(failed?.status === "rejected" && failed.reason.code).toBe(
      "VERSION_CONFLICT",
    );
  });
  it.each(["audit", "outbox", "receipt"])(
    "rolls back every test-adapter write when %s fails",
    async (step) => {
      const store = new MemoryStore();
      store.failAt = step;
      await expect(executeCommand(store, command())).rejects.toThrow();
      expect(store.state).toMatchObject({
        version: 1,
        writes: 0,
        audits: [],
        events: [],
      });
      expect(store.state.receipts.size).toBe(0);
    },
  );
  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid base version %s",
    async (version) => {
      await expect(
        executeCommand(new MemoryStore(), {
          ...command(),
          baseVersion: version,
        }),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    },
  );
  it("never leaks unexpected error messages", () => {
    expect(
      JSON.stringify(problem(new Error("student secret token"))),
    ).not.toContain("student secret token");
    expect(problem(new Error()).status).toBe(500);
  });
});
describe("B04 opaque cursors", () => {
  const scope = {
    actorId: "a",
    editionId: "edition-a",
    operation: "listAthletes",
    filters: { school: "a", sport: "b" },
  };
  it("round trips bound scope without exposing IDs and ignores filter key ordering", () => {
    const codec = new CursorCodec(randomBytes(32));
    const token = codec.encode("private-id", scope, 100);
    expect(Buffer.from(token, "base64url").toString()).not.toContain(
      "private-id",
    );
    expect(
      codec.decode(
        token,
        { ...scope, filters: { sport: "b", school: "a" } },
        101,
      ),
    ).toBe("private-id");
  });
  it.each(["actorId", "editionId", "operation"] as const)(
    "rejects changed %s",
    (field) => {
      const codec = new CursorCodec(randomBytes(32));
      const token = codec.encode("id", scope, 100);
      expect(() =>
        codec.decode(token, { ...scope, [field]: "other" }, 101),
      ).toThrow();
    },
  );
  it("rejects altered filters, corruption, expiry and a different key", () => {
    const codec = new CursorCodec(randomBytes(32), 10);
    const token = codec.encode("id", scope, 100);
    expect(() => codec.decode(token, { ...scope, filters: {} }, 101)).toThrow();
    expect(() => codec.decode("!" + token, scope, 101)).toThrow();
    expect(() => codec.decode(token, scope, 110)).toThrow();
    expect(() =>
      new CursorCodec(randomBytes(32)).decode(token, scope, 101),
    ).toThrow();
  });
  it("caps page size without coercing arbitrary query inputs", () => {
    expect(pageLimit()).toBe(50);
    expect(pageLimit(100)).toBe(100);
    for (const value of [0, 101, 1.5, "100", null])
      expect(() => pageLimit(value)).toThrow();
  });
});
describe("B05 worker delivery", () => {
  it("deduplicates per consumer and retries after a rolled-back handler", async () => {
    let state = { processed: new Set<string>(), effects: 0 };
    type Tx = DeliveryTransaction & { effect(): void };
    const store = {
      transaction: async <R>(run: (tx: Tx) => Promise<R>) => {
        const draft = structuredClone(state);
        const result = await run({
          hasProcessed: async (c, id) => draft.processed.has(`${c}/${id}`),
          markProcessed: async (c, id) => {
            draft.processed.add(`${c}/${id}`);
          },
          effect: () => {
            draft.effects++;
          },
        });
        state = draft;
        return result;
      },
    };
    const event: Event = {
      id: randomUUID(),
      type: "school.write",
      editionId: "a",
      resourceId: "r",
      version: 2,
    };
    await expect(
      deliver(store, "projection", event, async (tx) => {
        tx.effect();
        throw new Error();
      }),
    ).rejects.toThrow();
    expect(state.effects).toBe(0);
    expect(
      await deliver(store, "projection", event, async (tx) => tx.effect()),
    ).toBe("processed");
    expect(
      await deliver(store, "projection", event, async (tx) => tx.effect()),
    ).toBe("duplicate");
    expect(
      await deliver(store, "another", event, async (tx) => tx.effect()),
    ).toBe("processed");
    expect(state.effects).toBe(2);
  });
});
