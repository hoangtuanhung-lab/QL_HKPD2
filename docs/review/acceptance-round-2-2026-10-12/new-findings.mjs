import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
const root = new URL("../../../", import.meta.url);
const K = await import(new URL("packages/results/dist/index.js", root));
const R = await import(new URL("packages/registration/dist/index.js", root));
const C = await import(new URL("packages/competition/dist/index.js", root));
const B = await import(new URL("packages/foundation/dist/index.js", root));
const findings = [];
const standings = [
  {
    schoolId: "s",
    block: "secondary",
    sportId: "football",
    sportKind: "football",
    rank: 1,
  },
];
const mandatory = [
  {
    schoolId: "s",
    block: "secondary",
    requiredEventIds: ["event"],
    actuallyPlayedEventIds: ["event"],
    organizerCancelledEventIds: [],
  },
];
const penalty = {
  id: "penalty",
  schoolId: "s",
  block: "secondary",
  sportId: "football",
  points: 10,
  waived: false,
  reason: "Synthetic",
  decidedBy: "leader",
};
const valid = K.allRoundPoints(standings, [penalty], mandatory)[0];
const malformed = K.allRoundPoints(
  standings,
  [{ ...penalty, waived: "false" }],
  mandatory,
)[0];
assert.equal(valid.total, 23);
assert.equal(malformed.total, 33);
findings.push({
  id: "M-01",
  issue:
    "Penalty waived string false is treated as truthy and removes the deduction",
  validFalseTotal: valid.total,
  stringFalseTotal: malformed.total,
});
const parties = ["a", "b", "c"].map((id) => ({
  id,
  eventId: "event",
  schoolId: id,
  status: "active",
  playedMatchIds: [""],
  performed: false,
  validAchievement: true,
  history: [],
}));
const awards = K.awardEvent(parties, ["a", "b", "c"], {
  kind: "individual",
  registered: 3,
  approved: 3,
  bronzeMatchCancelled: false,
});
assert.equal(awards.status, "resolved");
assert.equal(awards.counts.actual, 3);
findings.push({
  id: "M-02",
  issue: "Empty played match references count as actual participation",
  performed: false,
  onlyMatchId: "",
  actual: awards.counts.actual,
  medals: awards.awards.map((a) => a.medal),
});
const catalog = R.snapshotCatalog("snapshot", "edition", 1, [
  {
    id: "sport",
    code: "sp",
    name: "Synthetic",
    parentId: null,
    kind: "sport",
    order: 0,
    active: true,
    rules: { schoolQuota: 1, maxEventsPerSport: 2 },
  },
  {
    id: "event",
    code: "ev",
    name: "Synthetic",
    parentId: "sport",
    kind: "event",
    order: 0,
    active: true,
    participantKind: "team",
    rules: { minMembers: 2, maxMembers: 2 },
  },
]);
const registry = {
  editionId: "edition",
  year: 2026,
  version: 1,
  registrationOpen: true,
  deadline: "2026-10-25T00:00:00Z",
  schoolCodes: { s: "01" },
  athleteSequenceWidth: 3,
  masterListPresent: false,
  catalog,
  students: [],
  athletes: [],
  teams: [
    {
      id: "team",
      editionId: "edition",
      schoolId: "s",
      eventId: "event",
      name: "Synthetic",
      memberIds: [],
    },
  ],
  registrations: [
    {
      id: "registration",
      editionId: "edition",
      schoolId: "s",
      eventId: "event",
      version: 2,
      approvedRevisionId: "revision",
      revisions: [
        {
          id: "revision",
          version: 2,
          status: "approved",
          participant: { kind: "team", teamId: "team" },
        },
      ],
    },
  ],
};
const approved = R.approvedEntries(registry, "event");
assert.equal(approved[0].personIds.length, 0);
findings.push({
  id: "M-03",
  issue: "Approved roster projection accepts an empty approved team",
  exportedEntries: approved.length,
  personIds: approved[0].personIds,
});
const codec = new B.CursorCodec(randomBytes(32), 100);
const scope = {
  actorId: "actor",
  editionId: "edition",
  operation: "list",
  filters: {},
};
const token = codec.encode("last-id", scope, 1000);
assert.throws(() => codec.decode(token, scope, 1100));
assert.equal(codec.decode(token, scope, NaN), "last-id");
findings.push({
  id: "M-04",
  issue: "Invalid NaN clock bypasses cursor expiry comparison",
  expiredAtValidClockRejected: true,
  invalidClockAccepted: true,
});
const task = (id, venues) => ({
  id,
  eventId: "event",
  sportId: "sport",
  participantPersonIds: [`person-${id}`],
  refereePersonIds: [],
  restMinutes: 0,
  dependsOnIds: [],
  durationMinutes: 30,
  venueIds: venues,
});
const flexible = task("flex", ["A", "B"]),
  fixed = task("fixed", ["A"]);
const window = {
  start: "2026-10-12T08:00:00.000Z",
  end: "2026-10-12T08:30:00.000Z",
};
assert.throws(() => C.proposeSchedule([flexible, fixed], [], window));
const feasible = C.proposeSchedule([fixed, flexible], [], window);
assert.equal(C.scheduleConflicts(feasible).length, 0);
findings.push({
  id: "M-05",
  issue: "Greedy scheduler fails a feasible two-task two-venue input order",
  classification: "documented greedy limitation; improvement proposal",
  inputOrderRejected: ["flex", "fixed"],
  alternativeFeasible: feasible.map((x) => ({
    id: x.id,
    venue: x.venueId,
    start: x.start,
  })),
});
console.log(
  JSON.stringify(
    {
      purpose:
        "Additional observed defects/limitation; exit0 means reproduced, not acceptance passed",
      externalServicesUsed: [],
      findings,
    },
    null,
    2,
  ),
);
