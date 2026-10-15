import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  excelHeaders,
  studentHeaders,
  readRegistrationWorkbook,
  registrationWorkbook,
  readStudentWorkbook,
  studentWorkbook,
} from "../apps/web/src/registration-excel.js";
const sample = {
  draftId: "test",
  athleteCode: "VDV000001",
  schoolName: "Trường A",
  fullName: "Minh họa",
  className: "6",
  requestedEvent: "",
  identityNumber: "040205001234",
  birthDate: "2012-05-15",
  gender: "female" as const,
};
const bytes = (v: Uint8Array) => v.slice().buffer as ArrayBuffer;
describe("Registration Excel", () => {
  it("writes exactly the eight specified columns without registration content, group or notes", async () => {
    const data = await registrationWorkbook([sample]);
    const b = new ExcelJS.Workbook();
    await b.xlsx.load(bytes(data));
    expect((b.worksheets[0]!.getRow(1).values as unknown[]).slice(1)).toEqual(
      excelHeaders,
    );
    expect(excelHeaders).toEqual([
      "STT",
      "Mã VĐV",
      "TRƯỜNG",
      "KHỐI",
      "HỌ VÀ TÊN",
      "CCCD",
      "NGÀY SINH",
      "GIỚI TÍNH",
    ]);
    expect((await readRegistrationWorkbook(bytes(data)))[0]).toMatchObject({
      ...sample,
      draftId: expect.any(String),
      catalogSelections: [],
    });
    expect(b.worksheets[0]!.getCell("F2").value).toBe("040205001234");
  });
  it("continues reading previous templates explicitly, retaining their old fields", async () => {
    const b = new ExcelJS.Workbook(),
      s = b.addWorksheet("Đăng ký");
    s.addRow([
      "STT",
      "HỌ VÀ TÊN",
      "CCCD/MÃ ĐD",
      "NGÀY SINH",
      "GIỚI TÍNH",
      "GHI CHÚ",
      "LỚP/NHÓM",
      "NỘI DUNG DỰ KIẾN",
    ]);
    s.addRow([
      1,
      sample.fullName,
      sample.identityNumber,
      "15/05/2012",
      "Nữ",
      "=1+1",
      "6A",
      "Chạy",
    ]);
    expect(
      (
        await readRegistrationWorkbook(
          bytes(new Uint8Array(await b.xlsx.writeBuffer())),
        )
      )[0],
    ).toMatchObject({
      fullName: sample.fullName,
      note: "=1+1",
      className: "6A",
      requestedEvent: "Chạy",
    });
  });
  it("reads the seven-column student baseline with leading-zero identity and numeric grade", async () => {
    const b = new ExcelJS.Workbook(),
      s = b.addWorksheet("Học sinh");
    s.addRow(studentHeaders);
    s.addRow([
      1,
      "Học sinh A",
      "000000000001",
      new Date("2016-05-15T00:00:00Z"),
      "Nam",
      "Trường A",
      5,
    ]);
    expect(
      (
        await readStudentWorkbook(
          bytes(new Uint8Array(await b.xlsx.writeBuffer())),
        )
      )[0],
    ).toMatchObject({
      fullName: "Học sinh A",
      identityNumber: "000000000001",
      className: "5",
      birthDate: "2016-05-15",
      schoolName: "Trường A",
    });
    const empty = new ExcelJS.Workbook();
    await empty.xlsx.load(bytes(await studentWorkbook()));
    expect(
      (empty.worksheets[0]!.getRow(1).values as unknown[]).slice(1),
    ).toEqual(studentHeaders);
  });
  it("rejects formulas, numeric identities, wrong headers, malformed dates, wrong gender and arbitrary grades atomically", async () => {
    for (const [column, value] of [
      [6, 40205001234],
      [5, { formula: '"Tên"', result: "Tên" }],
      [7, "31/02/2012"],
      [8, "Khác"],
      [4, 10],
      [3, { formula: '"Trường A"', result: "Trường A" }],
    ] as const) {
      const b = new ExcelJS.Workbook(),
        s = b.addWorksheet("VDV");
      s.addRow(excelHeaders);
      s.addRow([
        1,
        "",
        "Trường A",
        6,
        "Tên",
        "040205001234",
        "15/05/2012",
        "Nam",
      ]);
      s.getRow(2).getCell(column).value = value;
      await expect(
        readRegistrationWorkbook(
          bytes(new Uint8Array(await b.xlsx.writeBuffer())),
        ),
      ).rejects.toThrow();
    }
    await expect(
      readRegistrationWorkbook(
        bytes(await registrationWorkbook([sample, sample])),
      ),
    ).rejects.toThrow(/trùng mã/);
    await expect(
      readRegistrationWorkbook(bytes(await registrationWorkbook())),
    ).rejects.toThrow(/chưa có/);
    await expect(
      readRegistrationWorkbook(new ArrayBuffer(5 * 1024 * 1024 + 1)),
    ).rejects.toThrow(/5 MB/);
  });
});
