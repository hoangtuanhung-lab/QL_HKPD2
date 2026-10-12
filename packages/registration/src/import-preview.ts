import { ensure, type Sex, type Student } from "./model.js";
export interface PreviewRow {
  row: number;
  studentCode: string;
  name: string;
  sex: Sex | null;
  birthYear: number | null;
  grade: number | null;
  identityMask: string | null;
  errors: string[];
  existingStudentId: string | null;
}
export function maskIdentity(value: string): string {
  if (!value) return "";
  // Never display the original malformed value, even if it is shorter than last4.
  return /^\d{12}$/.test(value)
    ? `${"*".repeat(8)}${value.slice(-4)}`
    : "*".repeat(value.length);
}
/** Strict RFC-style quoted CSV. Technical byte limit is not an athlete quota. */
export function parseCsv(text: string): string[][] {
  ensure(
    new TextEncoder().encode(text).length <= 1_048_576,
    "IMPORT_TOO_LARGE",
    "Tệp vượt 1 MiB; chia tệp để xem trước.",
  );
  text = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  const finishField = () => {
    row.push(field);
    field = "";
    closed = false;
  };
  const finishRow = () => {
    finishField();
    if (row.some((v) => v !== "")) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += c;
    } else if (c === '"') {
      ensure(
        !field && !closed,
        "CSV_FORMAT",
        "Dấu nháy CSV không đúng vị trí.",
      );
      quoted = true;
    } else if (c === ",") finishField();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      finishRow();
    } else {
      ensure(!closed, "CSV_FORMAT", "Có ký tự sau dấu nháy đóng.");
      field += c;
    }
  }
  ensure(!quoted, "CSV_FORMAT", "CSV thiếu dấu nháy đóng.");
  if (field || row.length || closed) finishRow();
  return rows;
}
/** For Excel a trusted parser must first produce rows; binary XLSX is not parsed here. */
export function previewRows(
  rows: readonly (readonly string[])[],
  schoolId: string,
  existing: readonly Student[],
): readonly PreviewRow[] {
  ensure(schoolId, "SCHOOL_REQUIRED", "Chọn trường trước khi nhập.");
  const header = rows[0]?.map((h) => h.trim());
  const required = ["student_code", "name", "sex", "birth_year", "grade"];
  ensure(
    header &&
      new Set(header).size === header.length &&
      required.every((h) => header.includes(h)) &&
      header.every((h) => [...required, "cccd"].includes(h)),
    "CSV_HEADER",
    "Cột cần có: student_code,name,sex,birth_year,grade; CCCD là cột tùy chọn.",
  );
  const seen = new Set<string>();
  return rows.slice(1).map((line, index) => {
    const read = (key: string) => line[header.indexOf(key)]?.trim() ?? "";
    const errors: string[] = [];
    if (line.length !== header.length) errors.push("COLUMN_COUNT");
    const studentCode = read("student_code"),
      name = read("name"),
      sex = read("sex"),
      birth = read("birth_year"),
      grade = read("grade"),
      identity = read("cccd");
    if (!studentCode || !name) errors.push("REQUIRED");
    if (seen.has(studentCode)) errors.push("DUPLICATE_STUDENT_CODE");
    seen.add(studentCode);
    if (!["male", "female"].includes(sex)) errors.push("SEX");
    if (!/^\d{4}$/.test(birth) || Number(birth) < 1900 || Number(birth) > 2100)
      errors.push("BIRTH_YEAR");
    if (
      !/^\d+$/.test(grade) ||
      !Number.isSafeInteger(Number(grade)) ||
      Number(grade) < 1
    )
      errors.push("GRADE");
    if (identity && !/^\d{12}$/.test(identity)) errors.push("IDENTITY_FORMAT");
    const matches = existing.filter(
      (s) => s.schoolId === schoolId && s.studentCode === studentCode,
    );
    if (matches.length > 1) errors.push("AMBIGUOUS_MASTER_RECORD");
    return {
      row: index + 2,
      studentCode,
      name,
      sex: sex === "male" || sex === "female" ? sex : null,
      birthYear: /^\d{4}$/.test(birth) ? Number(birth) : null,
      grade: /^\d+$/.test(grade) ? Number(grade) : null,
      identityMask: identity ? maskIdentity(identity) : null,
      errors,
      existingStudentId: matches.length === 1 ? matches[0]!.id : null,
    };
  });
}
export const previewCsv = (
  text: string,
  schoolId: string,
  existing: readonly Student[],
) => previewRows(parseCsv(text), schoolId, existing);
