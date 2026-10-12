import type { components } from "@hkpd/contracts";
import {
  ensure,
  freeze,
  integer,
  scaled,
  type Value,
  type Official,
} from "./model.js";
export interface Publication {
  id: string;
  editionId: string;
  version: number;
  status: "provisional" | "finalized";
  sourceVersions: Readonly<Record<string, number>>;
}
function validVersion(value: number, increment = false) {
  ensure(
    Number.isSafeInteger(value) &&
      value > 0 &&
      (!increment || value < Number.MAX_SAFE_INTEGER),
    "INVALID_VERSION",
    "Phiên bản phải là số nguyên dương an toàn, không vượt giới hạn tăng.",
  );
}
function validSources(sources: Readonly<Record<string, number>>) {
  ensure(
    sources && typeof sources === "object" && !Array.isArray(sources),
    "INVALID_VERSION",
    "Nguồn phiên bản không hợp lệ.",
  );
  for (const [id, version] of Object.entries(sources)) {
    ensure(id.trim(), "INVALID_VERSION", "Thiếu ID nguồn.");
    validVersion(version);
  }
}
function validatePublication(p: Publication) {
  validVersion(p.version);
  validSources(p.sourceVersions);
  ensure(
    p.id && p.editionId && ["provisional", "finalized"].includes(p.status),
    "INVALID_STATE",
    "Phạm vi/trạng thái công bố không hợp lệ.",
  );
}
export function invalidatePublication(
  p: Publication,
  matchId: string,
  officialVersion: number,
): Publication {
  validatePublication(p);
  ensure(matchId.trim(), "INVALID_VERSION", "Thiếu ID nguồn.");
  integer(officialVersion);
  ensure(
    officialVersion > 0,
    "INVALID_VERSION",
    "Phiên bản chính thức phải từ 1.",
  );
  // Delayed or duplicate outbox delivery must never roll a source back.
  if ((p.sourceVersions[matchId] ?? 0) >= officialVersion) return p;
  validVersion(p.version, true);
  return freeze({
    ...structuredClone(p),
    version: p.version + 1,
    status: "provisional",
    sourceVersions: { ...p.sourceVersions, [matchId]: officialVersion },
  });
}
export function finalizePublication(
  p: Publication,
  currentVersions: Readonly<Record<string, number>>,
  expectedVersion: number,
  readiness: { rankingsResolved: boolean; allResultsConfirmed: boolean },
) {
  validatePublication(p);
  validVersion(p.version, true);
  validVersion(expectedVersion);
  validSources(currentVersions);
  ensure(
    readiness.rankingsResolved &&
      readiness.allResultsConfirmed &&
      Object.keys(currentVersions).length > 0,
    "PUBLICATION_UNRESOLVED",
    "Chưa đủ kết quả/tiêu chí để chốt bảng.",
  );
  ensure(
    p.version === expectedVersion &&
      JSON.stringify(Object.entries(p.sourceVersions).sort()) ===
        JSON.stringify(Object.entries(currentVersions).sort()),
    "VERSION_CONFLICT",
    "Nguồn bảng đã thay đổi; phải tính/chốt lại.",
  );
  return freeze({
    ...structuredClone(p),
    version: p.version + 1,
    status: "finalized" as const,
  });
}
export function publicResults(
  p: Publication,
  official: Official,
  labels: Readonly<
    Record<
      string,
      {
        eventLabel: string;
        athleteCode: string;
        displayName: string;
        schoolLabel: string;
      }
    >
  >,
): components["schemas"]["PublicResult"][] {
  validatePublication(p);
  if (p.status !== "finalized") return [];
  ensure(
    p.editionId === official.edition_id &&
      p.sourceVersions[official.match_id] === official.version,
    "STALE_PUBLICATION",
    "Phiên bản công bố không khớp kết quả.",
  );
  return official.payload.entries.map((entry) => {
    ensure(
      entry.participant.kind === "athlete",
      "PUBLIC_TEAM_CONTRACT",
      "DTO công khai đội cần được chốt, không gán mã VĐV giả cho đội.",
    );
    const key = entry.participant.athlete_id;
    const label = labels[key];
    ensure(label, "PUBLIC_LABEL", "Thiếu whitelist thông tin công khai.");
    return {
      publication_id: p.id,
      edition_id: p.editionId,
      event_label: label.eventLabel,
      athlete_code: label.athleteCode,
      display_name: label.displayName,
      school_label: label.schoolLabel,
      value: publicValue(entry.value),
      publication_status: "finalized",
    };
  });
}
/** CSV fallback export, NOT XLSX; formulas are escaped, correction note is retained. */
export function exportResultCsv(
  rows: readonly {
    name: string;
    value: string;
    correctedAt: string | null;
    reason: string | null;
  }[],
) {
  const cell = (value: string) =>
    `"${(/^[\s]*[=+\-@]/.test(value) ? "'" : "") + value.replaceAll('"', '""')}"`;
  return (
    "\uFEFF" +
    [
      ["Tên hiển thị", "Thành tích", "Thời điểm sửa", "Ghi chú sửa"],
      ...rows.map((r) => [
        r.name,
        r.value,
        r.correctedAt ?? "",
        r.reason ?? "",
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
export interface NotificationLink {
  editionId: string;
  matchId: string;
  eventId: string;
  sportId: string;
}
export function notificationIntent(
  link: NotificationLink,
  officialVersion: number,
) {
  ensure(
    link.editionId &&
      link.matchId &&
      link.eventId &&
      link.sportId &&
      Number.isSafeInteger(officialVersion) &&
      officialVersion > 0,
    "NOTIFICATION_INPUT",
    "Thiếu phạm vi thông báo.",
  );
  return {
    deduplicationKey: JSON.stringify([
      link.editionId,
      link.matchId,
      officialVersion,
    ]),
    text: "Có cập nhật kết quả cần xem.",
    link: { ...link },
  };
}

/** Explicit value whitelist even if a repository record contains unexpected extra fields. */
export function publicValue(value: Value): Value {
  switch (value.kind) {
    case "time":
      scaled(value.seconds, 6);
      return { kind: value.kind, seconds: value.seconds };
    case "distance":
      scaled(value.metres, 6);
      return { kind: value.kind, metres: value.metres };
    case "points":
      scaled(value.points, 6, true);
      return { kind: value.kind, points: value.points };
    case "score":
      return {
        kind: value.kind,
        scored: integer(value.scored),
        conceded: integer(value.conceded),
      };
    case "sets":
      return {
        kind: value.kind,
        sets: value.sets.map((s) => ({
          scored: integer(s.scored),
          conceded: integer(s.conceded),
        })),
      };
    case "cards":
      return {
        kind: value.kind,
        yellow: integer(value.yellow),
        red: integer(value.red),
      };
    case "external_rank":
      ensure(value.rank > 0, "INVALID_VALUE", "Vị thứ ngoài không hợp lệ.");
      return { kind: value.kind, rank: integer(value.rank) };
  }
}
