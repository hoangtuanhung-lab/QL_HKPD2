import { createHash, randomUUID } from "node:crypto";
import { allowed, type Actor } from "@hkpd/foundation";
import {
  assertWindow,
  reviseRegistration,
  transitionRegistration,
} from "./revisions.js";
import {
  currentRevision,
  ensure,
  immutable,
  type Registry,
  type Student,
  type Participant,
  type Registration,
  type Team,
} from "./model.js";
import { resolveEvent, snapshotCatalog } from "./catalog.js";
import { validateRegistration } from "./rules.js";
export type Operation =
  | {
      type: "propose-student";
      schoolId: string;
      studentCode: string;
      name: string;
      sex: "male" | "female";
      birthYear: number;
      grade: number;
    }
  | { type: "approve-profile"; studentId: string }
  | { type: "create-athlete"; schoolId: string; studentId: string }
  | {
      type: "create-team";
      schoolId: string;
      eventId: string;
      name: string;
      memberIds: readonly string[];
    }
  | {
      type: "create-registration";
      schoolId: string;
      eventId: string;
      participant: Participant;
    }
  | { type: "revise"; registrationId: string; participant: Participant }
  | {
      type: "revise-team";
      registrationId: string;
      memberIds: readonly string[];
      reason: string;
    }
  | {
      type: "submit" | "approve" | "return";
      registrationId: string;
      reason?: string;
    };
export interface RegistrationCommand {
  actorId: string;
  editionId: string;
  key: string;
  baseVersion: number;
  operation: Operation;
}
export interface Receipt {
  fingerprint: string;
  result: CommandResult;
}
export interface CommandResult {
  resourceId: string;
  version: number;
  warnings: readonly { code: string; message: string }[];
}
export interface RegistryTransaction {
  actor(id: string): Promise<Actor | null>;
  /** Lock the entire edition (or all athlete/registration/quota keys in stable order).
   * Read authoritative catalogue, deadline, master status and assignments. */
  registryForUpdate(editionId: string): Promise<Registry>;
  /** Atomically increment scoped edition/school sequence; never SELECT MAX at client. */
  nextAthleteSequence(editionId: string, schoolId: string): Promise<number>;
  receipt(key: string): Promise<Receipt | null>;
  /** CAS aggregate version; enforce UNIQUE(edition,student), UNIQUE(edition,code),
   * one root team per school/event (preserve replacement snapshots),
   * UNIQUE(edition,school,studentCode). */
  save(state: Registry, expectedVersion: number): Promise<void>;
  audit(record: {
    actorId: string;
    editionId: string;
    action: string;
    resourceId: string;
    version: number;
    reason?: string;
  }): Promise<void>;
  enqueue(record: {
    editionId: string;
    type: string;
    resourceId: string;
    version: number;
  }): Promise<void>;
  saveReceipt(key: string, receipt: Receipt): Promise<void>;
}
export interface RegistryStore {
  /** Roll back state, sequences, receipt, audit and outbox together on ANY failure. */
  transaction<T>(run: (tx: RegistryTransaction) => Promise<T>): Promise<T>;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  ensure(
    value === null ||
      typeof value === "string" ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value)),
    "INVALID_INPUT",
    "Lệnh không hợp lệ.",
  );
  return JSON.stringify(value);
}
export function executeRegistration(
  store: RegistryStore,
  command: RegistrationCommand,
  clock: () => Date = () => new Date(),
  newId: () => string = randomUUID,
): Promise<CommandResult> {
  ensure(
    command.actorId &&
      command.editionId &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
        command.key,
      ) &&
      Number.isSafeInteger(command.baseVersion) &&
      command.baseVersion > 0,
    "INVALID_INPUT",
    "Thiếu ID lệnh hoặc phiên bản.",
  );
  const fingerprint = createHash("sha256")
    .update(
      canonical({
        operation: command.operation,
        baseVersion: command.baseVersion,
      }),
    )
    .digest("hex");
  const receiptKey = JSON.stringify([
    command.actorId,
    command.editionId,
    command.key,
  ]);
  return store.transaction(async (tx) => {
    const state = await tx.registryForUpdate(command.editionId),
      actor = await tx.actor(command.actorId),
      op = command.operation;
    ensure(
      state.editionId === command.editionId &&
        state.catalog.editionId === state.editionId,
      "FORBIDDEN",
      "Kỳ giải không đúng phạm vi.",
    );
    const registration =
      "registrationId" in op
        ? state.registrations.find((r) => r.id === op.registrationId)
        : undefined;
    const student =
      op.type === "approve-profile"
        ? state.students.find((s) => s.id === op.studentId)
        : undefined;
    const schoolId =
      "schoolId" in op
        ? op.schoolId
        : (registration?.schoolId ?? student?.schoolId);
    const admin =
      op.type === "approve" ||
      op.type === "return" ||
      op.type === "approve-profile";
    ensure(
      allowed(actor, admin ? "edition.configure" : "school.write", {
        editionId: state.editionId,
        schoolId,
      }),
      "FORBIDDEN",
      "Không có quyền thao tác phạm vi này.",
    );
    const receipt = await tx.receipt(receiptKey);
    if (receipt) {
      ensure(
        receipt.fingerprint === fingerprint,
        "IDEMPOTENCY_CONFLICT",
        "ID lệnh đã dùng cho nội dung khác.",
      );
      return receipt.result;
    }
    if ("registrationId" in op)
      ensure(registration, "NOT_FOUND", "Không tìm thấy đăng ký.");
    if (op.type === "approve-profile")
      ensure(student, "NOT_FOUND", "Không tìm thấy hồ sơ.");
    const version = registration?.version ?? state.version;
    ensure(
      version === command.baseVersion &&
        version < Number.MAX_SAFE_INTEGER &&
        state.version < Number.MAX_SAFE_INTEGER,
      "VERSION_CONFLICT",
      "Dữ liệu đã thay đổi; tải lại bản mới.",
    );
    if (!admin) assertWindow(state, clock());
    let next: Registry = structuredClone(state),
      resourceId = state.editionId,
      resourceVersion = version + 1;
    let warnings: CommandResult["warnings"] = [];
    switch (op.type) {
      case "propose-student": {
        ensure(
          op.schoolId in state.schoolCodes &&
            op.studentCode.trim() &&
            op.name.trim() &&
            ["male", "female"].includes(op.sex) &&
            Number.isSafeInteger(op.birthYear) &&
            op.birthYear >= 1900 &&
            op.birthYear <= state.year &&
            Number.isSafeInteger(op.grade) &&
            op.grade > 0,
          "INVALID_STUDENT",
          "Hồ sơ thiếu hoặc sai dữ liệu.",
        );
        ensure(
          !state.students.some(
            (s) =>
              s.schoolId === op.schoolId &&
              s.studentCode === op.studentCode.trim(),
          ),
          "DUPLICATE_STUDENT",
          "Mã học sinh đã có trong trường.",
        );
        resourceId = newId();
        const s: Student = {
          id: resourceId,
          schoolId: op.schoolId,
          studentCode: op.studentCode.trim(),
          name: op.name.trim(),
          sex: op.sex,
          birthYear: op.birthYear,
          grade: op.grade,
          profileStatus: state.masterListPresent ? "pending" : "approved",
        };
        next = { ...next, students: [...state.students, s] };
        break;
      }
      case "approve-profile":
        ensure(
          student?.profileStatus === "pending",
          "INVALID_STATE",
          "Hồ sơ không chờ duyệt.",
        );
        resourceId = student.id;
        next = {
          ...next,
          students: state.students.map((s) =>
            s.id === student.id ? { ...s, profileStatus: "approved" } : s,
          ),
          athletes: state.athletes.map((a) =>
            a.studentId === student.id
              ? { ...a, profileStatus: "approved", version: a.version + 1 }
              : a,
          ),
        };
        break;
      case "create-athlete": {
        const s = state.students.find(
          (s) => s.id === op.studentId && s.schoolId === op.schoolId,
        );
        ensure(
          s,
          "STUDENT_NOT_FOUND",
          "Không tìm thấy hồ sơ trường được giao.",
        );
        ensure(
          !state.athletes.some((a) => a.studentId === s.id),
          "DUPLICATE_ATHLETE",
          "Học sinh đã có VĐV trong kỳ giải.",
        );
        const schoolCode = state.schoolCodes[op.schoolId],
          sequence = await tx.nextAthleteSequence(state.editionId, op.schoolId);
        ensure(
          schoolCode &&
            /^\d+$/.test(schoolCode) &&
            Number.isSafeInteger(sequence) &&
            sequence > 0 &&
            Number.isSafeInteger(state.athleteSequenceWidth) &&
            state.athleteSequenceWidth >= 0 &&
            state.athleteSequenceWidth <= 12,
          "INVALID_CODE",
          "Bộ cấp mã không hợp lệ.",
        );
        resourceId = newId();
        resourceVersion = 1;
        const athleteCode = `${schoolCode}.${String(sequence).padStart(state.athleteSequenceWidth, "0")}`;
        ensure(
          !state.athletes.some((a) => a.athleteCode === athleteCode),
          "DUPLICATE_CODE",
          "Mã VĐV đã được cấp.",
        );
        next = {
          ...next,
          athletes: [
            ...state.athletes,
            {
              ...s,
              id: resourceId,
              studentId: s.id,
              editionId: state.editionId,
              athleteCode,
              version: 1,
            },
          ],
        };
        await tx.enqueue({
          editionId: state.editionId,
          type: "athlete.folder.requested",
          resourceId,
          version: 1,
        });
        break;
      }
      case "create-team": {
        const { node } = resolveEvent(state.catalog, op.eventId);
        ensure(
          node.participantKind === "team" &&
            op.name.trim() &&
            op.schoolId in state.schoolCodes &&
            new Set(op.memberIds).size === op.memberIds.length &&
            op.memberIds.every((id) =>
              state.athletes.some(
                (a) =>
                  a.id === id &&
                  a.schoolId === op.schoolId &&
                  a.editionId === state.editionId,
              ),
            ),
          "TEAM_INPUT",
          "Đội hoặc thành viên không hợp lệ.",
        );
        ensure(
          !state.teams.some(
            (t) => t.schoolId === op.schoolId && t.eventId === op.eventId,
          ),
          "TEAM_UNIQUE",
          "Trường đã có đội trong nội dung.",
        );
        resourceId = newId();
        resourceVersion = 1;
        const team: Team = {
          id: resourceId,
          editionId: state.editionId,
          schoolId: op.schoolId,
          eventId: op.eventId,
          name: op.name.trim(),
          memberIds: [...op.memberIds],
        };
        next = { ...next, teams: [...state.teams, team] };
        break;
      }
      case "create-registration": {
        resourceId = newId();
        resourceVersion = 1;
        const r: Registration = {
          id: resourceId,
          editionId: state.editionId,
          schoolId: op.schoolId,
          eventId: op.eventId,
          version: 1,
          revisions: [
            {
              id: newId(),
              version: 1,
              status: "draft",
              participant: structuredClone(op.participant),
            },
          ],
          approvedRevisionId: null,
        };
        ensure(
          op.schoolId in state.schoolCodes,
          "SCHOOL_NOT_FOUND",
          "Trường chưa có trong danh mục.",
        );
        const result = validateRegistration(state, r, "draft");
        ensure(
          result.valid,
          result.errors[0]?.code ?? "RULE_ERROR",
          result.errors[0]?.message ?? "Đăng ký không hợp lệ.",
        );
        warnings = result.warnings;
        next = { ...next, registrations: [...state.registrations, r] };
        break;
      }
      case "revise-team": {
        const p = currentRevision(registration!).participant;
        ensure(
          p.kind === "team" && op.reason.trim(),
          "TEAM_INPUT",
          "Cần đội và lý do thay người.",
        );
        const previous = state.teams.find((t) => t.id === p.teamId);
        ensure(
          previous &&
            previous.editionId === state.editionId &&
            previous.schoolId === schoolId &&
            previous.eventId === registration!.eventId &&
            new Set(op.memberIds).size === op.memberIds.length &&
            op.memberIds.every((id) =>
              state.athletes.some(
                (a) =>
                  a.id === id &&
                  a.schoolId === schoolId &&
                  a.editionId === state.editionId,
              ),
            ),
          "TEAM_INPUT",
          "Thành viên không hợp lệ.",
        );
        const team = {
          ...structuredClone(previous),
          id: newId(),
          memberIds: [...op.memberIds],
        };
        const r = reviseRegistration(
          registration!,
          newId(),
          { kind: "team", teamId: team.id },
          command.baseVersion,
        );
        next = { ...next, teams: [...state.teams, team] };
        const result = validateRegistration(next, r, "draft");
        ensure(
          result.valid,
          result.errors[0]?.code ?? "RULE_ERROR",
          result.errors[0]?.message ?? "Đội không hợp lệ.",
        );
        warnings = result.warnings;
        resourceId = r.id;
        resourceVersion = r.version;
        next = {
          ...next,
          registrations: state.registrations.map((v) =>
            v.id === r.id ? r : v,
          ),
        };
        break;
      }
      case "revise": {
        const r = reviseRegistration(
          registration!,
          newId(),
          op.participant,
          command.baseVersion,
        );
        const result = validateRegistration(state, r, "draft");
        ensure(
          result.valid,
          result.errors[0]?.code ?? "RULE_ERROR",
          result.errors[0]?.message ?? "Đăng ký không hợp lệ.",
        );
        warnings = result.warnings;
        resourceId = r.id;
        resourceVersion = r.version;
        next = {
          ...next,
          registrations: state.registrations.map((v) =>
            v.id === r.id ? r : v,
          ),
        };
        break;
      }
      case "submit":
      case "approve":
      case "return": {
        const r = transitionRegistration(
          state,
          registration!,
          op.type,
          command.baseVersion,
          clock(),
          op.reason,
        );
        resourceId = r.id;
        resourceVersion = r.version;
        if (op.type !== "return")
          warnings = validateRegistration(state, r, op.type).warnings;
        next = {
          ...next,
          registrations: state.registrations.map((v) =>
            v.id === r.id ? r : v,
          ),
        };
        break;
      }
      default:
        ensure(false, "INVALID_INPUT", "Loại lệnh chưa được hỗ trợ.");
    }
    next = { ...next, version: state.version + 1 };
    await tx.save(immutable(next), state.version);
    await tx.audit({
      actorId: command.actorId,
      editionId: state.editionId,
      action: op.type,
      resourceId,
      version: resourceVersion,
      ...("reason" in op && op.reason ? { reason: op.reason } : {}),
    });
    await tx.enqueue({
      editionId: state.editionId,
      type: `registration.${op.type}`,
      resourceId,
      version: resourceVersion,
    });
    const result: CommandResult = {
      resourceId,
      version: resourceVersion,
      warnings,
    };
    await tx.saveReceipt(receiptKey, { fingerprint, result });
    return result;
  });
}
/** R01 selective configuration clone; never copies students/athletes/teams/registrations. */
export function emptyEditionFromConfiguration(
  source: Registry,
  input: {
    editionId: string;
    snapshotId: string;
    year: number;
    deadline: string;
    schoolCodes: Record<string, string>;
  },
): Registry {
  ensure(
    input.editionId &&
      input.editionId !== source.editionId &&
      Number.isSafeInteger(input.year) &&
      Number.isFinite(Date.parse(input.deadline)),
    "EDITION_INPUT",
    "Thông tin giải mới không hợp lệ.",
  );
  const ids = new Map(source.catalog.nodes.map((n) => [n.id, randomUUID()]));
  return immutable({
    editionId: input.editionId,
    year: input.year,
    deadline: input.deadline,
    version: 1,
    registrationOpen: false,
    schoolCodes: structuredClone(input.schoolCodes),
    athleteSequenceWidth: source.athleteSequenceWidth,
    masterListPresent: false,
    catalog: snapshotCatalog(
      input.snapshotId,
      input.editionId,
      source.catalog.sourceVersion,
      source.catalog.nodes.map((n) => ({
        ...structuredClone(n),
        id: ids.get(n.id)!,
        parentId: n.parentId ? ids.get(n.parentId)! : null,
      })),
    ),
    students: [],
    athletes: [],
    teams: [],
    registrations: [],
  });
}
