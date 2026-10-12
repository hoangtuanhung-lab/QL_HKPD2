import ExcelJS from "exceljs";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  athleteCatalog,
  athleteCatalogSha256,
} from "../apps/web/src/athlete-catalog.generated.js";
import {
  blankCatalogRow,
  catalogContents,
  catalogGroups,
  catalogSports,
  educationLevel,
  eligibleCatalog,
  hasCatalogGroups,
  migrateLegacyPreferences,
  rowFromCode,
  scopeIssue,
  selectCatalogSport,
  validateCatalogRow,
  validateCatalogRows,
  type StudentScope,
} from "../apps/web/src/athlete-catalog.js";
import {
  fromSheet,
  toSheet,
  readDraftSnapshot,
  saveDrafts,
} from "../apps/web/src/registration-draft.js";
const male: StudentScope = {
  level: "THCS",
  gender: "male",
  birthYear: 2012,
  year: 2026,
};
describe("Uploaded 133-event registration catalog", () => {
  it("preserves the exact Excel codes, labels and row count, ignoring formatted blank rows", async () => {
    const bytes = readFileSync("docs/catalog/DanhMuc_Mon_NoiDung_HKPD.xlsx");
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      athleteCatalogSha256,
    );
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(new Uint8Array(bytes).buffer as ArrayBuffer);
    const entries: {
      row: number;
      code: string;
      group: string | null;
      name: string;
    }[] = [];
    book.worksheets[0]!.eachRow((r, i) => {
      if (i > 1 && r.getCell(2).value)
        entries.push({
          row: i,
          code: r.getCell(2).text,
          group: r.getCell(6).text || null,
          name: r.getCell(7).text,
        });
    });
    expect(athleteCatalog).toHaveLength(133);
    expect(new Set(athleteCatalog.map((e) => e.code)).size).toBe(133);
    expect(
      athleteCatalog.map((e) => ({
        row: e.sourceRow,
        code: e.code,
        group: e.group,
        name: e.name,
      })),
    ).toEqual(entries);
  });
  it("filters football by actual education level and sex and fills BD_TH/BD_THCS without subgroups", () => {
    for (const [scope, code] of [
      [male, "BD_THCS"],
      [{ ...male, level: "TH", birthYear: 2016 }, "BD_TH"],
    ] as const) {
      const entries = eligibleCatalog(scope);
      expect(
        entries.filter((e) => e.sportCode === "BD").map((e) => e.code),
      ).toEqual([code]);
      expect(hasCatalogGroups("BD")).toBe(false);
      const row = selectCatalogSport(blankCatalogRow(), "BD", entries);
      expect(row.eventCode).toBe(code);
      expect(row.group).toBe("");
      expect(validateCatalogRow(row, entries)).toBe(code);
    }
    expect(
      catalogSports(eligibleCatalog({ ...male, gender: "female" })).map(
        (s) => s.code,
      ),
    ).not.toContain("BD");
    expect(eligibleCatalog({ ...male, level: "TH", birthYear: 2015 })).toEqual(
      [],
    );
    expect(eligibleCatalog({ ...male, birthYear: 2016 })).toEqual([]);
    const primary = eligibleCatalog({ ...male, level: "TH", birthYear: 2016 });
    expect(
      primary.filter((e) => e.sportCode === "DK").map((e) => e.code),
    ).toEqual([
      "DK_TH_NAM_TC_60M",
      "DK_TH_NAM_TC_BATXA",
      "DK_TH_NAM_TC_TS4X50",
    ]);
    expect(() =>
      validateCatalogRow(rowFromCode("DK_THCS_NAM_TC_1500M"), primary),
    ).toThrow();
    expect(
      validateCatalogRow(
        rowFromCode("DK_THCS_NAM_TC_1500M"),
        eligibleCatalog(male),
      ),
    ).toBe("DK_THCS_NAM_TC_1500M");
  });
  it("uses the spreadsheet age labels rather than guessing from historical numeric code suffixes", () => {
    for (const [scope, group] of [
      [{ ...male, level: "TH", birthYear: 2019 }, "6 - 8 tuổi"],
      [{ ...male, level: "TH", birthYear: 2016 }, "9 - 10 tuổi"],
      [{ ...male, birthYear: 2015 }, "11 - 12 tuổi"],
      [{ ...male, birthYear: 2013 }, "13 - 14 tuổi"],
    ] as const) {
      const entries = eligibleCatalog(scope);
      expect(catalogGroups(entries, "BOI")).toEqual([group, "Cả cấp"]);
      expect(
        catalogContents(entries, "BOI", group).every((e) => e.group === group),
      ).toBe(true);
    }
    expect(
      eligibleCatalog({ ...male, birthYear: 2011 }).some(
        (e) => e.sportCode === "BOI" && e.group !== "Cả cấp",
      ),
    ).toBe(false);
  });
  it("keeps mixed-sex events available to both sexes and blocks choices with missing profile data", () => {
    for (const gender of ["male", "female"] as const) {
      const entries = eligibleCatalog({ ...male, gender });
      expect(
        entries.some((e) => e.code === "BOI_THCS_HON_HOP_TC_TS4X100"),
      ).toBe(true);
      expect(
        entries
          .filter((e) => e.gender !== "Nam - nữ")
          .every((e) => e.gender === (gender === "male" ? "Nam" : "Nữ")),
      ).toBe(true);
    }
    for (const scope of [
      { ...male, gender: "" as const },
      { ...male, level: "" as const },
      { ...male, birthYear: null },
    ]) {
      expect(scopeIssue(scope)).not.toBe("");
      expect(eligibleCatalog(scope)).toEqual([]);
    }
    expect(educationLevel({ className: "5A", educationLevel: "THCS" })).toBe(
      "TH",
    );
    expect(educationLevel({ className: "6A" })).toBe("THCS");
  });
  it("cascades choices and rejects wrong groups, wrong-sex codes, duplicates and a third sport", () => {
    const entries = eligibleCatalog(male);
    const row = {
      ...blankCatalogRow("BOI", "13 - 14 tuổi"),
      eventCode: "BOI_THCS_NAM_1415_ECH50",
    };
    expect(validateCatalogRow(row, entries)).toBe(row.eventCode);
    expect(selectCatalogSport(row, "DK", entries)).toMatchObject({
      sportCode: "DK",
      group: "",
      eventCode: "",
    });
    expect(() =>
      validateCatalogRow({ ...row, group: "11 - 12 tuổi" }, entries),
    ).toThrow();
    expect(() =>
      validateCatalogRow(
        { ...row, eventCode: "BOI_THCS_NU_1415_ECH50" },
        entries,
      ),
    ).toThrow();
    expect(() => validateCatalogRows([row, row], entries)).toThrow(/trùng/);
    expect(() =>
      validateCatalogRows(
        [row, rowFromCode("BD_THCS"), rowFromCode("DK_THCS_NAM_TC_100M")],
        entries,
      ),
    ).toThrow(/2 môn/);
  });
  it("matches legacy preferences only when one eligible real code is identified; retains unresolved choices", () => {
    const migrated = migrateLegacyPreferences(
      [
        { sportId: "athletics", level: "THCS", eventLabel: "Chạy 100 m" },
        { sportId: "swimming", level: "THCS", eventLabel: "Ếch 50 m" },
        { sportId: "chess", level: "THCS", eventLabel: "Cá nhân nam" },
      ],
      eligibleCatalog(male),
    );
    expect(migrated.codes).toEqual([
      "DK_THCS_NAM_TC_100M",
      "BOI_THCS_NAM_1415_ECH50",
    ]);
    expect(migrated.unresolved).toHaveLength(1);
  });
  it("round trips code-based portable v4 and storage while continuing to read older sheets", async () => {
    const sheet = {
      format: "hkpd-school-registration-draft",
      formatVersion: 4,
      schoolName: "Trường",
      editionName: "2026",
      athletes: [
        {
          fullName: "Minh họa",
          className: "6A",
          requestedEvent: "Bóng đá",
          gender: "male",
          birthDate: "2012-05-15",
          educationLevel: "THCS",
          catalogSelections: ["BD_THCS"],
        },
      ],
    };
    const draft = fromSheet(sheet);
    expect(toSheet(draft)).toEqual(sheet);
    const memory = new Map<string, string>();
    const storage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v);
      },
    };
    await saveDrafts(storage, [draft], readDraftSnapshot(storage), {
      request: async (_n, f) => f(),
    });
    expect(readDraftSnapshot(storage).drafts[0]).toEqual(draft);
    expect(() =>
      fromSheet({
        ...sheet,
        athletes: [{ ...sheet.athletes[0], catalogSelections: ["BAD_CODE"] }],
      }),
    ).toThrow();
    expect(() =>
      fromSheet({
        ...sheet,
        athletes: [
          { ...sheet.athletes[0], catalogSelections: ["BD_THCS", "BD_THCS"] },
        ],
      }),
    ).toThrow();
  });
});
