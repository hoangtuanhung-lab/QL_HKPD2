import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import {
  confirmEvent,
  projectEvent,
  resultMatchFromDraw,
  publicationReadiness,
  registrationLifecycle,
} from "../packages/integration/src/index.js";
import { transitionRegistration, reviseRegistration } from "@hkpd/registration";
import { submitPreview, participantKey, type ResultMatch } from "@hkpd/results";
import {
  approvedRegistry,
  bundle,
  confirm,
  clock,
} from "./cross-group-fixtures.js";
it("R approved → C locked draw → K confirmed fixed slots; bye is not a scored match", () => {
  const registry = approvedRegistry(),
    draft = bundle(registry);
  const first = projectEvent(draft, []).find((r) => r.status === "ready")!;
  expect(() => resultMatchFromDraw(draft, first.logicalId, [])).toThrow();
  const b = confirmEvent(draft, registry, 1),
    records: ResultMatch[] = [];
  const byes = projectEvent(b, []).filter((r) => r.status === "bye");
  expect(byes).toHaveLength(2);
  expect(() => resultMatchFromDraw(b, byes[0]!.logicalId, records)).toThrow();
  while (true) {
    const ready = projectEvent(b, records).find((r) => r.status === "ready");
    if (!ready) break;
    records.push(confirm(resultMatchFromDraw(b, ready.logicalId, records)));
  }
  expect(records).toHaveLength(5); // N-1 actual KO matches, never a bye score
  expect(
    projectEvent(b, records).every((r) =>
      ["confirmed", "bye"].includes(r.status),
    ),
  ).toBe(true);
  expect(publicationReadiness(b, records).allResultsConfirmed).toBe(true);
  expect(
    Object.keys(publicationReadiness(b, records).sourceVersions),
  ).toHaveLength(5);
  const final = b.competition.draw!.rounds.at(-1)!.matches[0]!;
  const finalRecord = records.find((m) => m.id === b.matchIds[final.id])!;
  expect(
    Object.keys(finalRecord.prerequisiteOfficialVersions).length,
  ).toBeGreaterThan(1);
  expect(
    registrationLifecycle(registry.editionId, b.competition.eventId, b, records)
      .locked,
  ).toBe(true);
  const source = records.find((m) =>
    b.competition.draw!.rounds[0]!.matches.some(
      (d) => b.matchIds[d.id] === m.id,
    ),
  )!;
  records[records.indexOf(source)] = confirm(source, 0, 3);
  const changed = projectEvent(b, records);
  expect(changed.find((r) => r.logicalId === final.id)?.status).toBe("stale");
  const pub = publicationReadiness(b, records);
  expect(pub.allResultsConfirmed).toBe(false);
  expect(pub.sourceVersions[finalRecord.id]).toBeUndefined();
  expect(() => resultMatchFromDraw(b, final.id, records)).toThrow();
});
it("new approval invalidates draft roster; pending revision alone retains the approved roster", () => {
  const registry = approvedRegistry(3),
    draft = bundle(registry),
    r = registry.registrations[0]!;
  const revised = reviseRegistration(
    r,
    randomUUID(),
    r.revisions[0]!.participant,
    r.version,
  );
  const pending = transitionRegistration(
    registry,
    revised,
    "submit",
    revised.version,
    clock(),
  );
  const state = {
    ...registry,
    registrations: registry.registrations.map((old) =>
      old.id === r.id ? pending : old,
    ),
  };
  expect(() => confirmEvent(draft, state, 1)).not.toThrow();
  const approved = transitionRegistration(
    state,
    pending,
    "approve",
    pending.version,
    clock(),
  );
  const newState = {
    ...state,
    registrations: state.registrations.map((old) =>
      old.id === r.id ? approved : old,
    ),
  };
  expect(() => confirmEvent(draft, newState, 1)).toThrow();
});
it("RR rest creates no result; pending does not become confirmed or ready for publication", () => {
  const registry = approvedRegistry(3),
    b = confirmEvent(bundle(registry), registry, 1);
  expect(b.competition.draw!.rounds.flatMap((r) => r.restingIds)).toHaveLength(
    3,
  );
  const row = projectEvent(b, [])[0]!,
    m = resultMatchFromDraw(b, row.logicalId, []);
  const payload = {
    rule_snapshot_id: m.rule.snapshotId,
    file_ids: [],
    entries: m.participantKeys.map((key, i) => ({
      participant: { kind: "athlete" as const, athlete_id: key.slice(8) },
      value: { kind: "score" as const, scored: i, conceded: 1 - i },
    })),
  };
  const pending = submitPreview(
    m,
    payload,
    randomUUID(),
    clock(),
    randomUUID(),
  );
  expect(
    projectEvent(b, [pending]).find((r) => r.matchId === m.id)?.status,
  ).toBe("pending");
  expect(publicationReadiness(b, [pending]).sourceVersions).toEqual({});
  expect(() =>
    projectEvent(b, [{ ...pending, editionId: randomUUID() }]),
  ).toThrow();
  expect(new Set(row.participants.map(participantKey)).size).toBe(2);
});
it("K command checks current C source graph before writing a downstream correction", async () => {
  const { TestResultStore, ids: actors } =
    await import("./group-k-fixtures.js");
  const { executeResult } = await import("@hkpd/results");
  const { complete } = await import("./cross-group-fixtures.js");
  const registry = approvedRegistry(),
    b = confirmEvent(bundle(registry), registry, 1),
    records = complete(b);
  const finalId =
    b.matchIds[b.competition.draw!.rounds.at(-1)!.matches[0]!.id]!;
  const final = records.find((m) => m.id === finalId)!;
  const store = new TestResultStore();
  store.state = structuredClone(final);
  store.actors = store.actors.map((a) => ({
    ...a,
    schoolId: "outside",
    assignments: a.assignments.map((g) => ({
      ...g,
      editionId: final.editionId,
      sportId: final.sportId,
      eventIds: [final.eventId],
    })),
  }));
  const linked = {
    transaction<T>(
      run: Parameters<typeof store.transaction<T>>[0],
    ): Promise<T> {
      return store.transaction((tx) =>
        run({
          ...tx,
          prerequisitesCurrent: async () =>
            !publicationReadiness(b, records).staleMatchIds.includes(finalId),
        }),
      );
    },
  };
  const base = {
    actorId: actors.ref,
    sessionId: "trusted-session",
    editionId: final.editionId,
    matchId: final.id,
  };
  const leased = await executeResult(
    linked,
    {
      ...base,
      key: randomUUID(),
      baseVersion: final.version,
      operation: { type: "lease", ttlSeconds: 30 },
    },
    clock,
  );
  const source = records.find((m) =>
    b.competition.draw!.rounds[0]!.matches.some(
      (d) => b.matchIds[d.id] === m.id,
    ),
  )!;
  records[records.indexOf(source)] = confirm(source, 0, 3);
  const before = structuredClone(store.state);
  await expect(
    executeResult(
      linked,
      {
        ...base,
        key: randomUUID(),
        baseVersion: store.state.version,
        operation: {
          type: "submit",
          token: leased.leaseToken!,
          payload: final.official!.payload,
          reason: "Đối chiếu biên bản",
        },
      },
      clock,
    ),
  ).rejects.toMatchObject({ code: "SOURCE_UNCONFIRMED" });
  expect(store.state).toEqual(before);
});
