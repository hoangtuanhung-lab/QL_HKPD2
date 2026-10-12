import { ensure, integer, scaled } from "./model.js";
export interface RoundRobinEntrant {
  id: string;
  schoolId: string;
  officialWeightKg?: string;
}
export interface RoundRobinResult {
  id: string;
  left: string;
  right: string;
  leftScore: number;
  rightScore: number;
  confirmed: boolean;
  leftSets?: number;
  rightSets?: number;
  leftWarnings?: number;
  rightWarnings?: number;
  /** Mutually exclusive player-match card categories; not yellow/red totals. */
  leftFairPlay?: number;
  rightFairPlay?: number;
}
export type Criterion = "head_to_head" | "set_difference" | "warnings";
export interface RankingOptions {
  sport: "football" | "tug_or_push" | "vovinam" | "racket";
  racketCriteria?: readonly Criterion[];
  manualTieOrder?: readonly string[];
  decisionKind?: "leader" | "physical_draw";
  decisionActorId?: string;
  decisionReason?: string;
}
export function fairPlay(cards: {
  yellowOnly: number;
  secondYellowRed: number;
  directRed: number;
  yellowDirectRed: number;
}) {
  Object.values(cards).forEach(integer);
  const total =
    BigInt(cards.yellowOnly) +
    3n * BigInt(cards.secondYellowRed) +
    3n * BigInt(cards.directRed) +
    4n * BigInt(cards.yellowDirectRed);
  ensure(
    total <= BigInt(Number.MAX_SAFE_INTEGER),
    "POINT_OVERFLOW",
    "Điểm fair-play vượt phạm vi số nguyên.",
  );
  return Number(total);
}
export function rankRoundRobin(
  entrants: readonly RoundRobinEntrant[],
  results: readonly RoundRobinResult[],
  options: RankingOptions,
) {
  ensure(
    entrants.length >= 3 &&
      new Set(entrants.map((e) => e.id)).size === entrants.length &&
      entrants.every((e) => e.id && e.schoolId),
    "ROSTER_INPUT",
    "Danh sách vòng tròn thiếu hoặc trùng.",
  );
  if (options.sport === "racket")
    ensure(
      options.racketCriteria?.length &&
        new Set(options.racketCriteria).size ===
          options.racketCriteria.length &&
        options.racketCriteria.every((c) =>
          ["head_to_head", "set_difference", "warnings"].includes(c),
        ),
      "RULES_UNRESOLVED",
      "Cần thứ tự tiêu chí Cầu lông/Đá cầu đã đối chiếu nguồn.",
    );
  const confirmed = results.filter((r) => r.confirmed),
    seen = new Set<string>(),
    seenIds = new Set<string>();
  for (const r of confirmed) {
    ensure(
      r.id &&
        r.left !== r.right &&
        entrants.some((e) => e.id === r.left) &&
        entrants.some((e) => e.id === r.right),
      "MATCH_INPUT",
      "Trận vòng tròn sai đối tượng.",
    );
    const pair = [r.left, r.right].sort().join("|");
    ensure(
      !seen.has(pair) && !seenIds.has(r.id),
      "DUPLICATE_MATCH",
      "Mỗi cặp chỉ có một kết quả chính thức.",
    );
    seen.add(pair);
    seenIds.add(r.id);
    integer(r.leftScore);
    integer(r.rightScore);
    if (options.sport !== "football")
      ensure(
        r.leftScore !== r.rightScore,
        "DRAW_UNSUPPORTED",
        "Môn không hòa cần người thắng được xác nhận.",
      );
    for (const v of [
      r.leftSets,
      r.rightSets,
      r.leftWarnings,
      r.rightWarnings,
      r.leftFairPlay,
      r.rightFairPlay,
    ])
      if (v !== undefined) integer(v);
  }
  const aggregate = (id: string, subset?: Set<string>) => {
    const matches = confirmed.filter(
      (r) =>
        (r.left === id || r.right === id) &&
        (!subset || (subset.has(r.left) && subset.has(r.right))),
    );
    let points = 0,
      difference = 0n,
      scored = 0n,
      setDifference = 0n,
      warnings = 0n,
      cards = 0n;
    for (const r of matches) {
      const left = r.left === id,
        a = left ? r.leftScore : r.rightScore,
        b = left ? r.rightScore : r.leftScore;
      points +=
        options.sport === "football"
          ? a > b
            ? 3
            : a === b
              ? 1
              : 0
          : a > b
            ? 2
            : 1;
      difference += BigInt(a) - BigInt(b);
      scored += BigInt(a);
      setDifference +=
        BigInt(left ? (r.leftSets ?? 0) : (r.rightSets ?? 0)) -
        BigInt(left ? (r.rightSets ?? 0) : (r.leftSets ?? 0));
      warnings += BigInt(left ? (r.leftWarnings ?? 0) : (r.rightWarnings ?? 0));
      cards += BigInt(left ? (r.leftFairPlay ?? 0) : (r.rightFairPlay ?? 0));
    }
    const safe = (v: bigint) => {
      const n = Number(v);
      ensure(
        Number.isSafeInteger(n),
        "METRIC_OVERFLOW",
        "Tổng tiêu chí vượt phạm vi số nguyên.",
      );
      return n;
    };
    return {
      points,
      difference: safe(difference),
      scored: safe(scored),
      setDifference: safe(setDifference),
      warnings: safe(warnings),
      cards: safe(cards),
      played: matches.length,
    };
  };
  const metrics = new Map(entrants.map((e) => [e.id, aggregate(e.id)]));
  const byPoints = new Map<number, string[]>();
  for (const e of entrants) {
    const p = metrics.get(e.id)!.points;
    byPoints.set(p, [...(byPoints.get(p) ?? []), e.id]);
  }
  const orderedGroups: string[][] = [];
  const explanations: Record<string, string[]> = {};
  const blocked = new Set<string>();
  const split = (
    groups: string[][],
    criterion: string,
    metric: (id: string, group: readonly string[]) => bigint | null,
    ascending = false,
    notApplicable?: (group: readonly string[]) => boolean,
  ) =>
    groups.flatMap((group) => {
      if (group.length < 2 || group.some((id) => blocked.has(id)))
        return [group];
      if (notApplicable?.(group)) {
        group.forEach((id) =>
          (explanations[id] ??= []).push(
            `${criterion}: không áp dụng cho nhóm này`,
          ),
        );
        return [group];
      }
      const values = group.map((id) => ({ id, value: metric(id, group) }));
      if (values.some((v) => v.value === null)) {
        group.forEach((id) => blocked.add(id));
        group.forEach((id) =>
          (explanations[id] ??= []).push(
            `${criterion}: thiếu dữ liệu/quyết định`,
          ),
        );
        return [group];
      }
      values.sort((a, b) =>
        a.value === b.value
          ? 0
          : (a.value! < b.value! ? -1 : 1) * (ascending ? 1 : -1),
      );
      const buckets: string[][] = [];
      let prior: bigint | null = null;
      for (const v of values) {
        if (!buckets.length || v.value !== prior) buckets.push([]);
        buckets.at(-1)!.push(v.id);
        prior = v.value;
      }
      group.forEach((id) => (explanations[id] ??= []).push(criterion));
      return buckets;
    });
  for (const [, original] of [...byPoints].sort(([a], [b]) => b - a)) {
    let groups = [original];
    if (options.sport === "football") {
      const groupSet = new Set(original),
        mini = new Map(original.map((id) => [id, aggregate(id, groupSet)]));
      groups = split(groups, "Điểm đối đầu trong nhóm bằng điểm", (id) =>
        BigInt(mini.get(id)!.points),
      );
      groups = split(groups, "Hiệu số đối đầu", (id) =>
        BigInt(mini.get(id)!.difference),
      );
      groups = split(groups, "Bàn thắng đối đầu", (id) =>
        BigInt(mini.get(id)!.scored),
      );
      groups = split(groups, "Hiệu số toàn bảng", (id) =>
        BigInt(metrics.get(id)!.difference),
      );
      groups = split(groups, "Bàn thắng toàn bảng", (id) =>
        BigInt(metrics.get(id)!.scored),
      );
      const hasCards = confirmed.every(
        (r) => r.leftFairPlay !== undefined && r.rightFairPlay !== undefined,
      );
      groups = split(
        groups,
        "Fair-play 1/3/3/4",
        (id) => (hasCards ? BigInt(metrics.get(id)!.cards) : null),
        true,
      );
    } else {
      const h2h = (id: string, group: readonly string[]) => {
        if (group.length !== 2) return null;
        const r = confirmed.find(
          (r) => group.includes(r.left) && group.includes(r.right),
        );
        return r
          ? BigInt(
              (
                r.left === id
                  ? r.leftScore > r.rightScore
                  : r.rightScore > r.leftScore
              )
                ? 1
                : 0,
            )
          : null;
      };
      const criteria =
        options.sport === "racket"
          ? options.racketCriteria!
          : options.sport === "tug_or_push"
            ? (["head_to_head", "set_difference", "warnings"] as const)
            : (["head_to_head"] as const);
      for (const criterion of criteria) {
        if (criterion === "head_to_head")
          groups = split(
            groups,
            "Đối đầu (không tạo bảng phụ 3 bên)",
            h2h,
            false,
            (group) => group.length !== 2,
          );
        else if (criterion === "set_difference")
          groups = split(groups, "Hiệu số hiệp", (id) =>
            confirmed.every(
              (r) => r.leftSets !== undefined && r.rightSets !== undefined,
            )
              ? BigInt(metrics.get(id)!.setDifference)
              : null,
          );
        else
          groups = split(
            groups,
            "Ít cảnh cáo hơn",
            (id) =>
              confirmed.every(
                (r) =>
                  r.leftWarnings !== undefined && r.rightWarnings !== undefined,
              )
                ? BigInt(metrics.get(id)!.warnings)
                : null,
            true,
          );
      }
      if (options.sport === "vovinam")
        groups = split(
          groups,
          "Cân chính thức nhẹ hơn (0,1 kg)",
          (id) => {
            const kg = entrants.find((e) => e.id === id)?.officialWeightKg;
            if (!kg) return null;
            const weight = scaled(kg, 1);
            ensure(
              weight > 0,
              "INVALID_WEIGHT",
              "Cân chính thức phải lớn hơn 0.",
            );
            return weight;
          },
          true,
        );
    }
    // Recorded external tie decision only resolves an otherwise unresolved group.
    if (options.manualTieOrder) {
      ensure(
        options.decisionActorId &&
          options.decisionReason?.trim() &&
          options.decisionKind ===
            (options.sport === "vovinam" ? "leader" : "physical_draw"),
        "TIE_DECISION",
        "Cần quyết định tổ trưởng/bốc thăm thực tế có người và lý do.",
      );
      ensure(
        new Set(options.manualTieOrder).size ===
          options.manualTieOrder.length &&
          options.manualTieOrder.every((id) =>
            entrants.some((e) => e.id === id),
          ),
        "TIE_DECISION",
        "Thứ tự quyết định có ID trùng/sai.",
      );
      groups = groups.flatMap((g) =>
        g.length > 1 &&
        !g.some((id) => blocked.has(id)) &&
        g.every((id) => options.manualTieOrder!.includes(id))
          ? [...g]
              .sort(
                (a, b) =>
                  options.manualTieOrder!.indexOf(a) -
                  options.manualTieOrder!.indexOf(b),
              )
              .map((id) => [id])
          : [g],
      );
    }
    orderedGroups.push(...groups);
  }
  let place = 1;
  const rows = orderedGroups.flatMap((group) => {
    const rank = group.length === 1 ? place : null;
    const rows = group.map((id) => ({
      id,
      rank,
      ...metrics.get(id)!,
      criteria: explanations[id] ?? [],
      needsDecision: group.length > 1,
    }));
    place += group.length;
    return rows;
  });
  return {
    status: rows.some((r) => r.needsDecision)
      ? ("unresolved" as const)
      : ("resolved" as const),
    provisional:
      confirmed.length !== (entrants.length * (entrants.length - 1)) / 2,
    rows,
  };
}
