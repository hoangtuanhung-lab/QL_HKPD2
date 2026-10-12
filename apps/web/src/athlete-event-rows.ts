import {
  eventOptions,
  type EventPreference,
  type SportId,
} from "./athlete-event-options.js";
export interface EventRow {
  id: string;
  groupId: string;
  sportId: SportId | "";
  eventLabel: string;
  content: string;
  extraEventLabels: string[];
}
export function blankEventRow(
  groupId: string = crypto.randomUUID(),
  sportId: SportId | "" = "",
): EventRow {
  return {
    id: crypto.randomUUID(),
    groupId,
    sportId,
    eventLabel: "",
    content: "",
    extraEventLabels: [],
  };
}
export function splitEventLabel(sportId: SportId, eventLabel: string) {
  if (sportId === "swimming") {
    const m = eventLabel.match(/^(Tự do|Ếch) (.+)$/);
    if (m) return { content: m[1]!, detail: m[2]! };
  }
  if (sportId === "athletics" && eventLabel.startsWith("Chạy "))
    return { content: "Chạy", detail: eventLabel.slice(5) };
  if (sportId === "stick") return { content: "Đối kháng", detail: eventLabel };
  if (sportId === "vovinam")
    return eventLabel.startsWith("Đối kháng ")
      ? { content: "Đối kháng", detail: eventLabel.slice(10) }
      : { content: "Đơn luyện", detail: eventLabel };
  if (sportId === "tug") {
    const m = eventLabel.match(/^(Đội nam|Đội nữ) \((.+)\)$/);
    if (m) return { content: m[1]!, detail: m[2]! };
  }
  return { content: eventLabel, detail: "" };
}
export function isAdditionalEvent(label: string) {
  return /^(Tiếp sức|Đôi |Đồng đội|Song luyện|Đội nam nữ)/.test(label);
}
export function initialEventRows(
  selections: readonly EventPreference[],
): EventRow[] {
  const groups = new Map<SportId, EventRow[]>();
  for (const s of selections) {
    let group = groups.get(s.sportId);
    if (!group) {
      group = [blankEventRow(undefined, s.sportId)];
      groups.set(s.sportId, group);
    }
    if (isAdditionalEvent(s.eventLabel))
      group[0]!.extraEventLabels.push(s.eventLabel);
    else {
      let row = group.find((r) => !r.eventLabel);
      if (!row) {
        row = blankEventRow(group[0]!.groupId, s.sportId);
        group.push(row);
      }
      row.eventLabel = s.eventLabel;
      row.content = splitEventLabel(s.sportId, s.eventLabel).content;
    }
  }
  const rows = [...groups.values()].flat();
  return rows.length ? rows : [blankEventRow()];
}
export function addSportRow(rows: readonly EventRow[]): EventRow[] {
  if (!rows.some((r) => r.sportId))
    throw Error("Chọn môn thứ nhất trước khi thêm môn.");
  if (new Set(rows.map((r) => r.groupId)).size >= 2)
    throw Error("Mỗi VĐV chỉ được đăng ký tối đa 2 môn.");
  return [...rows, blankEventRow()];
}
export function removeEventRow(
  rows: readonly EventRow[],
  id: string,
): EventRow[] {
  const removed = rows.find((r) => r.id === id);
  const next = rows
    .filter((r) => r.id !== id)
    .map((r) => ({ ...r, extraEventLabels: [...r.extraEventLabels] }));
  if (removed?.extraEventLabels.length) {
    const first = next.find((r) => r.groupId === removed.groupId);
    if (first) first.extraEventLabels.push(...removed.extraEventLabels);
  }
  return next.length ? next : [blankEventRow()];
}
/** Changing the sport applies to every inherited content row in this group. */
export function changeRowSport(
  rows: readonly EventRow[],
  groupId: string,
  sportId: SportId | "",
): EventRow[] {
  if (
    sportId &&
    rows.some((r) => r.groupId !== groupId && r.sportId === sportId)
  )
    throw Error(
      "Môn này đã có trong bảng. Dùng Thêm nội dung để bổ sung nội dung của môn đó.",
    );
  return rows.map((r) =>
    r.groupId === groupId
      ? { ...r, sportId, eventLabel: "", content: "", extraEventLabels: [] }
      : r,
  );
}
export function addContentRow(
  rows: readonly EventRow[],
  groupId: string,
): EventRow[] {
  const selected = rows.find((r) => r.groupId === groupId);
  if (!selected?.sportId)
    throw Error("Chọn môn thi đấu trước khi thêm nội dung.");
  const last = rows.findLastIndex((r) => r.groupId === groupId);
  return [
    ...rows.slice(0, last + 1),
    blankEventRow(groupId, selected.sportId),
    ...rows.slice(last + 1),
  ];
}
export function rowPreferences(
  rows: readonly EventRow[],
  level: "TH" | "THCS" | "",
  gender?: "male" | "female",
): EventPreference[] {
  const seen = new Set<string>();
  const selections: EventPreference[] = [];
  const sports = new Set<SportId>();
  rows.forEach((r, i) => {
    if (!r.sportId && !r.eventLabel && !r.content && !r.extraEventLabels.length)
      return;
    if (!level || !r.sportId || (!r.eventLabel && !r.extraEventLabels.length))
      throw Error(
        `Dòng ${i + 1}: chọn đủ cấp học, môn, nội dung và chi tiết thi đấu.`,
      );
    if (!r.eventLabel && r.content)
      throw Error(`Dòng ${i + 1}: chọn chi tiết thi đấu.`);
    sports.add(r.sportId);
    if (sports.size > 2) throw Error("Mỗi VĐV chỉ được đăng ký tối đa 2 môn.");
    for (const eventLabel of [
      ...(r.eventLabel ? [r.eventLabel] : []),
      ...r.extraEventLabels,
    ]) {
      if (!eventOptions(r.sportId, level, gender).includes(eventLabel))
        throw Error(
          `Dòng ${i + 1}: nội dung không phù hợp với môn/cấp học/giới tính đang chọn.`,
        );
      const key = JSON.stringify([r.sportId, eventLabel]);
      if (seen.has(key))
        throw Error(`Dòng ${i + 1}: nội dung thi đấu bị trùng.`);
      seen.add(key);
      selections.push({ sportId: r.sportId, level, eventLabel });
    }
  });
  return selections;
}
