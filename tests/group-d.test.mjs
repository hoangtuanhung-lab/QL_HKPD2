import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  auditRelease,
  digest,
  evidenceKeys,
} from "../scripts/release-readiness.mjs";
import { reconcile, tables } from "../scripts/reconcile-data.mjs";
const fixture = () => ({
  format: "hkpd-reconciliation-v1",
  editionId: "synthetic-edition",
  ruleVersion: "test-only",
  ...Object.fromEntries(
    tables.map((t) => [t, [{ id: "001", value: "synthetic" }]]),
  ),
});
const bytes = Buffer.from("synthetic evidence for validator tests only");
const evidence = () => ({
  status: "passed",
  commit: "a".repeat(40),
  reviewedBy: "synthetic-reviewer",
  path: "fixture",
  sha256: digest(bytes),
});
const manifest = () => ({
  format: "hkpd-release-v1",
  commit: "a".repeat(40),
  environment: "staging-real-backend",
  criticalDefects: 0,
  evidence: Object.fromEntries(evidenceKeys.map((key) => [key, evidence()])),
  uat: [{ id: "T01", ...evidence() }],
});
describe("D02 private export reconciliation", () => {
  it("compares full records while ignoring object and row order", () => {
    const a = fixture(),
      b = fixture();
    a.schools.push({ id: "002", code: "002", name: "synthetic school" });
    b.schools.unshift({ name: "synthetic school", code: "002", id: "002" });
    expect(reconcile(a, b).matches).toBe(true);
  });
  it("retains leading zero IDs and detects missing, unexpected and changed records", () => {
    const a = fixture(),
      b = fixture();
    b.schools[0].id = "1";
    b.accounts[0].value = "private-person@example.invalid";
    const result = reconcile(a, b);
    expect(result.matches).toBe(false);
    expect(result.reports[0]).toMatchObject({ missing: 1, unexpected: 1 });
    expect(result.reports[3].changed).toBe(1);
    expect(JSON.stringify(result)).not.toContain("private-person");
  });
  it("rejects duplicate IDs, incomplete exports and unknown tables", () => {
    const a = fixture();
    a.schools.push(a.schools[0]);
    expect(() => reconcile(a, fixture())).toThrow();
    const b = fixture();
    delete b.accounts;
    expect(() => reconcile(b, fixture())).toThrow();
    expect(() => reconcile({ ...fixture(), extra: [] }, fixture())).toThrow();
  });
  it("rejects different editions or rule snapshots", () => {
    expect(
      reconcile(fixture(), { ...fixture(), editionId: "other" }).matches,
    ).toBe(false);
    expect(
      reconcile(fixture(), { ...fixture(), ruleVersion: "other" }).matches,
    ).toBe(false);
  });
});
describe("D03 release evidence gate", () => {
  it("accepts complete byte-verified synthetic evidence only for validator testing", () => {
    expect(auditRelease(manifest(), ["T01"], () => bytes).ready).toBe(true);
  });
  it("blocks current pending manifest and preserves all 20 source UAT cases", () => {
    const baseline = JSON.parse(
      readFileSync("docs/business/requirements.json"),
    );
    const cases = JSON.parse(readFileSync("docs/group-d/uat-cases.json")).cases;
    expect(cases.map((c) => c.id)).toEqual(baseline.scenarios.map((c) => c.id));
    for (const [index, entry] of cases.entries()) {
      expect(entry.source).toEqual(baseline.scenarios[index].source);
      expect(entry.status).toBe("pending");
    }
    const current = JSON.parse(
      readFileSync("docs/group-d/release-manifest.json"),
    );
    expect(
      auditRelease(
        current,
        cases.map((c) => c.id),
        () => bytes,
      ).ready,
    ).toBe(false);
  });
  it.each(evidenceKeys)("blocks missing evidence %s", (key) => {
    const m = manifest();
    delete m.evidence[key];
    expect(auditRelease(m, ["T01"], () => bytes).blockers).toContain(
      `EVIDENCE_REQUIRED:${key}`,
    );
  });
  it("blocks stale, corrupted or unreadable evidence", () => {
    const m = manifest();
    m.evidence.G0.commit = "b".repeat(40);
    expect(auditRelease(m, ["T01"], () => bytes).ready).toBe(false);
    expect(
      auditRelease(manifest(), ["T01"], () => Buffer.from("changed")).ready,
    ).toBe(false);
    expect(
      auditRelease(manifest(), ["T01"], () => {
        throw new Error("absent");
      }).ready,
    ).toBe(false);
  });
  it("blocks mock backend, critical defects and duplicate/missing/unknown cases", () => {
    for (const patch of [
      { environment: "mock" },
      { criticalDefects: 1 },
      { criticalDefects: null },
      { uat: [] },
      { uat: [evidence()] },
      { uat: [...manifest().uat, ...manifest().uat] },
    ]) {
      expect(
        auditRelease({ ...manifest(), ...patch }, ["T01"], () => bytes).ready,
      ).toBe(false);
    }
  });
});
