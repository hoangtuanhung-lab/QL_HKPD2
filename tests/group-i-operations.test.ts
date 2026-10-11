import { describe, it, expect } from "vitest";
import {
  makeManifest,
  verifyBackup,
  retentionExpired,
  prepareRestore,
  assertMigrationUnchanged,
  retryAfterFailure,
  athleteFolderIntent,
  offlineProblem,
  OfflineError,
} from "../packages/offline/src/index.js";
import { ids } from "./group-k-fixtures.js";
const now = new Date("2026-10-11T00:00:00Z");
const bytes = new TextEncoder().encode('{"synthetic":true}');
const metadata = {
  editionId: ids.edition,
  schemaVersion: "dev-1",
  keyVersion: "synthetic-1",
  createdAt: now.toISOString(),
  kind: "hourly" as const,
  recordCounts: { athletes: 500, schools: 7 },
};
const manifest = () => makeManifest(bytes, metadata);
describe("I03/I04/I07 deferred service preparation", () => {
  it("generates the same private folder intent key for each athlete/edition", () => {
    const a = athleteFolderIntent(ids.edition, ids.athleteA);
    expect(athleteFolderIntent(ids.edition, ids.athleteA)).toEqual(a);
    expect(a.visibility).toBe("private");
    expect(a.status).toBe("deferred");
    expect(athleteFolderIntent(ids.edition, ids.athleteB).key).not.toBe(a.key);
    expect(() => athleteFolderIntent("../private", ids.athleteA)).toThrow();
  });
  it("bounds retry count/backoff without dropping failed intents", () => {
    let s = {
      attempts: 0,
      dueAt: now.toISOString(),
      status: "pending" as const,
    } as Parameters<typeof retryAfterFailure>[0];
    for (let i = 1; i <= 8; i++) {
      s = retryAfterFailure(s, now, true);
      expect(s.attempts).toBe(i);
      expect(Date.parse(s.dueAt) - now.getTime()).toBeLessThanOrEqual(300000);
    }
    expect(s.status).toBe("manual_review");
    expect(() => retryAfterFailure(s, now, true)).toThrow();
    expect(
      retryAfterFailure(
        { attempts: 0, dueAt: now.toISOString(), status: "pending" },
        now,
        false,
      ).status,
    ).toBe("manual_review");
  });
  it("verifies actual byte checksum and rejects corrupt/incomplete backups", () => {
    const m = manifest();
    expect(() => verifyBackup(m, bytes)).not.toThrow();
    const changed = bytes.slice();
    changed[0] = 0;
    expect(() => verifyBackup(m, changed)).toThrow("BACKUP_CHECKSUM_MISMATCH");
    expect(() => verifyBackup(m, bytes.slice(1))).toThrow(
      "BACKUP_CHECKSUM_MISMATCH",
    );
  });
  it.each([
    ["hourly", 7],
    ["daily", 30],
  ] as const)(
    "retains %s for %d days with an exact expiration boundary",
    (kind, days) => {
      const m = { ...manifest(), kind };
      expect(
        retentionExpired(m, new Date(now.getTime() + days * 86400000 - 1)),
      ).toBe(false);
      expect(
        retentionExpired(m, new Date(now.getTime() + days * 86400000)),
      ).toBe(true);
    },
  );
  it("never marks final archive eligible for automatic removal", () => {
    expect(
      retentionExpired(
        { ...manifest(), kind: "edition_final" },
        new Date("2126-10-11T00:00:00Z"),
      ),
    ).toBe(false);
    expect(() =>
      retentionExpired(manifest(), new Date("2025-01-01")),
    ).toThrow();
  });
  it("requires a verified current snapshot and explicit reason before preparing a restore", () => {
    const target = { ...manifest(), createdAt: "2026-10-10T00:00:00Z" },
      current = manifest();
    const options = {
      editionId: ids.edition,
      schemaVersion: metadata.schemaVersion,
      keyVersion: metadata.keyVersion,
      reason: "Diễn tập tổng hợp",
      now,
    };
    expect(prepareRestore(target, bytes, current, bytes, options).status).toBe(
      "prepared_not_restored",
    );
    expect(() =>
      prepareRestore(target, bytes, current, bytes, {
        ...options,
        reason: " ",
      }),
    ).toThrow("RESTORE_REASON_REQUIRED");
    expect(() =>
      prepareRestore(target, bytes, current, bytes, {
        ...options,
        now: new Date(now.getTime() + 300001),
      }),
    ).toThrow("CURRENT_BACKUP_REQUIRED");
    expect(() =>
      prepareRestore(target, bytes, current, bytes, {
        ...options,
        keyVersion: "other",
      }),
    ).toThrow("RESTORE_SCOPE_MISMATCH");
    expect(() =>
      prepareRestore(
        target,
        bytes,
        { ...current, sha256: "0".repeat(64) },
        bytes,
        options,
      ),
    ).toThrow("BACKUP_CHECKSUM_MISMATCH");
  });
  it("rejects migration record-count/data/edition/key mismatches", () => {
    const before = manifest();
    expect(() =>
      assertMigrationUnchanged(before, {
        ...before,
        createdAt: "2026-10-12T00:00:00Z",
      }),
    ).not.toThrow();
    for (const patch of [
      { recordCounts: { athletes: 499, schools: 7 } },
      { sha256: "0".repeat(64) },
      { keyVersion: "other" },
      { editionId: ids.event },
    ])
      expect(() =>
        assertMigrationUnchanged(before, { ...before, ...patch }),
      ).toThrow("MIGRATION_MISMATCH");
  });
  it("rejects invalid manifest counts", () => {
    expect(() =>
      makeManifest(bytes, { ...metadata, recordCounts: { athletes: -1 } }),
    ).toThrow("INVALID_BACKUP_MANIFEST");
  });
});
describe("I05 safe errors", () => {
  it.each([
    ["FORBIDDEN", 403],
    ["NOT_FOUND", 404],
    ["IDEMPOTENCY_CONFLICT", 409],
    ["INVALID_SYNC_SUBMISSION", 400],
    ["INVALID_SCOPE", 400],
    ["PRIVATE_INTERNAL", 500],
  ] as const)(
    "normalizes %s without exposing inbox content",
    (code, status) => {
      const p = offlineProblem(new OfflineError(code));
      expect(p.status).toBe(status);
      expect(p.body.message).not.toContain("PRIVATE_INTERNAL");
      expect(p.body.request_id).toMatch(/^[0-9a-f-]{36}$/);
    },
  );
  it("hides arbitrary storage/provider messages", () => {
    const p = offlineProblem(new Error("synthetic PII payload secret"));
    expect(p.status).toBe(500);
    expect(JSON.stringify(p)).not.toContain("synthetic PII");
  });
});
