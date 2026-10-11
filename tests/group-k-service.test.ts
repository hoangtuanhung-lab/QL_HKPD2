import { describe, expect, it } from "vitest";
import {
  executeResult,
  confirmBatch,
  submitPreview,
  confirmPreview,
  winnerFromOfficial,
  validatePayload,
  scaled,
} from "../packages/results/src/index.js";
import {
  TestResultStore,
  ref,
  command,
  clock,
  ids,
  score,
  match,
} from "./group-k-fixtures.js";
async function pending(store: TestResultStore) {
  const lease = await executeResult(
    store,
    command({ type: "lease", ttlSeconds: 30 }, store.state.version),
    clock,
  );
  await executeResult(
    store,
    command(
      { type: "submit", token: lease.leaseToken!, payload: score() },
      store.state.version,
    ),
    clock,
  );
  return store.state.submissions.at(-1)!;
}
const confirmation = (store: TestResultStore) => {
  const s = store.state.submissions.at(-1)!;
  return {
    type: "confirm" as const,
    confirmation: {
      submission_id: s.id,
      submission_version: s.version,
      base_official_version: s.base_official_version,
    },
  };
};
describe("K01 server commands and K07 invalidation", () => {
  it("pending never advances; confirmation pins ID/version, then invalidates/outboxes once", async () => {
    const store = new TestResultStore();
    await pending(store);
    expect(store.state.official).toBe(null);
    expect(winnerFromOfficial(store.state)).toBe(null);
    const c = command(confirmation(store), store.state.version, ids.leader);
    await executeResult(store, c, clock);
    await executeResult(store, c, clock);
    expect(winnerFromOfficial(store.state)).toBe(`athlete:${ids.athleteA}`);
    expect(store.invalidations).toBe(1);
    expect(store.events).toHaveLength(1);
    expect(store.state.officialHistory).toHaveLength(1);
  });
  it("edits preserve old official, require reason and rejected edits do not invalidate", async () => {
    const store = new TestResultStore();
    await pending(store);
    await executeResult(
      store,
      command(confirmation(store), store.state.version, ids.leader),
      clock,
    );
    const old = structuredClone(store.state.official),
      token = store.state.lease!.token;
    await expect(
      executeResult(
        store,
        command(
          { type: "submit", token, payload: score(1, 3) },
          store.state.version,
        ),
        clock,
      ),
    ).rejects.toMatchObject({ code: "EDIT_REASON" });
    await executeResult(
      store,
      command(
        {
          type: "submit",
          token,
          payload: score(1, 3),
          reason: "Sửa theo biên bản tổng hợp",
        },
        store.state.version,
      ),
      clock,
    );
    expect(store.state.official).toEqual(old);
    const s = store.state.submissions.at(-1)!;
    await executeResult(
      store,
      command(
        {
          type: "return",
          submissionId: s.id,
          submissionVersion: s.version,
          reason: "Cần đối chiếu",
        },
        store.state.version,
        ids.leader,
      ),
      clock,
    );
    expect(store.state.official).toEqual(old);
    expect(store.invalidations).toBe(1);
  });
  it("archives every official payload/actor/time after confirmed correction", async () => {
    const store = new TestResultStore();
    await pending(store);
    await executeResult(
      store,
      command(confirmation(store), store.state.version, ids.leader),
      clock,
    );
    await executeResult(
      store,
      command(
        {
          type: "submit",
          token: store.state.lease!.token,
          payload: score(1, 3),
          reason: "Biên bản mới",
        },
        store.state.version,
      ),
      clock,
    );
    await executeResult(
      store,
      command(confirmation(store), store.state.version, ids.leader),
      clock,
    );
    expect(store.state.officialHistory.map((v) => v.version)).toEqual([1, 2]);
    expect(winnerFromOfficial(store.state)).toBe(`athlete:${ids.athleteB}`);
    expect(store.invalidations).toBe(2);
  });
  it("only referee checklist can submit, same-school referee blocked; same-school leader can confirm", async () => {
    for (const actorId of [ids.leader, ids.admin])
      await expect(
        executeResult(
          new TestResultStore(),
          command({ type: "lease", ttlSeconds: 30 }, 1, actorId),
          clock,
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const store = new TestResultStore();
    store.actors = store.actors.map((a) =>
      a.id === ids.ref ? { ...a, schoolId: "school-a" } : a,
    );
    await expect(
      executeResult(store, command({ type: "lease", ttlSeconds: 30 }), clock),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const valid = new TestResultStore();
    await pending(valid);
    await executeResult(
      valid,
      command(confirmation(valid), valid.state.version, ids.leader),
      clock,
    );
    expect(valid.state.official).toBeTruthy();
  });
  it("admin confirmation requires trusted absence/delegation and never grants score entry", async () => {
    const store = new TestResultStore();
    await pending(store);
    await expect(
      executeResult(
        store,
        command(confirmation(store), store.state.version, ids.admin),
        clock,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    store.delegation = true;
    await executeResult(
      store,
      command(confirmation(store), store.state.version, ids.admin),
      clock,
    );
    await expect(
      executeResult(
        store,
        command(
          { type: "lease", ttlSeconds: 30 },
          store.state.version,
          ids.admin,
        ),
        clock,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("one session online: same actor second device blocked, heartbeat and expiry checked", async () => {
    const store = new TestResultStore();
    const leased = await executeResult(
      store,
      command({ type: "lease", ttlSeconds: 30 }),
      clock,
    );
    await expect(
      executeResult(
        store,
        command(
          { type: "lease", ttlSeconds: 30 },
          store.state.version,
          ids.ref,
          "session-b",
        ),
        clock,
      ),
    ).rejects.toMatchObject({ code: "LEASE_CONFLICT" });
    await executeResult(
      store,
      command(
        { type: "heartbeat", token: leased.leaseToken!, ttlSeconds: 40 },
        store.state.version,
      ),
      clock,
    );
    await expect(
      executeResult(
        store,
        command(
          { type: "submit", token: leased.leaseToken!, payload: score() },
          store.state.version,
        ),
        () => new Date("2026-10-11T00:01:00Z"),
      ),
    ).rejects.toMatchObject({ code: "LEASE_CONFLICT" });
    await executeResult(
      store,
      command(
        { type: "lease", ttlSeconds: 30 },
        store.state.version,
        ids.ref,
        "session-b",
      ),
      () => new Date("2026-10-11T00:01:00Z"),
    );
    expect(store.state.lease!.sessionId).toBe("session-b");
  });
  it("blocks obsolete/unconfirmed upstream sources on submit and confirm", async () => {
    const store = new TestResultStore();
    const leased = await executeResult(
      store,
      command({ type: "lease", ttlSeconds: 30 }),
      clock,
    );
    store.sourcesCurrent = false;
    await expect(
      executeResult(
        store,
        command(
          { type: "submit", token: leased.leaseToken!, payload: score() },
          store.state.version,
        ),
        clock,
      ),
    ).rejects.toMatchObject({ code: "SOURCE_UNCONFIRMED" });
    store.sourcesCurrent = true;
    await executeResult(
      store,
      command(
        { type: "submit", token: leased.leaseToken!, payload: score() },
        store.state.version,
      ),
      clock,
    );
    store.sourcesCurrent = false;
    await expect(
      executeResult(
        store,
        command(confirmation(store), store.state.version, ids.leader),
        clock,
      ),
    ).rejects.toMatchObject({ code: "SOURCE_UNCONFIRMED" });
  });
  it("rechecks revoked permissions before cached response and rejects changed payload same key", async () => {
    const store = new TestResultStore(),
      c = command({ type: "lease", ttlSeconds: 30 });
    await executeResult(store, c, clock);
    await expect(
      executeResult(
        store,
        { ...c, operation: { type: "lease", ttlSeconds: 40 } },
        clock,
      ),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    store.actors = store.actors.map((a) => ({ ...a, approved: false }));
    await expect(executeResult(store, c, clock)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it.each(["save", "audit", "enqueue", "invalidate", "receipt"])(
    "rolls back confirmation on %s failure",
    async (step) => {
      const store = new TestResultStore();
      await pending(store);
      const before = structuredClone(store.state);
      store.failAt = step;
      await expect(
        executeResult(
          store,
          command(confirmation(store), store.state.version, ids.leader),
          clock,
        ),
      ).rejects.toThrow();
      expect(store.state).toEqual(before);
      expect(store.events).toEqual([]);
      expect(store.invalidations).toBe(0);
    },
  );
  it("batch returns per-item outcomes and never replaces a valid result with failed item", async () => {
    const store = new TestResultStore();
    await pending(store);
    const result = await confirmBatch(
      store,
      [
        command(confirmation(store), store.state.version, ids.ref),
        command(confirmation(store), store.state.version, ids.leader),
      ],
      clock,
    );
    expect(result.map((v) => v.status)).toEqual(["rejected", "confirmed"]);
    expect(store.state.official).toBeTruthy();
  });
  it("competing confirmations from same official base allow exactly one", async () => {
    const store = new TestResultStore();
    await pending(store);
    const base = store.state.version,
      op = confirmation(store);
    const results = await Promise.allSettled([
      executeResult(store, command(op, base, ids.leader), clock),
      executeResult(store, command(op, base, ids.leader), clock),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(store.state.official!.version).toBe(1);
  });
});
describe("K03 exact forms", () => {
  it("uses bigint for decimal equality and rejects rounding, infinity, extra precision", () => {
    expect(scaled("42.3", 1)).toBe(423n);
    expect(scaled("5.010", 3)).toBe(5010n);
    expect(scaled("-0.50", 2, true)).toBe(-50n);
    for (const v of ["42.31", "Infinity", "1e2"])
      expect(() => scaled(v, 1)).toThrow();
  });
  it("rejects wrong roster/rule, inconsistent score and confirmation carrying replacement points", () => {
    const m = match(),
      p = score();
    p.entries[1]!.value.scored = 99;
    expect(() => validatePayload(p, m)).toThrow();
    expect(() =>
      validatePayload({ ...score(), rule_snapshot_id: "other" }, m),
    ).toThrow();
    expect(() =>
      validatePayload({ ...score(), entries: score().entries.slice(1) }, m),
    ).toThrow();
    const submitted = submitPreview(m, score(), ids.ref, clock(), "s");
    expect(() =>
      confirmPreview(
        submitted,
        {
          submission_id: "s",
          submission_version: 1,
          base_official_version: 0,
          payload: score(),
        } as never,
        ids.leader,
        clock(),
        "o",
      ),
    ).toThrow();
  });
});
it("K09 rejects foreign file references before storing submission", async () => {
  const store = new TestResultStore();
  const leased = await executeResult(
    store,
    command({ type: "lease", ttlSeconds: 30 }),
    clock,
  );
  store.filesAllowed = false;
  await expect(
    executeResult(
      store,
      command(
        { type: "submit", token: leased.leaseToken!, payload: score() },
        store.state.version,
      ),
      clock,
    ),
  ).rejects.toMatchObject({ code: "FILE_SCOPE" });
  expect(store.state.submissions).toEqual([]);
});

it("K10 notification link cannot retain access after current permission revocation or scope change", async () => {
  const { canOpenNotification } =
    await import("../packages/results/src/notifications.js");
  const link = {
    editionId: ids.edition,
    matchId: ids.match,
    eventId: ids.event,
    sportId: ids.sport,
  };
  expect(canOpenNotification(ref, link, ["school-a", "school-b"])).toBe(true);
  expect(
    canOpenNotification({ ...ref, approved: false }, link, [
      "school-a",
      "school-b",
    ]),
  ).toBe(false);
  expect(
    canOpenNotification(ref, { ...link, editionId: "other" }, [
      "school-a",
      "school-b",
    ]),
  ).toBe(false);
  expect(canOpenNotification(null, link, ["school-a", "school-b"])).toBe(false);
});

it("K03 set results must describe the same match from both sides", () => {
  const m = {
    ...match(),
    rule: { ...match().rule, kind: "sets" as const, maxSets: 5 },
  };
  const payload = {
    ...score(),
    entries: score().entries.map((e, i) => ({
      ...e,
      value: {
        kind: "sets" as const,
        sets: [{ scored: i === 0 ? 21 : 15, conceded: i === 0 ? 15 : 21 }],
      },
    })),
  };
  expect(() => validatePayload(payload, m)).not.toThrow();
  payload.entries[1]!.value.sets[0]!.scored = 16;
  expect(() => validatePayload(payload, m)).toThrow();
});
