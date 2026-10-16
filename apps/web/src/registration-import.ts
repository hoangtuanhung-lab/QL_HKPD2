import type { AthleteDraft } from "./registration-draft.js";
export const normalizedSchool = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
/** Excel contains identity fields only; keep server IDs, course choices and hidden legacy notes. */
export function mergeRegistrationRows(
  existing: readonly AthleteDraft[],
  imported: readonly AthleteDraft[],
): AthleteDraft[] {
  const athletes = [...existing];
  for (const row of imported) {
    const identity = athletes.find(
        (a) =>
          Boolean(row.identityNumber) &&
          a.identityNumber === row.identityNumber,
      ),
      code = row.athleteCode
        ? athletes.find((a) => a.athleteCode === row.athleteCode)
        : undefined;
    if (
      row.athleteCode &&
      (!code || code.identityNumber !== row.identityNumber)
    )
      throw Error(
        `${row.fullName}: Mã VĐV không khớp CCCD. Không tự cấp mã từ Excel.`,
      );
    const before = identity ?? code;
    const value = {
      ...before,
      ...row,
      draftId: before?.draftId ?? row.draftId,
      athleteCode: before?.athleteCode,
      note: before ? before.note : row.note,
      catalogSelections: before?.catalogSelections ?? [],
      eventSelections: before?.eventSelections,
      requestedEvent: "",
    };
    const i = athletes.findIndex((a) => a.draftId === value.draftId);
    if (i < 0) athletes.push(value);
    else athletes[i] = value;
  }
  return athletes;
}
