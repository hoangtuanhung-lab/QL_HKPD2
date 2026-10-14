import { athleteCatalog } from "./athlete-catalog.generated.js";
import { clean, newDraftId, type SchoolDraft } from "./registration-draft.js";
export interface TournamentStaff {
  id: string;
  name: string;
  role: "leader" | "referee";
  sportCodes: string[];
  needsReview: boolean;
}
export interface Tournament {
  id: string;
  name: string;
  year: number;
  catalogCodes: string[];
  staff: TournamentStaff[];
  sourceId?: string;
}
export interface TournamentState {
  currentId: string;
  editions: Tournament[];
  draftEditions: Record<string, string>;
}
export interface CarryOptions {
  catalog: boolean;
  staff: boolean;
  registrations: boolean;
}
const normalized = (name: string) =>
  clean(name).normalize("NFKC").toLocaleLowerCase("vi");
export function initialTournaments(
  drafts: readonly SchoolDraft[],
): TournamentState {
  const state: TournamentState = {
    currentId: "edition-2026",
    editions: [
      {
        id: "edition-2026",
        name: "2026",
        year: 2026,
        catalogCodes: athleteCatalog.map((e) => e.code),
        staff: [],
      },
    ],
    draftEditions: {},
  };
  const linked = linkDrafts(state, drafts);
  const existingCurrent = drafts
    .map((d) =>
      linked.editions.find((e) => e.id === linked.draftEditions[d.draftId]),
    )
    .find((e) => e?.year === 2026);
  if (existingCurrent) {
    linked.currentId = existingCurrent.id;
    if (
      existingCurrent.id !== "edition-2026" &&
      !Object.values(linked.draftEditions).includes("edition-2026")
    )
      linked.editions = linked.editions.filter((e) => e.id !== "edition-2026");
  }
  return linked;
}
export function linkDrafts(
  state: TournamentState,
  drafts: readonly SchoolDraft[],
): TournamentState {
  const next = structuredClone(state);
  next.draftEditions = Object.fromEntries(
    Object.entries(next.draftEditions).filter(([id]) =>
      drafts.some((d) => d.draftId === id),
    ),
  );
  for (const d of drafts) {
    if (Object.hasOwn(next.draftEditions, d.draftId)) continue;
    let edition = next.editions.find(
      (e) => normalized(e.name) === normalized(d.editionName),
    );
    if (!edition) {
      edition = {
        id: `legacy:${normalized(d.editionName)}`,
        name: clean(d.editionName),
        year: Number(d.editionName.match(/\b(20\d{2})\b/)?.[1] ?? 2026),
        catalogCodes: athleteCatalog.map((e) => e.code),
        staff: [],
      };
      next.editions.push(edition);
    }
    next.draftEditions = { ...next.draftEditions, [d.draftId]: edition.id };
  }
  return next;
}
export function validateTournamentState(
  value: unknown,
  drafts: readonly SchoolDraft[],
): TournamentState {
  if (!value || typeof value !== "object")
    throw Error("Thiết lập giải không hợp lệ.");
  const state = value as TournamentState;
  if (
    !Array.isArray(state.editions) ||
    !state.editions.length ||
    !state.draftEditions ||
    typeof state.draftEditions !== "object"
  )
    throw Error("Danh sách giải không hợp lệ.");
  const ids = new Set<string>(),
    names = new Set<string>(),
    known = new Set<string>(athleteCatalog.map((e) => e.code));
  for (const e of state.editions) {
    if (
      !e ||
      typeof e.id !== "string" ||
      !e.id ||
      typeof e.name !== "string" ||
      !clean(e.name) ||
      ids.has(e.id) ||
      names.has(normalized(e.name)) ||
      !Number.isInteger(e.year) ||
      e.year < 2000 ||
      e.year > 2100 ||
      !Array.isArray(e.catalogCodes) ||
      new Set(e.catalogCodes).size !== e.catalogCodes.length ||
      e.catalogCodes.some((code) => !known.has(code)) ||
      !Array.isArray(e.staff)
    )
      throw Error("Thông tin giải không hợp lệ hoặc trùng.");
    ids.add(e.id);
    names.add(normalized(e.name));
    const staffIds = new Set<string>();
    const sports = new Set<string>(
      athleteCatalog
        .filter((c) => e.catalogCodes.includes(c.code))
        .map((c) => c.sportCode),
    );
    for (const person of e.staff) {
      if (
        !person ||
        typeof person.id !== "string" ||
        !person.id ||
        staffIds.has(person.id) ||
        typeof person.name !== "string" ||
        !clean(person.name) ||
        !["leader", "referee"].includes(person.role) ||
        typeof person.needsReview !== "boolean" ||
        !Array.isArray(person.sportCodes) ||
        new Set(person.sportCodes).size !== person.sportCodes.length ||
        person.sportCodes.some((code) => !sports.has(code))
      )
        throw Error("Danh sách trọng tài không hợp lệ.");
      staffIds.add(person.id);
    }
  }
  if (!ids.has(state.currentId)) throw Error("Giải hiện tại không tồn tại.");
  for (const d of drafts)
    if (
      !ids.has(state.draftEditions[d.draftId] ?? "") ||
      normalized(
        state.editions.find((e) => e.id === state.draftEditions[d.draftId])!
          .name,
      ) !== normalized(d.editionName)
    )
      throw Error("Phiếu chưa gắn với giải hợp lệ.");
  for (const [draftId, editionId] of Object.entries(state.draftEditions))
    if (!drafts.some((d) => d.draftId === draftId) || !ids.has(editionId))
      throw Error("Liên kết phiếu và giải không hợp lệ.");
  return structuredClone(state);
}
function reviewNote(note: string | undefined, source: string) {
  const combined = [
    note,
    `Kết chuyển từ ${source}; cần rà soát lớp, tuổi và nội dung trước đăng ký.`,
  ]
    .filter(Boolean)
    .join(" · ");
  return combined.length <= 2000 ? combined : (note ?? "");
}
export function carryTournament(
  state: TournamentState,
  drafts: readonly SchoolDraft[],
  sourceId: string,
  name: string,
  year: number,
  options: CarryOptions,
) {
  const source = state.editions.find((e) => e.id === sourceId);
  if (
    !source ||
    !clean(name) ||
    state.editions.some((e) => normalized(e.name) === normalized(name)) ||
    !Number.isInteger(year) ||
    year <= source.year ||
    year > 2100
  )
    throw Error("Tên giải phải mới và năm phải sau giải nguồn (tối đa 2100).");
  const next = structuredClone(state),
    nextDrafts = structuredClone([...drafts]);
  const target: Tournament = {
    id: newDraftId(),
    name: clean(name),
    year,
    sourceId,
    catalogCodes: options.catalog ? [...source.catalogCodes] : [],
    staff: options.staff
      ? source.staff.map((person) => ({
          ...structuredClone(person),
          sportCodes: options.catalog ? [...person.sportCodes] : [],
          needsReview: true,
        }))
      : [],
  };
  next.editions.push(target);
  if (options.registrations)
    for (const d of drafts.filter(
      (d) => state.draftEditions[d.draftId] === sourceId,
    )) {
      const copy: SchoolDraft = {
        ...structuredClone(d),
        draftId: newDraftId(),
        editionName: target.name,
        athletes: d.athletes.map((a) => ({
          ...structuredClone(a),
          draftId: newDraftId(),
          note: reviewNote(a.note, source.name),
          ...(options.catalog
            ? {}
            : {
                requestedEvent: "",
                catalogSelections: [],
                eventSelections: [],
              }),
        })),
      };
      nextDrafts.push(copy);
      next.draftEditions[copy.draftId] = target.id;
    }
  return {
    state: validateTournamentState(next, nextDrafts),
    drafts: nextDrafts,
    target,
  };
}
