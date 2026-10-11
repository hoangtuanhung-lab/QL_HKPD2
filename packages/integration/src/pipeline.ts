import type { components } from "@hkpd/contracts";
import {
  approvedEntries,
  resolveEvent,
  type Registry,
} from "@hkpd/registration";
import {
  createDraw,
  projectMatches,
  confirmDraw,
  type CompetitionSnapshot,
  type EventKind,
  type DrawOptions,
} from "@hkpd/competition";
import {
  ensure,
  freeze,
  participantKey,
  validatePayload,
  winnerFromOfficial,
  type ResultMatch,
  type ResultRule,
} from "@hkpd/results";
type Participant = components["schemas"]["Participant"];
export interface EventBundle {
  competition: CompetitionSnapshot;
  catalogSnapshotId: string;
  rule: ResultRule;
  matchIds: Readonly<Record<string, string>>;
  participants: Readonly<Record<string, Participant>>;
}
/** Trusted registry and vetted result rule, no client-supplied approved roster. Allocate IDs once per draw revision. */
export function prepareEvent(
  registry: Registry,
  eventId: string,
  kind: EventKind,
  rule: ResultRule,
  newId: () => string,
  options: DrawOptions = {},
): EventBundle {
  const event = resolveEvent(registry.catalog, eventId);
  ensure(
    event.active &&
      (event.node.participantKind === "team") === (kind === "team"),
    "EVENT_KIND",
    "Nội dung ngừng hoặc loại thi đấu không khớp danh mục.",
  );
  const entries = approvedEntries(registry, eventId);
  const draw = createDraw(eventId, entries, kind, options);
  const participants = Object.fromEntries(
    entries.map((e) => [
      e.id,
      event.node.participantKind === "team"
        ? { kind: "team" as const, team_id: e.id }
        : { kind: "athlete" as const, athlete_id: e.id },
    ]),
  );
  const matchIds = Object.fromEntries(
    draw.rounds.flatMap((r) => r.matches).map((m) => [m.id, newId()]),
  );
  projectMatches(draw, {
    editionId: registry.editionId,
    matchIds: new Map(Object.entries(matchIds)),
    participants: new Map(Object.entries(participants)),
  });
  return freeze({
    catalogSnapshotId: registry.catalog.id,
    rule: structuredClone(rule),
    matchIds,
    participants,
    competition: {
      editionId: registry.editionId,
      eventId,
      sportId: event.sportId,
      kind,
      version: 1,
      status: "draft",
      startedAt: null,
      entrants: entries,
      draw,
      withdrawnIds: [],
      approvedRoster: entries.map((e) => ({
        entrantId: e.id,
        revisionId: e.approvedRevisionId,
      })),
    },
  });
}
export function assertRosterCurrent(bundle: EventBundle, registry: Registry) {
  const c = bundle.competition;
  ensure(
    registry.editionId === c.editionId &&
      registry.catalog.id === bundle.catalogSnapshotId,
    "ROSTER_STALE",
    "Danh mục/kỳ giải đã thay đổi.",
  );
  const approved = approvedEntries(registry, c.eventId);
  ensure(
    approved.length === c.entrants.length &&
      approved.every(
        (e) =>
          c.approvedRoster?.some(
            (r) =>
              r.entrantId === e.id && r.revisionId === e.approvedRevisionId,
          ) &&
          c.entrants.some(
            (old) =>
              old.id === e.id &&
              old.schoolId === e.schoolId &&
              old.personIds.length === e.personIds.length &&
              e.personIds.every((id) => old.personIds.includes(id)),
          ),
      ),
    "ROSTER_STALE",
    "Roster duyệt hoặc thành viên đã thay đổi; cần tạo/kiểm lại bản nháp.",
  );
}
export function confirmEvent(
  bundle: EventBundle,
  registry: Registry,
  expectedVersion: number,
): EventBundle {
  assertRosterCurrent(bundle, registry);
  return freeze({
    ...structuredClone(bundle),
    competition: confirmDraw(bundle.competition, expectedVersion),
  });
}
/** Adapter R must derive this from locked C/K rows in the same transaction. Missing C draw still allows registration. */
export function registrationLifecycle(
  editionId: string,
  eventId: string,
  bundle: EventBundle | null,
  records: readonly ResultMatch[],
) {
  ensure(
    !bundle ||
      (bundle.competition.editionId === editionId &&
        bundle.competition.eventId === eventId),
    "FORBIDDEN",
    "Sai phạm vi trạng thái đăng ký.",
  );
  ensure(
    records.every((m) => m.editionId === editionId && m.eventId === eventId),
    "FORBIDDEN",
    "Sai phạm vi kết quả.",
  );
  return {
    editionId,
    eventId,
    locked: !!bundle && bundle.competition.status !== "draft",
    startedAt: bundle?.competition.startedAt ?? null,
    hasSavedResults: records.some(
      (m) => m.submissions.length > 0 || m.official !== null,
    ),
  };
}
export interface ReadyMatch {
  logicalId: string;
  matchId: string;
  status: "ready" | "pending" | "confirmed" | "bye" | "blocked" | "stale";
  participants: readonly Participant[];
  participantSchoolIds: readonly string[];
  prerequisiteOfficialVersions: Readonly<Record<string, number>>;
  reason: string | null;
}
const sameVersions = (
  a: Readonly<Record<string, number>>,
  b: Readonly<Record<string, number>>,
) =>
  JSON.stringify(Object.entries(a).sort()) ===
  JSON.stringify(Object.entries(b).sort());
/** Resolve fixed C slots from CURRENT confirmed K results. Byes advance structurally, never create scores or actual participation. */
export function projectEvent(
  bundle: EventBundle,
  records: readonly ResultMatch[],
): readonly ReadyMatch[] {
  const c = bundle.competition;
  ensure(
    c.draw && c.draw.eventId === c.eventId,
    "DRAW_MISSING",
    "Thiếu sơ đồ đúng nội dung.",
  );
  const matches = c.draw.rounds.flatMap((r) => r.matches);
  ensure(
    new Set(matches.map((m) => m.id)).size === matches.length &&
      new Set(records.map((r) => r.id)).size === records.length,
    "MATCH_DUPLICATE",
    "Trùng mã trận.",
  );
  const ids = matches.map((m) => bundle.matchIds[m.id]);
  ensure(
    ids.every(Boolean) && new Set(ids).size === matches.length,
    "MATCH_MAPPING",
    "Ánh xạ trận bị thiếu/trùng.",
  );
  ensure(
    records.every(
      (m) =>
        ids.includes(m.id) &&
        m.editionId === c.editionId &&
        m.eventId === c.eventId &&
        m.sportId === c.sportId,
    ),
    "FORBIDDEN",
    "Kết quả ngoài phạm vi sơ đồ.",
  );
  const memo = new Map<string, ReadyMatch>(),
    visiting = new Set<string>();
  const walk = (logicalId: string): ReadyMatch => {
    const cached = memo.get(logicalId);
    if (cached) return cached;
    ensure(!visiting.has(logicalId), "DRAW_CYCLE", "Sơ đồ có vòng phụ thuộc.");
    visiting.add(logicalId);
    const drawMatch = matches.find((m) => m.id === logicalId);
    ensure(drawMatch, "SOURCE_MISSING", "Thiếu trận nguồn.");
    let blocked: string | null = null;
    const participants: Participant[] = [],
      versions: Record<string, number> = {};
    for (const slot of drawMatch.slots) {
      if (slot.kind === "ghost") {
        ensure(
          drawMatch.round === 1,
          "INVALID_BYE",
          "Ảo chỉ được có ở vòng đầu.",
        );
        continue;
      }
      if (slot.kind === "participant") {
        const p = bundle.participants[slot.entrantId];
        ensure(p, "PARTICIPANT_MAPPING", "Thiếu định danh đối tượng.");
        participants.push(p);
        continue;
      }
      const sourceMatch = matches.find((m) => m.id === slot.matchId);
      ensure(
        sourceMatch && sourceMatch.round < drawMatch.round,
        "DRAW_CYCLE",
        "Trận nguồn không thuộc vòng trước.",
      );
      const source = walk(slot.matchId);
      if (source.status === "bye") {
        participants.push(source.participants[0]!);
        Object.assign(versions, source.prerequisiteOfficialVersions);
        continue;
      }
      if (source.status !== "confirmed") {
        blocked =
          source.status === "stale" ? "SOURCE_STALE" : "SOURCE_UNCONFIRMED";
        continue;
      }
      const record = records.find((m) => m.id === source.matchId)!;
      const winner = winnerFromOfficial(record);
      const p = source.participants.find((p) => participantKey(p) === winner);
      if (!p) {
        blocked = "WINNER_UNRESOLVED";
        continue;
      }
      participants.push(p);
      Object.assign(versions, source.prerequisiteOfficialVersions, {
        [record.id]: record.official!.version,
      });
    }
    const schools = participants.map((p) => {
      const key = p.kind === "athlete" ? p.athlete_id : p.team_id;
      const entrant = c.entrants.find((e) => e.id === key);
      ensure(entrant, "PARTICIPANT_MAPPING", "Đối tượng không thuộc roster.");
      return entrant.schoolId;
    });
    let status: ReadyMatch["status"] = blocked
      ? "blocked"
      : participants.length === 1
        ? "bye"
        : "ready";
    ensure(
      blocked || (participants.length >= 1 && participants.length <= 2),
      "INVALID_BYE",
      "Trận không có đối tượng hoặc quá hai phía.",
    );
    const record = records.find((m) => m.id === bundle.matchIds[logicalId]);
    if (record) {
      const expected = participants.map(participantKey);
      const current =
        !blocked &&
        status !== "bye" &&
        sameVersions(record.prerequisiteOfficialVersions, versions) &&
        record.rule.snapshotId === bundle.rule.snapshotId &&
        record.rule.kind === bundle.rule.kind &&
        record.rule.precision === bundle.rule.precision &&
        record.rule.maxSets === bundle.rule.maxSets &&
        record.participantSchoolIds.length === new Set(schools).size &&
        schools.every((id) => record.participantSchoolIds.includes(id)) &&
        record.participantKeys.length === expected.length &&
        expected.every((k) => record.participantKeys.includes(k)) &&
        new Set(record.participantKeys).size === expected.length;
      if (!current) {
        status = "stale";
        blocked = "SOURCE_STALE";
      } else if (record.official) {
        ensure(
          record.official.edition_id === c.editionId &&
            record.official.match_id === record.id,
          "FORBIDDEN",
          "Official không đúng giải/trận.",
        );
        validatePayload(record.official.payload, record);
        status = "confirmed";
      } else if (
        record.submissions.some((s) => s.status === "pending_confirmation")
      )
        status = "pending";
    }
    const row: ReadyMatch = {
      logicalId,
      matchId: bundle.matchIds[logicalId]!,
      status,
      participants,
      participantSchoolIds: [...new Set(schools)],
      prerequisiteOfficialVersions: versions,
      reason: blocked,
    };
    visiting.delete(logicalId);
    memo.set(logicalId, row);
    return row;
  };
  return freeze(matches.map((m) => walk(m.id)));
}
export function resultMatchFromDraw(
  bundle: EventBundle,
  logicalId: string,
  records: readonly ResultMatch[],
): ResultMatch {
  const c = bundle.competition;
  ensure(
    c.status === "draw_confirmed" || c.status === "in_progress",
    "DRAW_UNCONFIRMED",
    "Chốt sơ đồ trước nhập kết quả.",
  );
  const row = projectEvent(bundle, records).find(
    (m) => m.logicalId === logicalId,
  );
  ensure(
    row?.status === "ready" && !records.some((m) => m.id === row.matchId),
    "SOURCE_UNCONFIRMED",
    "Trận chưa đủ nguồn hoặc đã có dữ liệu; không ghi đè lịch sử.",
  );
  return freeze({
    id: row.matchId,
    editionId: c.editionId,
    eventId: c.eventId,
    sportId: c.sportId,
    version: 1,
    locked: false,
    participantSchoolIds: row.participantSchoolIds,
    participantKeys: row.participants.map(participantKey),
    prerequisiteOfficialVersions: row.prerequisiteOfficialVersions,
    rule: structuredClone(bundle.rule),
    lease: null,
    submissions: [],
    official: null,
    officialHistory: [],
  });
}
export function publicationReadiness(
  bundle: EventBundle,
  records: readonly ResultMatch[],
) {
  const rows = projectEvent(bundle, records);
  const current = rows.filter((r) => r.status === "confirmed");
  return {
    allResultsConfirmed:
      (bundle.competition.status === "draw_confirmed" ||
        bundle.competition.status === "in_progress") &&
      rows.every((r) => r.status === "confirmed" || r.status === "bye"),
    sourceVersions: Object.fromEntries(
      current.map((r) => [
        r.matchId,
        records.find((m) => m.id === r.matchId)!.official!.version,
      ]),
    ),
    staleMatchIds: rows
      .filter((r) => r.status === "stale" || r.status === "blocked")
      .map((r) => r.matchId),
  };
}
/** A03 projection retains fixed source UUIDs; stale official results never appear as current. */
export function projectEventMatches(
  bundle: EventBundle,
  records: readonly ResultMatch[],
): readonly components["schemas"]["Match"][] {
  const rows = projectEvent(bundle, records),
    c = bundle.competition;
  return freeze(
    c
      .draw!.rounds.flatMap((r) => r.matches)
      .map((m) => {
        const row = rows.find((r) => r.logicalId === m.id)!;
        const record = records.find((r) => r.id === row.matchId);
        return {
          id: row.matchId,
          edition_id: c.editionId,
          event_id: c.eventId,
          version: record?.version ?? 1,
          slots: m.slots.map((slot) => {
            if (slot.kind === "ghost") return { kind: "ghost" as const };
            if (slot.kind === "participant")
              return {
                kind: "participant" as const,
                participant: structuredClone(
                  bundle.participants[slot.entrantId]!,
                ),
              };
            const source = rows.find((r) => r.logicalId === slot.matchId)!;
            const sourceRecord = records.find((r) => r.id === source.matchId);
            const winner =
              source.status === "confirmed"
                ? winnerFromOfficial(sourceRecord!)
                : null;
            const p =
              source.status === "bye"
                ? source.participants[0]
                : source.participants.find((p) => participantKey(p) === winner);
            return p
              ? {
                  kind: "participant" as const,
                  participant: structuredClone(p),
                }
              : { kind: "pending" as const, source_match_id: source.matchId };
          }),
          scheduled_at: null,
          started_at: null,
          official_result_id:
            row.status === "confirmed" ? record!.official!.id : null,
        };
      }),
  );
}
/** Conservative unresolved KO occupancy uses global STUDENT IDs, including every team member. */
export function schedulePeopleForMatch(
  bundle: EventBundle,
  logicalId: string,
  records: readonly ResultMatch[],
): readonly string[] {
  const rows = projectEvent(bundle, records),
    draw = bundle.competition.draw!,
    visiting = new Set<string>();
  const people = (id: string): string[] => {
    ensure(!visiting.has(id), "DRAW_CYCLE", "Vòng phụ thuộc lịch.");
    visiting.add(id);
    const match = draw.rounds
      .flatMap((r) => r.matches)
      .find((m) => m.id === id);
    ensure(match, "SOURCE_MISSING", "Thiếu trận khi lập lịch.");
    const result = match.slots.flatMap((slot) => {
      if (slot.kind === "ghost") return [];
      if (slot.kind === "participant")
        return bundle.competition.entrants.find((e) => e.id === slot.entrantId)!
          .personIds;
      const source = rows.find((r) => r.logicalId === slot.matchId)!;
      if (source.status === "confirmed" || source.status === "bye") {
        const winner =
          source.status === "bye"
            ? participantKey(source.participants[0]!)
            : winnerFromOfficial(records.find((m) => m.id === source.matchId)!);
        const p = source.participants.find((p) => participantKey(p) === winner);
        if (p)
          return bundle.competition.entrants.find(
            (e) => e.id === (p.kind === "athlete" ? p.athlete_id : p.team_id),
          )!.personIds;
      }
      return people(slot.matchId);
    });
    visiting.delete(id);
    return result;
  };
  return freeze([...new Set(people(logicalId))]);
}
