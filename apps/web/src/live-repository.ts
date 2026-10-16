import type {
  EventDraw,
  ResultMatch,
  MatchCommand,
  DrawSetup,
} from "./match-results.js";
import { createContext } from "react";
import type { AthleteDraft } from "./registration-draft.js";
import type { ManagedSchool } from "./admin-settings.js";
export interface StudentRecord extends Partial<AthleteDraft> {
  identityNumber: string;
  schoolId: string;
  fullName: string;
  className: string;
  birthDate: string;
  gender: "male" | "female";
}
export interface LiveAthlete extends AthleteDraft {
  athleteCode: string;
}
export interface LiveSchool extends ManagedSchool {
  revision: number;
  status: "draft" | "submitted" | "approved" | "returned";
  note: string;
  athletes: LiveAthlete[];
}
export interface LiveOperation {
  code: string;
  kind: "schedule" | "lanes" | "result";
  revision: number;
  status: "saved" | "submitted" | "confirmed";
  payload: unknown;
  updated_at: string;
}
export interface LiveState {
  draws?: EventDraw[];
  matches?: ResultMatch[];
  registryRevision?: number;
  studentCount?: number;
  editionId: string;
  catalogCodes: string[];
  schools: LiveSchool[];
  operations: LiveOperation[];
}
export interface LiveRepository {
  load(): Promise<LiveState>;
  createMatches(
    code: string,
    revision: number,
    draw: DrawSetup,
  ): Promise<LiveState>;
  matchCommand(match: ResultMatch, command: MatchCommand): Promise<LiveState>;
  students(identities: string[]): Promise<StudentRecord[]>;
  importStudents(revision: number, rows: StudentRecord[]): Promise<LiveState>;
  importRegistrations(
    rosters: { schoolId: string; revision: number; athletes: AthleteDraft[] }[],
  ): Promise<LiveState>;

  status(): Promise<{
    database: boolean;
    drive: boolean;
    missing: string[];
    ready: boolean;
  }>;
  roster(
    school: LiveSchool,
    athletes: AthleteDraft[],
    action: "save" | "submit" | "approve" | "return",
    note?: string,
  ): Promise<LiveState>;
  operation(
    code: string,
    kind: LiveOperation["kind"],
    revision: number,
    payload: unknown,
    action?: "save" | "confirm",
  ): Promise<LiveState>;
  upload(athleteId: string, file: File): Promise<void>;
  files(athleteId: string): Promise<{ id: string; name: string }[]>;
  download(athleteId: string, fileId: string): Promise<Blob>;
}
export const LiveRepositoryContext = createContext<LiveRepository | null>(null);
export function validateLiveState(data: unknown): LiveState {
  const s = data as LiveState;
  if (
    !s ||
    s.editionId !== "edition-2026" ||
    !Array.isArray(s.catalogCodes) ||
    !Array.isArray(s.schools) ||
    !Array.isArray(s.operations)
  )
    throw Error("Dữ liệu trực tuyến không hợp lệ.");
  for (const school of s.schools)
    if (
      !school.id ||
      !Number.isSafeInteger(school.revision) ||
      school.revision < 0 ||
      !Array.isArray(school.athletes) ||
      !["draft", "submitted", "approved", "returned"].includes(school.status)
    )
      throw Error("Phiếu trực tuyến không hợp lệ.");
  return s;
}
export function supabaseLiveRepository(
  port: {
    rpc(
      name: string,
      args?: Record<string, unknown>,
    ): PromiseLike<{ data: unknown; error: unknown }>;
    auth: {
      getSession(): Promise<{
        data: { session: { access_token: string } | null };
      }>;
    };
  },
  request: typeof fetch = fetch,
): LiveRepository {
  async function rawCall(name: string, args?: Record<string, unknown>) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        Promise.resolve()
          .then(() => port.rpc(name, args))
          .catch(() => {
            throw Error(
              "Không kết nối được dữ liệu nghiệp vụ. Kiểm tra mạng và migration 005–008.",
            );
          }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                Error(
                  "Yêu cầu quá 20 giây. Tải lại để đối chiếu trước khi thử lưu lại.",
                ),
              ),
            20000,
          );
        }),
      ]);
      if (result.error) {
        const code = (result.error as { code?: string }).code;
        throw Error(
          code === "40001"
            ? "Dữ liệu đã thay đổi. Giữ bản đang nhập và Tải lại để đối chiếu."
            : code === "42501"
              ? "Không còn quyền thao tác. Bấm Kiểm tra quyền."
              : code === "23505"
                ? "Trùng mã định danh hoặc VĐV đã tồn tại."
                : code === "22023"
                  ? "Hồ sơ, trạng thái hoặc dữ liệu thi đấu chưa hợp lệ. Kiểm tra điều kiện, nội dung và xung đột."
                  : "Không kết nối được dữ liệu nghiệp vụ. Kiểm tra mạng và migration 005–008.",
        );
      }
      return result.data;
    } finally {
      clearTimeout(timer);
    }
  }
  const call = async (name: string, args?: Record<string, unknown>) =>
    validateLiveState(await rawCall(name, args));
  async function drive(
    athleteId: string,
    method: string,
    body?: BodyInit,
    fileId?: string,
  ) {
    const session = (await port.auth.getSession()).data.session;
    if (!session) throw Error("Đăng nhập lại để truy cập hồ sơ.");
    const response = await request(
      `/.netlify/functions/athlete-files?athleteId=${encodeURIComponent(athleteId)}${fileId ? `&fileId=${encodeURIComponent(fileId)}` : ""}`,
      {
        method,
        headers: { Authorization: `Bearer ${session.access_token}` },
        body,
        signal: AbortSignal.timeout(25000),
      },
    );
    if (!response.ok)
      throw Error(
        response.status === 503
          ? "Drive chưa sẵn sàng. Ban tổ chức cần kiểm tra cấu hình máy chủ."
          : "Không đọc hoặc lưu được tệp. Kiểm tra quyền và thử lại.",
      );
    return response;
  }
  return {
    load: () => call("hkpd_online_state"),
    createMatches: (code, revision, draw) =>
      call("hkpd_create_event_matches", {
        p_code: code,
        p_revision: revision,
        p_draw: draw,
      }),
    matchCommand: (match, command) =>
      call("hkpd_match_command", {
        p_match_id: match.id,
        p_revision: match.revision,
        p_action: command.action,
        p_score1: command.score1 ?? null,
        p_score2: command.score2 ?? null,
        p_reason: command.reason ?? "",
      }),
    students: async (identities) => {
      const value = await rawCall("hkpd_lookup_students", {
        p_identities: identities,
      });
      if (!Array.isArray(value)) throw Error("Dữ liệu nền không hợp lệ.");
      return value as StudentRecord[];
    },
    importStudents: (revision, rows) =>
      call("hkpd_import_students", { p_revision: revision, p_rows: rows }),
    importRegistrations: (rosters) =>
      call("hkpd_import_registrations", { p_rosters: rosters }),
    status: async () => {
      const session = (await port.auth.getSession()).data.session;
      if (!session) throw Error("Đăng nhập lại.");
      const response = await request("/.netlify/functions/integration-status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok)
        throw Error(
          "Chưa kiểm tra được kết nối. Kiểm tra cấu hình Functions và quyền quản trị.",
        );
      return response.json();
    },
    roster: (school, athletes, action, note = "") =>
      call("hkpd_save_roster", {
        p_school_id: school.id,
        p_revision: school.revision,
        p_athletes: athletes.map((a) => ({
          ...a,
          catalogSelections: a.catalogSelections ?? [],
          photoDataUrl: undefined,
        })),
        p_action: action,
        p_note: note,
      }),
    operation: (code, kind, revision, payload, action = "save") =>
      call("hkpd_save_operation", {
        p_code: code,
        p_kind: kind,
        p_revision: revision,
        p_payload: payload,
        p_action: action,
      }),
    upload: async (id, file) => {
      const data = new FormData();
      data.set("file", file);
      await drive(id, "POST", data);
    },
    files: async (id) =>
      (await (await drive(id, "GET")).json()) as { id: string; name: string }[],
    download: async (id, fileId) =>
      (await drive(id, "GET", undefined, fileId)).blob(),
  };
}
