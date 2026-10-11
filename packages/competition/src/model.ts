export class CompetitionError extends Error {
  constructor(
    public readonly code:
      | "VALIDATION_ERROR"
      | "INVALID_STATE"
      | "VERSION_CONFLICT"
      | "RULES_UNRESOLVED"
      | "FORBIDDEN",
    message: string,
  ) {
    super(message);
  }
}
export function ensure(
  condition: unknown,
  message: string,
  code: CompetitionError["code"] = "VALIDATION_ERROR",
): asserts condition {
  if (!condition) throw new CompetitionError(code, message);
}
export interface Entrant {
  id: string;
  label: string;
  schoolId: string;
  /** Global person identifiers: team entries expand to EVERY member for scheduling. */
  personIds: readonly string[];
}
export type Slot =
  | { kind: "participant"; entrantId: string }
  | { kind: "ghost" }
  | { kind: "winner"; matchId: string };
export interface DrawMatch {
  id: string;
  round: number;
  number: number;
  slots: readonly [Slot, Slot];
}
export interface DrawRound {
  number: number;
  matches: readonly DrawMatch[];
  restingIds: readonly string[];
}
export interface Draw {
  eventId: string;
  format: "knockout" | "round_robin";
  entrants: readonly Entrant[];
  rounds: readonly DrawRound[];
  seedIds: readonly string[];
  positions: readonly (string | null)[];
  schoolException: { reason: string; matchIds: readonly string[] } | null;
}
export function validateEntrants(
  entrants: readonly Entrant[],
  minimum = 3,
  maximum = 64,
) {
  ensure(
    entrants.length >= minimum && entrants.length <= maximum,
    `Danh sách cần từ ${minimum} đến ${maximum} đối tượng thi đấu.`,
  );
  const ids = new Set<string>();
  const people = new Set<string>();
  for (const entrant of entrants) {
    ensure(
      entrant.id &&
        entrant.label.trim() &&
        entrant.schoolId &&
        !ids.has(entrant.id),
      "Danh sách thiếu thông tin hoặc trùng mã đối tượng thi đấu.",
    );
    ensure(
      entrant.personIds.length &&
        new Set(entrant.personIds).size === entrant.personIds.length &&
        entrant.personIds.every(Boolean),
      "Danh sách thành viên thi đấu chưa đầy đủ.",
    );
    ensure(
      entrant.personIds.every((id) => !people.has(id)),
      "Một người bị đăng ký ở nhiều đối tượng trong cùng nội dung.",
    );
    entrant.personIds.forEach((id) => people.add(id));
    ids.add(entrant.id);
  }
}
/** Domain snapshots are immutable; adapters persist JSON and revalidate on load. */
export function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export type RandomIndex = (exclusiveMaximum: number) => number;
/** Runtime CSPRNG; deterministic injection is reserved for tests and reproducible fixtures. */
export const secureIndex: RandomIndex = (maximum) => {
  ensure(
    Number.isSafeInteger(maximum) && maximum > 0 && maximum <= 0x100000000,
    "Giới hạn bốc thăm không hợp lệ.",
  );
  const ceiling = Math.floor(0x100000000 / maximum) * maximum;
  const value = new Uint32Array(1);
  do {
    globalThis.crypto.getRandomValues(value);
  } while (value[0]! >= ceiling);
  return value[0]! % maximum;
};
export function shuffle<T>(values: readonly T[], random: RandomIndex): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const selected = random(index + 1);
    ensure(
      Number.isInteger(selected) && selected >= 0 && selected <= index,
      "Nguồn bốc thăm không hợp lệ.",
    );
    [result[index], result[selected]] = [result[selected]!, result[index]!];
  }
  return result;
}
