import {
  createDraw,
  type Entrant,
  type RandomIndex,
  type CompetitionSnapshot,
} from "../packages/competition/src/index.js";
export const roster = (count: number, schools = 4, prefix = "e"): Entrant[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i + 1}`,
    label: `VĐV giả ${i + 1}`,
    schoolId: `school-${i % schools}`,
    personIds: [`person-${prefix}${i + 1}`],
  }));
export function random(seed: number): RandomIndex {
  let state = seed >>> 0;
  return (maximum) => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state % maximum;
  };
}
export function snapshot(
  count: number,
  eventId = "event-a",
): CompetitionSnapshot {
  const entrants = roster(count);
  return {
    eventId,
    editionId: "edition-a",
    sportId: "sport-vovinam",
    kind: "individual_combat",
    version: 1,
    status: "draft",
    startedAt: null,
    entrants,
    draw: createDraw(eventId, entrants, "individual_combat", {
      random: random(123),
    }),
    withdrawnIds: [],
  };
}
