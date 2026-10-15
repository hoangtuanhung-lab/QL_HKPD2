import type { Workbook, CellValue } from "exceljs";
import {
  athleteDetails,
  clean,
  newDraftId,
  type AthleteDraft,
} from "./registration-draft.js";

const legacyHeaders = [
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
function cellText(value: CellValue, label: string): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  throw new Error(
    `${label}: phải là ô văn bản, không dùng công thức hoặc số thay cho mã định danh.`,
  );
}
async function readLegacyWorkbook(bytes: ArrayBuffer): Promise<AthleteDraft[]> {
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
  legacyHeaders.slice(0, 6).forEach((header, index) => {
    if (
      cellText(sheet.getRow(1).getCell(index + 1).value, "Tiêu đề") !== header
    )
      throw new Error("Tiêu đề không đúng biểu mẫu. Hãy tải biểu mẫu mới.");
  });
  for (let index = 6; index < 8; index++) {
    const header = cellText(
      sheet.getRow(1).getCell(index + 1).value,
      "Tiêu đề",
    );
    const legacyHeader = index === 6 ? "LỚP/NHÓM" : "NỘI DUNG DỰ KIẾN";
    if (header && header !== legacyHeaders[index] && header !== legacyHeader)
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
        : cellText(v, `Dòng ${index}, ${legacyHeaders[i + 1]}`),
    );
    const [
      fullName,
      identityNumber,
      birth,
      gender,
      note,
      className,
      requestedEvent,
    ] = values as [string, string, string, string, string, string, string];
    if (!fullName) throw new Error(`Dòng ${index}: thiếu họ và tên.`);
    const birthDate = /^\d{2}\/\d{2}\/\d{4}$/.test(birth)
      ? birth.split("/").reverse().join("-")
      : birth;
    if (gender && gender !== "Nam" && gender !== "Nữ")
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
        ...(gender ? { gender: gender === "Nam" ? "male" : "female" } : {}),
        note,
      }),
    });
  }
  if (!athletes.length) throw new Error("Tệp chưa có vận động viên.");
  return athletes;
}

export const excelHeaders = [
  "STT",
  "Mã VĐV",
  "TRƯỜNG",
  "KHỐI",
  "HỌ VÀ TÊN",
  "CCCD",
  "NGÀY SINH",
  "GIỚI TÍNH",
];
export const studentHeaders = [
  "STT",
  "HỌ VÀ TÊN",
  "CCCD",
  "NGÀY SINH",
  "GIỚI TÍNH",
  "TRƯỜNG",
  "KHỐI",
];
export async function registrationWorkbook(
  athletes: AthleteDraft[] = [],
  schoolName = "",
) {
  const book = await workbook(),
    sheet = book.addWorksheet("Đăng ký VĐV");
  sheet.addRow(excelHeaders);
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((c, i) => {
    c.width = i === 0 ? 8 : 24;
  });
  sheet.getColumn(6).numFmt = "@";
  for (const [i, a] of athletes.entries())
    sheet.addRow([
      i + 1,
      a.athleteCode ?? "",
      a.schoolName ?? schoolName,
      a.className.match(/^\d+/)?.[0] ?? a.className,
      a.fullName,
      a.identityNumber ?? "",
      a.birthDate ? a.birthDate.split("-").reverse().join("/") : "",
      a.gender === "male" ? "Nam" : a.gender === "female" ? "Nữ" : "",
    ]);
  return new Uint8Array(await book.xlsx.writeBuffer());
}
export async function studentWorkbook() {
  const book = await workbook(),
    sheet = book.addWorksheet("Học sinh nền");
  sheet.addRow(studentHeaders);
  sheet.columns.forEach((c) => {
    c.width = 24;
  });
  sheet.getColumn(3).numFmt = "@";
  return new Uint8Array(await book.xlsx.writeBuffer());
}
async function readNewWorkbook(
  bytes: ArrayBuffer,
  base: boolean,
): Promise<AthleteDraft[]> {
  if (bytes.byteLength > 5 * 1024 * 1024) throw Error("Tệp Excel vượt 5 MB.");
  const book = await workbook();
  await book.xlsx.load(bytes);
  if (book.worksheets.length !== 1)
    throw Error("Biểu mẫu cần đúng một trang tính.");
  const sheet = book.worksheets[0]!,
    headers = base ? studentHeaders : excelHeaders;
  if (sheet.rowCount > 2001) throw Error("Mỗi tệp tối đa 2.000 dòng.");
  headers.forEach((h, i) => {
    if (cellText(sheet.getRow(1).getCell(i + 1).value, "Tiêu đề") !== h)
      throw Error("Tiêu đề không đúng biểu mẫu mới.");
  });
  if (sheet.columnCount > headers.length)
    throw Error("Biểu mẫu có cột thừa. Không nhập môn/nội dung bằng Excel.");
  const out: AthleteDraft[] = [],
    identities = new Set<string>(),
    codes = new Set<string>();
  for (let n = 2; n <= sheet.rowCount; n++) {
    const row = sheet.getRow(n);
    if (
      Array.from(
        { length: headers.length - 1 },
        (_, i) => row.getCell(i + 2).value,
      ).every((v) => v === null || v === undefined || v === "")
    )
      continue;
    const text = (i: number) =>
      cellText(row.getCell(i).value, `Dòng ${n}, ${headers[i - 1]}`);
    const fullName = text(base ? 2 : 5),
      identityNumber = text(base ? 3 : 6),
      schoolName = text(base ? 6 : 3);
    const gradeRaw = row.getCell(base ? 7 : 4).value;
    const grade =
      typeof gradeRaw === "number"
        ? String(gradeRaw)
        : cellText(gradeRaw, `Dòng ${n}, Khối`);
    if (!/^[1-9]$/.test(grade)) throw Error(`Dòng ${n}: Khối phải từ 1 đến 9.`);
    const rawBirth = row.getCell(base ? 4 : 7).value;
    const birth =
      rawBirth instanceof Date
        ? rawBirth.toISOString().slice(0, 10)
        : cellText(rawBirth, `Dòng ${n}, Ngày sinh`);
    const birthDate = /^\d{2}\/\d{2}\/\d{4}$/.test(birth)
      ? birth.split("/").reverse().join("-")
      : birth;
    const gender = text(base ? 5 : 8),
      athleteCode = base ? "" : text(2);
    if (
      !fullName ||
      !schoolName ||
      !/^\d{12}$/.test(identityNumber) ||
      !birthDate ||
      !["Nam", "Nữ"].includes(gender)
    )
      throw Error(
        `Dòng ${n}: thiếu hoặc sai họ tên, CCCD, ngày sinh, giới tính, trường.`,
      );
    if (
      identities.has(identityNumber) ||
      (athleteCode && codes.has(athleteCode))
    )
      throw Error(`Dòng ${n}: trùng mã định danh hoặc Mã VĐV.`);
    identities.add(identityNumber);
    if (athleteCode) codes.add(athleteCode);
    out.push({
      draftId: newDraftId(),
      fullName: clean(fullName),
      schoolName: clean(schoolName),
      athleteCode,
      className: grade,
      requestedEvent: "",
      catalogSelections: [],
      ...athleteDetails({
        identityNumber,
        birthDate,
        gender: gender === "Nam" ? "male" : "female",
      }),
    });
  }
  if (!out.length) throw Error("Tệp chưa có vận động viên / học sinh.");
  return out;
}
export async function readRegistrationWorkbook(
  bytes: ArrayBuffer,
): Promise<AthleteDraft[]> {
  if (bytes.byteLength > 5 * 1024 * 1024) throw Error("Tệp Excel vượt 5 MB.");
  const book = await workbook();
  await book.xlsx.load(bytes);
  if (book.worksheets[0]?.getRow(1).getCell(2).value === "HỌ VÀ TÊN")
    return readLegacyWorkbook(bytes);
  return readNewWorkbook(bytes, false);
}
export const readStudentWorkbook = (bytes: ArrayBuffer) =>
  readNewWorkbook(bytes, true);
