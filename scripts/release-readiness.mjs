import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const digest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export const evidenceKeys = [
  ...Array.from({ length: 7 }, (_, i) => `G${i}`),
  "data_reconciliation",
  "backup_restore",
  "migration_rollback",
  "I07",
  "manuals",
  "on_call",
  "user_acceptance",
  "quality_checks",
];
// Checks completeness and byte integrity, not the truth of a human attestation.
export function auditRelease(manifest, cases, readEvidence) {
  const blockers = [];
  if (manifest?.format !== "hkpd-release-v1") blockers.push("INVALID_FORMAT");
  if (!/^[a-f0-9]{40}$/.test(manifest?.commit ?? ""))
    blockers.push("INVALID_COMMIT");
  if (manifest?.environment !== "staging-real-backend")
    blockers.push("REAL_BACKEND_REQUIRED");
  if (manifest?.criticalDefects !== 0)
    blockers.push("CRITICAL_DEFECTS_UNRESOLVED");
  const checkEvidence = (entry, key) => {
    if (
      entry?.status !== "passed" ||
      typeof entry.reviewedBy !== "string" ||
      !entry.reviewedBy.trim() ||
      entry.commit !== manifest.commit ||
      !/^[a-f0-9]{64}$/.test(entry.sha256 ?? "") ||
      typeof entry.path !== "string"
    ) {
      blockers.push(`EVIDENCE_REQUIRED:${key}`);
      return;
    }
    try {
      const bytes = readEvidence(entry.path);
      if (!bytes.length || digest(bytes) !== entry.sha256)
        blockers.push(`EVIDENCE_MISMATCH:${key}`);
    } catch {
      blockers.push(`EVIDENCE_UNREADABLE:${key}`);
    }
  };
  for (const key of evidenceKeys) checkEvidence(manifest?.evidence?.[key], key);
  const executions = manifest?.uat ?? [];
  if (!Array.isArray(executions)) blockers.push("INVALID_UAT");
  for (const id of cases) {
    const matches = Array.isArray(executions)
      ? executions.filter((x) => x?.id === id)
      : [];
    if (matches.length !== 1) blockers.push(`UAT_REQUIRED:${id}`);
    else checkEvidence(matches[0], `UAT:${id}`);
  }
  if (
    Array.isArray(executions) &&
    executions.some((x) => !cases.includes(x?.id))
  )
    blockers.push("UNKNOWN_UAT_CASE");
  return { ready: blockers.length === 0, blockers };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const manifestPath =
      process.argv[2] ?? "docs/group-d/release-manifest.json";
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const baseline = JSON.parse(
      readFileSync("docs/business/requirements.json", "utf8"),
    );
    const result = auditRelease(
      manifest,
      baseline.scenarios.map((x) => x.id),
      (path) => readFileSync(path),
    );
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ready ? 0 : 2;
  } catch {
    console.error("RELEASE_INPUT_INVALID");
    process.exitCode = 1;
  }
}
