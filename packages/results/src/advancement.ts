import { ensure, participantKey, scaled, type ResultMatch } from "./model.js";
/** C/K adapter advances fixed winner slots ONLY from the current confirmed payload. */
export function winnerFromOfficial(match: ResultMatch): string | null {
  if (!match.official) return null;
  const entries = match.official.payload.entries;
  const values = entries.map((entry) => {
    const value = entry.value;
    let metric: bigint;
    switch (value.kind) {
      case "time":
        metric = -scaled(value.seconds, match.rule.precision);
        break;
      case "distance":
        metric = scaled(value.metres, match.rule.precision);
        break;
      case "points":
        metric = scaled(value.points, match.rule.precision, true);
        break;
      case "score":
        metric = BigInt(value.scored);
        break;
      case "sets":
        metric = BigInt(value.sets.filter((s) => s.scored > s.conceded).length);
        break;
      case "external_rank":
        metric = -BigInt(value.rank);
        break;
      default:
        ensure(
          false,
          "WINNER_UNRESOLVED",
          "Biểu mẫu này không quyết định người đi tiếp.",
        );
    }
    return { id: participantKey(entry.participant), metric };
  });
  const best = values.reduce<bigint | null>(
    (best, v) => (best === null || v.metric > best ? v.metric : best),
    null,
  );
  const winners = values.filter((v) => v.metric === best);
  return winners.length === 1 ? winners[0]!.id : null;
}
