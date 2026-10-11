import type { components } from "@hkpd/contracts";
export type Payload = components["schemas"]["ResultPayload"];
export type Submission = components["schemas"]["Submission"];
export type Official = components["schemas"]["OfficialResult"];
export type Value = components["schemas"]["ResultValue"];
export class ResultError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export function ensure(
  condition: unknown,
  code: string,
  message: string,
): asserts condition {
  if (!condition) throw new ResultError(code, message);
}
export function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export const participantKey = (p: components["schemas"]["Participant"]) =>
  p.kind === "athlete" ? `athlete:${p.athlete_id}` : `team:${p.team_id}`;
export interface ResultRule {
  snapshotId: string;
  kind: Value["kind"];
  precision: number;
  maxSets?: number;
}
export interface Lease {
  actorId: string;
  sessionId: string;
  token: string;
  expiresAt: string;
}
export interface ResultMatch {
  id: string;
  editionId: string;
  eventId: string;
  sportId: string;
  version: number;
  locked: boolean;
  participantSchoolIds: readonly string[];
  participantKeys: readonly string[];
  prerequisiteOfficialVersions: Readonly<Record<string, number>>;
  rule: ResultRule;
  lease: Lease | null;
  submissions: readonly Submission[];
  official: Official | null;
  officialHistory: readonly Official[];
}
/** Exact decimal scale: rejects excess precision instead of rounding under unresolved U02. */
export function scaled(
  value: string,
  precision: number,
  signed = false,
): bigint {
  ensure(
    Number.isSafeInteger(precision) &&
      precision >= 0 &&
      precision <= 6 &&
      typeof value === "string" &&
      value.length <= 32 &&
      (signed ? /^-?\d+(?:\.\d+)?$/ : /^\d+(?:\.\d+)?$/).test(value),
    "INVALID_VALUE",
    "Thành tích hoặc độ chính xác không hợp lệ.",
  );
  const negative = value.startsWith("-"),
    [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  ensure(
    fraction.length <= precision,
    "PRECISION",
    "Thành tích vượt độ chính xác cấu hình; không tự làm tròn.",
  );
  return (
    (BigInt(whole!) * 10n ** BigInt(precision) +
      BigInt(fraction.padEnd(precision, "0") || "0")) *
    (negative ? -1n : 1n)
  );
}
export function integer(value: number) {
  ensure(
    Number.isSafeInteger(value) && value >= 0,
    "INVALID_VALUE",
    "Giá trị phải là số nguyên không âm.",
  );
  return value;
}
export function validatePayload(payload: Payload, match: ResultMatch) {
  ensure(
    Object.keys(payload).every((k) =>
      ["rule_snapshot_id", "entries", "file_ids"].includes(k),
    ),
    "INVALID_PAYLOAD",
    "Payload chứa trường ngoài hợp đồng.",
  );
  ensure(
    payload.rule_snapshot_id === match.rule.snapshotId &&
      Array.isArray(payload.entries) &&
      payload.entries.length &&
      Array.isArray(payload.file_ids) &&
      new Set(payload.file_ids).size === payload.file_ids.length,
    "INVALID_PAYLOAD",
    "Payload hoặc rule snapshot không hợp lệ.",
  );
  const keys = payload.entries.map((e) => participantKey(e.participant));
  ensure(
    new Set(keys).size === keys.length &&
      keys.every((k) => match.participantKeys.includes(k)) &&
      keys.length === match.participantKeys.length,
    "PARTICIPANT_SCOPE",
    "Thành tích phải đúng và đủ đối tượng của trận/lượt.",
  );
  for (const entry of payload.entries) {
    ensure(
      Object.keys(entry).every((k) => ["participant", "value"].includes(k)),
      "INVALID_PAYLOAD",
      "Dòng thành tích chứa trường lạ.",
    );
    const { value } = entry;
    const keys: Record<Value["kind"], readonly string[]> = {
      time: ["kind", "seconds"],
      distance: ["kind", "metres"],
      points: ["kind", "points"],
      score: ["kind", "scored", "conceded"],
      sets: ["kind", "sets"],
      cards: ["kind", "yellow", "red"],
      external_rank: ["kind", "rank"],
    };
    ensure(
      keys[value.kind] &&
        Object.keys(value).every((k) => keys[value.kind].includes(k)),
      "INVALID_VALUE",
      "Biểu mẫu chứa trường ngoài hợp đồng.",
    );
    ensure(
      value.kind === match.rule.kind,
      "VALUE_KIND",
      "Sai biểu mẫu thành tích theo cấu hình.",
    );
    switch (value.kind) {
      case "time":
        scaled(value.seconds, match.rule.precision);
        break;
      case "distance":
        scaled(value.metres, match.rule.precision);
        break;
      case "points":
        scaled(value.points, match.rule.precision, true);
        break;
      case "score":
        integer(value.scored);
        integer(value.conceded);
        break;
      case "sets":
        ensure(
          value.sets.length > 0 &&
            match.rule.maxSets !== undefined &&
            value.sets.length <= match.rule.maxSets,
          "SETS_RULE",
          "Thiếu giới hạn hiệp hoặc số hiệp không hợp lệ.",
        );
        value.sets.forEach((s) => {
          integer(s.scored);
          integer(s.conceded);
        });
        break;
      case "cards":
        integer(value.yellow);
        integer(value.red);
        break;
      case "external_rank":
        integer(value.rank);
        ensure(value.rank > 0, "INVALID_VALUE", "Vị thứ ngoài phải từ 1.");
        break;
    }
  }
  if (match.rule.kind === "score" || match.rule.kind === "sets")
    ensure(
      payload.entries.length === 2,
      "PARTICIPANT_SCOPE",
      "Tỷ số/hiệp cần đúng hai phía.",
    );
  if (match.rule.kind === "score") {
    const a = payload.entries[0]!.value,
      b = payload.entries[1]!.value;
    ensure(
      a.kind === "score" &&
        b.kind === "score" &&
        a.scored === b.conceded &&
        a.conceded === b.scored,
      "SCORE_INCONSISTENT",
      "Hai phía phải cùng một tỷ số đối xứng.",
    );
  }
  if (match.rule.kind === "sets") {
    const a = payload.entries[0]!.value,
      b = payload.entries[1]!.value;
    ensure(
      a.kind === "sets" &&
        b.kind === "sets" &&
        a.sets.length === b.sets.length &&
        a.sets.every(
          (set, i) =>
            set.scored === b.sets[i]!.conceded &&
            set.conceded === b.sets[i]!.scored,
        ),
      "SETS_INCONSISTENT",
      "Hai phía phải ghi cùng các hiệp đối xứng.",
    );
  }
}
export function submitPreview(
  match: ResultMatch,
  payload: Payload,
  actorId: string,
  now: Date,
  id: string,
  reason?: string,
): ResultMatch {
  ensure(
    Number.isSafeInteger(match.version) &&
      match.version > 0 &&
      match.version < Number.MAX_SAFE_INTEGER,
    "VERSION_CONFLICT",
    "Phiên bản trận không hợp lệ.",
  );
  ensure(
    !match.locked && (!match.official || reason?.trim()),
    "EDIT_REASON",
    "Kết quả đã khóa hoặc bản sửa thiếu lý do.",
  );
  validatePayload(payload, match);
  const submission: Submission = {
    id,
    edition_id: match.editionId,
    event_id: match.eventId,
    match_id: match.id,
    version: 1,
    base_official_version: match.official?.version ?? 0,
    status: "pending_confirmation",
    payload: structuredClone(payload),
    created_by: actorId,
    created_at: now.toISOString(),
  };
  return freeze({
    ...structuredClone(match),
    version: match.version + 1,
    submissions: [...structuredClone(match.submissions), submission],
  });
}
export function confirmPreview(
  match: ResultMatch,
  input: components["schemas"]["ConfirmSubmission"],
  actorId: string,
  now: Date,
  id: string,
): ResultMatch {
  ensure(
    Number.isSafeInteger(match.version) &&
      match.version > 0 &&
      match.version < Number.MAX_SAFE_INTEGER &&
      Number.isSafeInteger(input.base_official_version) &&
      input.base_official_version >= 0 &&
      input.base_official_version < Number.MAX_SAFE_INTEGER,
    "VERSION_CONFLICT",
    "Phiên bản xác nhận không hợp lệ.",
  );
  ensure(
    Object.keys(input).every((k) =>
      ["submission_id", "submission_version", "base_official_version"].includes(
        k,
      ),
    ),
    "CONFIRM_PAYLOAD",
    "Xác nhận không nhận điểm mới.",
  );
  ensure(!match.locked, "LOCKED", "Trận/lượt đã khóa.");
  const s = match.submissions.find((s) => s.id === input.submission_id);
  ensure(
    s &&
      s.status === "pending_confirmation" &&
      s.version === input.submission_version &&
      s.base_official_version === input.base_official_version &&
      (match.official?.version ?? 0) === input.base_official_version,
    "VERSION_CONFLICT",
    "Bản nhập hoặc kết quả chính thức đã thay đổi.",
  );
  validatePayload(s.payload, match);
  const official: Official = {
    id,
    edition_id: match.editionId,
    match_id: match.id,
    version: input.base_official_version + 1,
    submission_id: s.id,
    submission_version: s.version,
    payload: structuredClone(s.payload),
    confirmed_by: actorId,
    confirmed_at: now.toISOString(),
  };
  return freeze({
    ...structuredClone(match),
    version: match.version + 1,
    official,
    officialHistory: [...structuredClone(match.officialHistory), official],
    submissions: match.submissions.map((v) =>
      v.id === s.id
        ? { ...structuredClone(v), status: "confirmed" }
        : structuredClone(v),
    ),
  });
}
