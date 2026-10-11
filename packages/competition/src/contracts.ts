import type { components } from "@hkpd/contracts";
import { ensure, freeze, type Draw } from "./model.js";
type Participant = components["schemas"]["Participant"];
type Match = components["schemas"]["Match"];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Logical round IDs are internal. Adapter allocates NEW UUIDs per draw revision, never overwrites old matches. */
export function projectMatches(
  draw: Draw,
  context: {
    editionId: string;
    matchIds: ReadonlyMap<string, string>;
    participants: ReadonlyMap<string, Participant>;
  },
): readonly Match[] {
  ensure(
    uuid.test(context.editionId) && uuid.test(draw.eventId),
    "Cần UUID kỳ giải và nội dung để xuất hợp đồng A03.",
  );
  const matches = draw.rounds.flatMap((round) => round.matches);
  const ids = matches.map((match) => context.matchIds.get(match.id));
  ensure(
    ids.every((id) => id && uuid.test(id)) &&
      new Set(ids).size === matches.length,
    "Mỗi trận cần UUID riêng, không thiếu hoặc trùng.",
  );
  const participantKeys = draw.entrants.map((e) => {
    const p = context.participants.get(e.id);
    ensure(p, "Thiếu ánh xạ đối tượng thi đấu.");
    return p.kind === "athlete"
      ? `athlete:${p.athlete_id}`
      : `team:${p.team_id}`;
  });
  ensure(
    new Set(participantKeys).size === draw.entrants.length,
    "Hai đối tượng bị ánh xạ chung một VĐV/đội.",
  );
  return freeze(
    matches.map((match) => ({
      id: context.matchIds.get(match.id)!,
      edition_id: context.editionId,
      event_id: draw.eventId,
      version: 1,
      slots: match.slots.map((slot) => {
        if (slot.kind === "ghost") return { kind: "ghost" as const };
        if (slot.kind === "winner") {
          const source_match_id = context.matchIds.get(slot.matchId);
          ensure(source_match_id, "Thiếu UUID trận nguồn.");
          return { kind: "pending" as const, source_match_id };
        }
        const participant = context.participants.get(slot.entrantId);
        ensure(
          participant &&
            ((participant.kind === "athlete" &&
              uuid.test(participant.athlete_id)) ||
              (participant.kind === "team" && uuid.test(participant.team_id))),
          "Thiếu ánh xạ VĐV/đội bằng UUID hợp lệ.",
        );
        return {
          kind: "participant" as const,
          participant: structuredClone(participant),
        };
      }),
      scheduled_at: null,
      started_at: null,
      official_result_id: null,
    })),
  );
}
