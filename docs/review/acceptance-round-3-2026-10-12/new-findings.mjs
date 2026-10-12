import assert from "node:assert/strict";
const root = new URL("../../../", import.meta.url);
const C = await import(new URL("packages/competition/dist/index.js", root));
const B = await import(new URL("packages/foundation/dist/index.js", root));
const R = await import(new URL("packages/registration/dist/index.js", root));
const K = await import(new URL("packages/results/dist/index.js", root));
const findings = [];

// Caller mutation across a suspended authorization lookup; no HTTP or real store.
let releasePermission;
const permissionGate = new Promise((resolve) => {
  releasePermission = resolve;
});
const input = {
  actorId: "allowed-actor",
  editionId: "edition",
  eventId: "allowed-event",
  baseVersion: 1,
};
const checked = [],
  saved = [],
  audited = [];
const pending = C.drawFromApproved(
  {
    transaction: (run) =>
      run({
        canManage: async (...args) => {
          checked.push(args);
          await permissionGate;
          return true;
        },
        event: async (eventId) => ({
          eventId,
          editionId: "edition",
          sportId: "sport",
          kind: "individual_combat",
          version: 1,
          status: "draft",
          startedAt: null,
          entrants: [],
          draw: null,
          withdrawnIds: [],
        }),
        approvedEntries: async (eventId) =>
          ["a", "b", "c"].map((id) => ({
            id,
            label: id,
            schoolId: id,
            personIds: [`person-${id}`],
            editionId: "edition",
            eventId,
            approvedRevisionId: `revision-${id}`,
          })),
        save: async (snapshot) => {
          saved.push(snapshot.eventId);
        },
        audit: async (record) => {
          audited.push(record.actorId);
        },
        enqueue: async () => {},
      }),
  },
  input,
  { random: () => 0 },
);
input.actorId = "other-actor";
input.eventId = "other-event";
releasePermission();
await pending;
assert.equal(checked[0][0], "allowed-actor");
assert.equal(checked[0][2], "allowed-event");
assert.deepEqual(saved, ["other-event"]);
assert.deepEqual(audited, ["other-actor"]);
findings.push({
  id: "P-01",
  issue: "C draw input is not captured across authorization await",
  authorizedActor: checked[0][0],
  authorizedEvent: checked[0][2],
  savedEvent: saved[0],
  auditedActor: audited[0],
});

let releaseDelivery;
const deliveryGate = new Promise((resolve) => {
  releaseDelivery = resolve;
});
const event = {
  id: "original-event",
  type: "Synthetic",
  editionId: "edition",
  resourceId: "resource",
  version: 1,
};
const lookedUp = [],
  handled = [],
  marked = [];
const delivery = B.deliver(
  {
    transaction: (run) =>
      run({
        hasProcessed: async (_consumer, id) => {
          lookedUp.push(id);
          await deliveryGate;
          return false;
        },
        markProcessed: async (_consumer, id) => {
          marked.push(id);
        },
      }),
  },
  "synthetic-consumer",
  event,
  async (_tx, received) => {
    handled.push(received.id);
  },
);
event.id = "changed-event";
releaseDelivery();
assert.equal(await delivery, "processed");
assert.deepEqual(lookedUp, ["original-event"]);
assert.deepEqual(handled, ["changed-event"]);
assert.deepEqual(marked, ["changed-event"]);
findings.push({
  id: "P-02",
  issue:
    "Outbox delivery checks one event identity but handles and marks another after caller mutation",
  lookedUp,
  handled,
  marked,
});

const registration = {
  id: "registration",
  editionId: "edition",
  schoolId: "school",
  eventId: "event",
  version: -1,
  approvedRevisionId: null,
  revisions: [
    {
      id: "old-revision",
      version: -1,
      status: "draft",
      participant: { kind: "athlete", athleteId: "athlete" },
    },
  ],
};
const revised = R.reviseRegistration(
  registration,
  "new-revision",
  registration.revisions[0].participant,
  -1,
);
assert.equal(revised.version, 0);
findings.push({
  id: "P-03",
  issue:
    "Registration revision accepts negative matching CAS versions and produces version zero",
  inputVersion: -1,
  outputVersion: revised.version,
});

const publication = {
  id: "publication",
  editionId: "edition",
  version: 1,
  status: "provisional",
  sourceVersions: { match: 1 },
};
assert.throws(() =>
  K.finalizePublication(publication, { match: 1 }, 1, {
    rankingsResolved: false,
    allResultsConfirmed: false,
  }),
);
const finalized = K.finalizePublication(publication, { match: 1 }, 1, {
  rankingsResolved: "false",
  allResultsConfirmed: "false",
});
assert.equal(finalized.status, "finalized");
findings.push({
  id: "P-04",
  issue: "Publication readiness string false passes truthiness gates",
  booleanFalseRejected: true,
  stringFalseStatus: finalized.status,
});

const official = {
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
    file_ids: [],
    entries: [
      {
        participant: { kind: "athlete", athlete_id: "athlete" },
        value: { kind: "unsupported" },
      },
    ],
  },
};
const rows = K.publicResults(
  { ...publication, status: "finalized" },
  official,
  {
    athlete: {
      eventLabel: "Synthetic",
      athleteCode: "01.001",
      displayName: "Synthetic",
      schoolLabel: "Synthetic",
    },
  },
);
assert.equal(rows.length, 1);
assert.equal(rows[0].value, undefined);
assert.equal(
  Object.hasOwn(JSON.parse(JSON.stringify(rows))[0], "value"),
  false,
);
findings.push({
  id: "P-05",
  issue:
    "Public projection emits finalized result without required value for unsupported persisted value kind",
  returnedRows: rows.length,
  serializedHasRequiredValue: false,
});

console.log(
  JSON.stringify(
    {
      purpose:
        "Unwanted behaviors reproduced on built libraries; exit zero is not acceptance success",
      externalServicesUsed: [],
      findings,
    },
    null,
    2,
  ),
);
