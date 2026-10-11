import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { allowed, type Actor } from "@hkpd/foundation";
import { ensure } from "./model.js";
import { maskIdentity } from "./import-preview.js";
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
export function schoolIdentityView(
  actor: Actor | null,
  scope: PrivateScope,
  record: EncryptedIdentity,
  key: Uint8Array,
  keyId: string,
): string {
  ensure(
    allowed(actor, "school.write", scope),
    "FORBIDDEN",
    "Không được tra giấy tờ trường khác.",
  );
  return maskIdentity(openIdentity(record, key, keyId, scope));
}
