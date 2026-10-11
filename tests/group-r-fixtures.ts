import { randomUUID } from "node:crypto";
import type { Actor } from "@hkpd/foundation";
import {
  snapshotCatalog,
  type Registry,
  type CatalogNode,
  type Athlete,
  type Registration,
  type RegistryStore,
  type Receipt,
} from "../packages/registration/src/index.js";
export const ids = {
  edition: "00000000-0000-4000-8000-000000000001",
  school: "00000000-0000-4000-8000-000000000002",
  sport: "00000000-0000-4000-8000-000000000006",
  event: "00000000-0000-4000-8000-000000000005",
};
export function nodes(): CatalogNode[] {
  return [
    {
      id: ids.sport,
      code: "sport-test",
      name: "Môn thử",
      kind: "sport",
      parentId: null,
      order: 1,
      active: true,
      rules: { schoolQuota: 2, maxEventsPerSport: 2 },
    },
    {
      id: ids.event,
      code: "event-test",
      name: "Nội dung thử",
      kind: "event",
      parentId: ids.sport,
      order: 1,
      active: true,
      participantKind: "athlete",
      rules: { gender: "male", minAge: 10, maxAge: 15 },
    },
  ];
}
export function athlete(id: string, sex: "male" | "female" = "male"): Athlete {
  return {
    id,
    studentId: `student-${id}`,
    schoolId: ids.school,
    editionId: ids.edition,
    studentCode: `code-${id}`,
    name: "VĐV tổng hợp",
    birthYear: 2014,
    grade: 6,
    sex,
    profileStatus: "approved",
    athleteCode: `01.${id.replace(/\D/g, "") || "001"}`,
    version: 1,
  };
}
export function registration(
  id: string,
  athleteId: string,
  eventId = ids.event,
): Registration {
  return {
    id,
    editionId: ids.edition,
    schoolId: ids.school,
    eventId,
    version: 1,
    approvedRevisionId: null,
    revisions: [
      {
        id: `rev-${id}`,
        version: 1,
        status: "draft",
        participant: { kind: "athlete", athleteId },
      },
    ],
  };
}
export function registry(): Registry {
  return {
    editionId: ids.edition,
    year: 2026,
    version: 1,
    registrationOpen: true,
    deadline: "2026-10-25T00:00:00Z",
    schoolCodes: { [ids.school]: "01" },
    athleteSequenceWidth: 3,
    masterListPresent: false,
    catalog: snapshotCatalog("snapshot-test", ids.edition, 1, nodes()),
    students: [],
    athletes: [],
    teams: [],
    registrations: [],
  };
}
export const schoolActor: Actor = {
  id: "school-actor",
  approved: true,
  assignments: [
    { editionId: ids.edition, role: "school", schoolId: ids.school },
  ],
};
export const adminActor: Actor = {
  id: "admin-actor",
  approved: true,
  assignments: [{ editionId: ids.edition, role: "admin" }],
};
/** Synthetic serialized/rollback adapter for tests ONLY; never used by API or UI. */
export class TestRegistryStore implements RegistryStore {
  state: Registry;
  actors: Actor[] = [schoolActor, adminActor];
  receipts = new Map<string, Receipt>();
  sequence = 0;
  audits: unknown[] = [];
  events: unknown[] = [];
  failAt: string | null = null;
  private lock = Promise.resolve();
  constructor(state = registry()) {
    this.state = structuredClone(state);
  }
  transaction<T>(run: Parameters<RegistryStore["transaction"]>[0]): Promise<T> {
    const result = this.lock.then(async () => {
      const backup = {
        state: structuredClone(this.state),
        receipts: structuredClone(this.receipts),
        sequence: this.sequence,
        audits: structuredClone(this.audits),
        events: structuredClone(this.events),
      };
      const fail = (step: string) => {
        if (this.failAt === step) throw new Error("synthetic failure");
      };
      try {
        return await run({
          actor: async (id) => this.actors.find((a) => a.id === id) ?? null,
          registryForUpdate: async () => structuredClone(this.state),
          nextAthleteSequence: async () => ++this.sequence,
          receipt: async (key) => this.receipts.get(key) ?? null,
          save: async (next, expected) => {
            if (this.state.version !== expected) throw new Error("CAS");
            this.state = structuredClone(next);
            fail("save");
          },
          audit: async (record) => {
            this.audits.push(record);
            fail("audit");
          },
          enqueue: async (event) => {
            this.events.push(event);
            fail("enqueue");
          },
          saveReceipt: async (key, receipt) => {
            this.receipts.set(key, structuredClone(receipt));
            fail("receipt");
          },
        });
      } catch (error) {
        Object.assign(this, backup);
        throw error;
      }
    });
    this.lock = result.then(
      () => undefined,
      () => undefined,
    );
    return result as Promise<T>;
  }
}
export const command = (
  operation: Parameters<
    typeof import("../packages/registration/src/service.js").executeRegistration
  >[1]["operation"],
  baseVersion = 1,
  actorId = schoolActor.id,
) => ({
  actorId,
  editionId: ids.edition,
  key: randomUUID(),
  baseVersion,
  operation,
});
export const clock = () => new Date("2026-10-11T00:00:00Z");
