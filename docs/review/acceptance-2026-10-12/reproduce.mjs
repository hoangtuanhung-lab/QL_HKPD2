import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const root = new URL("../../../", import.meta.url);
const K = await import(new URL("packages/results/dist/index.js", root));
const C = await import(new URL("packages/competition/dist/index.js", root));
const API = await import(new URL("apps/api/dist/app.js", root));
const report = [];
// Q-01: higher priority missing sets must not be bypassed with warnings.
const entrants = ["a", "b", "c"].map((id) => ({ id, schoolId: id }));
const results = [
  ["a", "b", 0, 1],
  ["b", "c", 1, 2],
  ["c", "a", 2, 0],
].map(([left, right, lw, rw], i) => ({
  id: `m${i}`,
  left,
  right,
  leftScore: 2,
  rightScore: 1,
  confirmed: true,
  leftWarnings: lw,
  rightWarnings: rw,
}));
const ranking = K.rankRoundRobin(entrants, results, { sport: "tug_or_push" });
assert.equal(ranking.status, "resolved");
assert(
  ranking.rows.some((r) => r.criteria.some((c) => c.includes("thiếu dữ liệu"))),
);
report.push({
  case: "Q-01",
  observed: "resolved despite missing set metrics",
  rows: ranking.rows.map((r) => ({
    id: r.id,
    rank: r.rank,
    criteria: r.criteria,
  })),
});
// Q-02: approved=0 and registered=0 but awards resolved for three actual people.
const all = entrants.map((e) => ({
  id: e.id,
  eventId: "e",
  schoolId: e.schoolId,
  status: "active",
  playedMatchIds: ["m"],
  performed: true,
  validAchievement: true,
  history: [],
}));
const awards = K.awardEvent(all, ["a", "b", "c"], {
  kind: "individual",
  registered: 0,
  approved: 0,
  bronzeMatchCancelled: false,
});
assert.equal(awards.status, "resolved");
assert.equal(awards.counts.actual, 3);
report.push({
  case: "Q-02",
  counts: awards.counts,
  status: awards.status,
  awards: awards.awards,
});
// Q-03: roster metadata is valid but every match has been removed.
const roster = entrants.map((e) => ({
  id: e.id,
  label: e.id,
  schoolId: e.schoolId,
  personIds: [e.id],
}));
const draw = C.createDraw("event", roster, "individual_combat");
const state = {
  eventId: "event",
  editionId: "edition",
  sportId: "sport",
  kind: "individual_combat",
  version: 1,
  status: "draft",
  startedAt: null,
  entrants: roster,
  draw: { ...draw, rounds: [] },
  withdrawnIds: [],
};
const confirmed = C.confirmDraw(state, 1);
assert.equal(confirmed.status, "draw_confirmed");
report.push({
  case: "Q-03",
  observed: confirmed.status,
  matchRounds: confirmed.draw.rounds.length,
});
// Q-04: replaceDraftDraw accepts duplicate entrant ID and drops another entrant.
const replaced = C.replaceDraftDraw({ ...state, draw }, 1, {
  ...draw,
  entrants: [roster[0], roster[0], roster[2]],
});
assert.equal(replaced.version, 2);
report.push({
  case: "Q-04",
  observed: "draft replacement accepted",
  entrantIds: replaced.draw.entrants.map((e) => e.id),
});
// Q-05: queued command can change after its idempotency fingerprint is calculated.
const editionId = randomUUID(),
  eventId = randomUUID(),
  sportId = randomUUID(),
  matchId = randomUUID(),
  actorId = randomUUID();
let stateMatch = {
  id: matchId,
  editionId,
  eventId,
  sportId,
  version: 1,
  locked: false,
  participantSchoolIds: ["s1", "s2"],
  participantKeys: [`athlete:${randomUUID()}`, `athlete:${randomUUID()}`],
  prerequisiteOfficialVersions: {},
  rule: { snapshotId: randomUUID(), kind: "score", precision: 0 },
  lease: null,
  submissions: [],
  official: null,
  officialHistory: [],
};
const actor = {
  id: actorId,
  approved: true,
  assignments: [{ editionId, role: "referee", sportId, eventIds: [eventId] }],
};
let resume;
const gate = new Promise((r) => {
  resume = r;
});
let saved;
const tx = {
  actor: async () => {
    await gate;
    return actor;
  },
  matchForUpdate: async () => stateMatch,
  receipt: async () => saved ?? null,
  save: async (m) => {
    stateMatch = m;
  },
  audit: async () => {},
  saveReceipt: async (_, r) => {
    saved = r;
  },
};
const store = { transaction: async (run) => run(tx) };
const now = () => new Date("2026-10-12T00:00:00Z");
const command = {
  actorId,
  sessionId: "session",
  editionId,
  matchId,
  key: randomUUID(),
  baseVersion: 1,
  operation: { type: "lease", ttlSeconds: 30 },
};
const work = K.executeResult(store, command, now);
command.operation.ttlSeconds = 120;
resume();
await work;
command.operation.ttlSeconds = 30;
const replay = await K.executeResult(store, command, now);
assert.equal(
  Date.parse(replay.match.lease.expiresAt) - now().getTime(),
  120000,
);
report.push({ case: "Q-05", fingerprintedTTL: 30, appliedAndReplayedTTL: 120 });
// Integration acceptance probe: business contract route remains unmounted.
const app = API.createApp(async () => {}, "dev");
const response = await app.inject({
  method: "POST",
  url: `/v1/editions/${editionId}/sync/submissions`,
  payload: {},
});
assert.equal(response.statusCode, 404);
report.push({
  case: "G-01",
  route: "POST /v1/editions/{id}/sync/submissions",
  status: response.statusCode,
});
await app.close();
console.log(
  JSON.stringify(
    { reviewed_tree: "a219b5e / ff14459 identical", reproduced: report },
    null,
    2,
  ),
);
