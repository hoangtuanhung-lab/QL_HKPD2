import { randomUUID } from "node:crypto";
import {
  snapshotCatalog,
  transitionRegistration,
  type Registry,
} from "@hkpd/registration";
import {
  prepareEvent,
  projectEvent,
  resultMatchFromDraw,
  type EventBundle,
} from "../packages/integration/src/index.js";
import { submitPreview, confirmPreview, type ResultMatch } from "@hkpd/results";
const clock = () => new Date("2026-10-11T00:00:00Z");
function approvedRegistry(count = 6): Registry {
  const editionId = randomUUID(),
    sportId = randomUUID(),
    eventId = randomUUID();
  const state: Registry = {
    editionId,
    year: 2026,
    version: 1,
    registrationOpen: true,
    deadline: "2026-11-01T00:00:00Z",
    schoolCodes: {},
    athleteSequenceWidth: 3,
    masterListPresent: false,
    catalog: snapshotCatalog(randomUUID(), editionId, 1, [
      {
        id: sportId,
        code: "synthetic",
        name: "Môn tổng hợp",
        parentId: null,
        kind: "sport",
        order: 0,
        active: true,
        rules: { schoolQuota: 100, maxEventsPerSport: 2 },
      },
      {
        id: eventId,
        code: "event",
        name: "Nội dung tổng hợp",
        parentId: sportId,
        kind: "event",
        order: 0,
        active: true,
        participantKind: "athlete",
        rules: {},
      },
    ]),
    students: [],
    athletes: [],
    teams: [],
    registrations: [],
  };
  for (let i = 0; i < count; i++) {
    const id = randomUUID(),
      schoolId = randomUUID();
    state.schoolCodes[schoolId] = String(i + 1).padStart(2, "0");
    state.athletes = [
      ...state.athletes,
      {
        id,
        studentId: randomUUID(),
        schoolId,
        editionId,
        studentCode: String(i),
        name: `VĐV tổng hợp ${i}`,
        sex: "male",
        birthYear: 2014,
        grade: 6,
        profileStatus: "approved",
        athleteCode: `${String(i + 1).padStart(2, "0")}.001`,
        version: 1,
      },
    ];
    const r = {
      id: randomUUID(),
      editionId,
      schoolId,
      eventId,
      version: 1,
      approvedRevisionId: null as string | null,
      revisions: [
        {
          id: randomUUID(),
          version: 1,
          status: "draft" as const,
          participant: { kind: "athlete" as const, athleteId: id },
        },
      ],
    };
    const submitted = transitionRegistration(state, r, "submit", 1, clock());
    const approved = transitionRegistration(
      state,
      submitted,
      "approve",
      submitted.version,
      clock(),
    );
    state.registrations = [...state.registrations, approved];
  }
  return state;
}
function bundle(state: Registry) {
  const eventId = state.catalog.nodes.find((n) => n.kind === "event")!.id;
  return prepareEvent(
    state,
    eventId,
    "individual_combat",
    { snapshotId: randomUUID(), kind: "score", precision: 0 },
    randomUUID,
    { random: () => 0 },
  );
}
function confirm(m: ResultMatch, left = 2, right = 1): ResultMatch {
  const payload = {
    rule_snapshot_id: m.rule.snapshotId,
    file_ids: [],
    entries: m.participantKeys.map((key, i) => ({
      participant: {
        kind: "athlete" as const,
        athlete_id: key.slice("athlete:".length),
      },
      value: {
        kind: "score" as const,
        scored: i === 0 ? left : right,
        conceded: i === 0 ? right : left,
      },
    })),
  };
  const s = submitPreview(
    m,
    payload,
    randomUUID(),
    clock(),
    randomUUID(),
    m.official ? "Đối chiếu biên bản" : undefined,
  );
  const p = s.submissions.at(-1)!;
  return confirmPreview(
    s,
    {
      submission_id: p.id,
      submission_version: p.version,
      base_official_version: p.base_official_version,
    },
    randomUUID(),
    clock(),
    randomUUID(),
  );
}

export { approvedRegistry, bundle, confirm, clock };
export function complete(b: EventBundle) {
  const records: ResultMatch[] = [];
  while (true) {
    const ready = projectEvent(b, records).find((r) => r.status === "ready");
    if (!ready) break;
    records.push(confirm(resultMatchFromDraw(b, ready.logicalId, records)));
  }
  return records;
}
