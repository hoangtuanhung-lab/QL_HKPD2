import "fake-indexeddb/auto";
import { randomUUID } from "node:crypto";
import { it, expect } from "vitest";
import {
  createDataset,
  assertDatasetIntegrity,
} from "../packages/test-fixtures/a05/dataset.mjs";
import { approvedRegistry, complete, confirm } from "./cross-group-fixtures.js";
import {
  snapshotCatalog,
  transitionRegistration,
  approvedEntries,
} from "@hkpd/registration";
import {
  prepareEvent,
  confirmEvent,
  projectEvent,
  publicationReadiness,
  resultMatchFromDraw,
} from "../packages/integration/src/index.js";
import { IndexedDbQueue, flushQueue } from "../packages/offline/src/browser.js";
import {
  receiveOffline,
  makeManifest,
  verifyBackup,
} from "../packages/offline/src/index.js";
import { TestInboxStore, input } from "./group-i-fixtures.js";
import { confirmPreview } from "@hkpd/results";
it("I06 synthetic 7-school/500-athlete R→C→K drill with offline input, correction and cancellation projection", async () => {
  const dataset = createDataset();
  assertDatasetIntegrity(dataset);
  const registry = approvedRegistry(0);
  registry.editionId = dataset.edition_id;
  registry.schoolCodes = Object.fromEntries(
    dataset.schools.map((s) => [s.id, s.code]),
  );
  const originalSport = registry.catalog.nodes.find((n) => n.kind === "sport");
  const prototype = registry.catalog.nodes.find((n) => n.kind === "event");
  const events = Array.from({ length: 10 }, (_, i) => ({
    ...prototype,
    id: randomUUID(),
    code: `synthetic-${i}`,
    name: `Nội dung tổng hợp ${i}`,
  }));
  registry.catalog = snapshotCatalog(randomUUID(), registry.editionId, 1, [
    originalSport,
    ...events,
  ]);
  for (const [i, a] of dataset.athletes.entries()) {
    registry.athletes.push({
      id: a.id,
      studentId: a.student_id,
      schoolId: a.school_id,
      editionId: a.edition_id,
      studentCode: String(i),
      name: a.display_name,
      sex: "male",
      birthYear: 2014,
      grade: 6,
      profileStatus: "approved",
      athleteCode: a.athlete_code,
      version: 1,
    });
    const draft = {
      id: randomUUID(),
      editionId: registry.editionId,
      schoolId: a.school_id,
      eventId: events[Math.floor(i / 50)].id,
      version: 1,
      approvedRevisionId: null,
      revisions: [
        {
          id: randomUUID(),
          version: 1,
          status: "draft",
          participant: { kind: "athlete", athleteId: a.id },
        },
      ],
    };
    const submitted = transitionRegistration(
      registry,
      draft,
      "submit",
      1,
      new Date("2026-10-11"),
    );
    registry.registrations.push(
      transitionRegistration(
        registry,
        submitted,
        "approve",
        submitted.version,
        new Date("2026-10-11"),
      ),
    );
  }
  expect(new Set(registry.athletes.map((a) => a.schoolId)).size).toBe(7);
  expect(registry.registrations).toHaveLength(500);
  expect(new Set(dataset.folders.map((f) => f.logical_key)).size).toBe(500);
  let actualMatches = 0;
  for (const event of events) {
    expect(approvedEntries(registry, event.id)).toHaveLength(50);
    const draft = prepareEvent(
      registry,
      event.id,
      "individual_combat",
      { snapshotId: randomUUID(), kind: "score", precision: 0 },
      randomUUID,
      { random: () => 0 },
    );
    const b = confirmEvent(draft, registry, 1);
    const records = complete(b);
    actualMatches += records.length;
    expect(publicationReadiness(b, records).allResultsConfirmed).toBe(true);
    // Cancellation here tests the projection guard, not a deployed cancellation endpoint.
    const cancelled = {
      ...b,
      competition: { ...b.competition, status: "cancelled" },
    };
    expect(publicationReadiness(cancelled, records).allResultsConfirmed).toBe(
      false,
    );
    if (event !== events[0]) continue;
    const first = projectEvent(b, []).find((row) => row.status === "ready");
    const server = new TestInboxStore();
    server.state = resultMatchFromDraw(b, first.logicalId, []);
    server.actor.assignments = [
      {
        editionId: registry.editionId,
        sportId: originalSport.id,
        eventIds: [event.id],
        role: "referee",
      },
    ];
    server.snapshot = {
      ...server.snapshot,
      editionId: registry.editionId,
      sportId: originalSport.id,
      eventId: event.id,
    };
    const scope = { actorId: server.actor.id, editionId: registry.editionId };
    const q = await IndexedDbQueue.open(indexedDB, randomUUID());
    const op = input();
    op.submission.match_id = server.state.id;
    op.submission.payload = structuredClone(
      records.find((m) => m.id === server.state.id).official.payload,
    );
    await q.append(scope, op);
    await flushQueue(
      q,
      scope,
      () => scope,
      async () => {
        throw Error("synthetic outage");
      },
    );
    expect((await q.list(scope))[0].receipt).toBeNull();
    await flushQueue(
      q,
      scope,
      () => scope,
      async (_, request) =>
        receiveOffline(server, scope, request, () => new Date("2026-10-11")),
    );
    expect(server.state.official).toBeNull();
    const r = server.state.submissions[0];
    server.state = confirmPreview(
      server.state,
      {
        submission_id: r.id,
        submission_version: r.version,
        base_official_version: 0,
      },
      randomUUID(),
      new Date("2026-10-11"),
      randomUUID(),
    );
    expect(server.state.official.version).toBe(1);
    q.close();
    const source = records.find((m) => m.id === server.state.id);
    const pendingCorrection = structuredClone(source);
    expect(pendingCorrection.official.version).toBe(1);
    records[records.indexOf(source)] = confirm(source, 0, 3);
    expect(records.find((m) => m.id === source.id).official.version).toBe(2);
    expect(projectEvent(b, records).some((row) => row.status === "stale")).toBe(
      true,
    );
    expect(publicationReadiness(b, records).allResultsConfirmed).toBe(false);
    // No downstream re-confirmation is invented: changed participants require the unresolved K workflow.
  }
  expect(actualMatches).toBe(490);
  const data = new TextEncoder().encode(
    JSON.stringify({
      synthetic: true,
      registrations: registry.registrations,
      folders: dataset.folders,
    }),
  );
  const m = makeManifest(data, {
    editionId: registry.editionId,
    schemaVersion: "synthetic-v1",
    keyVersion: "synthetic-v1",
    createdAt: "2026-10-11T00:00:00Z",
    kind: "edition_final",
    recordCounts: {
      schools: 7,
      athletes: 500,
      registrations: 500,
      logicalFolders: 500,
    },
  });
  expect(() => verifyBackup(m, data)).not.toThrow();
}, 20000);
