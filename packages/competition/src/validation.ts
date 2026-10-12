import { manualKnockout, roundRobin } from "./draw.js";
import { ensure, validateEntrants, type Draw } from "./model.js";
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
/** Rebuild from persisted positions WITHOUT randomizing; enforce the existing supported draw rules. */
export function validateDraw(draw: Draw) {
  validateEntrants(draw.entrants);
  ensure(
    draw.eventId &&
      ["knockout", "round_robin"].includes(draw.format) &&
      Array.isArray(draw.positions) &&
      Array.isArray(draw.rounds) &&
      Array.isArray(draw.seedIds),
    "Cấu trúc sơ đồ không hợp lệ.",
  );
  let expected: Draw;
  if (draw.format === "knockout") {
    expected = manualKnockout(draw.eventId, draw.entrants, draw.positions, {
      seedIds: draw.seedIds,
      avoidSameSchool: draw.schoolException !== null,
      exceptionReason: draw.schoolException?.reason,
    });
  } else {
    const ids = draw.positions.filter((id): id is string => id !== null);
    ensure(
      ids.length === draw.entrants.length &&
        new Set(ids).size === ids.length &&
        ids.every((id) => draw.entrants.some((e) => e.id === id)),
      "Vị trí vòng tròn thiếu, trùng hoặc có đối tượng lạ.",
    );
    expected = roundRobin(
      draw.eventId,
      ids.map((id) => draw.entrants.find((e) => e.id === id)!),
    );
    ensure(
      canonical(draw.positions) === canonical(expected.positions) &&
        draw.seedIds.length === 0 &&
        draw.schoolException === null,
      "Metadata vòng tròn không hợp lệ.",
    );
  }
  ensure(
    canonical(draw.rounds) === canonical(expected.rounds) &&
      canonical(draw.schoolException) === canonical(expected.schoolException),
    "Các vòng/trận hoặc tham chiếu sơ đồ không khớp vị trí đã lưu.",
  );
}
