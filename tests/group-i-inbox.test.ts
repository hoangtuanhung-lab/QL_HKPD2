import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import { receiveOffline } from "../packages/offline/src/index.js";
import { confirmPreview } from "@hkpd/results";
import { input, scope, TestInboxStore } from "./group-i-fixtures.js";
import { ids, leader, clock } from "./group-k-fixtures.js";
describe("I02 authoritative offline inbox", () => {
  it("accepts a pending submission only; reconnect never confirms official", async () => {
    const store = new TestInboxStore();
    const request = input();
    const r = await receiveOffline(store, scope, request, clock);
    expect(r.status).toBe("accepted");
    expect(store.state.official).toBeNull();
    expect(store.state.submissions[0]?.status).toBe("pending_confirmation");
    expect(store.records[0]?.request).toEqual(request);
  });
  it("deduplicates concurrent retries and returns same receipt", async () => {
    const store = new TestInboxStore(),
      request = input();
    const receipts = await Promise.all(
      Array.from({ length: 20 }, () =>
        receiveOffline(store, scope, request, clock),
      ),
    );
    expect(new Set(receipts.map((r) => r.submission_id)).size).toBe(1);
    expect(store.state.version).toBe(2);
    expect(store.records).toHaveLength(1);
  });
  it("keeps both device results; conflicts cannot replace the first pending result", async () => {
    const store = new TestInboxStore(),
      a = input(),
      b = input();
    b.submission.payload.entries[0]!.value = {
      kind: "score",
      scored: 4,
      conceded: 1,
    };
    expect((await receiveOffline(store, scope, a, clock)).status).toBe(
      "accepted",
    );
    expect((await receiveOffline(store, scope, b, clock)).status).toBe(
      "conflict",
    );
    expect(store.records.map((r) => r.request)).toEqual([a, b]);
    expect(store.state.submissions).toHaveLength(1);
  });
  it("changed assignment preserves payload for review without writing a match", async () => {
    const store = new TestInboxStore();
    store.actor.assignments = [];
    const r = await receiveOffline(store, scope, input(), clock);
    expect(r.status).toBe("review_required");
    expect(r.submission_id).toBeNull();
    expect(store.state.version).toBe(1);
    expect(store.records[0]?.reason).toBe("assignment_changed");
  });
  it("even a replacement current grant cannot make an obsolete snapshot current", async () => {
    const store = new TestInboxStore();
    store.current = false;
    expect((await receiveOffline(store, scope, input(), clock)).status).toBe(
      "review_required",
    );
    expect(store.state.submissions).toHaveLength(0);
  });
  it.each(["actorId", "editionId", "eventId", "sportId"] as const)(
    "does not trust a historical snapshot with foreign %s",
    async (field) => {
      const store = new TestInboxStore();
      store.snapshot[field] = randomUUID();
      await expect(
        receiveOffline(store, scope, input(), clock),
      ).rejects.toThrow("NOT_FOUND");
      expect(store.records).toHaveLength(0);
    },
  );
  it("rejects a snapshot that never had result submission permission", async () => {
    const store = new TestInboxStore();
    store.snapshot.maySubmit = false;
    await expect(receiveOffline(store, scope, input(), clock)).rejects.toThrow(
      "NOT_FOUND",
    );
  });
  it("rechecks account authorization before returning a cached receipt", async () => {
    const store = new TestInboxStore(),
      request = input();
    await receiveOffline(store, scope, request, clock);
    store.actor.approved = false;
    await expect(receiveOffline(store, scope, request, clock)).rejects.toThrow(
      "FORBIDDEN",
    );
  });
  it("operation ID cannot be reused for modified content", async () => {
    const store = new TestInboxStore(),
      request = input();
    await receiveOffline(store, scope, request, clock);
    request.submission.reason = "changed";
    await expect(receiveOffline(store, scope, request, clock)).rejects.toThrow(
      "IDEMPOTENCY_CONFLICT",
    );
    expect(store.records).toHaveLength(1);
  });
  it("rolls back pending submission when inbox/audit receipt persistence fails", async () => {
    const store = new TestInboxStore();
    store.failInsert = true;
    const request = input();
    await expect(
      receiveOffline(store, scope, request, clock),
    ).rejects.toThrow();
    expect(store.state.version).toBe(1);
    expect(store.records).toHaveLength(0);
    store.failInsert = false;
    expect((await receiveOffline(store, scope, request, clock)).status).toBe(
      "accepted",
    );
  });
  it.each(["sources", "files"] as const)(
    "retains %s failures for review without publication",
    async (field) => {
      const store = new TestInboxStore();
      store[field] = false;
      expect((await receiveOffline(store, scope, input(), clock)).status).toBe(
        "review_required",
      );
      expect(store.state.official).toBeNull();
    },
  );
  it("keeps invalid scores and locked-match input for review", async () => {
    for (const locked of [false, true]) {
      const store = new TestInboxStore();
      store.state.locked = locked;
      const r = input();
      r.submission.payload.entries[0]!.value = {
        kind: "time",
        seconds: "1.25",
      };
      expect((await receiveOffline(store, scope, r, clock)).status).toBe(
        "review_required",
      );
      expect(store.records[0]?.request).toEqual(r);
    }
  });
  it("does not discard a pending submission after official results advance", async () => {
    const store = new TestInboxStore();
    const first = await receiveOffline(store, scope, input(), clock);
    store.state = confirmPreview(
      store.state,
      {
        submission_id: first.submission_id!,
        submission_version: 1,
        base_official_version: 0,
      },
      leader.id,
      clock(),
      randomUUID(),
    );
    const oldOfficial = structuredClone(store.state.official);
    const stale = input();
    stale.base_version = store.state.version;
    expect((await receiveOffline(store, scope, stale, clock)).status).toBe(
      "conflict",
    );
    expect(store.state.official).toEqual(oldOfficial);
  });
  it("rejects malformed payload before storing unknown/PII fields", async () => {
    const store = new TestInboxStore();
    const bad = { ...input(), token: "synthetic" };
    await expect(receiveOffline(store, scope, bad, clock)).rejects.toThrow(
      "INVALID_SYNC_SUBMISSION",
    );
    expect(store.records).toHaveLength(0);
  });
  it("rejects wrong edition and unauthenticated actors", async () => {
    const store = new TestInboxStore();
    await expect(
      receiveOffline(
        store,
        { ...scope, editionId: randomUUID() },
        input(),
        clock,
      ),
    ).rejects.toThrow("NOT_FOUND");
    await expect(
      receiveOffline(store, { ...scope, actorId: ids.admin }, input(), clock),
    ).rejects.toThrow("FORBIDDEN");
  });
});
it("active online lease places offline input in conflict rather than stealing the writer", async () => {
  const store = new TestInboxStore();
  store.state.lease = {
    actorId: ids.ref,
    sessionId: "synthetic",
    token: "synthetic",
    expiresAt: "2026-10-11T00:00:30Z",
  };
  const before = structuredClone(store.state);
  expect((await receiveOffline(store, scope, input(), clock)).status).toBe(
    "conflict",
  );
  expect(store.state).toEqual(before);
});
it("invalid generated receipt ID fails before any write", async () => {
  const store = new TestInboxStore();
  for (const badId of ["invalid", null]) {
    await expect(
      receiveOffline(
        store,
        scope,
        input(),
        clock,
        () => badId as unknown as string,
      ),
    ).rejects.toThrow("INVALID_SYNC_RECEIPT");
  }
  expect(store.state.version).toBe(1);
  expect(store.records).toHaveLength(0);
});
