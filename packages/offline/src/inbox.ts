import { createHash, randomUUID } from "node:crypto";
import { allowed, type Actor } from "@hkpd/foundation";
import { submitPreview, ResultError, type ResultMatch } from "@hkpd/results";
import {
  assertScope,
  assertSubmission,
  assertReceipt,
  canonical,
  requireValue,
  type QueueScope,
  type SyncSubmission,
  type SyncReceipt,
} from "./model.js";
export interface AssignmentSnapshot {
  id: string;
  actorId: string;
  editionId: string;
  eventId: string;
  sportId: string;
  maySubmit: boolean;
}
export interface InboxRecord {
  scope: QueueScope;
  request: SyncSubmission;
  fingerprint: string;
  receipt: SyncReceipt;
  receivedAt: string;
  reason:
    | "pending_confirmation"
    | "assignment_changed"
    | "version_conflict"
    | "review_required";
}
/** Adapter must serialize operation identity AND the match; all writes commit/rollback together.
 * No adapter accepting client actors or arbitrary assignment snapshots is permitted.
 */
export interface InboxTransaction {
  actor(actorId: string): Promise<Actor | null>;
  match(editionId: string, matchId: string): Promise<ResultMatch | null>;
  snapshot(id: string): Promise<AssignmentSnapshot | null>;
  assignmentCurrent(
    snapshot: AssignmentSnapshot,
    actor: Actor,
    match: ResultMatch,
  ): Promise<boolean>;
  find(scope: QueueScope, operationId: string): Promise<InboxRecord | null>;
  sourcesCurrent(match: ResultMatch): Promise<boolean>;
  filesAllowed(
    actor: Actor,
    match: ResultMatch,
    fileIds: readonly string[],
  ): Promise<boolean>;
  saveMatch(match: ResultMatch, expectedVersion: number): Promise<void>;
  /** Insert immutable record, idempotency receipt and audit; UNIQUE(actor,edition,operation). */
  insert(record: InboxRecord): Promise<void>;
}
export interface InboxStore {
  transaction<T>(run: (tx: InboxTransaction) => Promise<T>): Promise<T>;
}
/** Trusted actorId comes from authenticated session, not the SyncSubmission body.
 * There is intentionally NO confirm method: accepted means pending_confirmation only.
 */
export async function receiveOffline(
  store: InboxStore,
  scope: QueueScope,
  input: unknown,
  clock: () => Date = () => new Date(),
  newId: () => string = randomUUID,
): Promise<SyncReceipt> {
  assertScope(scope);
  assertSubmission(input);
  const request = structuredClone(input);
  const captured = structuredClone(scope);
  const fingerprint = createHash("sha256")
    .update(canonical(request))
    .digest("hex");
  return store.transaction(async (tx) => {
    const actor = await tx.actor(captured.actorId);
    requireValue(actor?.id === captured.actorId && actor.approved, "FORBIDDEN");
    const match = await tx.match(
      captured.editionId,
      request.submission.match_id,
    );
    const snapshot = await tx.snapshot(request.assignment_snapshot_id);
    // A caller cannot create a review entry against an unassigned or foreign match.
    requireValue(
      match &&
        match.id === request.submission.match_id &&
        match.editionId === captured.editionId &&
        snapshot &&
        snapshot.id === request.assignment_snapshot_id &&
        snapshot.actorId === actor.id &&
        snapshot.editionId === match.editionId &&
        snapshot.eventId === match.eventId &&
        snapshot.sportId === match.sportId &&
        snapshot.maySubmit === true,
      "NOT_FOUND",
    );
    const old = await tx.find(captured, request.operation_id);
    if (old) {
      requireValue(
        old.scope.actorId === captured.actorId &&
          old.scope.editionId === captured.editionId &&
          old.fingerprint === fingerprint,
        "IDEMPOTENCY_CONFLICT",
      );
      return structuredClone(old.receipt);
    }
    const now = clock();
    requireValue(Number.isFinite(now.getTime()), "INVALID_CLOCK");
    let status: SyncReceipt["status"] = "accepted";
    let reason: InboxRecord["reason"] = "pending_confirmation";
    if (
      !allowed(actor, "result.submit", {
        editionId: match.editionId,
        eventId: match.eventId,
        sportId: match.sportId,
        participantSchoolIds: match.participantSchoolIds,
      }) ||
      !(await tx.assignmentCurrent(snapshot, actor, match))
    ) {
      status = "review_required";
      reason = "assignment_changed";
    } else if (
      request.base_version !== match.version ||
      request.submission.base_official_version !==
        (match.official?.version ?? 0) ||
      match.submissions.some((s) => s.status === "pending_confirmation") ||
      (match.lease !== null &&
        (!Number.isFinite(Date.parse(match.lease.expiresAt)) ||
          Date.parse(match.lease.expiresAt) > now.getTime()))
    ) {
      status = "conflict";
      reason = "version_conflict";
    } else if (
      !(await tx.sourcesCurrent(match)) ||
      !(await tx.filesAllowed(
        actor,
        match,
        request.submission.payload.file_ids,
      ))
    ) {
      status = "review_required";
      reason = "review_required";
    }
    let next: ResultMatch | null = null;
    let submissionId: string | null = null;
    if (status === "accepted") {
      submissionId = newId();
      requireValue(
        typeof submissionId === "string" &&
          !match.submissions.some((s) => s.id === submissionId),
        "INVALID_SYNC_RECEIPT",
      );
      assertReceipt({
        operation_id: request.operation_id,
        status: "accepted",
        submission_id: submissionId,
      });
      try {
        next = submitPreview(
          match,
          request.submission.payload,
          actor.id,
          now,
          submissionId,
          request.submission.reason,
        );
      } catch (error) {
        if (!(error instanceof ResultError)) throw error;
        status = "review_required";
        reason = "review_required";
        submissionId = null;
      }
    }
    const receipt: SyncReceipt = {
      operation_id: request.operation_id,
      status,
      submission_id: submissionId,
    };
    assertReceipt(receipt);
    if (next) await tx.saveMatch(next, match.version);
    await tx.insert({
      scope: captured,
      request,
      fingerprint,
      receipt,
      receivedAt: now.toISOString(),
      reason,
    });
    return structuredClone(receipt);
  });
}
