import {
  ensure,
  freeze,
  secureIndex,
  shuffle,
  validateEntrants,
  type Draw,
  type Entrant,
  type RandomIndex,
  type Slot,
} from "./model.js";
export interface DrawOptions {
  seedIds?: readonly string[];
  avoidSameSchool?: boolean;
  /** Only a trusted leader decision adapter may authorize this in production. */
  exceptionReason?: string;
  random?: RandomIndex;
}
export function bracketSize(count: number): number {
  ensure(
    Number.isInteger(count) && count >= 6 && count <= 64,
    "Sơ đồ loại trực tiếp hỗ trợ 6–64 đối tượng thi đấu.",
  );
  return 2 ** Math.ceil(Math.log2(count));
}
export function seedPositions(size: number): readonly number[] {
  return [0, size - 1, size / 2 - 1, size / 2];
}
function seeds(
  entrants: readonly Entrant[],
  options: DrawOptions,
): readonly string[] {
  const ids = options.seedIds ?? [];
  ensure(
    ids.length <= 4 &&
      new Set(ids).size === ids.length &&
      ids.every((id) => entrants.some((entrant) => entrant.id === id)),
    "Hạt giống phải có trong danh sách, không trùng và tối đa 4.",
  );
  return ids;
}
// Integral max-flow assigns one entrant of each school per first-round pair.
// Seed/ghost positions are fixed before flow. This is exact for that placement, not a global impossibility proof.
function assignAvoidingSchool(
  positions: (string | null | undefined)[],
  entrants: readonly Entrant[],
  random: RandomIndex,
): boolean {
  const remaining = shuffle(
    entrants.filter((e) => !positions.includes(e.id)),
    random,
  );
  const schools = [...new Set(remaining.map((e) => e.schoolId))];
  const pairs = shuffle(
    Array.from({ length: positions.length / 2 }, (_, i) => i),
    random,
  );
  const sink = 1 + schools.length + pairs.length;
  const capacity = Array.from({ length: sink + 1 }, () =>
    Array<number>(sink + 1).fill(0),
  );
  for (let s = 0; s < schools.length; s++) {
    capacity[0]![1 + s] = remaining.filter(
      (e) => e.schoolId === schools[s],
    ).length;
    for (let p = 0; p < pairs.length; p++) {
      const offset = pairs[p]! * 2;
      const fixed = positions
        .slice(offset, offset + 2)
        .filter((id): id is string => typeof id === "string");
      if (
        !fixed.some(
          (id) => entrants.find((e) => e.id === id)!.schoolId === schools[s],
        )
      )
        capacity[1 + s]![1 + schools.length + p] = 1;
    }
  }
  for (let p = 0; p < pairs.length; p++) {
    const offset = pairs[p]! * 2;
    capacity[1 + schools.length + p]![sink] = positions
      .slice(offset, offset + 2)
      .filter((id) => id === undefined).length;
  }
  let flow = 0;
  while (true) {
    const parent = Array<number>(sink + 1).fill(-1);
    parent[0] = 0;
    const queue = [0];
    for (let q = 0; q < queue.length && parent[sink] === -1; q++) {
      const node = queue[q]!;
      for (let next = 1; next <= sink; next++)
        if (parent[next] === -1 && capacity[node]![next]! > 0) {
          parent[next] = node;
          queue.push(next);
        }
    }
    if (parent[sink] === -1) break;
    for (let node = sink; node !== 0; node = parent[node]!) {
      capacity[parent[node]!]![node]!--;
      capacity[node]![parent[node]!]!++;
    }
    flow++;
  }
  if (flow !== remaining.length) return false;
  for (let s = 0; s < schools.length; s++) {
    const members = remaining.filter((e) => e.schoolId === schools[s]);
    for (let p = 0; p < pairs.length; p++)
      if (capacity[1 + schools.length + p]![1 + s]! > 0) {
        const offset = pairs[p]! * 2;
        const slot = positions[offset] === undefined ? offset : offset + 1;
        positions[slot] = members.shift()!.id;
      }
  }
  return true;
}
function buildKnockout(
  eventId: string,
  entrants: readonly Entrant[],
  positions: readonly (string | null)[],
  options: DrawOptions,
): Draw {
  ensure(eventId, "Thiếu mã nội dung.");
  const size = bracketSize(entrants.length);
  const seedIds = seeds(entrants, options);
  ensure(positions.length === size, "Số vị trí không đúng kích thước sơ đồ.");
  const populated = positions.filter((id): id is string => id !== null);
  ensure(
    populated.length === entrants.length &&
      new Set(populated).size === entrants.length &&
      populated.every((id) => entrants.some((e) => e.id === id)),
    "Vị trí cần có đủ danh sách, không thiếu, trùng hoặc có mã lạ.",
  );
  seedIds.forEach((id, index) =>
    ensure(
      positions[seedPositions(size)[index]!] === id,
      "Vị trí hạt giống chưa đúng các phần tư/hai nửa quy định.",
    ),
  );
  const byeCount = size - entrants.length;
  seedIds
    .slice(0, Math.min(byeCount, seedIds.length))
    .forEach((id) =>
      ensure(
        positions[positions.indexOf(id) ^ 1] === null,
        "Suất miễn phải ưu tiên hạt giống theo thứ tự 1, 2, 3, 4.",
      ),
    );
  const halfByes = [0, 0];
  const quarterByes = [0, 0, 0, 0];
  for (let index = 0; index < size; index += 2) {
    ensure(
      positions[index] !== null || positions[index + 1] !== null,
      "Không được có trận ảo–ảo.",
    );
    if (positions[index] === null || positions[index + 1] === null) {
      halfByes[index < size / 2 ? 0 : 1]!++;
      quarterByes[Math.floor((index * 4) / size)]!++;
    }
  }
  ensure(
    Math.abs(halfByes[0]! - halfByes[1]!) <= 1,
    "Suất miễn cần phân bố cân đối ở hai nửa sơ đồ.",
  );
  ensure(
    Math.max(...quarterByes) - Math.min(...quarterByes) <= 1,
    "Suất miễn cần phân bố cân đối giữa các phần tư.",
  );
  const rounds: Draw["rounds"][number][] = [];
  const conflictIds: string[] = [];
  for (let round = 1, count = size / 2; count >= 1; round++, count /= 2) {
    const previous = rounds.at(-1);
    const matches = Array.from({ length: count }, (_, index) => {
      const id = `${eventId}:r${round}:m${index + 1}`;
      const slots: [Slot, Slot] = previous
        ? [
            { kind: "winner", matchId: previous.matches[index * 2]!.id },
            { kind: "winner", matchId: previous.matches[index * 2 + 1]!.id },
          ]
        : ([0, 1].map((side) =>
            positions[index * 2 + side] === null
              ? { kind: "ghost" }
              : {
                  kind: "participant",
                  entrantId: positions[index * 2 + side]!,
                },
          ) as [Slot, Slot]);
      if (!previous && slots.every((s) => s.kind === "participant")) {
        const first = entrants.find((e) => e.id === positions[index * 2])!;
        const second = entrants.find((e) => e.id === positions[index * 2 + 1])!;
        if (first.schoolId === second.schoolId) conflictIds.push(id);
      }
      return { id, round, number: index + 1, slots };
    });
    rounds.push({ number: round, matches, restingIds: [] });
  }
  if (options.avoidSameSchool && conflictIds.length)
    ensure(
      options.exceptionReason?.trim(),
      "Có cặp cùng trường; cần quyết định ngoại lệ của tổ trưởng.",
      "INVALID_STATE",
    );
  return freeze(
    structuredClone({
      eventId,
      format: "knockout" as const,
      entrants,
      rounds,
      positions,
      seedIds,
      schoolException:
        options.avoidSameSchool && conflictIds.length
          ? { reason: options.exceptionReason!.trim(), matchIds: conflictIds }
          : null,
    }),
  );
}
export function manualKnockout(
  eventId: string,
  entrants: readonly Entrant[],
  positions: readonly (string | null)[],
  options: DrawOptions = {},
): Draw {
  validateEntrants(entrants, 6);
  return buildKnockout(eventId, entrants, positions, options);
}
export function automaticKnockout(
  eventId: string,
  entrants: readonly Entrant[],
  options: DrawOptions = {},
): Draw {
  validateEntrants(entrants, 6);
  const size = bracketSize(entrants.length);
  const seedIds = seeds(entrants, options);
  const random = options.random ?? secureIndex;
  const positions: (string | null | undefined)[] = Array.from(
    { length: size },
    () => undefined,
  );
  seedIds.forEach((id, index) => {
    positions[seedPositions(size)[index]!] = id;
  });
  let remainingByes = size - entrants.length;
  const byePairs = new Set<number>();
  for (const id of seedIds)
    if (remainingByes > 0) {
      const slot = positions.indexOf(id);
      positions[slot ^ 1] = null;
      byePairs.add(Math.floor(slot / 2));
      remainingByes--;
    }
  while (remainingByes > 0) {
    const pairs = shuffle(
      Array.from({ length: size / 2 }, (_, i) => i).filter(
        (i) =>
          !byePairs.has(i) &&
          positions[i * 2] === undefined &&
          positions[i * 2 + 1] === undefined,
      ),
      random,
    );
    const halfCount = (pair: number) =>
      [...byePairs].filter(
        (i) => Math.floor((i * 4) / size) === Math.floor((pair * 4) / size),
      ).length;
    const quarterCount = (pair: number) =>
      [...byePairs].filter(
        (i) => Math.floor((i * 8) / size) === Math.floor((pair * 8) / size),
      ).length;
    pairs.sort(
      (a, b) =>
        halfCount(a) - halfCount(b) || quarterCount(a) - quarterCount(b),
    );
    const pair = pairs[0]!;
    positions[pair * 2 + 1] = null;
    byePairs.add(pair);
    remainingByes--;
  }
  if (
    !options.avoidSameSchool ||
    !assignAvoidingSchool(positions, entrants, random)
  ) {
    const pool = shuffle(
      entrants.filter((e) => !positions.includes(e.id)),
      random,
    );
    for (let i = 0; i < size; i++)
      if (positions[i] === undefined) positions[i] = pool.shift()!.id;
  }
  return buildKnockout(
    eventId,
    entrants,
    positions as (string | null)[],
    options,
  );
}
/** Circle method: with four entries, first round is 1–2, 3–4. Rest is metadata, never a scored match. */
export function roundRobin(
  eventId: string,
  entrants: readonly Entrant[],
  random?: RandomIndex,
): Draw {
  validateEntrants(entrants);
  ensure(eventId, "Thiếu mã nội dung.");
  const ordered = random ? shuffle(entrants, random) : [...entrants];
  const initial: (string | null)[] = ordered.map((e) => e.id);
  if (initial.length % 2) initial.push(null);
  // Place initial consecutive pairs opposite each other across the circle.
  let rotation = [
    ...initial.filter((_, i) => i % 2 === 0),
    ...initial.filter((_, i) => i % 2 === 1).reverse(),
  ];
  const rounds: Draw["rounds"][number][] = [];
  for (let round = 1; round < rotation.length; round++) {
    const matches: Draw["rounds"][number]["matches"][number][] = [];
    const restingIds: string[] = [];
    for (let i = 0; i < rotation.length / 2; i++) {
      const left = rotation[i]!;
      const right = rotation[rotation.length - 1 - i]!;
      if (left === null || right === null) {
        restingIds.push((left ?? right)!);
        continue;
      }
      const number = matches.length + 1;
      matches.push({
        id: `${eventId}:r${round}:m${number}`,
        round,
        number,
        slots: [
          { kind: "participant", entrantId: left },
          { kind: "participant", entrantId: right },
        ],
      });
    }
    rounds.push({ number: round, matches, restingIds });
    rotation = [rotation[0]!, ...rotation.slice(2), rotation[1]!];
  }
  return freeze(
    structuredClone({
      eventId,
      format: "round_robin" as const,
      entrants,
      rounds,
      seedIds: [],
      positions: initial,
      schoolException: null,
    }),
  );
}
