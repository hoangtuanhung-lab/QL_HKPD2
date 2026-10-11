import assert from "node:assert/strict";
import { format } from "prettier";
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, relative, isAbsolute } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const business = "docs/business";
const data = JSON.parse(
  await readFile(resolve(root, business, "requirements.json"), "utf8"),
);
const modes = new Set(["--check", "--generate"]);
assert.ok(modes.has(process.argv[2]), "Use --check or --generate.");
const decisionStatuses = new Set([
  "confirmed",
  "source_recorded",
  "proposed",
  "superseded",
]);
const deliveryStatuses = new Set([
  "not_implemented",
  "contract_only",
  "draft_ui",
  "partial",
  "foundation_verified",
]);
const positions = new Set(
  "L01 L02 P01 P02 P03 S01 S02 S03 R01 R02 R03 R04 C01 C02 C03 C04 K01 K02 K03 K04 F01 F02 F03 Q01 Q02 Q03 O01 O02".split(
    " ",
  ),
);
function indexed(items, label) {
  assert.ok(
    Array.isArray(items) && items.length,
    `${label}: empty collection.`,
  );
  const result = new Map();
  for (const item of items) {
    assert.ok(
      typeof item.id === "string" && item.id.length,
      `${label}: missing ID.`,
    );
    assert.ok(!result.has(item.id), `${label}: duplicate ${item.id}.`);
    result.set(item.id, item);
  }
  return result;
}
const sources = indexed(data.sources, "Sources");
const requirements = indexed(data.requirements, "Requirements");
const issues = indexed(data.open_issues, "Issues");
const wbs = indexed(data.wbs_catalog, "WBS");
const scenarios = indexed(data.scenarios, "Scenarios");
const questions = indexed(data.source_questions, "Source questions");
const groups = indexed(data.question_groups, "Question groups");
assert.equal(
  questions.size,
  data.coverage.pdf_questions_expected,
  "PDF coverage: question missing.",
);
for (let n = 1; n <= data.coverage.pdf_questions_expected; n++) {
  const q = questions.get(`PDF-Q${String(n).padStart(3, "0")}`);
  assert.equal(
    q?.question_number,
    n,
    `PDF coverage: missing or misnumbered ${n}.`,
  );
}
const sourceTexts = new Map();
async function localPath(path) {
  assert.ok(
    typeof path === "string" && path.length && !isAbsolute(path),
    `Invalid path: ${path}`,
  );
  const resolved = resolve(root, path);
  assert.ok(
    !relative(root, resolved).startsWith(".."),
    `Path escapes repository: ${path}`,
  );
  assert.ok((await stat(resolved)).isFile(), `Missing file: ${path}`);
  return resolved;
}
for (const source of sources.values()) {
  if (source.path) {
    const text = await readFile(await localPath(source.path), "utf8");
    const hash = createHash("sha256").update(text).digest("hex");
    assert.equal(
      hash,
      source.text_sha256,
      `Source checksum changed: ${source.id}`,
    );
    sourceTexts.set(source.id, text);
  } else if (source.text) sourceTexts.set(source.id, source.text);
}
function citation(ref) {
  const source = sources.get(ref?.source_id);
  assert.ok(source, `Unknown source: ${ref?.source_id}`);
  assert.equal(
    source.availability,
    "available",
    `Unavailable source cited: ${source.id}`,
  );
  const text = sourceTexts.get(source.id);
  assert.ok(
    typeof ref.quote === "string" &&
      ref.quote.length &&
      text?.includes(ref.quote),
    `Quote missing from source: ${source.id}`,
  );
  if (ref.locator.startsWith("line:")) {
    const line = Number(ref.locator.slice(5));
    assert.ok(Number.isInteger(line) && line > 0);
    assert.ok(
      text
        .split("\n")
        .slice(line - 1)
        .join("\n")
        .startsWith(ref.quote),
      `Incorrect line locator: ${source.id}:${line}`,
    );
  } else assert.equal(ref.locator, "message");
}
for (const item of [...wbs.values(), ...scenarios.values(), ...issues.values()])
  citation(item.source);
for (const q of questions.values()) {
  assert.ok(groups.has(q.group_id), `Unknown question group: ${q.id}`);
  assert.ok(
    q.source_occurrences.length && q.requirement_ids.length && q.wbs_ids.length,
    `Unmapped question: ${q.id}`,
  );
  for (const ref of q.source_occurrences) {
    citation(ref);
    assert.ok(ref.pdf_page >= 1 && ref.pdf_page <= 94);
  }
  for (const id of q.requirement_ids)
    assert.ok(
      requirements.has(id),
      `Unknown question requirement: ${q.id}:${id}`,
    );
  for (const id of q.wbs_ids)
    assert.ok(wbs.has(id), `Unknown question WBS: ${q.id}:${id}`);
  for (const owner of q.owner_positions) assert.ok(positions.has(owner));
  for (const ref of q.later_decision_refs ?? [])
    assert.ok(
      questions.has(ref) || requirements.has(ref),
      `Unknown later decision: ${q.id}:${ref}`,
    );
}
for (const requirement of requirements.values()) {
  const id = requirement.id;
  assert.ok(
    decisionStatuses.has(requirement.decision_status),
    `Invalid decision status: ${id}`,
  );
  assert.ok(
    deliveryStatuses.has(requirement.delivery_status),
    `Invalid delivery status: ${id}`,
  );
  for (const field of ["title", "statement", "module"])
    assert.ok(
      typeof requirement[field] === "string" && requirement[field].trim(),
      `Missing ${field}: ${id}`,
    );
  assert.ok(
    requirement.sources.length &&
      requirement.owner_positions.length &&
      requirement.wbs_ids.length,
    `Missing traceability: ${id}`,
  );
  for (const ref of requirement.sources) {
    citation(ref);
    if (
      ref.speaker === "user" &&
      sources.get(ref.source_id).kind === "business_dialogue"
    ) {
      const q = questions.get(ref.context_question_id);
      assert.ok(q, `Missing dialogue context: ${id}`);
      const sourceText = sourceTexts.get(ref.source_id);
      const context = q.source_occurrences[0];
      const questionStart =
        sourceText
          .split("\n")
          .slice(0, Number(context.locator.slice(5)) - 1)
          .join("\n").length + 1;
      const answerStart =
        sourceText
          .split("\n")
          .slice(0, Number(ref.locator.slice(5)) - 1)
          .join("\n").length + 1;
      const between = sourceText.slice(
        questionStart + context.quote.length,
        answerStart,
      );
      assert.ok(
        answerStart >= questionStart + context.quote.length &&
          !/^Câu\s+[\dTIl]+\s*:/m.test(between),
        `User quote outside answer context: ${id}`,
      );
    }
  }
  for (const id of requirement.source_question_ids ?? [])
    assert.ok(
      questions.has(id),
      `Unknown source question: ${requirement.id}:${id}`,
    );
  for (const owner of requirement.owner_positions)
    assert.ok(positions.has(owner), `Unknown position ${owner}: ${id}`);
  for (const [field, entries] of [
    ["wbs_ids", wbs],
    ["scenario_ids", scenarios],
    ["open_issue_ids", issues],
  ]) {
    assert.ok(Array.isArray(requirement[field]), `Missing ${field}: ${id}`);
    for (const ref of requirement[field])
      assert.ok(entries.has(ref), `Unknown ${field} ${ref}: ${id}`);
  }
  for (const path of requirement.artifact_paths) await localPath(path);
  assert.ok(Array.isArray(requirement.superseded_by));
  if (requirement.decision_status === "superseded")
    assert.ok(requirement.superseded_by.length, `No successor: ${id}`);
  else
    assert.equal(
      requirement.superseded_by.length,
      0,
      `Current requirement has successor: ${id}`,
    );
  if (requirement.decision_status === "confirmed")
    assert.ok(
      requirement.sources.some(
        (ref) =>
          sources.get(ref.source_id).kind === "user_message" ||
          (sources.get(ref.source_id).kind === "business_dialogue" &&
            ref.speaker === "user" &&
            ["image_checked", "transcript_reviewed"].includes(
              ref.verification,
            ) &&
            questions.has(ref.context_question_id)),
      ),
      `Missing user decision: ${id}`,
    );
}
function terminal(id, seen = new Set()) {
  assert.ok(!seen.has(id), `Replacement cycle: ${id}`);
  const requirement = requirements.get(id);
  assert.ok(requirement, `Unknown successor: ${id}`);
  if (requirement.decision_status !== "superseded") return;
  for (const next of requirement.superseded_by)
    terminal(next, new Set([...seen, id]));
}
for (const id of requirements.keys()) terminal(id);
const escaped = (value) =>
  String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
const list = (entries) =>
  entries.length ? entries.map(escaped).join(", ") : "—";
function table(headers, rows) {
  return [headers, headers.map(() => "---"), ...rows]
    .map((row) => `| ${row.map(escaped).join(" | ")} |`)
    .join("\n");
}
const matrix = `# A01 — Bảng truy vết\n\nSinh từ requirements.json; sửa nguồn rồi chạy npm run business:generate. Trạng thái quyết định khác trạng thái triển khai. artifact_paths chỉ là nơi đối chiếu, không chứng minh feature đã nghiệm thu. Mã T/TG là kịch bản trong plan, chưa phải test đã chạy.\n\n${table(
  [
    "Yêu cầu",
    "Nội dung",
    "Quyết định",
    "Triển khai",
    "Module / chủ trì; phối hợp",
    "WBS",
    "Kịch bản",
    "U",
    "Nguồn",
    "Thay thế bởi",
  ],
  data.requirements.map((r) => [
    r.id,
    r.title,
    r.decision_status,
    r.delivery_status,
    `${r.module} / ${r.owner_positions.join(", ")}`,
    list(r.wbs_ids),
    list(r.scenario_ids),
    list(r.open_issue_ids),
    r.sources.map((s) => `${s.source_id} ${s.locator}`).join(", "),
    list(r.superseded_by),
  ]),
)}\n`;
const current = data.requirements.filter(
  (r) => r.decision_status !== "superseded",
);
const backlog = `# A01 — Phạm vi hiện hành và hàng đợi đối chiếu\n\nSinh từ requirements.json. Quyết định đã xác nhận là phạm vi được người dùng giao, chưa đồng nghĩa Ready hoặc Accepted. U chỉ khóa bước phụ thuộc; phần độc lập tiếp tục. Các tích hợp SQL/Google/Netlify giữ ở bước cuối theo RQ-USER-002.\n\n## Quyết định người dùng đã xác nhận\n\n${table(
  ["Yêu cầu", "Nội dung", "WBS", "Triển khai", "U / điều kiện còn mở"],
  current
    .filter((r) => r.decision_status === "confirmed")
    .map((r) => [
      r.id,
      r.statement,
      list(r.wbs_ids),
      r.delivery_status,
      list(r.open_issue_ids),
    ]),
)}\n\n## Yêu cầu từ plan cần đối chiếu\n\nCác dòng này là ứng viên cho backlog chuyên môn, chưa được gán là quyết định người dùng đã duyệt. Không dùng expected result chưa đối chiếu làm luật chính thức.\n\n${table(
  ["Yêu cầu", "Nội dung", "Trạng thái", "WBS", "U"],
  current
    .filter((r) => r.decision_status !== "confirmed")
    .map((r) => [
      r.id,
      r.title,
      r.decision_status,
      list(r.wbs_ids),
      list(r.open_issue_ids),
    ]),
)}\n\n## Đầu vào còn mở hoặc mới giải quyết một phần\n\n${table(
  ["Mã", "Nội dung", "Người cung cấp / mốc", "Trạng thái"],
  data.open_issues
    .filter((u) => u.status !== "resolved_source_received")
    .map((u) => [u.id, u.description, u.owner_and_gate, u.status]),
)}\n\nQuyết định superseded chỉ lưu trong bảng truy vết/lịch sử; không xuất hiện ở hai hàng đợi hiện hành phía trên.\n`;
const coverage = `# A01 — Đối chiếu 293 câu PDF

Đã đọc 94 trang, tìm đủ 293 số câu và ghi cả bản lặp/correction. 22 nhóm dưới đây do A01 tổ chức để giao việc, không phải tên chương có sẵn trong PDF. Trạng thái lịch sử ở cấp câu chỉ là cảnh báo đối chiếu; quyết định hiện hành được thể hiện trong sổ yêu cầu và lịch sử thay thế. Q293 đã rút, không thêm bảng phụ đối đầu chéo.

${table(
  [
    "Câu",
    "Nhóm",
    "Trang",
    "Module / chủ trì",
    "WBS",
    "Yêu cầu",
    "Trạng thái / đối chiếu sau",
  ],
  data.source_questions.map((q) => [
    q.id,
    `${q.group_id}: ${groups.get(q.group_id).title}`,
    q.source_occurrences.map((s) => s.pdf_page).join(", "),
    `${q.module} / ${q.owner_positions.join(", ")}`,
    list(q.wbs_ids),
    list(q.requirement_ids),
    `${q.decision_status}${q.later_decision_refs ? ": " + q.later_decision_refs.join(", ") : ""}`,
  ]),
)}
`;
const grouped = `# A01 — Tổng hợp 22 nhóm nghiệp vụ từ nguồn mới

Sinh từ requirements.json. Mỗi nhóm dẫn câu PDF và WBS, gồm quyết định sau đã thay phần trước; các điểm chưa chốt vẫn theo U. Đây là bản đặc tả để chủ module review, chưa chứng minh các chức năng đã được lập trình.

${data.question_groups
  .map((g) => {
    const r = requirements.get("RQ-PDF-" + g.id);
    return `## ${g.id} — ${g.title}\n\n${r.statement}\n\nNguồn câu: ${r.source_question_ids.join(", ")}. WBS: ${r.wbs_ids.join(", ")}. Chủ trì/phối hợp: ${r.owner_positions.join(", ")}.\n`;
  })
  .join("\n")}`;
for (const [filename, content] of [
  ["traceability.md", matrix],
  ["current-backlog.md", backlog],
  ["pdf-coverage.md", coverage],
  ["grouped-requirements.md", grouped],
]) {
  const target = resolve(root, business, filename);
  const formatted = await format(content, { parser: "markdown" });
  if (process.argv[2] === "--generate") await writeFile(target, formatted);
  else
    assert.equal(
      await readFile(target, "utf8"),
      formatted,
      `${filename} out of date; run npm run business:generate.`,
    );
}
console.log(
  `A01: ${requirements.size} requirements, ${wbs.size} WBS, ${scenarios.size} source scenarios; citations/replacements/current backlog verified. ${questions.size}/293 PDF questions mapped in ${groups.size} groups; source receipt is not feature acceptance.`,
);
