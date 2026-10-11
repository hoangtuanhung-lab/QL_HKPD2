import type { components } from "@hkpd/contracts";
import { Ajv2020 } from "ajv/dist/2020.js";
import formats from "ajv-formats";
import type { FormatsPlugin } from "ajv-formats";
import { schemas } from "./schema.js";
export type SyncSubmission = components["schemas"]["SyncSubmission"];
export type SyncReceipt = components["schemas"]["SyncReceipt"];
export interface QueueScope {
  actorId: string;
  editionId: string;
}
export class OfflineError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
export function requireValue(
  condition: unknown,
  code: string,
): asserts condition {
  if (!condition) throw new OfflineError(code);
}
const ajv = new Ajv2020({ strict: true });
(formats as unknown as FormatsPlugin)(ajv);
const submission = ajv.compile({ ...schemas, $ref: "#/$defs/SyncSubmission" });
const receipt = ajv.compile({ ...schemas, $ref: "#/$defs/SyncReceipt" });
export function assertSubmission(
  input: unknown,
): asserts input is SyncSubmission {
  requireValue(submission(input), "INVALID_SYNC_SUBMISSION");
}
export function assertReceipt(input: unknown): asserts input is SyncReceipt {
  requireValue(receipt(input), "INVALID_SYNC_RECEIPT");
}
export function assertScope(scope: QueueScope) {
  requireValue(
    Object.keys(scope).length === 2 &&
      typeof scope.actorId === "string" &&
      typeof scope.editionId === "string" &&
      /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(scope.actorId) &&
      /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(scope.editionId),
    "INVALID_SCOPE",
  );
}
/** Stable JSON fingerprint input; object property order never changes operation identity. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
