import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import type { Event } from "@hkpd/foundation";
import {
  deliverResultConfirmed,
  confirmEvent,
  publicationReadiness,
  type ResultDeliveryTransaction,
} from "../packages/integration/src/index.js";
import type { Publication } from "@hkpd/results";
import {
  approvedRegistry,
  bundle,
  complete,
  confirm,
} from "./cross-group-fixtures.js";
function setup() {
  const registry = approvedRegistry(),
    b = confirmEvent(bundle(registry), registry, 1),
    original = complete(b);
  const p: Publication = {
    id: randomUUID(),
    editionId: registry.editionId,
    version: 1,
    status: "finalized",
    sourceVersions: publicationReadiness(b, original).sourceVersions,
  };
  const source = original.find((m) =>
    b.competition.draw!.rounds[0]!.matches.some(
      (d) => b.matchIds[d.id] === m.id,
    ),
  )!;
  const records = original.map((m) =>
    m.id === source.id ? confirm(m, 0, 3) : m,
  );
  const state = {
    p,
    processed: new Set<string>(),
    invalidated: [] as string[],
    rebuilds: [] as unknown[],
  };
  let failAt: string | null = null;
  let lock = Promise.resolve();
  const store = {
    transaction<T>(
      run: (tx: ResultDeliveryTransaction) => Promise<T>,
    ): Promise<T> {
      const result = lock.then(async () => {
        const backup = structuredClone(state);
        const fail = (step: string) => {
          if (failAt === step) throw new Error("synthetic transaction failure");
        };
        try {
          return await run({
            hasProcessed: async (_c, id) => state.processed.has(id),
            markProcessed: async (_c, id) => {
              state.processed.add(id);
              fail("receipt");
            },
            resultForUpdate: async (id) => records.find((m) => m.id === id)!,
            bundleForUpdate: async () => b,
            matchesForUpdate: async () => records,
            publicationForUpdate: async () => state.p,
            savePublication: async (next, expected) => {
              expect(expected).toBe(state.p.version);
              state.p = structuredClone(next);
              fail("publication");
            },
            invalidateMatches: async (ids) => {
              state.invalidated = [...ids];
              fail("invalidate");
            },
            requestRebuild: async (_edition, _event, sources) => {
              state.rebuilds.push(structuredClone(sources));
              fail("rebuild");
            },
          });
        } catch (error) {
          Object.assign(state, backup);
          throw error;
        }
      });
      lock = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
  const event: Event = {
    id: randomUUID(),
    type: "OfficialResultConfirmed",
    editionId: registry.editionId,
    resourceId: source.id,
    version: 2,
  };
  return {
    store,
    state,
    event,
    records,
    b,
    original,
    setFail: (step: string | null) => {
      failAt = step;
    },
  };
}
it("B05/C/K atomic consumer invalidates downstream, degrades finalized publication, deduplicates concurrent delivery and never accumulates points", async () => {
  const s = setup();
  const outcomes = await Promise.all([
    deliverResultConfirmed(s.store, s.event),
    deliverResultConfirmed(s.store, s.event),
  ]);
  expect(outcomes.sort()).toEqual(["duplicate", "processed"]);
  expect(s.state.p.status).toBe("provisional");
  expect(s.state.rebuilds).toHaveLength(1);
  expect(s.state.invalidated.length).toBeGreaterThan(0);
  const finalId =
    s.b.matchIds[s.b.competition.draw!.rounds.at(-1)!.matches[0]!.id]!;
  expect(s.state.invalidated).toContain(finalId);
  expect(
    (s.state.rebuilds[0] as Record<string, number>)[finalId],
  ).toBeUndefined();
  const version = s.state.p.version;
  await deliverResultConfirmed(s.store, {
    ...s.event,
    id: randomUUID(),
    version: 1,
  });
  expect(s.state.p.version).toBe(version);
  expect(s.state.p.sourceVersions[s.event.resourceId]).toBe(2);
});
it.each(["publication", "invalidate", "rebuild", "receipt"])(
  "consumer rolls back %s failure including processed receipt",
  async (step) => {
    const s = setup(),
      before = structuredClone(s.state);
    s.setFail(step);
    await expect(deliverResultConfirmed(s.store, s.event)).rejects.toThrow();
    expect(s.state).toEqual(before);
    s.setFail(null);
    expect(await deliverResultConfirmed(s.store, s.event)).toBe("processed");
  },
);
it("wrong edition or future version cannot mark an event processed", async () => {
  const s = setup();
  await expect(
    deliverResultConfirmed(s.store, { ...s.event, editionId: randomUUID() }),
  ).rejects.toThrow();
  await expect(
    deliverResultConfirmed(s.store, { ...s.event, version: 99 }),
  ).rejects.toThrow();
  expect(s.state.processed.size).toBe(0);
  expect(s.state.p.status).toBe("finalized");
});
