import { automaticKnockout, roundRobin, type DrawOptions } from "./draw.js";
import {
  ensure,
  freeze,
  validateEntrants,
  type Draw,
  type Entrant,
} from "./model.js";
export type EventKind = "individual_combat" | "team";
export interface CompetitionSnapshot {
  eventId: string;
  editionId: string;
  sportId: string;
  kind: EventKind;
  version: number;
  status: "draft" | "draw_confirmed" | "in_progress" | "cancelled";
  /** Authoritative actual start, never inferred from a scheduled date. */
  startedAt: string | null;
  entrants: readonly Entrant[];
  draw: Draw | null;
  withdrawnIds: readonly string[];
  approvedRoster?: readonly { entrantId: string; revisionId: string }[];
}
export function checkVersion(actual: number, expected: number) {
  ensure(
    Number.isSafeInteger(actual) &&
      actual >= 1 &&
      actual < Number.MAX_SAFE_INTEGER &&
      actual === expected,
    "Phiên bản đã thay đổi; cần tải lại dữ liệu.",
    "VERSION_CONFLICT",
  );
}
export function eligible(
  entrants: readonly Entrant[],
  kind: EventKind,
): boolean {
  return (
    entrants.length >= 3 &&
    new Set(entrants.map((e) => e.schoolId)).size >= (kind === "team" ? 3 : 2)
  );
}
export function createDraw(
  eventId: string,
  entrants: readonly Entrant[],
  kind: EventKind,
  options: DrawOptions = {},
): Draw {
  validateEntrants(entrants);
  ensure(
    eligible(entrants, kind),
    "Chưa đủ đối tượng thi đấu hoặc số trường để tổ chức.",
    "INVALID_STATE",
  );
  ensure(
    kind === "individual_combat" || kind === "team",
    "Loại nội dung chưa được hỗ trợ.",
    "RULES_UNRESOLVED",
  );
  return kind === "individual_combat" && entrants.length >= 6
    ? automaticKnockout(eventId, entrants, options)
    : roundRobin(eventId, entrants, options.random);
}
export function confirmDraw(
  snapshot: CompetitionSnapshot,
  expectedVersion: number,
): CompetitionSnapshot {
  checkVersion(snapshot.version, expectedVersion);
  ensure(
    snapshot.status === "draft" && snapshot.startedAt === null && snapshot.draw,
    "Sơ đồ không còn ở trạng thái nháp.",
    "INVALID_STATE",
  );
  ensure(
    snapshot.draw.eventId === snapshot.eventId &&
      snapshot.draw.entrants.length ===
        snapshot.entrants.filter((e) => !snapshot.withdrawnIds.includes(e.id))
          .length &&
      snapshot.entrants
        .filter((e) => !snapshot.withdrawnIds.includes(e.id))
        .every((e) =>
          snapshot.draw!.entrants.some(
            (d) =>
              d.id === e.id &&
              d.schoolId === e.schoolId &&
              d.personIds.length === e.personIds.length &&
              new Set(d.personIds).size === d.personIds.length &&
              e.personIds.every((id) => d.personIds.includes(id)),
          ),
        ),
    "Sơ đồ không khớp danh sách hiện hành.",
  );
  return freeze({
    ...structuredClone(snapshot),
    version: snapshot.version + 1,
    status: "draw_confirmed",
  });
}
export function replaceDraftDraw(
  snapshot: CompetitionSnapshot,
  expectedVersion: number,
  draw: Draw,
): CompetitionSnapshot {
  checkVersion(snapshot.version, expectedVersion);
  ensure(
    snapshot.status === "draft" && snapshot.startedAt === null,
    "Đã chốt bốc thăm; không được vẽ lại sơ đồ.",
    "INVALID_STATE",
  );
  ensure(
    draw.eventId === snapshot.eventId &&
      draw.entrants.length ===
        snapshot.entrants.filter((e) => !snapshot.withdrawnIds.includes(e.id))
          .length &&
      draw.entrants.every((e) =>
        snapshot.entrants.some(
          (p) =>
            p.id === e.id &&
            p.schoolId === e.schoolId &&
            !snapshot.withdrawnIds.includes(p.id) &&
            p.personIds.length === e.personIds.length &&
            new Set(e.personIds).size === e.personIds.length &&
            p.personIds.every((id) => e.personIds.includes(id)),
        ),
      ),
    "Danh sách bốc thăm không khớp.",
  );
  return freeze({
    ...structuredClone(snapshot),
    draw: structuredClone(draw),
    version: snapshot.version + 1,
  });
}
export function withdraw(
  snapshot: CompetitionSnapshot,
  expectedVersion: number,
  entrantId: string,
): CompetitionSnapshot {
  checkVersion(snapshot.version, expectedVersion);
  ensure(
    snapshot.status !== "cancelled" &&
      snapshot.entrants.some((e) => e.id === entrantId) &&
      !snapshot.withdrawnIds.includes(entrantId),
    "Không thể ghi bỏ cuộc ở vị trí này.",
    "INVALID_STATE",
  );
  // Do not compress or auto-publish a winner. Result adjudication belongs to K modules.
  return freeze({
    ...structuredClone(snapshot),
    version: snapshot.version + 1,
    withdrawnIds: [...snapshot.withdrawnIds, entrantId],
  });
}
export interface WeightClass {
  snapshot: CompetitionSnapshot;
  sportCode: "day_gay" | "vovinam";
  /** R01 immutable class-family key: same sex/age/discipline; not a display label. */
  transferGroupId: string;
  index: number;
  lowerKg: string;
  upperKg: string | null;
  schoolQuota: number;
}
/** Decimal 0.1 kg is represented as integer tenths; no binary floating point comparisons. */
function decimalTenths(value: string, allowZero: boolean): number {
  ensure(
    /^\d{1,3}(?:\.\d)?$/.test(value),
    "Cân nặng cần là số dương chính xác đến 0,1 kg.",
  );
  const [whole, fraction = "0"] = value.split(".");
  const tenths = Number(whole) * 10 + Number(fraction);
  ensure(tenths > 0 || (allowZero && tenths === 0), "Cân nặng phải lớn hơn 0.");
  return tenths;
}
export function weightTenths(value: string): number {
  return decimalTenths(value, false);
}
function boundaryTenths(value: string): number {
  return decimalTenths(value, true);
}
export interface TransferRequest {
  entrantId: string;
  sourceVersion: number;
  destinationVersion: number;
  officialKg: string;
  /** Supplied by the trusted official-weigh-in and leader decision adapters, not client flags. */
  officialWeightVerified: boolean;
  leaderConfirmed: boolean;
  reason: string;
}
export interface TransferOutcome {
  source: CompetitionSnapshot;
  destination: CompetitionSnapshot;
  archive: {
    source: CompetitionSnapshot;
    destination: CompetitionSnapshot;
    entrantId: string;
    officialKg: string;
    reason: string;
  };
  invalidatedEventIds: readonly string[];
}
/** Caller commits both snapshots, archive, schedule invalidation and audit in ONE transaction. */
export function transferWeight(
  source: WeightClass,
  destination: WeightClass,
  request: TransferRequest,
  options: DrawOptions = {},
): TransferOutcome {
  const from = source.snapshot;
  const to = destination.snapshot;
  checkVersion(from.version, request.sourceVersion);
  checkVersion(to.version, request.destinationVersion);
  ensure(
    from.eventId !== to.eventId &&
      from.editionId === to.editionId &&
      from.sportId === to.sportId &&
      source.transferGroupId &&
      source.transferGroupId === destination.transferGroupId &&
      source.sportCode === destination.sportCode &&
      ["day_gay", "vovinam"].includes(source.sportCode) &&
      from.kind === "individual_combat" &&
      to.kind === "individual_combat",
    "Chỉ chuyển hạng liền kề cùng kỳ giải, cùng môn Đẩy gậy/Vovinam đối kháng.",
  );
  ensure(
    Number.isInteger(source.index) &&
      Number.isInteger(destination.index) &&
      destination.index === source.index + 1,
    "Chỉ được chuyển lên hạng liền kề.",
  );
  ensure(
    source.upperKg !== null &&
      boundaryTenths(source.lowerKg) <= boundaryTenths(source.upperKg) &&
      (destination.upperKg === null ||
        boundaryTenths(destination.lowerKg) <=
          boundaryTenths(destination.upperKg)) &&
      boundaryTenths(destination.lowerKg) >= boundaryTenths(source.upperKg),
    "Cấu hình hạng cân không hợp lệ.",
  );
  ensure(
    from.startedAt === null &&
      to.startedAt === null &&
      ["draft", "draw_confirmed"].includes(from.status) &&
      ["draft", "draw_confirmed"].includes(to.status),
    "Một hạng đã bắt đầu hoặc ngừng tổ chức; không chuyển hạng. Cần xử lý truất quyền theo quy trình.",
    "INVALID_STATE",
  );
  ensure(
    request.leaderConfirmed &&
      request.officialWeightVerified &&
      request.reason.trim(),
    "Cần cân chính thức và quyết định có lý do của tổ trưởng.",
    "FORBIDDEN",
  );
  const weight = weightTenths(request.officialKg);
  ensure(
    weight >= boundaryTenths(destination.lowerKg) - 30 &&
      (destination.upperKg === null ||
        weight <= boundaryTenths(destination.upperKg)),
    "Cân chính thức không phù hợp hạng đích hoặc thiếu quá 3 kg.",
  );
  const entrant = from.entrants.find((e) => e.id === request.entrantId);
  ensure(
    entrant &&
      !from.withdrawnIds.includes(entrant.id) &&
      !to.entrants.some((e) => e.id === entrant.id),
    "VĐV không đủ điều kiện chuyển hạng.",
  );
  ensure(
    Number.isInteger(destination.schoolQuota) &&
      destination.schoolQuota > 0 &&
      to.entrants.filter((e) => e.schoolId === entrant.schoolId).length <
        destination.schoolQuota,
    "Trường đã hết suất ở hạng nhận.",
  );
  const rebuild = (
    snapshot: CompetitionSnapshot,
    entrants: readonly Entrant[],
  ): CompetitionSnapshot => {
    const active = entrants.filter(
      (e) => !snapshot.withdrawnIds.includes(e.id),
    );
    const canOrganize = eligible(active, snapshot.kind);
    const seedIds = (options.seedIds ?? snapshot.draw?.seedIds ?? []).filter(
      (id) => active.some((e) => e.id === id),
    );
    return freeze({
      ...structuredClone(snapshot),
      entrants: structuredClone(entrants),
      approvedRoster: snapshot.approvedRoster?.filter((ref) =>
        entrants.some((e) => e.id === ref.entrantId),
      ),
      version: snapshot.version + 1,
      status: canOrganize ? "draft" : "cancelled",
      draw: canOrganize
        ? createDraw(snapshot.eventId, active, snapshot.kind, {
            ...options,
            seedIds,
          })
        : null,
    });
  };
  return freeze({
    source: rebuild(
      from,
      from.entrants.filter((e) => e.id !== entrant.id),
    ),
    destination: rebuild(to, [...to.entrants, entrant]),
    archive: {
      source: structuredClone(from),
      destination: structuredClone(to),
      entrantId: entrant.id,
      officialKg: request.officialKg,
      reason: request.reason.trim(),
    },
    invalidatedEventIds: [from.eventId, to.eventId],
  });
}
