import { afterEach, expect, it } from "vitest";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
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
  const root = await mkdtemp(join(tmpdir(), "hkpd-a06-"));
  temporary.push(root);
  await mkdir(join(root, "scripts"));
  await mkdir(join(root, "docs"));
  await cp(
    join(repository, "scripts/group-a.mjs"),
    join(root, "scripts/group-a.mjs"),
  );
  await symlink(
    join(repository, "scripts/contracts-schema.mjs"),
    join(root, "scripts/contracts-schema.mjs"),
  );
  for (const entry of ["packages", "node_modules"])
    await symlink(join(repository, entry), join(root, entry));
  for (const entry of ["business", "api"])
    await symlink(join(repository, "docs", entry), join(root, "docs", entry));
  await cp(join(repository, "docs/planning"), join(root, "docs/planning"), {
    recursive: true,
  });
  const path = join(root, "docs/planning/backlog.json");
  const board = JSON.parse(await readFile(path, "utf8"));
  return { root, board, save: () => writeFile(path, JSON.stringify(board)) };
}
function run(root, mode = "--check") {
  try {
    return {
      ok: true,
      output: execFileSync(process.execPath, ["scripts/group-a.mjs", mode], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (error) {
    return { ok: false, output: error.stderr.toString() };
  }
}
it("A06 rejects dropping a range dependency while accepting the current source-backed board", async () => {
  const { root, board, save } = await fixture();
  expect(run(root).ok).toBe(true);
  const task = board.tasks.find((task) => task.id === "K11");
  task.dependencies.pop();
  await save();
  expect(run(root).output).toContain("dependency drift: K11");
});
it.each([
  ["missing", []],
  ["replacement with a valid roster position", ["Q02", "O01"]],
  ["extra", ["Q02", "Q03", "O01"]],
  ["duplicate", ["Q02", "Q03", "Q03"]],
])(
  "A06 rejects %s collaborators before checking or generating the table",
  async (_, collaborators) => {
    const { root, board, save } = await fixture();
    board.tasks.find((task) => task.id === "A05").collaborating_positions =
      collaborators;
    await save();
    const tablePath = join(root, "docs/planning/backlog.md");
    const originalTable = await readFile(tablePath, "utf8");
    for (const mode of ["--check", "--generate"]) {
      const result = run(root, mode);
      expect(result.ok).toBe(false);
      expect(result.output).toContain("collaboration drift: A05");
    }
    expect(await readFile(tablePath, "utf8")).toBe(originalTable);
  },
);
it.each([
  ["removed", "I08", null],
  ["invented", "A05", "các nhóm"],
])("A06 rejects %s additional collaboration", async (_, taskId, value) => {
  const { root, board, save } = await fixture();
  board.tasks.find((task) => task.id === taskId).additional_collaboration =
    value;
  await save();
  for (const mode of ["--check", "--generate"]) {
    const result = run(root, mode);
    expect(result.ok).toBe(false);
    expect(result.output).toContain(`collaboration drift: ${taskId}`);
  }
});
it("A06 prevents superseded requirements from reentering the active task backlog", async () => {
  const { root, board, save } = await fixture();
  board.tasks
    .find((task) => task.id === "C01")
    .requirement_ids.push("RQ-PDF-OLD-TRANSFER-GHOST");
  await save();
  expect(run(root).output).toContain("requirement drift: C01");
});
it("A06 detects incomplete position assignment coverage and generated table drift", async () => {
  const { root, board, save } = await fixture();
  const last = board.roster.pop();
  await save();
  expect(run(root).output).toContain("28 unique positions");
  board.roster.push(last);
  await save();
  await writeFile(
    join(root, "docs/planning/backlog.md"),
    "Silently changed owner list",
  );
  expect(run(root).output).toContain("generated backlog differs");
});
