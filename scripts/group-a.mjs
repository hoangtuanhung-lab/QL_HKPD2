import { readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";
import {
  createDataset,
  assertDatasetIntegrity,
} from "../packages/test-fixtures/a05/dataset.mjs";
import { contractValidators } from "./contracts-schema.mjs";

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const baseline = read("docs/business/requirements.json");
const board = read("docs/planning/backlog.json");
const scenarios = read("packages/test-fixtures/a05/scenarios.json");
const wbs = new Map(baseline.wbs_catalog.map((task) => [task.id, task]));
const requirements = new Map(
  baseline.requirements.map((item) => [item.id, item]),
);
const questions = new Set(
  baseline.source_questions.map((question) => question.id),
);
const fail = (message) => {
  throw new Error(message);
};
const positions = new Set(board.roster.map((person) => person.position));
if (positions.size !== 28 || board.roster.length !== 28)
  fail("A06 must cover 28 unique positions");
if (
  board.tasks.length !== wbs.size ||
  new Set(board.tasks.map((task) => task.id)).size !== wbs.size
)
  fail("A06 must cover every WBS exactly once");
const gates = new Set(board.external_gates.map((gate) => gate.id));
for (const task of board.tasks) {
  const original = wbs.get(task.id);
  if (
    !original ||
    task.acceptance !== original.description.split("Nghiệm thu:")[1].trim() ||
    task.dependencies_source_text !== original.dependencies_text ||
    task.primary_position !== original.owner_positions.split("/")[0]
  )
    fail(`A06 source drift: ${task.id}`);
  const expectedDependencies =
    original.dependencies_text === "Không"
      ? []
      : original.dependencies_text.split("/").flatMap((part) => {
          const range = /^([A-Z])(\d+)–\1(\d+)$/.exec(part);
          return range
            ? Array.from(
                { length: Number(range[3]) - Number(range[2]) + 1 },
                (_, index) =>
                  `${range[1]}${String(Number(range[2]) + index).padStart(2, "0")}`,
              )
            : [part];
        });
  if (
    JSON.stringify(task.dependencies) !== JSON.stringify(expectedDependencies)
  )
    fail(`A06 dependency drift: ${task.id}`);
  for (const dependency of task.dependencies)
    if (!wbs.has(dependency) && !gates.has(dependency))
      fail(`Unknown dependency ${dependency}`);
  for (const position of [
    task.primary_position,
    ...task.collaborating_positions,
  ])
    if (!positions.has(position)) fail(`Unknown owner ${position}`);
  const expectedRequirements = baseline.requirements
    .filter(
      (item) =>
        item.wbs_ids.includes(task.id) && item.decision_status !== "superseded",
    )
    .map((item) => item.id);
  if (
    JSON.stringify(task.requirement_ids) !==
    JSON.stringify(expectedRequirements)
  )
    fail(`A06 requirement drift: ${task.id}`);
}
const caseIds = new Set(scenarios.cases.map((item) => item.id));
if (caseIds.size !== scenarios.cases.length) fail("Duplicate A05 case");
for (const original of baseline.scenarios) {
  const item = scenarios.cases.find((item) => item.id === original.id);
  if (
    !item ||
    item.description !== original.description ||
    JSON.stringify(item.source) !== JSON.stringify(original.source)
  )
    fail(`Missing or changed source scenario ${original.id}`);
}
for (const scenario of scenarios.cases) {
  for (const requirementId of scenario.requirement_ids) {
    if (
      !requirements.has(requirementId) ||
      requirements.get(requirementId).decision_status === "superseded"
    )
      fail(`Invalid current requirement ${requirementId}`);
  }
  for (const question of scenario.source_question_ids ?? [])
    if (!questions.has(question)) fail(`Unknown source question ${question}`);
}
const dataset = createDataset();
assertDatasetIntegrity(dataset);
const validators = contractValidators(read("docs/api/core.openapi.json"));
for (const [schema, items] of [
  ["Athlete", dataset.athletes],
  ["AthleteFolder", dataset.folders],
]) {
  for (const item of items)
    if (!validators[schema](item)) fail(`A05 ${schema} does not satisfy A03`);
}
const escape = (text) =>
  String(text).replaceAll("|", "\\|").replaceAll("\n", " ");
let markdown =
  "# A06 — Backlog và vị trí\n\nSinh từ `backlog.json`; chạy `npm run group-a:generate`. Nguồn A01-v0.2, ghi ngày 11/10/2026 (Asia/Saigon). `handover_prepared` chỉ có đầu ra bàn giao, chưa nghiệm thu WBS. Các bước tích hợp SQL/Google/Netlify giữ tới cuối theo CR-004.\n\n## 28 vị trí\n\nChưa nhận tên thật của nhóm. Codex là đầu mối tích hợp theo CR-007 và thực hiện nhóm A theo yêu cầu người dùng; không thay danh sách 28 con người.\n\n| Nhóm | Vị trí | Người thật | GitHub | Reviewer dự phòng |\n| --- | --- | --- | --- | --- |\n";
for (const person of board.roster)
  markdown += `| ${person.group} | ${person.position} | ${escape(person.person_name ?? "Chờ phân công")} | ${escape(person.github_handle ?? "Chờ phân công")} | ${escape(person.backup_reviewer ?? "Chờ phân công")} |\n`;
markdown +=
  "\n## 58 đầu việc\n\nPhụ thuộc là sản phẩm cần nhận, không có nghĩa toàn WBS cung cấp đã hoàn thành. `G5` trong cột phụ thuộc là cổng nghiệm thu vận hành theo mục 6/QT40, khác nhóm tổ chức G5. Đọc tiêu chí đầy đủ trong JSON hoặc nguồn plan.\n\n| WBS | Chủ trì | Phối hợp | Phụ thuộc | Trạng thái đầu ra | Yêu cầu hiện hành |\n| --- | --- | --- | --- | --- | --- |\n";
for (const task of board.tasks)
  markdown += `| ${task.id} | ${task.primary_position} | ${escape([...task.collaborating_positions, task.additional_collaboration].filter(Boolean).join(", ") || "—")} | ${task.dependencies.join(", ") || "Không"} | ${task.status} | ${task.requirement_ids.join(", ") || "—"} |\n`;
markdown = await format(markdown, { parser: "markdown" });
const target = "docs/planning/backlog.md";
if (process.argv.includes("--generate")) writeFileSync(target, markdown);
else if (readFileSync(target, "utf8") !== markdown)
  fail("A06 generated backlog differs; run group-a:generate");
console.log(
  `Group A: ${board.tasks.length} WBS, ${positions.size} positions, ${scenarios.cases.length} scenario specifications; ${dataset.schools.length} synthetic schools / ${dataset.athletes.length} athletes / ${dataset.folders.length} deferred logical folders validated. No backend/UAT acceptance claimed.`,
);
