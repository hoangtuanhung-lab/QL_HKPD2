import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  excelHeaders,
  readRegistrationWorkbook,
  registrationWorkbook,
} from "../apps/web/src/registration-excel.js";
const sample = {
  draftId: "test",
  fullName: "Minh họa",
  className: "6A",
  requestedEvent: "Chạy",
  identityNumber: "040205001234",
  birthDate: "2012-05-15",
  gender: "female" as const,
  note: "=1+1",
};
const arrayBuffer = (bytes: Uint8Array) => bytes.slice().buffer as ArrayBuffer;
describe("Registration Excel", () => {
  it("writes a real xlsx and preserves leading zeros, dates, gender, notes and legacy fields", async () => {
    const bytes = await registrationWorkbook([sample]);
    expect([...bytes.slice(0, 2)]).toEqual([80, 75]);
    expect(
      (await readRegistrationWorkbook(arrayBuffer(bytes)))[0],
    ).toMatchObject({ ...sample, draftId: expect.any(String) });
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(arrayBuffer(bytes));
    expect(book.worksheets[0]!.getCell("F2").value).toBe("=1+1");
  });
  it("downloads an empty template and rejects empty/oversized files", async () => {
    await expect(
      readRegistrationWorkbook(arrayBuffer(await registrationWorkbook())),
    ).rejects.toThrow(/chưa có/);
    await expect(
      readRegistrationWorkbook(new ArrayBuffer(5 * 1024 * 1024 + 1)),
    ).rejects.toThrow(/5 MB/);
  });
  it("rejects formulas, numeric identities, wrong headers, duplicate IDs and malformed dates atomically", async () => {
    for (const [column, value] of [
      [3, 40205001234],
      [2, { formula: '"Tên"', result: "Tên" }],
      [4, "31/02/2012"],
      [5, "Khác"],
    ] as const) {
      const book = new ExcelJS.Workbook();
      const sheet = book.addWorksheet("VDV");
      sheet.addRow(excelHeaders);
      sheet.addRow([
        1,
        "Tên",
        "040205001234",
        "15/05/2012",
        "Nam",
        "",
        "6A",
        "Chạy",
      ]);
      sheet.getRow(2).getCell(column).value = value;
      await expect(
        readRegistrationWorkbook(
          arrayBuffer(new Uint8Array(await book.xlsx.writeBuffer())),
        ),
      ).rejects.toThrow();
    }
    await expect(
      readRegistrationWorkbook(
        arrayBuffer(await registrationWorkbook([sample, sample])),
      ),
    ).rejects.toThrow(/trùng mã/);
    const book = new ExcelJS.Workbook();
    book.addWorksheet("Sai").addRow(["Tên"]);
    await expect(
      readRegistrationWorkbook(
        arrayBuffer(new Uint8Array(await book.xlsx.writeBuffer())),
      ),
    ).rejects.toThrow(/Tiêu đề/);
  });
});
