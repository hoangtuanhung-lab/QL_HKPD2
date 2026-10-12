import ExcelJS from "exceljs";
import { format } from "prettier";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const file = resolve(
  process.argv.slice(2).find((a) => a !== "--check") ??
    "docs/catalog/DanhMuc_Mon_NoiDung_HKPD.xlsx",
);
const bytes = readFileSync(file);
const book = new ExcelJS.Workbook();
await book.xlsx.load(bytes);
if (book.worksheets.length !== 1) throw Error("Expected one catalog worksheet");
const sheet = book.worksheets[0];
const headers = [
  "Cấp học",
  "MaND",
  "MaMon",
  "Môn",
  "Giới tính",
  "Nhóm",
  "Tên nội dung",
  "Hình thức",
  "Số người/đội",
  "Hạn mức mỗi đơn vị",
];
headers.forEach((h, i) => {
  if (sheet.getRow(1).getCell(i + 1).value !== h)
    throw Error(`Unexpected column ${i + 1}`);
});
const entries = [];
const codes = new Set();
sheet.eachRow((row, index) => {
  if (index === 1) return;
  const cells = Array.from({ length: 10 }, (_, i) => row.getCell(i + 1).value);
  if (cells.every((v) => v === null || v === undefined || v === "")) return;
  if (cells.some((v) => v && typeof v === "object"))
    throw Error(`Formula/object at row ${index}`);
  const [
    level,
    code,
    sportCode,
    sportName,
    gender,
    rawGroup,
    name,
    form,
    teamSize,
    quota,
  ] = cells;
  if (
    !["TH", "THCS"].includes(level) ||
    !["Nam", "Nữ", "Nam - nữ"].includes(gender) ||
    ![code, sportCode, sportName, name, form, quota].every(
      (v) => typeof v === "string" && v.trim(),
    ) ||
    codes.has(code)
  )
    throw Error(`Invalid catalog row ${index}`);
  codes.add(code);
  const group = typeof rawGroup === "string" ? rawGroup.trim() : "";
  if (group && group !== "Cả cấp" && !/^\d+\s*-\s*\d+\s+tuổi$/.test(group))
    throw Error(`Unknown group at row ${index}`);
  entries.push({
    sourceRow: index,
    level,
    code,
    sportCode,
    sportName,
    gender,
    group: group || null,
    name,
    form,
    teamSize: String(teamSize ?? ""),
    quota,
  });
});
if (entries.length !== 133)
  throw Error(`Expected 133 entries; got ${entries.length}`);
const output = `// Generated from docs/catalog/DanhMuc_Mon_NoiDung_HKPD.xlsx. Do not edit manually.\nexport const athleteCatalogSha256 = ${JSON.stringify(createHash("sha256").update(bytes).digest("hex"))};\nexport const athleteCatalog = ${JSON.stringify(entries, null, 2)} as const;\n`;
const formatted = await format(output, { parser: "typescript" });
if (process.argv.includes("--check")) {
  if (
    readFileSync("apps/web/src/athlete-catalog.generated.ts", "utf8") !==
    formatted
  )
    throw Error(
      "Catalog source/generated mismatch; run node scripts/import-athlete-catalog.mjs",
    );
} else writeFileSync("apps/web/src/athlete-catalog.generated.ts", formatted);
console.log(`Imported ${entries.length} unique catalog codes`);
