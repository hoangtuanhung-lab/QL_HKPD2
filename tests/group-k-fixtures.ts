import { randomUUID } from "node:crypto";
import type { Actor } from "@hkpd/foundation";
import type {
  ResultMatch,
  ResultStore,
  CommandReply,
  ResultCommand,
  ResultOperation,
} from "../packages/results/src/index.js";
export const ids = {
  edition: randomUUID(),
  event: randomUUID(),
  sport: randomUUID(),
  match: randomUUID(),
  athleteA: randomUUID(),
  athleteB: randomUUID(),
  rule: randomUUID(),
  ref: randomUUID(),
  leader: randomUUID(),
  admin: randomUUID(),
};
export const ref: Actor = {
  id: ids.ref,
  approved: true,
  schoolId: "ref-school",
  assignments: [
    {
      editionId: ids.edition,
      role: "referee",
      sportId: ids.sport,
      eventIds: [ids.event],
    },
  ],
};
export const leader: Actor = {
  id: ids.leader,
  approved: true,
  schoolId: "school-a",
  assignments: [{ editionId: ids.edition, role: "leader", sportId: ids.sport }],
};
export const admin: Actor = {
  id: ids.admin,
  approved: true,
  assignments: [{ editionId: ids.edition, role: "admin" }],
};
export const clock = () => new Date("2026-10-11T00:00:00Z");
export function match(): ResultMatch {
  return {
    id: ids.match,
    editionId: ids.edition,
    eventId: ids.event,
    sportId: ids.sport,
    version: 1,
    locked: false,
    participantSchoolIds: ["school-a", "school-b"],
    participantKeys: [`athlete:${ids.athleteA}`, `athlete:${ids.athleteB}`],
    prerequisiteOfficialVersions: {},
    rule: { snapshotId: ids.rule, kind: "score", precision: 0 },
    lease: null,
    submissions: [],
    official: null,
    officialHistory: [],
  };
}
export const score = (a = 2, b = 1) => ({
  rule_snapshot_id: ids.rule,
  entries: [
    {
      participant: { kind: "athlete" as const, athlete_id: ids.athleteA },
      value: { kind: "score" as const, scored: a, conceded: b },
    },
    {
      participant: { kind: "athlete" as const, athlete_id: ids.athleteB },
      value: { kind: "score" as const, scored: b, conceded: a },
    },
  ],
  file_ids: [],
});
export const command = (
  operation: ResultOperation,
  baseVersion = 1,
  actorId = ids.ref,
  sessionId = "session-a",
): ResultCommand => ({
  actorId,
  sessionId,
  editionId: ids.edition,
  matchId: ids.match,
  key: randomUUID(),
  baseVersion,
  operation,
});
/** Test-only serialized transaction with full rollback. Not exported from production modules. */
export class TestResultStore implements ResultStore {
  state = match();
  actors = [ref, leader, admin];
  sourcesCurrent = true;
  filesAllowed = true;
  delegation = false;
  failAt: string | null = null;
  receipts = new Map<string, { fingerprint: string; reply: CommandReply }>();
  audits: unknown[] = [];
  events: unknown[] = [];
  invalidations = 0;
  private lock = Promise.resolve();
  transaction<T>(run: Parameters<ResultStore["transaction"]>[0]): Promise<T> {
    const result = this.lock.then(async () => {
      const backup = {
        state: structuredClone(this.state),
        receipts: structuredClone(this.receipts),
        audits: structuredClone(this.audits),
        events: structuredClone(this.events),
        invalidations: this.invalidations,
      };
      const fail = (step: string) => {
        if (this.failAt === step) throw new Error("synthetic failure");
      };
      try {
        return await run({
          actor: async (id) => this.actors.find((a) => a.id === id) ?? null,
          matchForUpdate: async () => structuredClone(this.state),
          prerequisitesCurrent: async () => this.sourcesCurrent,
          fileLinksAllowed: async () => this.filesAllowed,
          adminDelegation: async () => this.delegation,
          receipt: async (key) => this.receipts.get(key) ?? null,
          save: async (next, expected) => {
            if (expected !== this.state.version) throw new Error("CAS");
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
          invalidateDependents: async () => {
            this.invalidations++;
            fail("invalidate");
          },
          saveReceipt: async (key, record) => {
            this.receipts.set(key, structuredClone(record));
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
