import type { Workbook, CellValue } from "exceljs";
import {
  athleteDetails,
  clean,
  newDraftId,
  type AthleteDraft,
} from "./registration-draft.js";

export const excelHeaders = [
  "STT",
  "HỌ VÀ TÊN",
  "CCCD/MÃ ĐD",
  "NGÀY SINH",
  "GIỚI TÍNH",
  "GHI CHÚ",
  "LỚP / NHÓM",
  "NỘI DUNG THI ĐẤU",
];
async function workbook(): Promise<Workbook> {
  const { default: ExcelJS } = await import("exceljs");
  return new ExcelJS.Workbook();
}
export async function registrationWorkbook(athletes: AthleteDraft[] = []) {
  const book = await workbook();
  const sheet = book.addWorksheet("Đăng ký VĐV");
  sheet.addRow(excelHeaders);
  sheet.columns.forEach((column, index) => {
    column.width = index === 0 ? 8 : index === 1 ? 28 : 22;
  });
  sheet.getRow(1).font = { bold: true, color: { argb: "FF1643A2" } };
  sheet.getColumn(3).numFmt = "@";
  sheet.getColumn(7).numFmt = "@";
  for (const [index, a] of athletes.entries()) {
    sheet.addRow([
      index + 1,
      a.fullName,
      a.identityNumber ?? "",
      a.birthDate ? a.birthDate.split("-").reverse().join("/") : "",
      a.gender === "male" ? "Nam" : a.gender === "female" ? "Nữ" : "",
      a.note ?? "",
      a.className,
      a.requestedEvent,
    ]);
  }
  return new Uint8Array(await book.xlsx.writeBuffer());
}
/** Shared match key: Unicode NFC/NFD-safe, case-insensitive, without diacritics or extra spaces. */
export function matchKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLocaleLowerCase("vi")
    .replace(/\s+/g, "")
    .trim();
}
const genders: Record<string, "male" | "female"> = {
  nam: "male",
  nu: "female",
};
function cellText(
  value: CellValue,
  label: string,
  allowNumber = false,
): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.normalize("NFC").trim();
  if (allowNumber && typeof value === "number" && Number.isSafeInteger(value))
    return String(value);
  if (
    typeof value === "object" &&
    "richText" in value &&
    Array.isArray(value.richText)
  )
    return value.richText
      .map((part) => part.text)
      .join("")
      .normalize("NFC")
      .trim();
  if (
    typeof value === "object" &&
    "hyperlink" in value &&
    typeof value.text === "string"
  )
    return value.text.normalize("NFC").trim();
  if (typeof value === "number")
    throw new Error(
      `${label}: phải là ô văn bản. Excel bỏ số 0 ở đầu khi lưu dạng số; hãy định dạng cột là Văn bản rồi nhập lại.`,
    );
  throw new Error(`${label}: phải là ô văn bản, không dùng công thức.`);
}
export async function readRegistrationWorkbook(
  bytes: ArrayBuffer,
): Promise<AthleteDraft[]> {
  if (bytes.byteLength > 5 * 1024 * 1024)
    throw new Error("Tệp Excel vượt 5 MB.");
  const book = await workbook();
  await book.xlsx.load(bytes);
  if (book.worksheets.length !== 1)
    throw new Error("Biểu mẫu cần đúng một trang tính.");
  const sheet = book.worksheets[0]!;
  if (sheet.rowCount > 2001)
    throw new Error(
      "Mỗi tệp nhập tối đa 2.000 dòng; có thể chia thành nhiều tệp.",
    );
  excelHeaders.slice(0, 6).forEach((header, index) => {
    if (
      matchKey(
        cellText(sheet.getRow(1).getCell(index + 1).value, "Tiêu đề"),
      ) !== matchKey(header)
    )
      throw new Error("Tiêu đề không đúng biểu mẫu. Hãy tải biểu mẫu mới.");
  });
  for (let index = 6; index < 8; index++) {
    const header = matchKey(
      cellText(sheet.getRow(1).getCell(index + 1).value, "Tiêu đề"),
    );
    const legacyHeader = index === 6 ? "LỚP/NHÓM" : "NỘI DUNG DỰ KIẾN";
    if (
      header &&
      header !== matchKey(excelHeaders[index]!) &&
      header !== matchKey(legacyHeader)
    )
      throw new Error("Cột bổ sung không đúng biểu mẫu.");
  }
  const athletes: AthleteDraft[] = [];
  const identities = new Set<string>();
  for (let index = 2; index <= sheet.rowCount; index++) {
    const row = sheet.getRow(index);
    const cells = Array.from({ length: 7 }, (_, i) => row.getCell(i + 2).value);
    if (cells.every((v) => v === null || v === undefined || v === "")) continue;
    const values = cells.map((v, i) =>
      i === 2 && v instanceof Date
        ? v.toISOString().slice(0, 10)
        : cellText(v, `Dòng ${index}, ${excelHeaders[i + 1]}`, i >= 4),
    );
    const [
      fullName,
      rawIdentity,
      birth,
      genderText,
      note,
      className,
      requestedEvent,
    ] = values as [string, string, string, string, string, string, string];
    if (!fullName) throw new Error(`Dòng ${index}: thiếu họ và tên.`);
    const identityNumber = rawIdentity.replace(/[\s.-]/g, "");
    const birthDate = /^\d{2}\/\d{2}\/\d{4}$/.test(birth)
      ? birth.split("/").reverse().join("-")
      : birth;
    const gender = genderText ? genders[matchKey(genderText)] : undefined;
    if (genderText && !gender)
      throw new Error(`Dòng ${index}: giới tính phải là Nam hoặc Nữ.`);
    if (identityNumber && identities.has(identityNumber))
      throw new Error(`Dòng ${index}: trùng mã định danh trong tệp.`);
    if (identityNumber) identities.add(identityNumber);
    athletes.push({
      draftId: newDraftId(),
      fullName: clean(fullName),
      className: clean(className),
      requestedEvent: clean(requestedEvent),
      ...athleteDetails({
        identityNumber,
        birthDate,
        ...(gender ? { gender } : {}),
        note,
      }),
    });
  }
  if (!athletes.length) throw new Error("Tệp chưa có vận động viên.");
  return athletes;
}
