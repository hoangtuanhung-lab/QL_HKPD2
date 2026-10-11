export interface AthleteDraft {
  draftId: string;
  fullName: string;
  className: string;
  requestedEvent: string;
}
export interface SchoolDraft {
  draftId: string;
  editionName: string;
  schoolName: string;
  athletes: AthleteDraft[];
}
export interface RegistrationSheet {
  format: "hkpd-school-registration-draft";
  formatVersion: 1;
  editionName: string;
  schoolName: string;
  athletes: Omit<AthleteDraft, "draftId">[];
}
export const storageKey = "hkpd.a04.school-drafts.v1";
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
    formatVersion: 1,
    editionName: school.editionName,
    schoolName: school.schoolName,
    athletes: school.athletes.map(
      ({ fullName, className, requestedEvent }) => ({
        fullName,
        className,
        requestedEvent,
      }),
    ),
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
    value.formatVersion !== 1 ||
    !text(value.editionName) ||
    !text(value.schoolName) ||
    !Array.isArray(value.athletes)
  ) {
    throw new Error("Phiếu đăng ký không đúng định dạng bản nháp phiên bản 1.");
  }
  const athletes: AthleteDraft[] = value.athletes.map((athlete: unknown) => {
    if (
      !object(athlete) ||
      !hasOnly(athlete, ["fullName", "className", "requestedEvent"]) ||
      !text(athlete.fullName) ||
      !text(athlete.className) ||
      !text(athlete.requestedEvent)
    ) {
      throw new Error(
        "Mỗi VĐV cần họ tên, lớp/nhóm và nội dung dự kiến hợp lệ.",
      );
    }
    return {
      draftId: newDraftId(),
      fullName: clean(athlete.fullName),
      className: clean(athlete.className),
      requestedEvent: clean(athlete.requestedEvent),
    };
  });
  return {
    draftId: newDraftId(),
    editionName: clean(value.editionName),
    schoolName: clean(value.schoolName),
    athletes,
  };
}
export function saveDrafts(
  storage: Pick<Storage, "setItem">,
  drafts: SchoolDraft[],
) {
  // Reuse the external format: browser storage never contains server IDs or approval state.
  storage.setItem(storageKey, JSON.stringify(drafts.map(toSheet)));
}
export function loadDrafts(storage: Pick<Storage, "getItem">): SchoolDraft[] {
  const raw = storage.getItem(storageKey);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value))
    throw new Error("Dữ liệu nháp đã lưu không đúng định dạng.");
  const result = value.map(fromSheet);
  if (
    result.some((school, index) =>
      result.slice(0, index).some((other) => sameSchool(school, other)),
    )
  ) {
    throw new Error(
      "Dữ liệu đã lưu có nhiều phiếu cho cùng trường và kỳ giải.",
    );
  }
  return result;
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
