import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { FoundationError } from "./problem.js";
export interface CursorScope {
  actorId: string;
  editionId: string;
  operation: string;
  filters: Record<string, string>;
}
function binding(scope: CursorScope) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        scope.actorId,
        scope.editionId,
        scope.operation,
        Object.entries(scope.filters).sort(([a], [b]) => a.localeCompare(b)),
      ]),
    )
    .digest("hex");
}
/** Key supplied by runtime secret configuration, never committed. Tokens expire and conceal IDs. */
export class CursorCodec {
  constructor(
    private readonly key: Uint8Array,
    private readonly ttlMs = 900_000,
  ) {
    if (key.length !== 32 || !Number.isSafeInteger(ttlMs) || ttlMs <= 0)
      throw new Error("Invalid cursor configuration.");
  }
  encode(lastId: string, scope: CursorScope, now = Date.now()): string {
    if (
      !Number.isSafeInteger(now) ||
      now < 0 ||
      !Number.isSafeInteger(now + this.ttlMs)
    )
      throw new FoundationError("VALIDATION_ERROR");
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(
        JSON.stringify({
          lastId,
          binding: binding(scope),
          expires: now + this.ttlMs,
        }),
        "utf8",
      ),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
      "base64url",
    );
  }
  decode(token: string, scope: CursorScope, now = Date.now()): string {
    try {
      if (!Number.isSafeInteger(now) || now < 0) throw new Error();
      if (!/^[A-Za-z0-9_-]{40,4096}$/.test(token)) throw new Error();
      const data = Buffer.from(token, "base64url");
      if (data.toString("base64url") !== token) throw new Error();
      const decipher = createDecipheriv(
        "aes-256-gcm",
        this.key,
        data.subarray(0, 12),
      );
      decipher.setAuthTag(data.subarray(12, 28));
      const value = JSON.parse(
        Buffer.concat([
          decipher.update(data.subarray(28)),
          decipher.final(),
        ]).toString("utf8"),
      );
      if (
        typeof value.lastId !== "string" ||
        !value.lastId ||
        value.binding !== binding(scope) ||
        !Number.isSafeInteger(value.expires) ||
        value.expires <= now
      )
        throw new Error();
      return value.lastId;
    } catch {
      throw new FoundationError("VALIDATION_ERROR");
    }
  }
}
export function pageLimit(value: unknown = 50): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 100
  )
    throw new FoundationError("VALIDATION_ERROR");
  return value;
}
