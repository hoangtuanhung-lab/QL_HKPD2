import { ensure, integer, freeze } from "./model.js";
export interface SportStanding {
  schoolId: string;
  block: string;
  sportId: string;
  sportKind: "football" | "tug_of_war" | "other";
  rank: number;
}
export interface Penalty {
  id: string;
  schoolId: string;
  block: string;
  sportId: string;
  points: number;
  waived: boolean;
  reason: string;
  decidedBy: string;
}
export interface MandatoryParticipation {
  schoolId: string;
  block: string;
  requiredEventIds: readonly string[];
  actuallyPlayedEventIds: readonly string[];
  organizerCancelledEventIds: readonly string[];
}
export function allRoundPoints(
  standings: readonly SportStanding[],
  penalties: readonly Penalty[],
  mandatory: readonly MandatoryParticipation[],
) {
  ensure(
    new Set(penalties.map((p) => p.id)).size === penalties.length,
    "PENALTY_DUPLICATE",
    "Khoản phạt bị trùng ID.",
  );
  for (const p of penalties) {
    ensure(
      typeof p.waived === "boolean",
      "PENALTY_INPUT",
      "Cờ miễn phạt phải là boolean.",
    );
    integer(p.points);
    ensure(
      p.reason.trim() && p.decidedBy,
      "PENALTY_INPUT",
      "Phạt/miễn phạt cần lý do và người quyết định.",
    );
  }
  const keys = new Set<string>();
  for (const s of standings) {
    ensure(
      Number.isSafeInteger(s.rank) &&
        s.rank > 0 &&
        s.schoolId &&
        s.block &&
        s.sportId &&
        ["football", "tug_of_war", "other"].includes(s.sportKind),
      "SPORT_RANK",
      "Hạng môn không hợp lệ.",
    );
    const key = JSON.stringify([s.schoolId, s.block, s.sportId]);
    ensure(!keys.has(key), "SPORT_DUPLICATE", "Trùng hạng trường/môn/khối.");
    keys.add(key);
  }
  ensure(
    new Set(mandatory.map((m) => JSON.stringify([m.schoolId, m.block])))
      .size === mandatory.length,
    "MANDATORY_DUPLICATE",
    "Trùng cấu hình bắt buộc trường/khối.",
  );
  ensure(
    mandatory.every(
      (m) => Array.isArray(m.requiredEventIds) && m.requiredEventIds.length > 0,
    ) &&
      [...standings, ...penalties].every((s) =>
        mandatory.some((m) => m.schoolId === s.schoolId && m.block === s.block),
      ),
    "MANDATORY_INPUT",
    "Thiếu cấu hình môn bắt buộc hoặc trường/khối.",
  );
  for (const m of mandatory) {
    for (const refs of [
      m.requiredEventIds,
      m.actuallyPlayedEventIds,
      m.organizerCancelledEventIds,
    ]) {
      ensure(
        Array.isArray(refs) &&
          Array.from(refs).every(
            (id) => typeof id === "string" && id.trim().length > 0,
          ),
        "MANDATORY_INPUT",
        "Mã nội dung bắt buộc/thực đấu/hủy không hợp lệ.",
      );
    }
  }
  const scale = [11, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  return freeze(
    mandatory.map((m) => {
      const sports = standings
        .filter((s) => s.schoolId === m.schoolId && s.block === m.block)
        .map((s) => ({
          sportId: s.sportId,
          rank: s.rank,
          converted: scale[s.rank - 1] ?? 0,
          coefficient:
            s.sportKind === "football" || s.sportKind === "tug_of_war" ? 3 : 1,
        }));
      const raw = sports.reduce(
        (sum, s) => sum + s.converted * s.coefficient,
        0,
      );
      const deductions = penalties.filter(
        (p) => p.schoolId === m.schoolId && p.block === m.block,
      );
      const penalty = deductions
        .filter((p) => !p.waived)
        .reduce((sum, p) => sum + p.points, 0);
      ensure(
        Number.isSafeInteger(raw) && Number.isSafeInteger(penalty),
        "POINT_OVERFLOW",
        "Tổng điểm vượt phạm vi số nguyên.",
      );
      const missing = m.requiredEventIds.filter(
        (id) =>
          !m.actuallyPlayedEventIds.includes(id) &&
          !m.organizerCancelledEventIds.includes(id),
      );
      return {
        schoolId: m.schoolId,
        block: m.block,
        eligible: missing.length === 0,
        missing,
        sports,
        penalties: structuredClone(deductions),
        convertedTotal: raw,
        penalty,
        total: Math.max(0, raw - penalty),
      };
    }),
  );
}
export interface SchoolSportTotal {
  schoolId: string;
  points: number;
  gold: number;
  silver: number;
  bronze: number;
  actualAthleteIds: readonly string[];
}
/** School ranks: source points→gold→silver→bronze→unique actual athletes; unresolved draw is manual. */
export function rankSchoolsInSport(input: readonly SchoolSportTotal[]) {
  ensure(
    new Set(input.map((s) => s.schoolId)).size === input.length,
    "SCHOOL_DUPLICATE",
    "Trùng trường trong bảng môn.",
  );
  input.forEach((s) => [s.points, s.gold, s.silver, s.bronze].forEach(integer));
  const rows = input
    .map((s) => ({ ...s, actualAthletes: new Set(s.actualAthleteIds).size }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.gold - a.gold ||
        b.silver - a.silver ||
        b.bronze - a.bronze ||
        b.actualAthletes - a.actualAthletes,
    );
  return rows.map((r, i) => {
    const same = (s: typeof r) =>
      s.points === r.points &&
      s.gold === r.gold &&
      s.silver === r.silver &&
      s.bronze === r.bronze &&
      s.actualAthletes === r.actualAthletes;
    const tied = rows.filter(same).length > 1;
    return { ...r, rank: tied ? null : i + 1, needsDraw: tied };
  });
}
