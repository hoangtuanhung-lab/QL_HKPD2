import { randomUUID } from "node:crypto";
import type {
  InboxRecord,
  InboxStore,
  InboxTransaction,
  SyncSubmission,
} from "../packages/offline/src/index.js";
import { ids, ref, match, score } from "./group-k-fixtures.js";
export const snapshotId = randomUUID();
export const scope = { actorId: ref.id, editionId: ids.edition };
export const input = (): SyncSubmission => ({
  operation_id: randomUUID(),
  base_version: 1,
  assignment_snapshot_id: snapshotId,
  submission: {
    match_id: ids.match,
    base_official_version: 0,
    payload: score(),
  },
});
/** Test-only serialization+rollback. No volatile server adapter is exported by production package. */
export class TestInboxStore implements InboxStore {
  state = match();
  actor = structuredClone(ref);
  snapshot = {
    id: snapshotId,
    actorId: ref.id,
    editionId: ids.edition,
    eventId: ids.event,
    sportId: ids.sport,
    maySubmit: true,
  };
  records: InboxRecord[] = [];
  current = true;
  sources = true;
  files = true;
  failInsert = false;
  private lock = Promise.resolve();
  transaction<T>(run: (tx: InboxTransaction) => Promise<T>): Promise<T> {
    const result = this.lock.then(async () => {
      const backup = structuredClone({
        state: this.state,
        records: this.records,
      });
      try {
        return await run({
          actor: async (id) =>
            id === this.actor.id ? structuredClone(this.actor) : null,
          match: async (edition, id) =>
            edition === this.state.editionId && id === this.state.id
              ? structuredClone(this.state)
              : null,
          snapshot: async (id) =>
            id === this.snapshot.id ? structuredClone(this.snapshot) : null,
          assignmentCurrent: async () => this.current,
          find: async (s, id) =>
            this.records.find(
              (r) =>
                r.scope.actorId === s.actorId &&
                r.scope.editionId === s.editionId &&
                r.request.operation_id === id,
            ) ?? null,
          sourcesCurrent: async () => this.sources,
          filesAllowed: async () => this.files,
          saveMatch: async (m, v) => {
            if (this.state.version !== v) throw Error("CAS");
            this.state = structuredClone(m);
          },
          insert: async (record) => {
            if (this.failInsert) throw Error("test failure");
            this.records.push(structuredClone(record));
          },
        });
      } catch (error) {
        this.state = backup.state;
        this.records = backup.records;
        throw error;
      }
    });
    this.lock = result.then(
      () => {},
      () => {},
    );
    return result;
  }
}
