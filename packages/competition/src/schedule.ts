import { checkVersion } from "./lifecycle.js";
import { ensure, freeze } from "./model.js";
export interface ScheduleItem {
  id: string;
  eventId: string;
  sportId: string;
  venueId: string;
  start: string;
  end: string;
  /** Global person IDs, including all team members and possible unresolved KO entrants. */
  participantPersonIds: readonly string[];
  refereePersonIds: readonly string[];
  restMinutes: number;
  dependsOnIds: readonly string[];
}
export interface Conflict {
  kind: "venue" | "person" | "rest" | "dependency";
  itemIds: readonly string[];
}
export function instant(value: string): number {
  const parsed = Date.parse(value);
  ensure(
    Number.isFinite(parsed) && new Date(parsed).toISOString() === value,
    "Thời gian cần là ISO UTC hợp lệ, ví dụ 2026-10-23T01:00:00.000Z.",
  );
  return parsed;
}
function people(item: ScheduleItem): readonly string[] {
  return [...item.participantPersonIds, ...item.refereePersonIds];
}
function validate(item: ScheduleItem) {
  ensure(
    item.id &&
      item.eventId &&
      item.sportId &&
      item.venueId &&
      instant(item.end) > instant(item.start),
    "Thông tin hoặc khoảng thời gian lịch chưa hợp lệ.",
  );
  ensure(
    Number.isFinite(item.restMinutes) &&
      item.restMinutes >= 0 &&
      item.restMinutes <= 1440,
    "Thời gian nghỉ cần được cấu hình từ 0 đến 1440 phút.",
  );
  ensure(
    people(item).every(Boolean) &&
      new Set(people(item)).size === people(item).length &&
      item.participantPersonIds.length > 0,
    "Danh sách người thi đấu/trọng tài chưa đầy đủ hoặc bị trùng.",
  );
  ensure(
    new Set(item.dependsOnIds).size === item.dependsOnIds.length &&
      !item.dependsOnIds.includes(item.id),
    "Quan hệ phụ thuộc lịch không hợp lệ.",
  );
}
export function scheduleConflicts(
  items: readonly ScheduleItem[],
): readonly Conflict[] {
  ensure(
    new Set(items.map((item) => item.id)).size === items.length,
    "Mã trận/lượt trong lịch bị trùng.",
  );
  items.forEach(validate);
  const conflicts: Conflict[] = [];
  for (let i = 0; i < items.length; i++) {
    const first = items[i]!;
    const firstStart = instant(first.start);
    const firstEnd = instant(first.end);
    for (const dependencyId of first.dependsOnIds) {
      const dependency = items.find((item) => item.id === dependencyId);
      if (!dependency || instant(dependency.end) > firstStart)
        conflicts.push({
          kind: "dependency",
          itemIds: [first.id, dependencyId],
        });
    }
    for (let j = i + 1; j < items.length; j++) {
      const second = items[j]!;
      const secondStart = instant(second.start);
      const secondEnd = instant(second.end);
      const overlaps = firstStart < secondEnd && secondStart < firstEnd;
      const sharedPeople = people(first).some((id) =>
        people(second).includes(id),
      );
      if (overlaps && first.venueId === second.venueId)
        conflicts.push({ kind: "venue", itemIds: [first.id, second.id] });
      if (overlaps && sharedPeople)
        conflicts.push({ kind: "person", itemIds: [first.id, second.id] });
      const gap =
        firstStart < secondStart
          ? secondStart - firstEnd
          : firstStart - secondEnd;
      if (
        !overlaps &&
        sharedPeople &&
        gap < Math.max(first.restMinutes, second.restMinutes) * 60000
      )
        conflicts.push({ kind: "rest", itemIds: [first.id, second.id] });
    }
  }
  return freeze(conflicts);
}
export interface ScheduleTask extends Omit<
  ScheduleItem,
  "venueId" | "start" | "end"
> {
  durationMinutes: number;
  venueIds: readonly string[];
}
/** Constrained-first greedy proposal (not an exhaustive feasibility solver); caller supplies approved global occupancy and dependency graph. */
export function proposeSchedule(
  tasks: readonly ScheduleTask[],
  existing: readonly ScheduleItem[],
  window: { start: string; end: string },
): readonly ScheduleItem[] {
  const start = instant(window.start);
  const end = instant(window.end);
  ensure(end > start, "Khoảng lịch không hợp lệ.");
  ensure(
    scheduleConflicts(existing).length === 0,
    "Lịch hiện có đang xung đột.",
    "INVALID_STATE",
  );
  ensure(
    new Set([...existing.map((i) => i.id), ...tasks.map((t) => t.id)]).size ===
      existing.length + tasks.length,
    "Mã lịch bị trùng.",
  );
  const scheduled = [...existing];
  const proposed: ScheduleItem[] = [];
  const pending = [...tasks];
  while (pending.length) {
    // Among ready tasks, reserve scarce venue choices first; stable IDs break ties.
    const ready = pending
      .filter((t) =>
        t.dependsOnIds.every((id) => scheduled.some((s) => s.id === id)),
      )
      .sort(
        (a, b) =>
          new Set(a.venueIds).size - new Set(b.venueIds).size ||
          b.durationMinutes - a.durationMinutes ||
          a.id.localeCompare(b.id),
      );
    const index = ready[0] ? pending.indexOf(ready[0]) : -1;
    ensure(index >= 0, "Lịch có phụ thuộc thiếu hoặc vòng phụ thuộc.");
    const task = pending.splice(index, 1)[0]!;
    ensure(
      Number.isFinite(task.durationMinutes) &&
        task.durationMinutes > 0 &&
        task.venueIds.length > 0 &&
        task.venueIds.every(Boolean),
      "Thiếu thời lượng hoặc sân cho lịch đề xuất.",
    );
    let best: ScheduleItem | null = null;
    for (const venueId of task.venueIds) {
      const candidateStart = Math.max(
        start,
        ...task.dependsOnIds.map((id) =>
          instant(scheduled.find((s) => s.id === id)!.end),
        ),
      );
      // Earliest feasible start must be the window start, predecessor end, or an occupancy end + rest.
      const times = new Set([
        candidateStart,
        ...scheduled.map((item) => instant(item.end)),
        ...scheduled.map(
          (item) =>
            instant(item.end) +
            Math.max(item.restMinutes, task.restMinutes) * 60000,
        ),
      ]);
      for (const time of [...times].sort((a, b) => a - b)) {
        if (time < candidateStart || time + task.durationMinutes * 60000 > end)
          continue;
        const { venueIds: _venues, durationMinutes: _duration, ...base } = task;
        void _venues;
        void _duration;
        const item: ScheduleItem = {
          ...base,
          venueId,
          start: new Date(time).toISOString(),
          end: new Date(time + task.durationMinutes * 60000).toISOString(),
        };
        if (!scheduleConflicts([...scheduled, item]).length) {
          if (!best || time < instant(best.start)) best = item;
          break;
        }
      }
    }
    ensure(
      best,
      "Không tìm được lịch phù hợp trong khoảng thời gian; cần tổ trưởng điều chỉnh.",
      "INVALID_STATE",
    );
    scheduled.push(best);
    proposed.push(best);
  }
  return freeze(proposed);
}
export interface ScheduleSnapshot {
  version: number;
  items: readonly ScheduleItem[];
}
export function reviseSchedule(
  snapshot: ScheduleSnapshot,
  expectedVersion: number,
  items: readonly ScheduleItem[],
) {
  checkVersion(snapshot.version, expectedVersion);
  ensure(
    scheduleConflicts(items).length === 0,
    "Lịch đang xung đột; hãy điều chỉnh trước khi xác nhận.",
    "INVALID_STATE",
  );
  return freeze({
    snapshot: { version: snapshot.version + 1, items: structuredClone(items) },
    notification: {
      type: "schedule.changed" as const,
      version: snapshot.version + 1,
      changedItemIds: [
        ...new Set([
          ...snapshot.items.map((i) => i.id),
          ...items.map((i) => i.id),
        ]),
      ],
    },
  });
}
export interface LaneAssignment {
  entrantId: string;
  heat: number;
  lane: number;
}
export function assignLanes(
  entrantIds: readonly string[],
  lanes: number,
): readonly LaneAssignment[] {
  ensure(
    entrantIds.length > 0 &&
      entrantIds.every(Boolean) &&
      new Set(entrantIds).size === entrantIds.length &&
      Number.isInteger(lanes) &&
      lanes >= 1 &&
      lanes <= 16,
    "Danh sách hoặc số làn (1–16) không hợp lệ.",
  );
  return freeze(
    entrantIds.map((entrantId, index) => ({
      entrantId,
      heat: Math.floor(index / lanes) + 1,
      lane: (index % lanes) + 1,
    })),
  );
}
export function validateLanes(
  entrantIds: readonly string[],
  assignments: readonly LaneAssignment[],
  lanes: number,
) {
  assignLanes(entrantIds, lanes);
  ensure(
    assignments.length === entrantIds.length &&
      new Set(assignments.map((a) => a.entrantId)).size === entrantIds.length &&
      assignments.every((a) => entrantIds.includes(a.entrantId)),
    "Phân làn cần có đủ danh sách, không trùng hoặc thêm VĐV.",
  );
  ensure(
    assignments.every(
      (a) =>
        Number.isInteger(a.heat) &&
        a.heat > 0 &&
        Number.isInteger(a.lane) &&
        a.lane >= 1 &&
        a.lane <= lanes,
    ) &&
      new Set(assignments.map((a) => `${a.heat}/${a.lane}`)).size ===
        assignments.length,
    "Trùng làn trong lượt hoặc số lượt/làn không hợp lệ.",
  );
}
