import { createHash } from "node:crypto";
import { requireValue, canonical } from "./model.js";
export interface RetryState {
  attempts: number;
  dueAt: string;
  status: "pending" | "complete" | "manual_review";
}
/** Persist before scheduling; provider timeout keeps the original job key, never creates another intent. */
export function retryAfterFailure(
  state: RetryState,
  now: Date,
  retryable: boolean,
): RetryState {
  requireValue(
    state.status === "pending" &&
      Number.isSafeInteger(state.attempts) &&
      state.attempts >= 0 &&
      state.attempts < Number.MAX_SAFE_INTEGER &&
      Number.isFinite(Date.parse(state.dueAt)) &&
      Number.isFinite(now.getTime()),
    "INVALID_RETRY_STATE",
  );
  const attempts = state.attempts + 1;
  return {
    attempts,
    status: !retryable || attempts >= 8 ? "manual_review" : "pending",
    dueAt: new Date(
      now.getTime() + Math.min(300000, 1000 * 2 ** Math.min(attempts - 1, 9)),
    ).toISOString(),
  };
}
export interface BackupManifest {
  format: 1;
  editionId: string;
  schemaVersion: string;
  keyVersion: string;
  createdAt: string;
  kind: "hourly" | "daily" | "edition_final";
  bytes: number;
  sha256: string;
  recordCounts: Record<string, number>;
}
export function makeManifest(
  data: Uint8Array,
  metadata: Omit<BackupManifest, "format" | "bytes" | "sha256">,
): BackupManifest {
  const manifest: BackupManifest = {
    ...structuredClone(metadata),
    format: 1,
    bytes: data.byteLength,
    sha256: createHash("sha256").update(data).digest("hex"),
  };
  validateManifest(manifest);
  return manifest;
}
function validateManifest(m: BackupManifest) {
  requireValue(
    m.format === 1 &&
      !!m.editionId &&
      !!m.schemaVersion &&
      !!m.keyVersion &&
      Number.isFinite(Date.parse(m.createdAt)) &&
      ["hourly", "daily", "edition_final"].includes(m.kind) &&
      Number.isSafeInteger(m.bytes) &&
      m.bytes >= 0 &&
      /^[a-f0-9]{64}$/.test(m.sha256) &&
      Object.values(m.recordCounts).every(
        (v) => Number.isSafeInteger(v) && v >= 0,
      ),
    "INVALID_BACKUP_MANIFEST",
  );
}
export function verifyBackup(manifest: BackupManifest, data: Uint8Array) {
  validateManifest(manifest);
  requireValue(
    manifest.bytes === data.byteLength &&
      manifest.sha256 === createHash("sha256").update(data).digest("hex"),
    "BACKUP_CHECKSUM_MISMATCH",
  );
}
/** Eligibility only. No deletion, scheduler, SQL restore or real-file backup is performed here. */
export function retentionExpired(m: BackupManifest, now: Date): boolean {
  validateManifest(m);
  requireValue(
    Number.isFinite(now.getTime()) && Date.parse(m.createdAt) <= now.getTime(),
    "INVALID_RETENTION_CLOCK",
  );
  return (
    m.kind !== "edition_final" &&
    now.getTime() - Date.parse(m.createdAt) >=
      (m.kind === "hourly" ? 7 : 30) * 86400000
  );
}
export function prepareRestore(
  target: BackupManifest,
  targetData: Uint8Array,
  current: BackupManifest,
  currentData: Uint8Array,
  options: {
    editionId: string;
    schemaVersion: string;
    keyVersion: string;
    reason: string;
    now: Date;
  },
) {
  verifyBackup(target, targetData);
  verifyBackup(current, currentData);
  requireValue(
    options.reason.trim().length > 0 && options.reason.length <= 2000,
    "RESTORE_REASON_REQUIRED",
  );
  requireValue(
    target.editionId === options.editionId &&
      current.editionId === options.editionId &&
      target.schemaVersion === options.schemaVersion &&
      target.keyVersion === options.keyVersion &&
      current.schemaVersion === options.schemaVersion &&
      current.keyVersion === options.keyVersion,
    "RESTORE_SCOPE_MISMATCH",
  );
  requireValue(
    Number.isFinite(options.now.getTime()) &&
      Date.parse(target.createdAt) <= Date.parse(current.createdAt) &&
      options.now.getTime() >= Date.parse(current.createdAt) &&
      options.now.getTime() - Date.parse(current.createdAt) <= 300000,
    "CURRENT_BACKUP_REQUIRED",
  );
  return {
    targetSha256: target.sha256,
    currentSha256: current.sha256,
    editionId: options.editionId,
    reason: options.reason.trim(),
    status: "prepared_not_restored" as const,
  };
}
/** Exercise adapter must take coherent, independently exported snapshots before and after migration. */
export function assertMigrationUnchanged(
  before: BackupManifest,
  after: BackupManifest,
) {
  validateManifest(before);
  validateManifest(after);
  requireValue(
    before.editionId === after.editionId &&
      before.schemaVersion === after.schemaVersion &&
      before.keyVersion === after.keyVersion &&
      before.bytes === after.bytes &&
      before.sha256 === after.sha256 &&
      canonical(before.recordCounts) === canonical(after.recordCounts),
    "MIGRATION_MISMATCH",
  );
}
export interface AthleteFolderIntent {
  editionId: string;
  athleteId: string;
  key: string;
  visibility: "private";
  status: "deferred";
}
/** One logical folder per athlete, independent of schools/results. Provision only through R02's durable outbox. */
export function athleteFolderIntent(
  editionId: string,
  athleteId: string,
): AthleteFolderIntent {
  const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  requireValue(
    uuid.test(editionId) && uuid.test(athleteId),
    "INVALID_FOLDER_SCOPE",
  );
  return {
    editionId,
    athleteId,
    key: `athlete-folder:${editionId.toLowerCase()}:${athleteId.toLowerCase()}`,
    visibility: "private",
    status: "deferred",
  };
}
