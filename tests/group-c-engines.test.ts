import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  automaticKnockout,
  manualKnockout,
  roundRobin,
  bracketSize,
  createDraw,
  confirmDraw,
  replaceDraftDraw,
  withdraw,
  type Draw,
} from "../packages/competition/src/index.js";
import { roster, random, snapshot } from "./group-c-fixtures.js";
function assertKnockout(draw: Draw, count: number, seedCount: number) {
  const size = 2 ** Math.ceil(Math.log2(count));
  const first = draw.rounds[0]!.matches;
  expect(draw.positions).toHaveLength(size);
  expect(draw.positions.filter(Boolean)).toHaveLength(count);
  expect(new Set(draw.positions.filter(Boolean)).size).toBe(count);
  expect(draw.rounds.flatMap((round) => round.matches)).toHaveLength(size - 1);
  expect(
    first.filter((match) => match.slots.some((s) => s.kind === "ghost")),
  ).toHaveLength(size - count);
  expect(
    first.every((match) => match.slots.some((s) => s.kind === "participant")),
  ).toBe(true);
  const references = new Map(
    draw.rounds.flatMap((r) => r.matches).map((m) => [m.id, 0]),
  );
  for (let r = 1; r < draw.rounds.length; r++) {
    expect(draw.rounds[r]!.matches).toHaveLength(
      draw.rounds[r - 1]!.matches.length / 2,
    );
    for (const match of draw.rounds[r]!.matches)
      for (const slot of match.slots) {
        expect(slot.kind).toBe("winner");
        if (slot.kind === "winner") {
          const predecessor = draw.rounds[r - 1]!.matches.find(
            (m) => m.id === slot.matchId,
          );
          expect(predecessor).toBeDefined();
          references.set(slot.matchId, references.get(slot.matchId)! + 1);
        }
      }
  }
  for (const match of draw.rounds.slice(0, -1).flatMap((r) => r.matches))
    expect(references.get(match.id)).toBe(1);
  for (const seedId of draw.seedIds.slice(0, Math.min(seedCount, size - count)))
    expect(draw.positions[draw.positions.indexOf(seedId) ^ 1]).toBeNull();
  if (seedCount >= 2)
    expect(
      Math.floor(draw.positions.indexOf(draw.seedIds[0]!) / (size / 2)),
    ).not.toBe(
      Math.floor(draw.positions.indexOf(draw.seedIds[1]!) / (size / 2)),
    );
  if (seedCount > 2)
    expect(
      new Set(
        draw.seedIds.map((id) =>
          Math.floor(draw.positions.indexOf(id) / (size / 4)),
        ),
      ).size,
    ).toBe(seedCount);
  for (const match of first)
    if (match.slots.every((s) => s.kind === "participant")) {
      const ids = match.slots.map((s) =>
        s.kind === "participant" ? s.entrantId : "",
      );
      expect(draw.entrants.find((e) => e.id === ids[0])!.schoolId).not.toBe(
        draw.entrants.find((e) => e.id === ids[1])!.schoolId,
      );
    }
}
describe("C01/C02/C09 knockout invariants", () => {
  it.each(Array.from({ length: 59 }, (_, i) => i + 6))(
    "preserves bracket/seed/ghost invariants at N=%i across multiple random draws",
    (count) => {
      for (let seedCount = 0; seedCount <= 4; seedCount++)
        for (const value of [1, 42, 987654]) {
          const entrants = roster(count);
          const draw = automaticKnockout("event-a", entrants, {
            seedIds: entrants.slice(0, seedCount).map((e) => e.id),
            avoidSameSchool: true,
            random: random(value),
          });
          assertKnockout(draw, count, seedCount);
        }
    },
  );
  it("keeps the 14 entrants / 4 seeds / 2 byes regression", () => {
    const fixture = JSON.parse(
      readFileSync("packages/test-fixtures/c09/regressions.json", "utf8"),
    ).knockout;
    const entrants = roster(fixture.count, fixture.schoolCount);
    const draw = automaticKnockout("event-a", entrants, {
      seedIds: fixture.seedIds,
      random: random(fixture.randomFixtureSeed),
    });
    expect(
      fixture.expectedFirstRoundByeSeedIds.every(
        (id: string) => draw.positions[draw.positions.indexOf(id) ^ 1] === null,
      ),
    ).toBe(true);
    expect(draw.positions[1]).toBeNull();
    expect(draw.positions[14]).toBeNull();
    expect(draw.positions[6]).not.toBeNull();
    expect(draw.positions[9]).not.toBeNull();
  });
  it("requires a recorded exception when same-school pairing cannot be avoided", () => {
    const entrants = roster(8, 1);
    expect(() =>
      automaticKnockout("event-a", entrants, { avoidSameSchool: true }),
    ).toThrow("ngoại lệ");
    const draw = automaticKnockout("event-a", entrants, {
      avoidSameSchool: true,
      exceptionReason: "Quyết định thử có lý do",
      random: random(1),
    });
    expect(draw.schoolException?.matchIds).toHaveLength(4);
  });
  it("validates a manual draw instead of silently fixing actual positions", () => {
    const entrants = roster(14);
    const options = { seedIds: ["e1", "e2", "e3", "e4"], random: random(9) };
    const draw = automaticKnockout("event-a", entrants, options);
    expect(
      manualKnockout("event-a", entrants, draw.positions, options),
    ).toEqual(draw);
    const duplicate = [...draw.positions];
    duplicate[2] = duplicate[3]!;
    expect(() =>
      manualKnockout("event-a", entrants, duplicate, options),
    ).toThrow();
    const wrongSeed = [...draw.positions];
    [wrongSeed[0], wrongSeed[2]] = [wrongSeed[2]!, wrongSeed[0]!];
    expect(() =>
      manualKnockout("event-a", entrants, wrongSeed, options),
    ).toThrow("hạt giống");
    const wrongBye = [...draw.positions];
    [wrongBye[1], wrongBye[2]] = [wrongBye[2]!, wrongBye[1]!];
    expect(() =>
      manualKnockout("event-a", entrants, wrongBye, options),
    ).toThrow("ưu tiên");
  });
  it("rejects missing IDs, duplicate entrants, ghost–ghost and more than four seeds", () => {
    expect(() => automaticKnockout("event-a", roster(5))).toThrow();
    expect(() => automaticKnockout("", roster(6))).toThrow();
    expect(() =>
      automaticKnockout("event-a", [...roster(6), roster(1)[0]!]),
    ).toThrow();
    expect(() =>
      automaticKnockout("event-a", roster(8), {
        seedIds: roster(5).map((e) => e.id),
      }),
    ).toThrow();
    expect(() =>
      manualKnockout("event-a", roster(6), [
        null,
        null,
        "e1",
        "e2",
        "e3",
        "e4",
        "e5",
        "e6",
      ]),
    ).toThrow("ảo–ảo");
    expect(() => bracketSize(65)).toThrow();
  });
  it("reproduces deterministic fixtures while separating entrant ID from display names", () => {
    const entrants = roster(8).map((e) => ({ ...e, label: "Tên trùng" }));
    const first = automaticKnockout("event-a", entrants, {
      random: random(77),
    });
    expect(first).toEqual(
      automaticKnockout("event-a", entrants, { random: random(77) }),
    );
    expect(new Set(first.positions).size).toBe(8);
    expect(Object.isFrozen(first.rounds[0]!.matches[0]!.slots)).toBe(true);
  });
});
describe("C03/C09 round-robin invariants", () => {
  it.each(Array.from({ length: 62 }, (_, i) => i + 3))(
    "contains each pair exactly once at N=%i",
    (count) => {
      const draw = roundRobin("event-a", roster(count));
      const pairs = new Set<string>();
      const rests = new Map<string, number>();
      expect(draw.rounds).toHaveLength(count % 2 ? count : count - 1);
      for (const round of draw.rounds) {
        expect(round.matches).toHaveLength(Math.floor(count / 2));
        const used = new Set<string>();
        for (const match of round.matches) {
          expect(match.slots.every((slot) => slot.kind === "participant")).toBe(
            true,
          );
          const ids = match.slots.map((s) =>
            s.kind === "participant" ? s.entrantId : "",
          );
          for (const id of ids) {
            expect(used.has(id)).toBe(false);
            used.add(id);
          }
          const key = ids.sort().join("/");
          expect(pairs.has(key)).toBe(false);
          pairs.add(key);
        }
        for (const id of round.restingIds) {
          expect(used.has(id)).toBe(false);
          rests.set(id, (rests.get(id) ?? 0) + 1);
        }
      }
      expect(pairs.size).toBe((count * (count - 1)) / 2);
      expect(rests.size).toBe(count % 2 ? count : 0);
      if (count % 2) for (const times of rests.values()) expect(times).toBe(1);
    },
  );
  it("matches the four-entrant round order in the source", () => {
    const pairs = roundRobin("event-a", roster(4)).rounds.map((r) =>
      r.matches.map((m) =>
        m.slots
          .map((s) => (s.kind === "participant" ? s.entrantId : ""))
          .sort()
          .join("-"),
      ),
    );
    expect(pairs).toEqual([
      ["e1-e2", "e3-e4"],
      ["e1-e3", "e2-e4"],
      ["e1-e4", "e2-e3"],
    ]);
  });
});
describe("draw lifecycle and eligibility", () => {
  it("selects 3–5 combat round robin, 6+ knockout, team round robin", () => {
    expect(createDraw("e", roster(5), "individual_combat").format).toBe(
      "round_robin",
    );
    expect(createDraw("e", roster(6), "individual_combat").format).toBe(
      "knockout",
    );
    expect(createDraw("e", roster(6), "team").format).toBe("round_robin");
    expect(() => createDraw("e", roster(5, 1), "individual_combat")).toThrow(
      "trường",
    );
    expect(() => createDraw("e", roster(5, 2), "team")).toThrow("trường");
  });
  it("locks draw immediately after confirmation and keeps branches on withdrawal", () => {
    const draft = snapshot(6);
    const confirmed = confirmDraw(draft, 1);
    const changed = withdraw(confirmed, 2, "e1");
    expect(changed.draw).toEqual(confirmed.draw);
    expect(changed.entrants).toEqual(confirmed.entrants);
    expect(changed.withdrawnIds).toEqual(["e1"]);
    expect(() => replaceDraftDraw(confirmed, 2, draft.draw!)).toThrow("chốt");
    expect(() => confirmDraw(draft, 2)).toThrow("Phiên bản");
    expect(() => withdraw(changed, 3, "e1")).toThrow();
  });
});
