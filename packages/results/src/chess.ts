import { parseCsv } from "@hkpd/registration";
import { ensure } from "./model.js";
export function previewChessRows(
  rows: readonly (readonly string[])[],
  approvedAthleteCodes: readonly string[],
) {
  ensure(
    rows[0]?.join(",") === "athlete_code,rank",
    "CHESS_HEADER",
    "Cột Cờ vua: athlete_code,rank.",
  );
  const seen = new Set<string>();
  return rows.slice(1).map((r, index) => {
    const athleteCode = r[0]?.trim() ?? "",
      rank = r[1]?.trim() ?? "";
    const errors: string[] = [];
    if (
      r.length !== 2 ||
      !/^\d+$/.test(rank) ||
      !Number.isSafeInteger(Number(rank)) ||
      Number(rank) < 1
    )
      errors.push("RANK");
    if (!approvedAthleteCodes.includes(athleteCode))
      errors.push("ATHLETE_SCOPE");
    if (seen.has(athleteCode)) errors.push("DUPLICATE_ATHLETE");
    seen.add(athleteCode);
    return { row: index + 2, athleteCode, rank: Number(rank), errors };
  });
}
export const previewChessCsv = (
  csv: string,
  approvedAthleteCodes: readonly string[],
) => previewChessRows(parseCsv(csv), approvedAthleteCodes);
