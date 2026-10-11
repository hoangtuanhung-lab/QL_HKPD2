import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { digest } from "./release-readiness.mjs";

export const tables = [
  "schools",
  "catalog",
  "quotas",
  "accounts",
  "ruleSnapshots",
];
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
function normalize(data) {
  if (
    data?.format !== "hkpd-reconciliation-v1" ||
    typeof data.editionId !== "string" ||
    !data.editionId.trim() ||
    typeof data.ruleVersion !== "string" ||
    !data.ruleVersion.trim()
  )
    throw new Error("INVALID_DATASET");
  if (
    Object.keys(data).some(
      (key) => !["format", "editionId", "ruleVersion", ...tables].includes(key),
    )
  )
    throw new Error("UNKNOWN_TABLE");
  return Object.fromEntries(
    tables.map((table) => {
      const rows = data[table];
      if (!Array.isArray(rows)) throw new Error("MISSING_TABLE");
      const ids = new Set();
      for (const row of rows) {
        if (
          !row ||
          typeof row !== "object" ||
          Array.isArray(row) ||
          typeof row.id !== "string" ||
          !row.id.trim() ||
          ids.has(row.id)
        )
          throw new Error("INVALID_OR_DUPLICATE_ID");
        ids.add(row.id);
      }
      return [
        table,
        rows
          .map(canonical)
          .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
      ];
    }),
  );
}
// Aggregate reports deliberately omit row IDs, names, emails and field values.
export function reconcile(source, candidate) {
  const left = normalize(source),
    right = normalize(candidate);
  const scopeMatches =
    source.editionId === candidate.editionId &&
    source.ruleVersion === candidate.ruleVersion;
  const reports = tables.map((table) => {
    const a = new Map(left[table].map((row) => [row.id, JSON.stringify(row)]));
    const b = new Map(right[table].map((row) => [row.id, JSON.stringify(row)]));
    return {
      table,
      sourceCount: a.size,
      candidateCount: b.size,
      missing: [...a.keys()].filter((id) => !b.has(id)).length,
      unexpected: [...b.keys()].filter((id) => !a.has(id)).length,
      changed: [...a.keys()].filter(
        (id) => b.has(id) && a.get(id) !== b.get(id),
      ).length,
      sourceSha256: digest(JSON.stringify(left[table])),
      candidateSha256: digest(JSON.stringify(right[table])),
    };
  });
  return {
    matches:
      scopeMatches &&
      reports.every((r) => !r.missing && !r.unexpected && !r.changed),
    scopeMatches,
    reports,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    if (process.argv.length !== 4) throw new Error("INPUT_REQUIRED");
    const result = reconcile(
      ...process.argv
        .slice(2)
        .map((path) => JSON.parse(readFileSync(path, "utf8"))),
    );
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.matches ? 0 : 2;
  } catch {
    console.error("RECONCILIATION_INPUT_INVALID");
    process.exitCode = 1;
  }
}
