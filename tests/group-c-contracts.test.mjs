import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import {
  automaticKnockout,
  roundRobin,
  projectMatches,
} from "../packages/competition/src/index.ts";
import { contractValidators } from "../scripts/contracts-schema.mjs";
const validators = contractValidators(
  JSON.parse(readFileSync("docs/api/core.openapi.json", "utf8")),
);
function input(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: randomUUID(),
    label: `VĐV giả ${i + 1}`,
    schoolId: `school-${i % 4}`,
    personIds: [randomUUID()],
  }));
}
function context(draw, kind = "athlete") {
  return {
    editionId: randomUUID(),
    matchIds: new Map(
      draw.rounds.flatMap((r) => r.matches).map((m) => [m.id, randomUUID()]),
    ),
    participants: new Map(
      draw.entrants.map((e) => [
        e.id,
        kind === "team" ? { kind, team_id: e.id } : { kind, athlete_id: e.id },
      ]),
    ),
  };
}
it.each(["knockout", "round_robin"])(
  "C10 projects %s to A03 Match without inventing official results",
  (kind) => {
    const entrants = input(kind === "knockout" ? 6 : 5);
    const eventId = randomUUID();
    const draw =
      kind === "knockout"
        ? automaticKnockout(eventId, entrants)
        : roundRobin(eventId, entrants);
    const mapping = context(draw);
    const matches = projectMatches(draw, mapping);
    for (const match of matches) {
      expect(validators.Match(match)).toBe(true);
      expect(match.official_result_id).toBeNull();
      expect(match.started_at).toBeNull();
      for (const slot of match.slots)
        if (slot.kind === "pending")
          expect(matches.some((m) => m.id === slot.source_match_id)).toBe(true);
    }
  },
);
it("projects teams and rejects absent/duplicate UUID mapping", () => {
  const draw = roundRobin(randomUUID(), input(3));
  const mapping = context(draw, "team");
  expect(projectMatches(draw, mapping).every((m) => validators.Match(m))).toBe(
    true,
  );
  const match = draw.rounds[0].matches[0];
  mapping.matchIds.delete(match.id);
  expect(() => projectMatches(draw, mapping)).toThrow("UUID");
  const invalid = context(draw);
  invalid.participants.clear();
  expect(() => projectMatches(draw, invalid)).toThrow("ánh xạ");
  const duplicate = context(draw);
  const id = randomUUID();
  for (const matchId of duplicate.matchIds.keys())
    duplicate.matchIds.set(matchId, id);
  expect(() => projectMatches(draw, duplicate)).toThrow("trùng");
});
