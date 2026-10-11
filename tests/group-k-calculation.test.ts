import { describe, expect, it } from "vitest";
import {
  rankRoundRobin,
  fairPlay,
  awardEvent,
  participationCounts,
  changeParticipation,
  allRoundPoints,
  rankSchoolsInSport,
  previewChessCsv,
  finalizePublication,
  invalidatePublication,
  publicResults,
  exportResultCsv,
  notificationIntent,
  submitPreview,
  confirmPreview,
} from "../packages/results/src/index.js";
import { match, score, ids, clock } from "./group-k-fixtures.js";
const entrants = ["a", "b", "c"].map((id, i) => ({
  id,
  schoolId: `school-${i % 2}`,
  officialWeightKg: ["42.3", "42.4", "42.5"][i],
}));
const game = (left: string, right: string, a: number, b: number) => ({
  id: `${left}-${right}`,
  left,
  right,
  leftScore: a,
  rightScore: b,
  confirmed: true,
  leftSets: a,
  rightSets: b,
  leftWarnings: 0,
  rightWarnings: 0,
  leftFairPlay: 0,
  rightFairPlay: 0,
});
const cycle = [
  game("a", "b", 2, 1),
  game("b", "c", 2, 1),
  game("c", "a", 2, 1),
];
const party = (id: string, index: number) => ({
  id,
  eventId: "event",
  schoolId: `school-${index % 2}`,
  status: "active" as const,
  playedMatchIds: ["real-match"],
  performed: false,
  validAchievement: true,
  history: [],
});
describe("K04 sport ranking", () => {
  it("football uses 3/1/0 and mutual-group goals before overall goals", () => {
    const result = rankRoundRobin(
      entrants,
      [game("a", "b", 1, 0), game("a", "c", 0, 1), game("b", "c", 2, 0)],
      { sport: "football" },
    );
    expect(result.rows[0]!.id).toBe("b");
    expect(result.rows[0]!.points).toBe(3);
    expect(result.rows[0]!.criteria).toContain("Hiệu số đối đầu");
  });
  it("football draw is one point each and pending matches do not count", () => {
    const result = rankRoundRobin(
      entrants,
      [game("a", "b", 0, 0), { ...game("a", "c", 9, 0), confirmed: false }],
      { sport: "football" },
    );
    expect(result.provisional).toBe(true);
    expect(result.rows.find((r) => r.id === "a")!.points).toBe(1);
  });
  it("Vovinam cycle uses confirmed tenths of kg, no invented 3-person head-to-head table", () => {
    const result = rankRoundRobin(entrants, cycle, { sport: "vovinam" });
    expect(result.rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(result.rows[0]!.points).toBe(3);
    expect(
      result.rows[0]!.criteria.some((c) => c.includes("không tạo bảng phụ")),
    ).toBe(true);
  });
  it("equal official weights require recorded leader decision, not random fallback", () => {
    const equal = entrants.map((e) => ({ ...e, officialWeightKg: "42.3" }));
    expect(rankRoundRobin(equal, cycle, { sport: "vovinam" }).status).toBe(
      "unresolved",
    );
    expect(() =>
      rankRoundRobin(equal, cycle, {
        sport: "vovinam",
        manualTieOrder: ["a", "b", "c"],
      }),
    ).toThrow();
    expect(
      rankRoundRobin(equal, cycle, {
        sport: "vovinam",
        manualTieOrder: ["c", "b", "a"],
        decisionKind: "leader",
        decisionActorId: "leader",
        decisionReason: "Biên bản tổng hợp",
      }).rows[0]!.id,
    ).toBe("c");
  });
  it("tug/push uses set difference, warning count and then actual recorded draw", () => {
    const games = cycle.map((g, i) => ({
      ...g,
      leftWarnings: i === 0 ? 1 : 0,
    }));
    const result = rankRoundRobin(entrants, games, { sport: "tug_or_push" });
    expect(
      result.rows.some((r) => r.criteria.includes("Ít cảnh cáo hơn")),
    ).toBe(true);
    expect(result.status).toBe("unresolved");
  });
  it("racket rule remains blocked without reconciled criteria and rejects duplicates/invalid weights", () => {
    expect(() =>
      rankRoundRobin(entrants, cycle, { sport: "racket" }),
    ).toThrow();
    expect(() =>
      rankRoundRobin(entrants, [...cycle, cycle[0]!], { sport: "football" }),
    ).toThrow();
    expect(() =>
      rankRoundRobin(
        entrants.map((e) => ({ ...e, officialWeightKg: "0" })),
        cycle,
        { sport: "vovinam" },
      ),
    ).toThrow();
  });
  it("fair-play exact categories are 1/3/3/4 and rejects unsafe inputs", () => {
    expect(
      fairPlay({
        yellowOnly: 1,
        secondYellowRed: 1,
        directRed: 1,
        yellowDirectRed: 1,
      }),
    ).toBe(11);
    expect(() =>
      fairPlay({
        yellowOnly: 0,
        secondYellowRed: 0,
        directRed: 0,
        yellowDirectRed: Number.MAX_SAFE_INTEGER,
      }),
    ).toThrow();
    expect(() =>
      fairPlay({
        yellowOnly: -1,
        secondYellowRed: 0,
        directRed: 0,
        yellowDirectRed: 0,
      }),
    ).toThrow();
  });
});
describe("K02/K05 real versus valid participation and medals", () => {
  it.each([3, 4])(
    "%i actual awards only gold/silver with 11/9/7/6",
    (count) => {
      const roster = Array.from({ length: count }, (_, i) =>
          party(String(i), i),
        ),
        result = awardEvent(
          roster,
          roster.map((p) => p.id),
          {
            kind: "individual",
            registered: 20,
            approved: 10,
            bronzeMatchCancelled: false,
          },
        );
      expect(result.awards.map((a) => a.medal).filter(Boolean)).toEqual([
        "gold",
        "silver",
      ]);
      expect(result.awards.slice(0, 4).map((a) => a.points)).toEqual(
        [11, 9, 7, 6].slice(0, count),
      );
    },
  );
  it("five actual / three valid still awards bronze if enough schools, no count conflation", () => {
    const roster = Array.from({ length: 5 }, (_, i) => ({
      ...party(String(i), i),
      validAchievement: i < 3,
    }));
    const result = awardEvent(
      roster,
      roster.map((p) => p.id),
      {
        kind: "individual",
        registered: 20,
        approved: 10,
        bronzeMatchCancelled: false,
      },
    );
    expect(result.counts).toMatchObject({
      registered: 20,
      approved: 10,
      actual: 5,
      valid: 3,
      medalBasis: 5,
    });
    expect(result.awards.map((a) => a.medal)).toEqual([
      "gold",
      "silver",
      "bronze",
    ]);
  });
  it("bye/walkover without actual match is not actual; too few schools cancels", () => {
    const roster = [
      { ...party("a", 0), playedMatchIds: [] },
      party("b", 1),
      party("c", 0),
    ];
    expect(participationCounts(roster, 10, 5).actual).toBe(2);
    expect(
      awardEvent(
        roster,
        roster.map((p) => p.id),
        {
          kind: "individual",
          registered: 10,
          approved: 5,
          bronzeMatchCancelled: false,
        },
      ).status,
    ).toBe("cancelled");
    const oneSchool = Array.from({ length: 3 }, (_, i) => ({
      ...party(String(i), i),
      schoolId: "only",
    }));
    expect(
      awardEvent(
        oneSchool,
        oneSchool.map((p) => p.id),
        {
          kind: "team",
          registered: 3,
          approved: 3,
          bronzeMatchCancelled: false,
        },
      ).status,
    ).toBe("cancelled");
  });
  it("cancelled bronze and 6+ with missing rules remain unresolved", () => {
    const roster = Array.from({ length: 6 }, (_, i) => party(String(i), i));
    expect(
      awardEvent(
        roster,
        roster.map((p) => p.id),
        {
          kind: "individual",
          registered: 6,
          approved: 6,
          bronzeMatchCancelled: false,
        },
      ).reason,
    ).toBe("LARGE_COUNT_RULE_REQUIRED");
    expect(
      awardEvent(
        roster,
        roster.map((p) => p.id),
        {
          kind: "individual",
          registered: 6,
          approved: 6,
          bronzeMatchCancelled: true,
        },
      ).reason,
    ).toBe("U05_BRONZE_CANCELLED");
  });
  it("rejects mixed event counts and leaves missing valid ranks unresolved", () => {
    const roster = Array.from({ length: 3 }, (_, i) => party(String(i), i));
    expect(() =>
      participationCounts(
        [roster[0]!, { ...roster[1]!, eventId: "other" }],
        3,
        3,
      ),
    ).toThrow();
    expect(
      awardEvent(roster, ["0", "1"], {
        kind: "individual",
        registered: 3,
        approved: 3,
        bronzeMatchCancelled: false,
      }).reason,
    ).toBe("INCOMPLETE_RANKING");
  });
  it("disqualification retains real matches and cannot revive eliminated or downstream-scored knockout", () => {
    const p = party("a", 0),
      ctx = {
        eventId: "event",
        format: "knockout" as const,
        editionLocked: false,
        downstreamHasSavedResult: false,
        previouslyEliminated: false,
        actorId: "leader",
        reason: "Biên bản tổng hợp",
        at: clock().toISOString(),
      };
    const dsq = changeParticipation(p, "disqualified", ctx);
    expect(dsq.playedMatchIds).toEqual(p.playedMatchIds);
    expect(participationCounts([dsq], 1, 1).valid).toBe(0);
    expect(() =>
      changeParticipation(dsq, "active", {
        ...ctx,
        downstreamHasSavedResult: true,
      }),
    ).toThrow();
    expect(() =>
      changeParticipation(dsq, "active", {
        ...ctx,
        previouslyEliminated: true,
      }),
    ).toThrow();
    expect(
      changeParticipation(dsq, "active", { ...ctx, format: "round_robin" })
        .status,
    ).toBe("active");
  });
});
describe("K06 conversion, penalties and blocks", () => {
  const standing = {
    schoolId: "s",
    block: "TH",
    sportId: "football",
    sportKind: "football" as const,
    rank: 2,
  };
  const required = {
    schoolId: "s",
    block: "TH",
    requiredEventIds: ["football-event"],
    actuallyPlayedEventIds: ["football-event"],
    organizerCancelledEventIds: [],
  };
  it("converts sport rank before coefficient, then penalty and clamps at 0", () => {
    const penalty = {
      id: "p",
      schoolId: "s",
      block: "TH",
      sportId: "football",
      points: 33,
      waived: false,
      reason: "Biên bản bỏ nội dung",
      decidedBy: "leader",
    };
    const result = allRoundPoints([standing], [penalty], [required])[0]!;
    expect(result.convertedTotal).toBe(27);
    expect(result.total).toBe(0);
    expect(result.penalties).toHaveLength(1);
  });
  it("waiver preserves penalty record; missing actual mandatory event blocks unless BTC cancelled", () => {
    const missing = { ...required, actuallyPlayedEventIds: [] };
    expect(allRoundPoints([standing], [], [missing])[0]!.eligible).toBe(false);
    expect(
      allRoundPoints(
        [standing],
        [],
        [{ ...missing, organizerCancelledEventIds: ["football-event"] }],
      )[0]!.eligible,
    ).toBe(true);
    expect(() =>
      allRoundPoints([standing], [], [{ ...required, requiredEventIds: [] }]),
    ).toThrow();
  });
  it("counts each actual athlete once in school sport tie criteria, keeps unresolved draw", () => {
    const a = {
        schoolId: "a",
        points: 11,
        gold: 1,
        silver: 0,
        bronze: 0,
        actualAthleteIds: ["same", "same"],
      },
      b = { ...a, schoolId: "b", actualAthleteIds: ["other"] };
    const result = rankSchoolsInSport([a, b]);
    expect(result[0]!.actualAthletes).toBe(1);
    expect(result.every((r) => r.rank === null)).toBe(true);
  });
});
describe("K03/K07/K09/K10 exchange and publication", () => {
  it("chess preserves external rank/code including ties, no game recomputation", () => {
    const rows = previewChessCsv("athlete_code,rank\n01.012,3\n01.013,3", [
      "01.012",
      "01.013",
    ]);
    expect(rows.map((r) => r.rank)).toEqual([3, 3]);
    expect(rows.every((r) => !r.errors.length)).toBe(true);
    expect(
      previewChessCsv("athlete_code,rank\n99.999,1", ["01.012"])[0]!.errors,
    ).toContain("ATHLETE_SCOPE");
  });
  it("source correction invalidates finalized publication idempotently; blocks stale/unfinished finalize", () => {
    const p = {
      id: "p",
      editionId: ids.edition,
      version: 1,
      status: "provisional" as const,
      sourceVersions: { [ids.match]: 1 },
    };
    const finalized = finalizePublication(p, p.sourceVersions, 1, {
      rankingsResolved: true,
      allResultsConfirmed: true,
    });
    const corrected = invalidatePublication(finalized, ids.match, 2);
    expect(corrected.status).toBe("provisional");
    expect(invalidatePublication(corrected, ids.match, 2)).toEqual(corrected);
    expect(invalidatePublication(corrected, ids.match, 1)).toEqual(corrected);
    expect(() => invalidatePublication(corrected, ids.match, 0)).toThrow();
    expect(() =>
      finalizePublication(corrected, { [ids.match]: 1 }, corrected.version, {
        rankingsResolved: true,
        allResultsConfirmed: true,
      }),
    ).toThrow();
    expect(() =>
      finalizePublication(p, p.sourceVersions, 1, {
        rankingsResolved: false,
        allResultsConfirmed: true,
      }),
    ).toThrow();
  });
  it("public exposes only finalized current official whitelist, never pending/private fields", () => {
    const submitted = submitPreview(match(), score(), ids.ref, clock(), "s");
    const confirmed = confirmPreview(
      submitted,
      { submission_id: "s", submission_version: 1, base_official_version: 0 },
      ids.leader,
      clock(),
      "o",
    );
    const labels = Object.fromEntries(
      [ids.athleteA, ids.athleteB].map((id) => [
        id,
        {
          eventLabel: "Nội dung tổng hợp",
          athleteCode: "01.012",
          displayName: "VĐV tổng hợp",
          schoolLabel: "Trường tổng hợp",
          cccd: "synthetic-private-marker",
        },
      ]),
    );
    const p = {
      id: "p",
      editionId: ids.edition,
      version: 1,
      status: "provisional" as const,
      sourceVersions: { [ids.match]: 1 },
    };
    expect(publicResults(p, confirmed.official!, labels)).toEqual([]);
    const published = publicResults(
      { ...p, status: "finalized" },
      confirmed.official!,
      labels,
    );
    expect(JSON.stringify(published)).not.toContain("synthetic-private-marker");
    expect(published).toHaveLength(2);
  });
  it("CSV prevents formula injection and retains correction time/note; notifications contain no scores", () => {
    const csv = exportResultCsv([
      {
        name: '=HYPERLINK("x")',
        value: "2–1",
        correctedAt: clock().toISOString(),
        reason: "Biên bản tổng hợp",
      },
    ]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("2026-10-11");
    const a = notificationIntent(
      {
        editionId: ids.edition,
        matchId: ids.match,
        eventId: ids.event,
        sportId: ids.sport,
      },
      1,
    );
    expect(a.text).toBe("Có cập nhật kết quả cần xem.");
    expect(notificationIntent(a.link, 1).deduplicationKey).toBe(
      a.deduplicationKey,
    );
  });
});
