export * from "./model.js";
import {
  assertScope,
  assertSubmission,
  assertReceipt,
  canonical,
  requireValue,
  type QueueScope,
  type SyncSubmission,
  type SyncReceipt,
} from "./model.js";
export interface LocalOperation {
  scope: QueueScope;
  submission: SyncSubmission;
  receipt: SyncReceipt | null;
}
export interface QueueStore {
  append(scope: QueueScope, submission: SyncSubmission): Promise<void>;
  list(scope: QueueScope): Promise<LocalOperation[]>;
  acknowledge(
    scope: QueueScope,
    submission: SyncSubmission,
    receipt: SyncReceipt,
  ): Promise<void>;
}
const key = (s: QueueScope, op: string) => [s.actorId, s.editionId, op];
/** No memory fallback: failed/quota-blocked storage must be reported as unsaved. */
export class IndexedDbQueue implements QueueStore {
  private constructor(private readonly db: IDBDatabase) {}
  static async open(factory: IDBFactory, name = "hkpd-offline-v1") {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(name, 1);
      let blocked = false;
      request.onupgradeneeded = () =>
        request.result.createObjectStore("operations");
      request.onsuccess = () => {
        if (blocked) request.result.close();
        else resolve(request.result);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        blocked = true;
        reject(new Error("OFFLINE_STORAGE_BLOCKED"));
      };
    });
    db.onversionchange = () => db.close();
    return new IndexedDbQueue(db);
  }
  close() {
    this.db.close();
  }
  private transaction<T>(
    mode: IDBTransactionMode,
    run: (
      store: IDBObjectStore,
      done: (value: T) => void,
      protect: (fn: () => void) => () => void,
    ) => void,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("operations", mode);
      let value: T;
      let failure: unknown;
      tx.oncomplete = () => resolve(value);
      tx.onabort = () =>
        reject(failure ?? tx.error ?? new Error("OFFLINE_STORAGE_ABORTED"));
      tx.onerror = () => {
        failure ??= tx.error;
      };
      const protect = (fn: () => void) => () => {
        try {
          fn();
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
      try {
        run(
          tx.objectStore("operations"),
          (v) => {
            value = v;
          },
          protect,
        );
      } catch (error) {
        failure = error;
        tx.abort();
      }
    });
  }
  async append(scope: QueueScope, submission: SyncSubmission) {
    assertScope(scope);
    assertSubmission(submission);
    // Clone before yielding so callers cannot change a queued operation during an IDB read.
    const record: LocalOperation = structuredClone({
      scope,
      submission,
      receipt: null,
    });
    await this.transaction<void>("readwrite", (store, done, protect) => {
      const request = store.get(
        key(record.scope, record.submission.operation_id),
      );
      request.onsuccess = protect(() => {
        const old = request.result as LocalOperation | undefined;
        if (old && canonical(old.submission) !== canonical(record.submission)) {
          request.transaction?.abort();
          return;
        }
        if (!old)
          store.add(record, key(record.scope, record.submission.operation_id));
        done();
      });
    });
  }
  async list(scope: QueueScope) {
    assertScope(scope);
    const captured = structuredClone(scope);
    return this.transaction<LocalOperation[]>(
      "readonly",
      (store, done, protect) => {
        const request = store.getAll(
          IDBKeyRange.bound(
            [captured.actorId, captured.editionId, ""],
            [captured.actorId, captured.editionId, "\uffff"],
          ),
        );
        request.onsuccess = protect(() => {
          const records = request.result as LocalOperation[];
          for (const record of records) {
            requireValue(
              Object.keys(record).length === 3 &&
                canonical(record.scope) === canonical(captured),
              "CORRUPT_QUEUE_SCOPE",
            );
            assertSubmission(record.submission);
            if (record.receipt !== null) {
              assertReceipt(record.receipt);
              requireValue(
                record.receipt.operation_id === record.submission.operation_id,
                "RECEIPT_SCOPE",
              );
            }
          }
          done(records);
        });
      },
    );
  }
  async acknowledge(
    scope: QueueScope,
    submission: SyncSubmission,
    receipt: SyncReceipt,
  ) {
    assertScope(scope);
    assertSubmission(submission);
    assertReceipt(receipt);
    requireValue(
      receipt.operation_id === submission.operation_id,
      "RECEIPT_SCOPE",
    );
    const captured = structuredClone({ scope, submission, receipt });
    await this.transaction<void>("readwrite", (store, done, protect) => {
      const request = store.get(
        key(captured.scope, captured.submission.operation_id),
      );
      request.onsuccess = protect(() => {
        const old = request.result as LocalOperation | undefined;
        if (
          !old ||
          canonical(old.submission) !== canonical(captured.submission) ||
          (old.receipt &&
            canonical(old.receipt) !== canonical(captured.receipt))
        ) {
          request.transaction?.abort();
          return;
        }
        store.put(
          { ...old, receipt: captured.receipt },
          key(captured.scope, captured.submission.operation_id),
        );
        done();
      });
    });
  }
}
export type SyncTransport = (
  scope: QueueScope,
  submission: SyncSubmission,
  signal: AbortSignal,
) => Promise<unknown>;
/** Explicit flush only. Concurrent tabs may resend the SAME operation; server deduplicates it. */
export async function flushQueue(
  store: QueueStore,
  scope: QueueScope,
  currentScope: () => QueueScope | null,
  send: SyncTransport,
  timeoutMs = 10000,
) {
  assertScope(scope);
  requireValue(
    Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 120000,
    "INVALID_TIMEOUT",
  );
  const captured = structuredClone(scope);
  let acknowledged = 0;
  for (const record of await store.list(captured)) {
    if (record.receipt) continue;
    if (canonical(currentScope()) !== canonical(captured))
      return { acknowledged, paused: true };
    try {
      assertSubmission(record.submission);
      const signal = AbortSignal.timeout(timeoutMs);
      const receipt = await withDeadline(
        send(
          structuredClone(captured),
          structuredClone(record.submission),
          signal,
        ),
        signal,
      );
      assertReceipt(receipt);
      requireValue(
        receipt.operation_id === record.submission.operation_id,
        "RECEIPT_SCOPE",
      );
      if (canonical(currentScope()) !== canonical(captured))
        return { acknowledged, paused: true };
      await store.acknowledge(captured, record.submission, receipt);
      acknowledged++;
    } catch {
      return { acknowledged, paused: true };
    }
  }
  return { acknowledged, paused: false };
}

async function withDeadline<T>(
  work: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  let abort: () => void = () => {};
  const deadline = new Promise<never>((_, reject) => {
    abort = () => reject(new Error("SYNC_TIMEOUT"));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    signal.removeEventListener("abort", abort);
  }
}
