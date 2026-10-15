import { eventByCode } from "./athlete-catalog.js";
import {
  validateTournamentState,
  type TournamentState,
} from "./tournament-state.js";
import {
  eventOptions,
  sportNames,
  type EventPreference,
  type SportId,
} from "./athlete-event-options.js";
export interface AthleteDraft {
  athleteCode?: string;
  schoolName?: string;
  draftId: string;
  fullName: string;
  className: string;
  requestedEvent: string;
  identityNumber?: string;
  birthDate?: string;
  gender?: "male" | "female";
  note?: string;
  photoDataUrl?: string;
  eventSelections?: EventPreference[];
  catalogSelections?: string[];
  educationLevel?: "TH" | "THCS";
}
export interface SchoolDraft {
  draftId: string;
  editionName: string;
  schoolName: string;
  athletes: AthleteDraft[];
}
export interface RegistrationSheet {
  format: "hkpd-school-registration-draft";
  formatVersion: 1 | 2 | 3 | 4;
  editionName: string;
  schoolName: string;
  athletes: Omit<AthleteDraft, "draftId">[];
}
export const storageKey = "hkpd.a04.school-drafts.v2";
export const legacyStorageKey = "hkpd.a04.school-drafts.v1";
export const newDraftId = () => `draft_${crypto.randomUUID()}`;
export const clean = (value: string) => value.trim().replace(/\s+/g, " ");
export const sameSchool = (left: SchoolDraft, right: SchoolDraft) =>
  clean(left.editionName).normalize("NFKC").toLocaleLowerCase("vi") ===
    clean(right.editionName).normalize("NFKC").toLocaleLowerCase("vi") &&
  clean(left.schoolName).normalize("NFKC").toLocaleLowerCase("vi") ===
    clean(right.schoolName).normalize("NFKC").toLocaleLowerCase("vi");

export function toSheet(school: SchoolDraft): RegistrationSheet {
  return {
    format: "hkpd-school-registration-draft",
    formatVersion: school.athletes.some(
      (a) =>
        a.catalogSelections !== undefined || a.educationLevel !== undefined,
    )
      ? 4
      : school.athletes.some(
            (a) =>
              a.photoDataUrl !== undefined || a.eventSelections !== undefined,
          )
        ? 3
        : school.athletes.some(
              (a) =>
                extraKeys.some((k) => k in a) ||
                !a.className ||
                !a.requestedEvent,
            )
          ? 2
          : 1,
    editionName: school.editionName,
    schoolName: school.schoolName,
    athletes: school.athletes.map((athlete) => ({
      fullName: athlete.fullName,
      className: athlete.className,
      requestedEvent: athlete.requestedEvent,
      ...athleteDetails({ ...athlete }),
    })),
  };
}
function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function text(value: unknown): value is string {
  return typeof value === "string" && clean(value).length > 0;
}
function hasOnly(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}
const profileKeys = ["identityNumber", "birthDate", "gender", "note"] as const;
const v3Keys = [...profileKeys, "photoDataUrl", "eventSelections"] as const;
const extraKeys = [...v3Keys, "catalogSelections", "educationLevel"] as const;
export function athleteDetails(value: Record<string, unknown>) {
  const details: Pick<
    AthleteDraft,
    | "identityNumber"
    | "birthDate"
    | "gender"
    | "note"
    | "photoDataUrl"
    | "eventSelections"
    | "catalogSelections"
    | "educationLevel"
  > = {};
  if (value.identityNumber !== undefined) {
    if (
      typeof value.identityNumber !== "string" ||
      (value.identityNumber !== "" && !/^\d{12}$/.test(value.identityNumber))
    )
      throw new Error("CCCD/mã định danh phải có 12 chữ số.");
    details.identityNumber = value.identityNumber;
  }
  if (value.birthDate !== undefined) {
    if (typeof value.birthDate !== "string")
      throw new Error("Ngày sinh không hợp lệ.");
    if (value.birthDate) {
      const d = new Date(value.birthDate + "T00:00:00Z");
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value.birthDate) ||
        !Number.isFinite(d.getTime()) ||
        d.toISOString().slice(0, 10) !== value.birthDate ||
        value.birthDate > new Date().toISOString().slice(0, 10)
      )
        throw new Error("Ngày sinh không hợp lệ hoặc nằm trong tương lai.");
    }
    details.birthDate = value.birthDate;
  }
  if (value.gender !== undefined) {
    if (value.gender !== "male" && value.gender !== "female")
      throw new Error("Giới tính không hợp lệ.");
    details.gender = value.gender;
  }
  if (value.note !== undefined) {
    if (typeof value.note !== "string" || value.note.length > 2000)
      throw new Error("Ghi chú không hợp lệ hoặc vượt 2.000 ký tự.");
    details.note = value.note.trim();
  }
  if (value.photoDataUrl !== undefined) {
    if (
      typeof value.photoDataUrl !== "string" ||
      value.photoDataUrl.length > 700000 ||
      (value.photoDataUrl !== "" &&
        !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
          value.photoDataUrl,
        ))
    )
      throw new Error("Ảnh bản nháp không hợp lệ hoặc vượt 500 KB.");
    details.photoDataUrl = value.photoDataUrl;
  }
  if (value.eventSelections !== undefined) {
    if (
      !Array.isArray(value.eventSelections) ||
      value.eventSelections.length > 50
    )
      throw new Error("Danh sách môn đăng ký nháp không hợp lệ.");
    const seen = new Set<string>();
    details.eventSelections = Array.from(
      value.eventSelections,
      (item: unknown) => {
        if (
          !object(item) ||
          !hasOnly(item, ["sportId", "level", "eventLabel"]) ||
          typeof item.sportId !== "string" ||
          !Object.hasOwn(sportNames, item.sportId) ||
          (item.level !== "TH" && item.level !== "THCS") ||
          typeof item.eventLabel !== "string"
        )
          throw new Error("Nội dung đăng ký nháp không hợp lệ.");
        const sportId = item.sportId as SportId;
        if (
          ![
            ...eventOptions(sportId, item.level, "male"),
            ...eventOptions(sportId, item.level, "female"),
          ].includes(item.eventLabel)
        )
          throw new Error("Nội dung không nằm trong danh mục tham khảo.");
        const key = JSON.stringify([sportId, item.level, item.eventLabel]);
        if (seen.has(key)) throw new Error("Nội dung đăng ký nháp bị trùng.");
        seen.add(key);
        return { sportId, level: item.level, eventLabel: item.eventLabel };
      },
    );
  }
  if (value.educationLevel !== undefined) {
    if (value.educationLevel !== "TH" && value.educationLevel !== "THCS")
      throw Error("Cấp học không hợp lệ.");
    details.educationLevel = value.educationLevel;
  }
  if (value.catalogSelections !== undefined) {
    if (
      !Array.isArray(value.catalogSelections) ||
      value.catalogSelections.length > 50
    )
      throw Error("Danh sách mã môn không hợp lệ.");
    const seen = new Set<string>();
    details.catalogSelections = Array.from(
      value.catalogSelections,
      (code: unknown) => {
        if (typeof code !== "string" || !eventByCode(code) || seen.has(code))
          throw Error("Mã môn không có trong danh mục hoặc bị trùng.");
        seen.add(code);
        return code;
      },
    );
  }
  return details;
}
export function fromSheet(value: unknown): SchoolDraft {
  if (
    !object(value) ||
    !hasOnly(value, [
      "format",
      "formatVersion",
      "editionName",
      "schoolName",
      "athletes",
    ]) ||
    value.format !== "hkpd-school-registration-draft" ||
    (value.formatVersion !== 1 &&
      value.formatVersion !== 2 &&
      value.formatVersion !== 3 &&
      value.formatVersion !== 4) ||
    !text(value.editionName) ||
    !text(value.schoolName) ||
    !Array.isArray(value.athletes)
  ) {
    throw new Error(
      "Phiếu đăng ký không đúng định dạng bản nháp phiên bản 1, 2, 3 hoặc 4.",
    );
  }
  const athletes: AthleteDraft[] = Array.from(
    value.athletes,
    (athlete: unknown) => {
      if (
        !object(athlete) ||
        !hasOnly(athlete, [
          "fullName",
          "className",
          "requestedEvent",
          ...(value.formatVersion === 4
            ? extraKeys
            : value.formatVersion === 3
              ? v3Keys
              : value.formatVersion === 2
                ? profileKeys
                : []),
        ]) ||
        !text(athlete.fullName) ||
        !(value.formatVersion !== 1
          ? typeof athlete.className === "string"
          : text(athlete.className)) ||
        !(value.formatVersion !== 1
          ? typeof athlete.requestedEvent === "string"
          : text(athlete.requestedEvent))
      ) {
        throw new Error(
          "Mỗi VĐV cần họ tên, lớp/nhóm và nội dung dự kiến hợp lệ.",
        );
      }
      return {
        draftId: newDraftId(),
        fullName: clean(athlete.fullName),
        className: clean(athlete.className as string),
        requestedEvent: clean(athlete.requestedEvent as string),
        ...athleteDetails(athlete),
      };
    },
  );
  return {
    draftId: newDraftId(),
    editionName: clean(value.editionName),
    schoolName: clean(value.schoolName),
    athletes,
  };
}
export interface DraftSnapshot {
  tournaments?: TournamentState;
  revision: number;
  token: string | null;
  drafts: SchoolDraft[];
}
export interface DraftLocks {
  request<T>(name: string, callback: () => T | Promise<T>): Promise<T>;
}
export class DraftConflict extends Error {
  constructor() {
    super(
      "Bản đã lưu đã thay đổi ở tab khác. Bản đang sửa được giữ trong phiên này; hãy xuất phiếu trước khi tải lại.",
    );
  }
}
function validateStored(drafts: unknown): SchoolDraft[] {
  if (!Array.isArray(drafts)) throw new Error("Dữ liệu nháp không hợp lệ.");
  const schoolIds = new Set<string>(),
    athleteIds = new Set<string>();
  const result = Array.from(drafts, (value) => {
    if (
      !object(value) ||
      !hasOnly(value, ["draftId", "editionName", "schoolName", "athletes"]) ||
      !text(value.draftId) ||
      !text(value.editionName) ||
      !text(value.schoolName) ||
      !Array.isArray(value.athletes) ||
      schoolIds.has(value.draftId)
    )
      throw new Error("Phiếu nháp đã lưu không hợp lệ.");
    schoolIds.add(value.draftId);
    const athletes = Array.from(value.athletes, (a) => {
      if (
        !object(a) ||
        !hasOnly(a, [
          "draftId",
          "fullName",
          "className",
          "requestedEvent",
          ...extraKeys,
        ]) ||
        !text(a.draftId) ||
        !text(a.fullName) ||
        typeof a.className !== "string" ||
        typeof a.requestedEvent !== "string" ||
        athleteIds.has(a.draftId)
      )
        throw new Error("VĐV nháp đã lưu không hợp lệ.");
      athleteIds.add(a.draftId);
      return {
        draftId: a.draftId,
        fullName: clean(a.fullName),
        className: clean(a.className),
        requestedEvent: clean(a.requestedEvent),
        ...athleteDetails(a),
      };
    });
    return {
      draftId: value.draftId,
      editionName: clean(value.editionName),
      schoolName: clean(value.schoolName),
      athletes,
    };
  });
  if (
    result.some((school, index) =>
      result.slice(0, index).some((other) => sameSchool(school, other)),
    )
  )
    throw new Error(
      "Dữ liệu đã lưu có nhiều phiếu cho cùng trường và kỳ giải.",
    );
  return result;
}
export function readDraftSnapshot(
  storage: Pick<Storage, "getItem">,
): DraftSnapshot {
  const raw = storage.getItem(storageKey) ?? storage.getItem(legacyStorageKey);
  if (!raw) return { revision: 0, token: null, drafts: [] };
  const value: unknown = JSON.parse(raw);
  if (Array.isArray(value)) {
    const drafts = value.map(fromSheet);
    return { revision: 0, token: raw, drafts: validateStored(drafts) };
  }
  if (
    !object(value) ||
    !hasOnly(value, ["formatVersion", "revision", "drafts", "tournaments"]) ||
    value.formatVersion !== 2 ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 1
  )
    throw new Error("Dữ liệu nháp đã lưu không đúng định dạng.");
  const drafts = validateStored(value.drafts);
  return {
    revision: Number(value.revision),
    token: raw,
    drafts,
    ...(value.tournaments === undefined
      ? {}
      : { tournaments: validateTournamentState(value.tournaments, drafts) }),
  };
}
export const loadDrafts = (storage: Pick<Storage, "getItem">) =>
  readDraftSnapshot(storage).drafts;
/** Shared-origin lock + revision CAS. No unsafe read/write fallback when Web Locks is unavailable. */
export async function saveDrafts(
  storage: Pick<Storage, "getItem" | "setItem">,
  drafts: SchoolDraft[],
  expected: Pick<DraftSnapshot, "revision" | "token">,
  locks: DraftLocks | undefined = globalThis.navigator?.locks,
  tournaments?: TournamentState,
): Promise<DraftSnapshot> {
  const captured = validateStored(structuredClone(drafts));
  const capturedTournaments =
    tournaments === undefined
      ? undefined
      : validateTournamentState(tournaments, captured);
  const expectedRevision = expected.revision;
  const expectedToken = expected.token;
  if (
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0 ||
    expectedRevision >= Number.MAX_SAFE_INTEGER
  )
    throw new DraftConflict();
  if (!locks)
    throw new Error(
      "Trình duyệt chưa hỗ trợ lưu an toàn giữa các tab. Hãy xuất phiếu trước khi đóng trang.",
    );
  return locks.request(storageKey, () => {
    const current = readDraftSnapshot(storage);
    if (
      current.revision !== expectedRevision ||
      current.token !== expectedToken
    )
      throw new DraftConflict();
    const revision = current.revision + 1;
    const nextTournaments = capturedTournaments ?? current.tournaments;
    if (nextTournaments) validateTournamentState(nextTournaments, captured);
    const token = JSON.stringify({
      formatVersion: 2,
      revision,
      drafts: captured,
      ...(nextTournaments ? { tournaments: nextTournaments } : {}),
    });
    storage.setItem(storageKey, token);
    return {
      revision,
      token,
      drafts: captured,
      ...(nextTournaments ? { tournaments: nextTournaments } : {}),
    };
  });
}
/** Serializes this tab's own writes, but stops after conflict/quota errors without rebasing stale data. */
export class DraftWriter {
  private tail = Promise.resolve();
  private failure: unknown;
  private stopped = false;
  constructor(
    private readonly storage: Pick<Storage, "getItem" | "setItem">,
    private expected: Pick<DraftSnapshot, "revision" | "token">,
    private readonly locks: DraftLocks | undefined = globalThis.navigator
      ?.locks,
  ) {
    this.expected = { revision: expected.revision, token: expected.token };
  }
  save(drafts: SchoolDraft[], tournaments?: TournamentState): Promise<void> {
    const captured = structuredClone(drafts);
    const capturedTournaments =
      tournaments === undefined ? undefined : structuredClone(tournaments);
    const operation = this.tail.then(async () => {
      if (this.stopped) throw this.failure;
      try {
        this.expected = await saveDrafts(
          this.storage,
          captured,
          this.expected,
          this.locks,
          capturedTournaments,
        );
      } catch (error) {
        this.stopped = true;
        this.failure = error;
        throw error;
      }
    });
    this.tail = operation.catch(() => {});
    return operation;
  }
}
export function upsertAthlete(
  school: SchoolDraft,
  athlete: AthleteDraft,
): SchoolDraft {
  if (
    ![athlete.fullName, athlete.className, athlete.requestedEvent].every(text)
  ) {
    throw new Error("Vui lòng nhập đủ họ tên, lớp/nhóm và nội dung dự kiến.");
  }
  const entry = {
    ...athlete,
    fullName: clean(athlete.fullName),
    className: clean(athlete.className),
    requestedEvent: clean(athlete.requestedEvent),
  };
  const exists = school.athletes.some((item) => item.draftId === entry.draftId);
  return {
    ...school,
    athletes: exists
      ? school.athletes.map((item) =>
          item.draftId === entry.draftId ? entry : item,
        )
      : [...school.athletes, entry],
  };
}
