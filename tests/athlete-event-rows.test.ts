import { describe, expect, it } from "vitest";
import {
  addContentRow,
  blankEventRow,
  changeRowSport,
  initialEventRows,
  rowPreferences,
} from "../apps/web/src/athlete-event-rows.js";
describe("Athlete event registration rows", () => {
  it("starts with one blank row, adds a second sport and inherits only the selected sport for extra content", () => {
    let rows = initialEventRows([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.sportId).toBe("");
    expect(() => addContentRow(rows, rows[0]!.groupId)).toThrow(/Chọn môn/);
    rows = changeRowSport(rows, rows[0]!.groupId, "athletics");
    rows[0]!.eventLabel = "Chạy 100 m";
    const firstGroup = rows[0]!.groupId;
    rows = addContentRow(rows, firstGroup);
    expect(rows[1]).toMatchObject({
      groupId: firstGroup,
      sportId: "athletics",
      eventLabel: "",
    });
    rows[1]!.eventLabel = "Nhảy xa";
    rows.push(blankEventRow());
    rows = changeRowSport(rows, rows[2]!.groupId, "swimming");
    rows[2]!.eventLabel = "Tự do 50 m";
    rows = addContentRow(rows, rows[2]!.groupId);
    expect(rows[3]!.sportId).toBe("swimming");
    rows[3]!.eventLabel = "Ếch 50 m";
    expect(rowPreferences(rows, "THCS", "male").map((s) => s.sportId)).toEqual([
      "athletics",
      "athletics",
      "swimming",
      "swimming",
    ]);
  });
  it("changes inherited rows together and clears contents of the old sport without affecting another group", () => {
    const rows = initialEventRows([
      { sportId: "athletics", level: "THCS", eventLabel: "Chạy 100 m" },
      { sportId: "athletics", level: "THCS", eventLabel: "Nhảy xa" },
      { sportId: "swimming", level: "THCS", eventLabel: "Tự do 50 m" },
    ]);
    const changed = changeRowSport(rows, rows[0]!.groupId, "chess");
    expect(changed.slice(0, 2).map((r) => [r.sportId, r.eventLabel])).toEqual([
      ["chess", ""],
      ["chess", ""],
    ]);
    expect(changed[2]).toEqual(rows[2]);
    expect(rows[0]!.eventLabel).toBe("Chạy 100 m");
    expect(() => changeRowSport(rows, rows[0]!.groupId, "swimming")).toThrow(
      /Thêm nội dung/,
    );
  });
  it("rejects partial, duplicate and mismatched choices but permits an unused wholly blank row", () => {
    let rows = changeRowSport(initialEventRows([]), "missing", "athletics");
    expect(rowPreferences(rows, "THCS", "male")).toEqual([]);
    rows = initialEventRows([
      { sportId: "athletics", level: "THCS", eventLabel: "Chạy 100 m" },
    ]);
    rows.push(blankEventRow());
    expect(rowPreferences(rows, "THCS", "male")).toHaveLength(1);
    rows[1]!.sportId = "chess";
    expect(() => rowPreferences(rows, "THCS", "male")).toThrow(/Dòng 2/);
    rows[1]!.sportId = "athletics";
    rows[1]!.eventLabel = "Chạy 100 m";
    expect(() => rowPreferences(rows, "THCS", "male")).toThrow(/trùng/);
    expect(() => rowPreferences(rows, "TH", "male")).toThrow(/không phù hợp/);
  });
});
