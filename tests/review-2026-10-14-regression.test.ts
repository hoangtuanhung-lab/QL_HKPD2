// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  DraftStorageFull,
  DraftWriter,
  newDraftId,
  readDraftSnapshot,
  type DraftLocks,
  type SchoolDraft,
} from "../apps/web/src/registration-draft.js";
import {
  photoMaxLength,
  photoSize,
  resizePhoto,
} from "../apps/web/src/photo-resize.js";
import { randomBytes } from "node:crypto";
import ExcelJS from "exceljs";
import {
  excelHeaders,
  readRegistrationWorkbook,
  registrationWorkbook,
} from "../apps/web/src/registration-excel.js";
import type { Actor } from "../packages/foundation/src/index.js";
import {
  identityAccess,
  identityIndex,
  identityView,
  normalizeIdentity,
  partialIdentity,
  reconcileIdentities,
  sealIdentity,
} from "../packages/registration/src/index.js";

const serial: DraftLocks = {
  request: async (_name, run) => run(),
};
function boundedStorage(limit: number) {
  const data = new Map<string, string>();
  return {
    data,
    limit,
    getItem: (key: string) => data.get(key) ?? null,
    setItem(key: string, value: string) {
      let used = 0;
      for (const [k, v] of data) if (k !== key) used += k.length + v.length;
      if (used + key.length + value.length > this.limit)
        throw new DOMException("synthetic full storage", "QuotaExceededError");
      data.set(key, value);
    },
  };
}
function school(athletes: number, photo: string): SchoolDraft {
  return {
    draftId: newDraftId(),
    editionName: "Synthetic",
    schoolName: "Trường thử",
    athletes: Array.from({ length: athletes }, (_, i) => ({
      draftId: newDraftId(),
      fullName: `VĐV ${i + 1}`,
      className: "6A",
      requestedEvent: "",
      photoDataUrl: photo,
    })),
  };
}

describe("RV-01 ảnh VĐV và bộ nhớ trình duyệt", () => {
  it("thu ảnh về khung 360 × 480, giữ tỉ lệ, không phóng to ảnh nhỏ", () => {
    expect(photoSize(4000, 3000)).toEqual({ width: 360, height: 270 });
    expect(photoSize(3000, 4000)).toEqual({ width: 360, height: 480 });
    expect(photoSize(200, 100)).toEqual({ width: 200, height: 100 });
    expect(() => photoSize(0, 100)).toThrow();
  });
  it("nén JPEG giảm dần chất lượng cho tới khi đủ nhỏ", () => {
    const qualities: number[] = [];
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        fillStyle: "",
        fillRect: vi.fn(),
        drawImage: vi.fn(),
      }),
      toDataURL: (_type: string, quality: number) => {
        qualities.push(quality);
        return (
          "data:image/jpeg;base64," +
          "A".repeat(quality > 0.6 ? photoMaxLength : 1000)
        );
      },
    };
    const doc = { createElement: () => canvas } as unknown as Document;
    const image = {
      naturalWidth: 4000,
      naturalHeight: 3000,
    } as HTMLImageElement;
    const url = resizePhoto(image, doc);
    expect(url.length).toBeLessThanOrEqual(photoMaxLength);
    expect(qualities).toEqual([0.85, 0.7, 0.55]);
    expect(canvas.width).toBe(360);
  });
  it("báo lỗi tiếng Việt khi trình duyệt không có canvas, không lưu ảnh gốc", () => {
    const doc = {
      createElement: () => ({ getContext: () => null }),
    } as unknown as Document;
    expect(() =>
      resizePhoto(
        { naturalWidth: 10, naturalHeight: 10 } as HTMLImageElement,
        doc,
      ),
    ).toThrow("không thu nhỏ được ảnh");
  });
  it("40 VĐV có ảnh đã nén vừa trong 5 triệu ký tự", async () => {
    const storage = boundedStorage(5_000_000);
    const writer = new DraftWriter(
      storage,
      { revision: 0, token: null },
      serial,
    );
    const photo = "data:image/jpeg;base64," + "A".repeat(photoMaxLength - 23);
    await writer.save([school(40, photo)]);
    expect(readDraftSnapshot(storage).drafts[0]!.athletes).toHaveLength(40);
  });
  it("đầy bộ nhớ: báo lỗi rõ, giữ bản cũ, lần lưu sau của người dùng ghi được khi đã bớt dữ liệu", async () => {
    const storage = boundedStorage(5_000_000);
    const writer = new DraftWriter(
      storage,
      { revision: 0, token: null },
      serial,
    );
    const small = school(2, "");
    await writer.save([small]);
    const before = storage.data.get("hkpd.a04.school-drafts.v2");
    const big = school(40, "data:image/jpeg;base64," + "A".repeat(200_000));
    await expect(writer.save([big])).rejects.toBeInstanceOf(DraftStorageFull);
    await expect(writer.save([big])).rejects.toThrow(
      "Bộ nhớ trình duyệt đã đầy",
    );
    expect(storage.data.get("hkpd.a04.school-drafts.v2")).toBe(before);
    const trimmed = {
      ...small,
      athletes: [...small.athletes, ...school(1, "").athletes],
    };
    await writer.save([trimmed]);
    const saved = readDraftSnapshot(storage);
    expect(saved.revision).toBe(2);
    expect(saved.drafts[0]!.athletes).toHaveLength(3);
  });
  it("sau khi đầy bộ nhớ vẫn phát hiện tab khác đã ghi, không ghi đè", async () => {
    const storage = boundedStorage(1_000_000);
    const writer = new DraftWriter(
      storage,
      { revision: 0, token: null },
      serial,
    );
    await writer.save([school(1, "")]);
    await expect(
      writer.save([
        school(10, "data:image/jpeg;base64," + "A".repeat(200_000)),
      ]),
    ).rejects.toBeInstanceOf(DraftStorageFull);
    const other = new DraftWriter(storage, readDraftSnapshot(storage), serial);
    await other.save([school(3, "")]);
    await expect(writer.save([school(1, "")])).rejects.toThrow("tab khác");
    expect(readDraftSnapshot(storage).drafts[0]!.athletes).toHaveLength(3);
  });
});

describe("RV-02 CCCD theo vai trò, mã hóa và đối chiếu danh sách", () => {
  const edition = "edition-1";
  const scope = {
    editionId: edition,
    schoolId: "school-1",
    studentId: "student-1",
    sportIds: ["swim"],
  };
  const actor = (
    role: "school" | "admin" | "leader" | "referee",
    extra: Partial<Actor["assignments"][number]> = {},
    approved = true,
  ): Actor => ({
    id: `${role}-actor`,
    approved,
    assignments: [{ editionId: edition, role, ...extra }],
  });
  const key = randomBytes(32);
  const sealed = sealIdentity("001234567890", key, "aes-1", scope);

  it("trường đăng ký và quản trị thấy đủ 12 số", () => {
    expect(
      identityView(
        actor("school", { schoolId: "school-1" }),
        scope,
        sealed,
        key,
        "aes-1",
      ),
    ).toBe("001234567890");
    expect(identityView(actor("admin"), scope, sealed, key, "aes-1")).toBe(
      "001234567890",
    );
  });
  it("tổ trưởng và trọng tài môn được phân công thấy 3 số đầu và 4 số cuối", () => {
    for (const role of ["leader", "referee"] as const) {
      const viewer = actor(role, { sportId: "swim", eventIds: ["e1"] });
      expect(identityAccess(viewer, scope)).toBe("partial");
      expect(identityView(viewer, scope, sealed, key, "aes-1")).toBe(
        "001*****7890",
      );
    }
  });
  it("từ chối trọng tài môn khác, tài khoản chưa duyệt và trường khác", () => {
    for (const viewer of [
      actor("referee", { sportId: "chess" }),
      actor("leader", { sportId: "swim" }, false),
      actor("school", { schoolId: "school-2" }),
      {
        ...actor("referee", { sportId: "swim" }),
        assignments: [
          { editionId: "other", role: "referee" as const, sportId: "swim" },
        ],
      },
      null,
    ])
      expect(() => identityView(viewer, scope, sealed, key, "aes-1")).toThrow(
        "ngoài phạm vi",
      );
  });
  it("che toàn bộ giá trị sai định dạng, không lộ một phần", () => {
    expect(partialIdentity("12345")).toBe("*****");
    expect(partialIdentity("")).toBe("");
  });
  it("chuẩn hóa CCCD có khoảng trắng, dấu chấm, số toàn khổ; từ chối số Excel và sai độ dài", () => {
    expect(normalizeIdentity(" 001 234.567-890 ")).toBe("001234567890");
    expect(normalizeIdentity("００１２３４５６７８９０")).toBe("001234567890");
    expect(normalizeIdentity(1234567890)).toBeNull();
    expect(normalizeIdentity("00123456789")).toBeNull();
    expect(normalizeIdentity("00123456789a")).toBeNull();
  });
  it("mã so khớp ổn định theo khóa, khác khi đổi khóa, không chứa chữ số CCCD", () => {
    const index = { keyId: "hmac-1", key: randomBytes(32) };
    const a = identityIndex("001234567890", index);
    expect(identityIndex("001234567890", index)).toBe(a);
    expect(a.startsWith("hmac-1:")).toBe(true);
    expect(a).not.toContain("001234567890");
    expect(
      identityIndex("001234567890", { keyId: "hmac-2", key: randomBytes(32) }),
    ).not.toBe(a);
    expect(() =>
      identityIndex("001234567890", { keyId: "hmac-1", key: randomBytes(16) }),
    ).toThrow();
  });
  it("đối chiếu danh sách đăng ký với dữ liệu phần mềm, kết quả không chứa CCCD", () => {
    const index = { keyId: "hmac-1", key: randomBytes(32) };
    const stored = [
      { studentId: "s1", index: identityIndex("001000000001", index) },
      { studentId: "s2", index: identityIndex("001000000002", index) },
      { studentId: "s3", index: identityIndex("001000000003", index) },
      { studentId: "s4", index: identityIndex("001000000004", index) },
      { studentId: "s5", index: identityIndex("001000000004", index) },
    ];
    const result = reconcileIdentities(
      stored,
      [
        { row: 2, identity: "001 000 000 001" },
        { row: 3, identity: "001000000002" },
        { row: 4, identity: "001000000002" },
        { row: 5, identity: "009999999999" },
        { row: 6, identity: 1000000001 },
        { row: 7, identity: "001000000004" },
      ],
      index,
    );
    expect(result).toEqual({
      matched: [
        { row: 2, studentId: "s1" },
        { row: 3, studentId: "s2" },
      ],
      onlyInList: [{ row: 5 }],
      onlyInSoftware: [{ studentId: "s3" }],
      duplicateRows: [{ row: 4, firstRow: 3 }],
      invalidRows: [{ row: 6 }],
      ambiguous: [{ row: 7, studentIds: ["s4", "s5"] }],
    });
    expect(JSON.stringify(result)).not.toMatch(/\d{12}/);
  });
  it("từ chối đối chiếu khi mã đã lưu dùng khóa khác", () => {
    const old = { keyId: "hmac-1", key: randomBytes(32) };
    expect(() =>
      reconcileIdentities(
        [{ studentId: "s1", index: identityIndex("001000000001", old) }],
        [],
        { keyId: "hmac-2", key: randomBytes(32) },
      ),
    ).toThrow("khóa khác");
  });
});

async function excelBytes(
  rows: unknown[][],
  headers: readonly string[] = excelHeaders,
) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Đăng ký VĐV");
  sheet.addRow([...headers]);
  for (const row of rows) sheet.addRow(row);
  const bytes = new Uint8Array(await book.xlsx.writeBuffer());
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
}

describe("RV-03 Excel nhận cột Lớp, Ghi chú dạng số và ô định dạng", () => {
  it("lớp gõ số 6 được nhận là '6' và suy ra cấp THCS", async () => {
    const [a] = await readRegistrationWorkbook(
      await excelBytes([
        [1, "Nguyễn Văn A", "", "05/03/2014", "Nam", 12, 6, "Bơi"],
      ]),
    );
    expect(a).toMatchObject({ className: "6", note: "12", gender: "male" });
  });
  it("họ tên là ô định dạng (rich text) được ghép thành chữ", async () => {
    const [a] = await readRegistrationWorkbook(
      await excelBytes([
        [
          1,
          {
            richText: [
              { text: "Trần " },
              { font: { bold: true }, text: "Thị B" },
            ],
          },
          "",
          "",
          "Nữ",
          "",
          "7A",
          "",
        ],
      ]),
    );
    expect(a!.fullName).toBe("Trần Thị B");
  });
  it("CCCD có khoảng trắng hoặc dấu chấm được chuẩn hóa; CCCD dạng số báo rõ lý do", async () => {
    const [a] = await readRegistrationWorkbook(
      await excelBytes([[1, "A", "040 205.001 234", "", "", "", "6A", ""]]),
    );
    expect(a!.identityNumber).toBe("040205001234");
    await expect(
      readRegistrationWorkbook(
        await excelBytes([[1, "A", 40205001234, "", "", "", "6A", ""]]),
      ),
    ).rejects.toThrow("số 0 ở đầu");
  });
  it("biểu mẫu tải về định dạng cột Lớp là văn bản", async () => {
    const book = new ExcelJS.Workbook();
    const bytes = await registrationWorkbook();
    await book.xlsx.load(
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer,
    );
    expect(book.worksheets[0]!.getColumn(7).numFmt).toBe("@");
  });
});

describe("RV-04 Excel chuẩn hóa giới tính và tiêu đề", () => {
  for (const [text, gender] of [
    ["nữ", "female"],
    ["NỮ", "female"],
    ["Nữ".normalize("NFD"), "female"],
    [" nam ", "male"],
    ["NAM", "male"],
  ] as const)
    it(`giới tính ${JSON.stringify(text)}`, async () => {
      const [a] = await readRegistrationWorkbook(
        await excelBytes([[1, "A", "", "", text, "", "6A", ""]]),
      );
      expect(a!.gender).toBe(gender);
    });
  it("vẫn từ chối giới tính không hợp lệ", async () => {
    await expect(
      readRegistrationWorkbook(
        await excelBytes([[1, "A", "", "", "Khác", "", "6A", ""]]),
      ),
    ).rejects.toThrow("Nam hoặc Nữ");
  });
  it("tiêu đề gõ chữ thường hoặc Unicode tổ hợp vẫn khớp biểu mẫu", async () => {
    const headers = excelHeaders.map((h, i) =>
      i % 2 ? h.toLocaleLowerCase("vi") : h.normalize("NFD"),
    );
    const rows = await readRegistrationWorkbook(
      await excelBytes([[1, "A", "", "", "Nam", "", "6A", ""]], headers),
    );
    expect(rows).toHaveLength(1);
  });
});
