import "fake-indexeddb/auto";
import { randomUUID } from "node:crypto";
import { describe, it, expect, vi } from "vitest";
import {
  IndexedDbQueue,
  assertReceipt,
  flushQueue,
  type QueueStore,
  type SyncReceipt,
} from "../packages/offline/src/browser.js";
import { input, scope, TestInboxStore } from "./group-i-fixtures.js";
import { receiveOffline } from "../packages/offline/src/index.js";
import { clock } from "./group-k-fixtures.js";
const open = () => IndexedDbQueue.open(indexedDB, randomUUID());
const receipt = (
  op: string,
  status: SyncReceipt["status"] = "conflict",
): SyncReceipt => ({
  operation_id: op,
  status,
  submission_id: status === "accepted" ? randomUUID() : null,
});
describe("I01 durable local queue", () => {
  it("survives close/reopen and preserves base versions, assignment and operation ID", async () => {
    const name = randomUUID(),
      q = await IndexedDbQueue.open(indexedDB, name),
      r = input();
    await q.append(scope, r);
    q.close();
    const reopened = await IndexedDbQueue.open(indexedDB, name);
    expect((await reopened.list(scope))[0]).toEqual({
      scope,
      submission: r,
      receipt: null,
    });
    reopened.close();
  });
  it("separates actors and editions", async () => {
    const q = await open(),
      r = input();
    await q.append(scope, r);
    expect(await q.list({ ...scope, actorId: randomUUID() })).toEqual([]);
    expect(await q.list({ ...scope, editionId: randomUUID() })).toEqual([]);
    q.close();
  });
  it("rejects editing the same operation ID and retains both distinct revisions", async () => {
    const q = await open(),
      r = input();
    await q.append(scope, r);
    const changed = structuredClone(r);
    changed.submission.reason = "new revision";
    await expect(q.append(scope, changed)).rejects.toThrow();
    await q.append(scope, { ...changed, operation_id: randomUUID() });
    expect(await q.list(scope)).toHaveLength(2);
    expect(
      (await q.list(scope)).find(
        (x) => x.submission.operation_id === r.operation_id,
      )?.submission,
    ).toEqual(r);
    q.close();
  });
  it("concurrent tabs persist only one immutable operation", async () => {
    const name = randomUUID(),
      a = await IndexedDbQueue.open(indexedDB, name),
      b = await IndexedDbQueue.open(indexedDB, name),
      r = input();
    await Promise.all([a.append(scope, r), b.append(scope, r)]);
    expect(await a.list(scope)).toHaveLength(1);
    a.close();
    b.close();
  });
  it("clones before a caller can mutate an in-flight write", async () => {
    const q = await open(),
      r = input(),
      original = structuredClone(r);
    const saved = q.append(scope, r);
    r.submission.reason = "not saved";
    await saved;
    expect((await q.list(scope))[0]?.submission).toEqual(original);
    q.close();
  });
  it("storage quota failure is unsaved, never replaced with volatile success", async () => {
    const q = await open();
    const spy = vi
      .spyOn(IDBObjectStore.prototype, "add")
      .mockImplementation(() => {
        throw new DOMException("synthetic quota failure", "QuotaExceededError");
      });
    try {
      await expect(q.append(scope, input())).rejects.toThrow(
        "synthetic quota failure",
      );
    } finally {
      spy.mockRestore();
    }
    expect(await q.list(scope)).toHaveLength(0);
    q.close();
  });
  it("rejects unknown fields rather than storing tokens/profile data", async () => {
    const q = await open();
    const bad = { ...input(), token: "synthetic" };
    await expect(q.append(scope, bad)).rejects.toThrow(
      "INVALID_SYNC_SUBMISSION",
    );
    expect(await q.list(scope)).toHaveLength(0);
    q.close();
  });
  it("failed network keeps exact content and operation ID for reconnect", async () => {
    const q = await open(),
      r = input();
    await q.append(scope, r);
    expect(
      await flushQueue(
        q,
        scope,
        () => scope,
        async () => {
          throw Error("network");
        },
      ),
    ).toEqual({ acknowledged: 0, paused: true });
    expect((await q.list(scope))[0]).toEqual({
      scope,
      submission: r,
      receipt: null,
    });
    q.close();
  });
  it("timeout is bounded even if transport ignores abort", async () => {
    const q = await open();
    await q.append(scope, input());
    expect(
      await flushQueue(
        q,
        scope,
        () => scope,
        () => new Promise(() => {}),
        10,
      ),
    ).toEqual({ acknowledged: 0, paused: true });
    expect((await q.list(scope))[0]?.receipt).toBeNull();
    q.close();
  });
  it.each(["before", "during"])(
    "account switch %s sending cannot acknowledge another account",
    async (phase) => {
      const q = await open();
      await q.append(scope, input());
      let current = phase === "before" ? null : scope;
      const send = vi.fn(async (_scope, r) => {
        current = null;
        return receipt(r.operation_id);
      });
      await flushQueue(q, scope, () => current, send);
      expect(send).toHaveBeenCalledTimes(phase === "before" ? 0 : 1);
      expect((await q.list(scope))[0]?.receipt).toBeNull();
      q.close();
    },
  );
  it("rejects receipts for another operation or malformed receipts", async () => {
    const q = await open(),
      r = input();
    await q.append(scope, r);
    for (const value of [
      receipt(randomUUID()),
      { ...receipt(r.operation_id), status: "confirmed" },
      {
        ...receipt(r.operation_id),
        status: "accepted",
        submission_id: "invalid-uuid",
      },
    ]) {
      expect(
        (
          await flushQueue(
            q,
            scope,
            () => scope,
            async () => value,
          )
        ).acknowledged,
      ).toBe(0);
    }
    expect((await q.list(scope))[0]?.receipt).toBeNull();
    q.close();
  });
  it.each(["accepted", "review_required", "conflict", "rejected"] as const)(
    "keeps original payload after %s receipt and skips retry",
    async (status) => {
      const q = await open(),
        r = input();
      await q.append(scope, r);
      const send = vi.fn(async () => receipt(r.operation_id, status));
      expect((await flushQueue(q, scope, () => scope, send)).acknowledged).toBe(
        1,
      );
      await flushQueue(q, scope, () => scope, send);
      expect(send).toHaveBeenCalledTimes(1);
      expect((await q.list(scope))[0]?.submission).toEqual(r);
      q.close();
    },
  );
  it("receipt write failure retries original operation against server without duplicates", async () => {
    const q = await open(),
      r = input(),
      server = new TestInboxStore();
    await q.append(scope, r);
    const broken: QueueStore = {
      append: q.append.bind(q),
      list: q.list.bind(q),
      acknowledge: async () => {
        throw Error("disk");
      },
    };
    const send = async () => receiveOffline(server, scope, r, clock);
    expect((await flushQueue(broken, scope, () => scope, send)).paused).toBe(
      true,
    );
    expect((await q.list(scope))[0]?.receipt).toBeNull();
    expect((await flushQueue(q, scope, () => scope, send)).acknowledged).toBe(
      1,
    );
    expect(server.records).toHaveLength(1);
    expect(server.state.official).toBeNull();
    q.close();
  });
  it("cannot change a persisted receipt", async () => {
    const q = await open(),
      r = input();
    await q.append(scope, r);
    await q.acknowledge(scope, r, receipt(r.operation_id));
    await expect(
      q.acknowledge(scope, r, receipt(r.operation_id, "review_required")),
    ).rejects.toThrow();
    expect((await q.list(scope))[0]?.receipt?.status).toBe("conflict");
    q.close();
  });
});

it("I-REG-11 accepts all nullable receipt combinations allowed by A03 without inventing a narrower contract", () => {
  const op = input().operation_id;
  for (const status of [
    "accepted",
    "review_required",
    "conflict",
    "rejected",
  ] as const) {
    for (const submission_id of [null, randomUUID()])
      expect(() =>
        assertReceipt({ operation_id: op, status, submission_id }),
      ).not.toThrow();
  }
});
