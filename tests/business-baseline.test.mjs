import { afterEach, describe, expect, it } from "vitest";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const temporary = [];
afterEach(async () => {
  await Promise.all(
    temporary
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "hkpd-a01-"));
  temporary.push(root);
  await mkdir(join(root, "scripts"));
  await mkdir(join(root, "docs"));
  await cp(join(repository, "docs/business"), join(root, "docs/business"), {
    recursive: true,
  });
  for (const entry of [
    "apps",
    "packages",
    "tests",
    "infra",
    ".github",
    "node_modules",
  ])
    await symlink(join(repository, entry), join(root, entry));
  for (const entry of [
    "api",
    "architecture",
    "runbooks",
    "B02",
    "group-d",
    "group-r",
    "group-k",
    "group-i",
  ])
    await symlink(join(repository, "docs", entry), join(root, "docs", entry));
  for (const entry of await readdir(join(repository, "scripts"))) {
    const target = join(root, "scripts", entry);
    if (entry === "business-baseline.mjs")
      await cp(join(repository, "scripts", entry), target);
    else await symlink(join(repository, "scripts", entry), target);
  }
  const path = join(root, "docs/business/requirements.json");
  const data = JSON.parse(await readFile(path, "utf8"));
  return { root, data, save: () => writeFile(path, JSON.stringify(data)) };
}
function run(root, mode = "--check") {
  try {
    return {
      ok: true,
      output: execFileSync(
        process.execPath,
        ["scripts/business-baseline.mjs", mode],
        { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ),
    };
  } catch (error) {
    return { ok: false, output: error.stderr.toString() };
  }
}
describe("A01 baseline guard", () => {
  it("keeps historical requirements in traceability while excluding superseded rows from current backlog", async () => {
    const { root } = await fixture();
    expect(run(root, "--generate").ok).toBe(true);
    const matrix = await readFile(
      join(root, "docs/business/traceability.md"),
      "utf8",
    );
    const backlog = await readFile(
      join(root, "docs/business/current-backlog.md"),
      "utf8",
    );
    expect(matrix).toMatch(/\| QT37\s+\|/);
    expect(backlog).not.toMatch(/\| QT37\s+\|/);
    expect(backlog).toMatch(/\| QT37-R1\s+\|/);
    expect(run(root).ok).toBe(true);
    await writeFile(
      join(root, "docs/business/current-backlog.md"),
      backlog + "stale row\n",
    );
    expect(run(root).output).toContain("out of date");
  });
  it("rejects altered source bytes and fabricated quotations", async () => {
    const { root, data, save } = await fixture();
    data.requirements[0].sources[0].quote = "Không có câu này trong nguồn";
    await save();
    expect(run(root, "--generate").output).toContain(
      "Quote missing from source",
    );
    const source = join(root, "docs/business/sources/plan-v1.4.txt");
    await writeFile(source, (await readFile(source, "utf8")) + "modified\n");
    expect(run(root, "--generate").output).toContain("Source checksum changed");
  });
  it("rejects nonexistent WBS links and unapproved plan rules marked confirmed", async () => {
    const { root, data, save } = await fixture();
    data.requirements[0].wbs_ids = ["A99"];
    await save();
    expect(run(root, "--generate").output).toContain("Unknown wbs_ids A99");
    data.requirements[0].wbs_ids = ["A01"];
    data.requirements[0].decision_status = "confirmed";
    await save();
    expect(run(root, "--generate").output).toContain("Missing user decision");
  });
  it("rejects missing successors and replacement cycles instead of hiding both decisions", async () => {
    const { root, data, save } = await fixture();
    const old = data.requirements.find((r) => r.id === "QT37");
    old.superseded_by = ["missing-successor"];
    await save();
    expect(run(root, "--generate").output).toContain("Unknown successor");
    old.superseded_by = ["QT37-R1"];
    const successor = data.requirements.find((r) => r.id === "QT37-R1");
    successor.decision_status = "superseded";
    successor.superseded_by = ["QT37"];
    await save();
    expect(run(root, "--generate").output).toContain("Replacement cycle");
  });
  it("rejects missing PDF coverage and assistant question text falsely cited as a user answer", async () => {
    const { root, data, save } = await fixture();
    const removed = data.source_questions.pop();
    await save();
    expect(run(root, "--generate").output).toContain("PDF coverage");
    data.source_questions.push(removed);
    const requirement = data.requirements.find(
      (r) => r.id === "RQ-PDF-TRANSFER",
    );
    requirement.sources[0] = {
      ...data.source_questions.find((q) => q.id === "PDF-Q287")
        .source_occurrences[0],
      speaker: "user",
      context_question_id: "PDF-Q287",
      verification: "transcript_reviewed",
    };
    await save();
    expect(run(root, "--generate").output).toContain(
      "User quote outside answer context",
    );
  });
});
