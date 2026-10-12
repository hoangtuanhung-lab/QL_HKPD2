import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const root = new URL("../../../", import.meta.url);
const K = await import(new URL("packages/results/dist/index.js", root));
const R = await import(new URL("packages/registration/dist/index.js", root));
const observed = [];
const entrants = ["a", "b", "c"].map((id) => ({ id, schoolId: id }));
const games = [
  ["a", "b", 2, 0],
  ["a", "c", 3, 0],
  ["b", "c", 1, 0],
].map(([left, right, a, b]) => ({
  id: "duplicate-match",
  left,
  right,
  leftScore: a,
  rightScore: b,
  confirmed: true,
}));
const ranking = K.rankRoundRobin(entrants, games, { sport: "football" });
assert.equal(ranking.status, "resolved");
assert.equal(ranking.provisional, false);
observed.push({
  id: "N-01",
  issue: "Different confirmed pairs reuse the same match ID",
  observedStatus: ranking.status,
  rows: ranking.rows.map((r) => ({ id: r.id, rank: r.rank })),
});
const publication = K.finalizePublication(
  {
    id: "pub",
    editionId: "edition",
    version: 1,
    status: "provisional",
    sourceVersions: { match: 0 },
  },
  { match: 0 },
  1,
  { rankingsResolved: true, allResultsConfirmed: true },
);
assert.equal(publication.status, "finalized");
observed.push({
  id: "N-02",
  issue: "Publication finalizes with official source version 0",
  status: publication.status,
  sourceVersions: publication.sourceVersions,
});
const party = {
  id: "a",
  eventId: "e",
  schoolId: "s",
  status: "active",
  playedMatchIds: [],
  performed: false,
  validAchievement: false,
  history: [],
};
const changed = K.changeParticipation(party, "unknown_status", {
  eventId: "e",
  format: "knockout",
  editionLocked: false,
  downstreamHasSavedResult: false,
  previouslyEliminated: false,
  actorId: "leader",
  reason: "Synthetic review",
  at: "2026-10-12T00:00:00Z",
});
assert.equal(changed.status, "unknown_status");
observed.push({
  id: "N-03",
  issue: "Participation transition accepts status outside domain enum",
  status: changed.status,
});
const rows = R.previewCsv(
  "student_code,name,sex,birth_year,grade,cccd\nA,Synthetic,male,2014,6,1234",
  "school",
  [],
);
assert(rows[0].errors.includes("IDENTITY_FORMAT"));
assert.equal(rows[0].identityMask, "1234");
observed.push({
  id: "N-04",
  issue: "Malformed short identity value is returned unmasked in preview",
  identityFormatError: true,
  fullyMasked: false,
});
const a = randomUUID(),
  b = randomUUID(),
  rule = randomUUID();
const payload = {
  rule_snapshot_id: rule,
  file_ids: [],
  entries: [
    {
      participant: {
        kind: "athlete",
        athlete_id: a,
        private_note: "SYNTHETIC_PRIVATE",
      },
      value: { kind: "score", scored: 2, conceded: 1 },
    },
    {
      participant: { kind: "athlete", athlete_id: b },
      value: { kind: "score", scored: 1, conceded: 2 },
    },
  ],
};
const match = {
  id: randomUUID(),
  editionId: randomUUID(),
  eventId: randomUUID(),
  sportId: randomUUID(),
  version: 1,
  locked: false,
  participantSchoolIds: ["s1", "s2"],
  participantKeys: [`athlete:${a}`, `athlete:${b}`],
  prerequisiteOfficialVersions: {},
  rule: { snapshotId: rule, kind: "score", precision: 0 },
  lease: null,
  submissions: [],
  official: null,
  officialHistory: [],
};
const submission = K.submitPreview(
  match,
  payload,
  randomUUID(),
  new Date("2026-10-12T00:00:00Z"),
  randomUUID(),
);
assert.equal(
  submission.submissions[0].payload.entries[0].participant.private_note,
  "SYNTHETIC_PRIVATE",
);
observed.push({
  id: "N-05",
  issue:
    "Result participant accepts unknown properties against A03 additionalProperties:false",
  unknownFieldPersisted: true,
});
console.log(
  JSON.stringify(
    {
      purpose:
        "Observed defects for next iteration; zero exit means reproduced, not software accepted",
      externalServicesUsed: [],
      observed,
    },
    null,
    2,
  ),
);
