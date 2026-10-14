import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";
import { allowed, type Actor } from "@hkpd/foundation";
import { ensure } from "./model.js";
export interface PrivateScope {
  editionId: string;
  schoolId: string;
  studentId: string;
}
export interface EncryptedIdentity {
  keyId: string;
  iv: string;
  tag: string;
  ciphertext: string;
}
const aad = (scope: PrivateScope) =>
  Buffer.from(
    JSON.stringify([scope.editionId, scope.schoolId, scope.studentId]),
  );
export function sealIdentity(
  value: string,
  key: Uint8Array,
  keyId: string,
  scope: PrivateScope,
): EncryptedIdentity {
  ensure(
    /^\d{12}$/.test(value) &&
      key.length === 32 &&
      keyId &&
      scope.editionId &&
      scope.schoolId &&
      scope.studentId,
    "PRIVATE_INPUT",
    "Dữ liệu mã hóa không hợp lệ.",
  );
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad(scope));
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return {
    keyId,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}
export function openIdentity(
  record: EncryptedIdentity,
  key: Uint8Array,
  expectedKeyId: string,
  scope: PrivateScope,
): string {
  try {
    ensure(
      key.length === 32 && record.keyId === expectedKeyId,
      "PRIVATE_INPUT",
      "Khóa không hợp lệ.",
    );
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(record.iv, "base64"),
    );
    decipher.setAAD(aad(scope));
    decipher.setAuthTag(Buffer.from(record.tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(record.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    ensure(false, "PRIVATE_DATA_INVALID", "Không giải mã được dữ liệu riêng.");
  }
}
/** Sports the athlete is registered in, read from authoritative registrations, never from the request. */
export interface IdentityScope extends PrivateScope {
  sportIds: readonly string[];
}
export type IdentityAccess = "full" | "partial";
/** Registering school and admin see all 12 digits; leader/referee see 3 first + 4 last digits, only in assigned sports. */
export function identityAccess(
  actor: Actor | null,
  scope: IdentityScope,
): IdentityAccess {
  if (
    allowed(actor, "edition.configure", scope) ||
    allowed(actor, "school.write", scope)
  )
    return "full";
  ensure(
    actor?.approved &&
      actor.id &&
      actor.assignments.some(
        (grant) =>
          grant.editionId === scope.editionId &&
          (grant.role === "leader" || grant.role === "referee") &&
          !!grant.sportId &&
          scope.sportIds.includes(grant.sportId),
      ),
    "FORBIDDEN",
    "Không được xem giấy tờ của VĐV ngoài phạm vi được giao.",
  );
  return "partial";
}
export function partialIdentity(value: string): string {
  if (!value) return "";
  return /^\d{12}$/.test(value)
    ? `${value.slice(0, 3)}${"*".repeat(5)}${value.slice(-4)}`
    : "*".repeat(value.length);
}
export function identityView(
  actor: Actor | null,
  scope: IdentityScope,
  record: EncryptedIdentity,
  key: Uint8Array,
  keyId: string,
): string {
  const access = identityAccess(actor, scope);
  const value = openIdentity(record, key, keyId, scope);
  return access === "full" ? value : partialIdentity(value);
}
/** Separate 32-byte HMAC key; never reuse the AES key. keyId is stored with each index for rotation. */
export interface IdentityIndexKey {
  keyId: string;
  key: Uint8Array;
}
/** Accepts "001 234 567 890", "001.234.567.890" or full-width digits; returns 12 digits or null. */
export function normalizeIdentity(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.normalize("NFKC").replace(/[\s.-]/g, "");
  return /^\d{12}$/.test(digits) ? digits : null;
}
/** Deterministic blind index so lists can be compared without decrypting stored identities. */
export function identityIndex(value: string, index: IdentityIndexKey): string {
  ensure(
    /^\d{12}$/.test(value) &&
      index.key.length === 32 &&
      /^[\w.-]+$/.test(index.keyId),
    "PRIVATE_INPUT",
    "Dữ liệu tạo mã so khớp không hợp lệ.",
  );
  return `${index.keyId}:${createHmac("sha256", index.key).update(value).digest("hex")}`;
}
export interface StoredIdentity {
  studentId: string;
  index: string;
}
export interface ListedIdentity {
  row: number;
  identity: unknown;
}
export interface IdentityReconciliation {
  matched: { row: number; studentId: string }[];
  onlyInList: { row: number }[];
  onlyInSoftware: { studentId: string }[];
  duplicateRows: { row: number; firstRow: number }[];
  invalidRows: { row: number }[];
  ambiguous: { row: number; studentIds: string[] }[];
}
/** Compare an uploaded registration list with stored records; output never contains identity digits. */
export function reconcileIdentities(
  stored: readonly StoredIdentity[],
  listed: readonly ListedIdentity[],
  index: IdentityIndexKey,
): IdentityReconciliation {
  ensure(
    stored.every((s) => s.studentId && s.index.startsWith(`${index.keyId}:`)),
    "INDEX_KEY_VERSION",
    "Mã so khớp đã lưu dùng khóa khác; cần tạo lại trước khi đối chiếu.",
  );
  const byIndex = new Map<string, string[]>();
  for (const s of stored)
    byIndex.set(s.index, [...(byIndex.get(s.index) ?? []), s.studentId]);
  const result: IdentityReconciliation = {
    matched: [],
    onlyInList: [],
    onlyInSoftware: [],
    duplicateRows: [],
    invalidRows: [],
    ambiguous: [],
  };
  const firstRow = new Map<string, number>(),
    seenStudents = new Set<string>();
  for (const entry of listed) {
    const value = normalizeIdentity(entry.identity);
    if (!value) {
      result.invalidRows.push({ row: entry.row });
      continue;
    }
    const digest = identityIndex(value, index);
    const earlier = firstRow.get(digest);
    if (earlier !== undefined) {
      result.duplicateRows.push({ row: entry.row, firstRow: earlier });
      continue;
    }
    firstRow.set(digest, entry.row);
    const students = byIndex.get(digest) ?? [];
    if (students.length > 1) {
      result.ambiguous.push({ row: entry.row, studentIds: [...students] });
      students.forEach((id) => seenStudents.add(id));
    } else if (students.length === 1) {
      result.matched.push({ row: entry.row, studentId: students[0]! });
      seenStudents.add(students[0]!);
    } else result.onlyInList.push({ row: entry.row });
  }
  for (const s of stored)
    if (!seenStudents.has(s.studentId))
      result.onlyInSoftware.push({ studentId: s.studentId });
  return result;
}
