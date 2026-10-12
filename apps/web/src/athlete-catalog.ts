import { athleteCatalog } from "./athlete-catalog.generated.js";
import type { EventPreference } from "./athlete-event-options.js";
export type CatalogEvent = (typeof athleteCatalog)[number];
export interface StudentScope {
  level: "TH" | "THCS" | "";
  gender: "male" | "female" | "";
  birthYear: number | null;
  year: number;
}
export function educationLevel(value: {
  className?: unknown;
  educationLevel?: unknown;
}): StudentScope["level"] {
  const grade =
    typeof value.className === "string"
      ? Number(value.className.match(/^\s*(\d+)/)?.[1])
      : NaN;
  return grade >= 1 && grade <= 5
    ? "TH"
    : grade >= 6 && grade <= 9
      ? "THCS"
      : value.educationLevel === "TH" || value.educationLevel === "THCS"
        ? value.educationLevel
        : "";
}
export function scopeIssue(scope: StudentScope): string {
  if (!scope.level) return "Bổ sung cấp học của học sinh trước khi chọn môn.";
  if (!scope.gender)
    return "Bổ sung giới tính của học sinh trước khi chọn môn.";
  if (
    !scope.birthYear ||
    !Number.isInteger(scope.birthYear) ||
    scope.birthYear > scope.year
  )
    return "Bổ sung năm sinh hợp lệ trước khi chọn môn.";
  const age = scope.year - scope.birthYear;
  if (scope.level === "TH" && age >= 11)
    return "Cấp Tiểu học dành cho học sinh dưới 11 tuổi theo yêu cầu đăng ký; kiểm tra lại cấp học/năm sinh.";
  if (scope.level === "THCS" && age < 11)
    return "Học sinh dưới 11 tuổi không chọn nội dung Trung học cơ sở; kiểm tra lại cấp học/năm sinh.";
  return "";
}
export function eligibleCatalog(scope: StudentScope): readonly CatalogEvent[] {
  if (scopeIssue(scope)) return [];
  const gender = scope.gender === "male" ? "Nam" : "Nữ",
    age = scope.year - scope.birthYear!;
  return athleteCatalog.filter((e) => {
    if (
      e.level !== scope.level ||
      (e.gender !== gender && e.gender !== "Nam - nữ")
    )
      return false;
    const bounds = e.group?.match(/^(\d+)\s*-\s*(\d+)\s+tuổi$/);
    return !bounds || (age >= Number(bounds[1]) && age <= Number(bounds[2]));
  });
}
export function catalogSports(events: readonly CatalogEvent[]) {
  return [
    ...new Map(events.map((e) => [e.sportCode, e.sportName])).entries(),
  ].map(([code, name]) => ({ code, name }));
}
export function hasCatalogGroups(sportCode: string): boolean {
  return athleteCatalog.some(
    (e) => e.sportCode === sportCode && e.group && e.group !== "Cả cấp",
  );
}
export function catalogGroups(
  events: readonly CatalogEvent[],
  sportCode: string,
): string[] {
  return hasCatalogGroups(sportCode)
    ? [
        ...new Set(
          events
            .filter((e) => e.sportCode === sportCode)
            .map((e) => e.group ?? "Cả cấp"),
        ),
      ]
    : [];
}
export function catalogContents(
  events: readonly CatalogEvent[],
  sportCode: string,
  group: string,
): readonly CatalogEvent[] {
  return events.filter(
    (e) =>
      e.sportCode === sportCode &&
      (!hasCatalogGroups(sportCode) ||
        (Boolean(group) && (e.group ?? "Cả cấp") === group)),
  );
}
export function eventByCode(code: string): CatalogEvent | undefined {
  return athleteCatalog.find((e) => e.code === code);
}
export interface CatalogRow {
  id: string;
  sportCode: string;
  group: string;
  eventCode: string;
  isEditing: boolean;
}
export const blankCatalogRow = (sportCode = "", group = ""): CatalogRow => ({
  id: crypto.randomUUID(),
  sportCode,
  group,
  eventCode: "",
  isEditing: true,
});
export function rowFromCode(code: string): CatalogRow {
  const e = eventByCode(code);
  return {
    ...blankCatalogRow(
      e?.sportCode ?? "",
      e && hasCatalogGroups(e.sportCode) ? (e.group ?? "Cả cấp") : "",
    ),
    eventCode: code,
    isEditing: false,
  };
}
export function selectCatalogSport(
  row: CatalogRow,
  sportCode: string,
  events: readonly CatalogEvent[],
): CatalogRow {
  const options = events.filter((e) => e.sportCode === sportCode);
  return {
    ...row,
    sportCode,
    group: "",
    eventCode:
      !hasCatalogGroups(sportCode) && options.length === 1
        ? options[0]!.code
        : "",
    isEditing: true,
  };
}
export function validateCatalogRow(
  row: CatalogRow,
  events: readonly CatalogEvent[],
): string {
  if (!row.sportCode || !events.some((e) => e.sportCode === row.sportCode))
    throw Error("Chọn môn phù hợp với cấp học, năm sinh và giới tính.");
  if (hasCatalogGroups(row.sportCode) && !row.group)
    throw Error("Chọn phân nhóm trước khi lưu.");
  if (
    !row.eventCode ||
    !catalogContents(events, row.sportCode, row.group).some(
      (e) => e.code === row.eventCode,
    )
  )
    throw Error("Chọn nội dung hợp lệ theo môn và phân nhóm hiện tại.");
  return row.eventCode;
}
export function validateCatalogRows(
  rows: readonly CatalogRow[],
  events: readonly CatalogEvent[],
): string[] {
  const codes: string[] = [],
    sports = new Set<string>();
  rows.forEach((row, i) => {
    if (!row.sportCode && !row.group && !row.eventCode) return;
    try {
      const code = validateCatalogRow(row, events);
      if (codes.includes(code))
        throw Error("Nội dung đã được đăng ký, không chọn trùng.");
      sports.add(row.sportCode);
      if (sports.size > 2) throw Error("Mỗi VĐV tối đa 2 môn thi đấu.");
      codes.push(code);
    } catch (e) {
      throw Error(`Dòng ${i + 1}: ${(e as Error).message}`, { cause: e });
    }
  });
  return codes;
}
const legacySportCodes: Record<EventPreference["sportId"], string> = {
  athletics: "DK",
  swimming: "BOI",
  badminton: "CL",
  shuttlecock: "DC",
  chess: "CV",
  football: "BD",
  tug: "KC",
  stick: "DG",
  vovinam: "VNM",
};
const comparable = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("vi")
    .replace(/^bơi\s+/, "")
    .replace(/[\s.,:()×-]/g, "")
    .replace(/kg/g, "")
    .replace(/x/g, "");
/** Match legacy text only when exactly one eligible spreadsheet entry is found. Never guess ambiguous codes. */
export function migrateLegacyPreferences(
  preferences: readonly EventPreference[],
  events: readonly CatalogEvent[],
) {
  const codes: string[] = [],
    unresolved: EventPreference[] = [];
  for (const p of preferences) {
    let candidates = events.filter(
      (e) =>
        e.sportCode === legacySportCodes[p.sportId] &&
        e.level === p.level &&
        comparable(e.name) === comparable(p.eventLabel),
    );
    if (p.sportId === "football")
      candidates = events.filter(
        (e) => e.sportCode === "BD" && e.level === p.level,
      );
    if (candidates.length === 1 && !codes.includes(candidates[0]!.code))
      codes.push(candidates[0]!.code);
    else unresolved.push(p);
  }
  return { codes, unresolved };
}
