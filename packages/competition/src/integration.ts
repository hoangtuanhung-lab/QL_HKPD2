import {
  createDraw,
  checkVersion,
  type CompetitionSnapshot,
  transferWeight,
  type TransferOutcome,
  type WeightClass,
} from "./lifecycle.js";
import { ensure, freeze, type Entrant } from "./model.js";
import type { DrawOptions } from "./draw.js";
export interface ApprovedEntry extends Entrant {
  editionId: string;
  eventId: string;
  approvedRevisionId: string;
}
export interface CompetitionTransaction {
  /** Trusted server session/assignment lookup inside transaction. */
  canManage(
    actorId: string,
    editionId: string,
    eventId: string,
  ): Promise<boolean>;
  event(eventId: string): Promise<CompetitionSnapshot>;
  approvedEntries(eventId: string): Promise<readonly ApprovedEntry[]>;
  save(snapshot: CompetitionSnapshot, expectedVersion: number): Promise<void>;
  audit(record: {
    actorId: string;
    editionId: string;
    eventId: string;
    version: number;
    action: "draw.created";
  }): Promise<void>;
  enqueue(record: {
    eventId: string;
    editionId: string;
    version: number;
    type: "draw.created";
  }): Promise<void>;
}
export interface CompetitionStore {
  /** Same transaction/CAS/locking contract as B04; no memory adapter is supplied for production. */
  transaction<T>(run: (tx: CompetitionTransaction) => Promise<T>): Promise<T>;
}
/** C10 trusted-roster orchestration. Wrap this in B04 receipt handling when mounting an API command. */
export function drawFromApproved(
  store: CompetitionStore,
  input: {
    actorId: string;
    editionId: string;
    eventId: string;
    baseVersion: number;
  },
  options: DrawOptions = {},
): Promise<CompetitionSnapshot> {
  // Capture command data before the transaction can suspend authorization.
  input = structuredClone(input);
  ensure(
    [input.actorId, input.editionId, input.eventId].every(
      (id) => typeof id === "string" && id.trim(),
    ) &&
      Number.isSafeInteger(input.baseVersion) &&
      input.baseVersion > 0,
    "Thiếu phạm vi hoặc phiên bản lệnh tạo vòng đấu.",
  );
  // Keep the trusted random callback; copy caller-owned configuration and seeds.
  options = {
    ...options,
    ...(options.seedIds ? { seedIds: [...options.seedIds] } : {}),
  };
  return store.transaction(async (tx) => {
    ensure(
      await tx.canManage(input.actorId, input.editionId, input.eventId),
      "Không có quyền tạo vòng đấu.",
      "FORBIDDEN",
    );
    const event = await tx.event(input.eventId);
    ensure(
      event.editionId === input.editionId && event.eventId === input.eventId,
      "Nội dung không thuộc kỳ giải được phép.",
      "FORBIDDEN",
    );
    checkVersion(event.version, input.baseVersion);
    ensure(
      event.status === "draft" && event.startedAt === null,
      "Đã chốt bốc thăm hoặc bắt đầu; không tạo lại vòng đấu.",
      "INVALID_STATE",
    );
    const entries = await tx.approvedEntries(input.eventId);
    ensure(
      entries.every(
        (e) =>
          e.approvedRevisionId &&
          e.eventId === event.eventId &&
          e.editionId === event.editionId,
      ),
      "Danh sách duyệt không đúng phạm vi.",
      "FORBIDDEN",
    );
    const entrants: Entrant[] = entries.map(
      ({ id, label, schoolId, personIds }) => ({
        id,
        label,
        schoolId,
        personIds,
      }),
    );
    const snapshot = freeze({
      ...structuredClone(event),
      version: event.version + 1,
      entrants,
      approvedRoster: entries.map((e) => ({
        entrantId: e.id,
        revisionId: e.approvedRevisionId,
      })),
      draw: createDraw(
        event.eventId,
        entrants.filter((e) => !event.withdrawnIds.includes(e.id)),
        event.kind,
        options,
      ),
    });
    await tx.save(snapshot, event.version);
    await tx.audit({
      actorId: input.actorId,
      editionId: event.editionId,
      eventId: event.eventId,
      version: snapshot.version,
      action: "draw.created",
    });
    await tx.enqueue({
      eventId: event.eventId,
      editionId: event.editionId,
      version: snapshot.version,
      type: "draw.created",
    });
    return snapshot;
  });
}

export interface OfficialWeightRecord {
  id: string;
  editionId: string;
  eventId: string;
  entrantId: string;
  kg: string;
}
export interface WeightTransferTransaction {
  canManage(
    actorId: string,
    editionId: string,
    eventId: string,
  ): Promise<boolean>;
  weightClass(eventId: string): Promise<WeightClass>;
  officialWeight(
    eventId: string,
    entrantId: string,
  ): Promise<OfficialWeightRecord | null>;
  save(snapshot: CompetitionSnapshot, expectedVersion: number): Promise<void>;
  moveRegistration(record: {
    entrantId: string;
    sourceEventId: string;
    destinationEventId: string;
    actorId: string;
    reason: string;
  }): Promise<{ approvedRevisionId: string }>;
  archive(
    record: TransferOutcome["archive"] & {
      actorId: string;
      officialWeightId: string;
    },
  ): Promise<void>;
  invalidateSchedules(eventIds: readonly string[]): Promise<void>;
  enqueue(record: {
    type: "competition.redrawn";
    editionId: string;
    eventIds: readonly string[];
  }): Promise<void>;
}
export interface WeightTransferStore {
  /** Lock BOTH events in a stable order; CAS both versions; roll back all snapshots/history/outbox. */
  transaction<T>(
    run: (tx: WeightTransferTransaction) => Promise<T>,
  ): Promise<T>;
}
export async function transferFromOfficial(
  store: WeightTransferStore,
  input: {
    actorId: string;
    editionId: string;
    sourceEventId: string;
    destinationEventId: string;
    entrantId: string;
    sourceVersion: number;
    destinationVersion: number;
    reason: string;
  },
  options: DrawOptions = {},
): Promise<TransferOutcome> {
  // Capture command data before the transaction can suspend authorization.
  input = structuredClone(input);
  ensure(
    [
      input.actorId,
      input.editionId,
      input.sourceEventId,
      input.destinationEventId,
      input.entrantId,
    ].every((id) => typeof id === "string" && id.trim()) &&
      Number.isSafeInteger(input.sourceVersion) &&
      input.sourceVersion > 0 &&
      Number.isSafeInteger(input.destinationVersion) &&
      input.destinationVersion > 0 &&
      typeof input.reason === "string" &&
      input.reason.trim(),
    "Thiếu phạm vi, phiên bản hoặc lý do chuyển hạng.",
  );
  // Keep the trusted random callback; copy caller-owned configuration and seeds.
  options = {
    ...options,
    ...(options.seedIds ? { seedIds: [...options.seedIds] } : {}),
  };
  return store.transaction(async (tx) => {
    ensure(
      (await tx.canManage(
        input.actorId,
        input.editionId,
        input.sourceEventId,
      )) &&
        (await tx.canManage(
          input.actorId,
          input.editionId,
          input.destinationEventId,
        )),
      "Không có quyền xác nhận chuyển hạng.",
      "FORBIDDEN",
    );
    const source = await tx.weightClass(input.sourceEventId);
    const destination = await tx.weightClass(input.destinationEventId);
    ensure(
      source.snapshot.eventId === input.sourceEventId &&
        destination.snapshot.eventId === input.destinationEventId &&
        source.snapshot.editionId === input.editionId &&
        destination.snapshot.editionId === input.editionId,
      "Hạng cân không thuộc phạm vi cho phép.",
      "FORBIDDEN",
    );
    const official = await tx.officialWeight(
      input.sourceEventId,
      input.entrantId,
    );
    ensure(
      official?.id &&
        official.editionId === input.editionId &&
        official.eventId === input.sourceEventId &&
        official.entrantId === input.entrantId,
      "Chưa có cân chính thức đúng nội dung/VĐV.",
      "INVALID_STATE",
    );
    let outcome = transferWeight(
      source,
      destination,
      {
        entrantId: input.entrantId,
        sourceVersion: input.sourceVersion,
        destinationVersion: input.destinationVersion,
        officialKg: official.kg,
        officialWeightVerified: true,
        leaderConfirmed: true,
        reason: input.reason,
      },
      options,
    );
    const moved = await tx.moveRegistration({
      entrantId: input.entrantId,
      sourceEventId: input.sourceEventId,
      destinationEventId: input.destinationEventId,
      actorId: input.actorId,
      reason: input.reason,
    });
    ensure(
      moved.approvedRevisionId,
      "Chuyển đăng ký chưa tạo phiên bản duyệt mới.",
      "INVALID_STATE",
    );
    outcome = freeze({
      ...outcome,
      destination: {
        ...outcome.destination,
        approvedRoster: [
          ...(outcome.destination.approvedRoster ?? []),
          { entrantId: input.entrantId, revisionId: moved.approvedRevisionId },
        ],
      },
    });
    await tx.save(outcome.source, input.sourceVersion);
    await tx.save(outcome.destination, input.destinationVersion);
    await tx.archive({
      ...outcome.archive,
      actorId: input.actorId,
      officialWeightId: official.id,
    });
    await tx.invalidateSchedules(outcome.invalidatedEventIds);
    await tx.enqueue({
      type: "competition.redrawn",
      editionId: input.editionId,
      eventIds: outcome.invalidatedEventIds,
    });
    return outcome;
  });
}
