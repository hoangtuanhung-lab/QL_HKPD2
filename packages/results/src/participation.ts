import { ensure, freeze, integer } from "./model.js";
export type ParticipationStatus =
  "active" | "excused" | "absent" | "disqualified";
export interface Participation {
  id: string;
  eventId: string;
  schoolId: string;
  status: ParticipationStatus;
  playedMatchIds: readonly string[];
  performed: boolean;
  validAchievement: boolean;
  history: readonly {
    from: ParticipationStatus;
    to: ParticipationStatus;
    reason: string;
    actorId: string;
    at: string;
  }[];
}
/** Pure policy: server adapter must authorize leader/delegated admin, audit and invalidate tables. */
export function changeParticipation(
  p: Participation,
  next: ParticipationStatus,
  context: {
    eventId: string;
    format: "knockout" | "round_robin";
    editionLocked: boolean;
    downstreamHasSavedResult: boolean;
    previouslyEliminated: boolean;
    actorId: string;
    reason: string;
    at: string;
  },
) {
  ensure(
    ["active", "excused", "absent", "disqualified"].includes(p.status) &&
      ["active", "excused", "absent", "disqualified"].includes(next) &&
      ["knockout", "round_robin"].includes(context.format),
    "STATUS_INPUT",
    "Trạng thái/thể thức không được hỗ trợ.",
  );
  ensure(
    p.eventId === context.eventId &&
      !context.editionLocked &&
      context.actorId &&
      context.reason.trim() &&
      Number.isFinite(Date.parse(context.at)),
    "STATUS_INPUT",
    "Phạm vi/trạng thái hoặc lý do không hợp lệ.",
  );
  ensure(p.status !== next, "INVALID_STATE", "Trạng thái không thay đổi.");
  if (next === "active") {
    ensure(
      !context.previouslyEliminated,
      "ELIMINATED",
      "Không hồi sinh người đã thua.",
    );
    ensure(
      context.format !== "knockout" || !context.downstreamHasSavedResult,
      "RESTORE_BLOCKED",
      "Vòng sau đã lưu kết quả; không phục hồi loại trực tiếp.",
    );
  }
  return freeze({
    ...structuredClone(p),
    status: next,
    history: [
      ...structuredClone(p.history),
      {
        from: p.status,
        to: next,
        reason: context.reason.trim(),
        actorId: context.actorId,
        at: context.at,
      },
    ],
  });
}
export function participationCounts(
  all: readonly Participation[],
  registered: number,
  approved: number,
) {
  integer(registered);
  integer(approved);
  ensure(
    approved <= registered &&
      new Set(all.map((p) => p.id)).size === all.length &&
      new Set(all.map((p) => p.eventId)).size <= 1,
    "COUNT_SCOPE",
    "Số đếm hoặc phạm vi nội dung không hợp lệ.",
  );
  const actual = all.filter((p) => p.performed || p.playedMatchIds.length > 0);
  ensure(
    actual.length <= approved,
    "COUNT_SCOPE",
    "Số thực đấu vượt số được duyệt; cần đối chiếu cùng snapshot.",
  );
  const valid = actual.filter(
    (p) => p.status === "active" && p.validAchievement,
  );
  return {
    registered,
    approved,
    actual: actual.length,
    valid: valid.length,
    medalBasis: actual.length,
    validSchools: new Set(valid.map((p) => p.schoolId)).size,
  };
}
export function awardEvent(
  all: readonly Participation[],
  ranking: readonly string[],
  context: {
    kind: "individual" | "team";
    registered: number;
    approved: number;
    bronzeMatchCancelled: boolean;
    largeCountRules?: {
      points: Readonly<Record<number, number>>;
      bronzeRanks: readonly number[];
    };
  },
) {
  ensure(
    new Set(all.map((p) => p.id)).size === all.length &&
      new Set(ranking).size === ranking.length &&
      ranking.every((id) => all.some((p) => p.id === id)),
    "RANK_INPUT",
    "Danh sách phân hạng thiếu hoặc trùng đối tượng.",
  );
  const counts = participationCounts(all, context.registered, context.approved);
  if (
    counts.valid < 3 ||
    counts.validSchools < (context.kind === "team" ? 3 : 2)
  )
    return {
      status: "cancelled" as const,
      counts,
      awards: [],
      reason: "INSUFFICIENT_VALID",
    };
  if (context.bronzeMatchCancelled)
    return {
      status: "unresolved" as const,
      counts,
      awards: [],
      reason: "U05_BRONZE_CANCELLED",
    };
  if (
    all.some(
      (p) =>
        p.status === "active" &&
        p.validAchievement &&
        (p.performed || p.playedMatchIds.length) &&
        !ranking.includes(p.id),
    )
  )
    return {
      status: "unresolved" as const,
      counts,
      awards: [],
      reason: "INCOMPLETE_RANKING",
    };
  const points =
    counts.medalBasis <= 4
      ? { 1: 11, 2: 9, 3: 7, 4: 6 }
      : counts.medalBasis === 5
        ? { 1: 11, 2: 9, 3: 8, 4: 7, 5: 6 }
        : context.largeCountRules?.points;
  const bronzeRanks =
    counts.medalBasis <= 4
      ? []
      : counts.medalBasis === 5
        ? [3]
        : context.largeCountRules?.bronzeRanks;
  if (!points || !bronzeRanks)
    return {
      status: "unresolved" as const,
      counts,
      awards: [],
      reason: "LARGE_COUNT_RULE_REQUIRED",
    };
  const awards = ranking.flatMap((id, i) => {
    const p = all.find((p) => p.id === id)!,
      rank = i + 1;
    if (
      p.status !== "active" ||
      !p.validAchievement ||
      (!p.performed && !p.playedMatchIds.length)
    )
      return [];
    const score = points[rank as keyof typeof points];
    ensure(
      Number.isSafeInteger(score) && Number(score) >= 0,
      "POINT_RULE",
      "Chưa cấu hình điểm thứ hạng.",
    );
    return [
      {
        id,
        rank,
        points: Number(score),
        medal:
          rank === 1
            ? "gold"
            : rank === 2
              ? "silver"
              : bronzeRanks.includes(rank)
                ? "bronze"
                : null,
      },
    ];
  });
  return { status: "resolved" as const, counts, awards, reason: null };
}
/** Explicit final excuse outcome from source; never promotes an eliminated opponent. */
export const excusedFinal = () =>
  ({
    present: { medal: "gold", points: 11 },
    excused: { medal: "silver", points: 9 },
  }) as const;
