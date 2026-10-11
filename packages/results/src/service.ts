import { createHash, randomUUID } from "node:crypto";
import { allowed, type Actor } from "@hkpd/foundation";
import {
  confirmPreview,
  submitPreview,
  ensure,
  freeze,
  type ResultMatch,
  type Payload,
  type Lease,
} from "./model.js";
import type { components } from "@hkpd/contracts";
export type ResultOperation =
  | { type: "lease"; ttlSeconds: number }
  | { type: "heartbeat"; token: string; ttlSeconds: number }
  | { type: "release"; token: string }
  | { type: "submit"; token: string; payload: Payload; reason?: string }
  | {
      type: "confirm";
      confirmation: components["schemas"]["ConfirmSubmission"];
    }
  | {
      type: "return";
      submissionId: string;
      submissionVersion: number;
      reason: string;
    };
export interface ResultCommand {
  actorId: string;
  sessionId: string;
  editionId: string;
  matchId: string;
  key: string;
  baseVersion: number;
  operation: ResultOperation;
}
export interface CommandReply {
  match: ResultMatch;
  leaseToken?: string;
}
export interface ResultTransaction {
  actor(id: string): Promise<Actor | null>;
  matchForUpdate(id: string): Promise<ResultMatch>;
  /** Compare every prerequisite's current confirmed official version, not pending scores. */
  prerequisitesCurrent(match: ResultMatch): Promise<boolean>;
  /** Trusted record of leader absence/delegation; default false, scoped match/time. */
  adminDelegation(
    actorId: string,
    matchId: string,
    now: Date,
  ): Promise<boolean>;
  fileLinksAllowed(
    match: ResultMatch,
    fileIds: readonly string[],
    actorId: string,
  ): Promise<boolean>;
  receipt(
    key: string,
  ): Promise<{ fingerprint: string; reply: CommandReply } | null>;
  save(match: ResultMatch, expectedVersion: number): Promise<void>;
  audit(record: {
    actorId: string;
    editionId: string;
    matchId: string;
    action: string;
    at: string;
    reason: string | null;
    beforeOfficialVersion: number;
    afterOfficialVersion: number;
  }): Promise<void>;
  enqueue(record: {
    editionId: string;
    matchId: string;
    type: string;
    officialVersion: number;
  }): Promise<void>;
  /** Same transaction: invalidate downstream tables AND submissions tied to obsolete sources. */
  invalidateDependents(match: ResultMatch): Promise<void>;
  saveReceipt(
    key: string,
    record: { fingerprint: string; reply: CommandReply },
  ): Promise<void>;
}
export interface ResultStore {
  transaction<T>(run: (tx: ResultTransaction) => Promise<T>): Promise<T>;
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
/** B04-style transaction/receipt/CAS contract; adapter loads actor/session from server. */
export function executeResult(
  store: ResultStore,
  command: ResultCommand,
  clock: () => Date = () => new Date(),
  newId: () => string = randomUUID,
): Promise<CommandReply> {
  ensure(
    command.actorId &&
      command.sessionId &&
      command.editionId &&
      command.matchId &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
        command.key,
      ) &&
      Number.isSafeInteger(command.baseVersion) &&
      command.baseVersion > 0,
    "INVALID_INPUT",
    "Thiếu phạm vi, ID lệnh hoặc phiên bản.",
  );
  const fingerprint = createHash("sha256")
    .update(
      canonical({
        baseVersion: command.baseVersion,
        operation: command.operation,
      }),
    )
    .digest("hex");
  const receiptKey = JSON.stringify([
    command.actorId,
    command.sessionId,
    command.editionId,
    command.matchId,
    command.operation.type,
    command.key,
  ]);
  return store.transaction(async (tx) => {
    const now = clock();
    ensure(
      Number.isFinite(now.getTime()),
      "INVALID_DATE",
      "Clock server không hợp lệ.",
    );
    const actor = await tx.actor(command.actorId),
      match = await tx.matchForUpdate(command.matchId),
      op = command.operation;
    const scope = {
      editionId: match.editionId,
      eventId: match.eventId,
      sportId: match.sportId,
      participantSchoolIds: match.participantSchoolIds,
    };
    ensure(
      match.id === command.matchId && match.editionId === command.editionId,
      "FORBIDDEN",
      "Không đúng phạm vi trận/giải.",
    );
    const confirming = op.type === "confirm" || op.type === "return";
    const permission = confirming
      ? allowed(actor, "result.confirm", scope) ||
        (allowed(actor, "edition.configure", scope) &&
          (await tx.adminDelegation(command.actorId, match.id, now)))
      : allowed(actor, "result.submit", scope);
    ensure(
      permission,
      "FORBIDDEN",
      "Không được nhập hoặc xác nhận trong phạm vi này.",
    );
    const saved = await tx.receipt(receiptKey);
    if (saved) {
      ensure(
        saved.fingerprint === fingerprint,
        "IDEMPOTENCY_CONFLICT",
        "ID lệnh đã dùng cho nội dung khác.",
      );
      return saved.reply;
    }
    ensure(
      !match.locked &&
        match.version === command.baseVersion &&
        match.version < Number.MAX_SAFE_INTEGER,
      "VERSION_CONFLICT",
      "Trận đã khóa hoặc phiên bản đã thay đổi.",
    );
    let next: ResultMatch = structuredClone(match);
    let token: string | undefined;
    ensure(
      !match.lease || Number.isFinite(Date.parse(match.lease.expiresAt)),
      "INVALID_LEASE",
      "Lease lưu trữ không hợp lệ.",
    );
    const leaseCurrent =
      match.lease && Date.parse(match.lease.expiresAt) > now.getTime();
    const ownLease =
      leaseCurrent &&
      match.lease?.actorId === command.actorId &&
      match.lease.sessionId === command.sessionId;
    if (op.type === "lease" || op.type === "heartbeat") {
      ensure(
        Number.isSafeInteger(op.ttlSeconds) &&
          op.ttlSeconds >= 10 &&
          op.ttlSeconds <= 120,
        "LEASE_TTL",
        "TTL lease phải từ 10 đến 120 giây.",
      );
      if (op.type === "heartbeat")
        ensure(
          ownLease && match.lease?.token === op.token,
          "LEASE_CONFLICT",
          "Lease hết hạn hoặc thuộc phiên khác.",
        );
      else
        ensure(
          !leaseCurrent || ownLease,
          "LEASE_CONFLICT",
          "Có phiên khác đang nhập.",
        );
      token = ownLease ? match.lease!.token : newId();
      const lease: Lease = {
        actorId: command.actorId,
        sessionId: command.sessionId,
        token,
        expiresAt: new Date(now.getTime() + op.ttlSeconds * 1000).toISOString(),
      };
      next = { ...next, version: match.version + 1, lease };
    } else if (op.type === "release") {
      ensure(
        ownLease && match.lease?.token === op.token,
        "LEASE_CONFLICT",
        "Không được nhả lease của phiên khác.",
      );
      next = { ...next, version: match.version + 1, lease: null };
    } else if (op.type === "submit") {
      ensure(
        ownLease && match.lease?.token === op.token,
        "LEASE_CONFLICT",
        "Cần lease hợp lệ của phiên đang nhập.",
      );
      ensure(
        await tx.prerequisitesCurrent(match),
        "SOURCE_UNCONFIRMED",
        "Nguồn vòng trước chưa xác nhận hoặc đã thay đổi.",
      );
      ensure(
        await tx.fileLinksAllowed(match, op.payload.file_ids, command.actorId),
        "FILE_SCOPE",
        "Tệp không đúng quyền/phạm vi trận.",
      );
      next = submitPreview(
        match,
        op.payload,
        command.actorId,
        now,
        newId(),
        op.reason,
      );
    } else if (op.type === "confirm") {
      ensure(
        Object.keys(op.confirmation).every((k) =>
          [
            "submission_id",
            "submission_version",
            "base_official_version",
          ].includes(k),
        ),
        "CONFIRM_PAYLOAD",
        "Xác nhận chỉ nhận ID/version, không nhận điểm mới.",
      );
      ensure(
        await tx.prerequisitesCurrent(match),
        "SOURCE_UNCONFIRMED",
        "Nguồn vòng trước chưa xác nhận hoặc đã thay đổi.",
      );
      const pending = match.submissions.find(
        (s) => s.id === op.confirmation.submission_id,
      );
      ensure(
        pending &&
          (await tx.fileLinksAllowed(
            match,
            pending.payload.file_ids,
            command.actorId,
          )),
        "FILE_SCOPE",
        "Tệp không đúng quyền/phạm vi trận.",
      );
      next = confirmPreview(
        match,
        op.confirmation,
        command.actorId,
        now,
        newId(),
      );
    } else if (op.type === "return") {
      const submission = match.submissions.find(
        (s) => s.id === op.submissionId,
      );
      ensure(
        submission &&
          submission.status === "pending_confirmation" &&
          submission.version === op.submissionVersion &&
          op.reason.trim(),
        "VERSION_CONFLICT",
        "Bản nhập đã thay đổi hoặc thiếu lý do trả lại.",
      );
      next = {
        ...next,
        version: match.version + 1,
        submissions: match.submissions.map((s) =>
          s.id === submission.id
            ? {
                ...structuredClone(s),
                version: s.version + 1,
                status: "returned",
              }
            : structuredClone(s),
        ),
      };
    } else ensure(false, "INVALID_INPUT", "Lệnh chưa được hỗ trợ.");
    next = freeze(next);
    await tx.save(next, match.version);
    await tx.audit({
      actorId: command.actorId,
      editionId: match.editionId,
      matchId: match.id,
      action: op.type,
      at: now.toISOString(),
      reason:
        op.type === "confirm"
          ? (match.submissionReasons?.[op.confirmation.submission_id] ?? null)
          : "reason" in op
            ? (op.reason ?? null)
            : null,
      beforeOfficialVersion: match.official?.version ?? 0,
      afterOfficialVersion: next.official?.version ?? 0,
    });
    if (op.type === "confirm") {
      await tx.invalidateDependents(next);
      await tx.enqueue({
        editionId: match.editionId,
        matchId: match.id,
        type: "OfficialResultConfirmed",
        officialVersion: next.official!.version,
      });
    }
    const reply: CommandReply = {
      match: next,
      ...(token ? { leaseToken: token } : {}),
    };
    await tx.saveReceipt(receiptKey, { fingerprint, reply });
    return reply;
  });
}
export async function confirmBatch(
  store: ResultStore,
  commands: readonly ResultCommand[],
  clock: () => Date = () => new Date(),
) {
  const outcomes = [];
  for (const command of commands) {
    if (command.operation.type !== "confirm") {
      outcomes.push({
        key: command.key,
        status: "rejected",
        code: "CONFIRM_ONLY",
      });
      continue;
    }
    try {
      await executeResult(store, command, clock);
      outcomes.push({ key: command.key, status: "confirmed", code: null });
    } catch (error) {
      outcomes.push({
        key: command.key,
        status: "rejected",
        code:
          error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "INTERNAL_ERROR",
      });
    }
  }
  return outcomes;
}
