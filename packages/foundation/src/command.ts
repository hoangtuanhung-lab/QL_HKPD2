import { createHash, randomUUID } from "node:crypto";
import { allowed, type Action, type Actor, type Scope } from "./policy.js";
import { FoundationError } from "./problem.js";
export type Json =
  null | boolean | number | string | Json[] | { [key: string]: Json };
function canonical(value: Json): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value))
      throw new FoundationError("VALIDATION_ERROR");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (Object.getPrototypeOf(value) !== Object.prototype)
    throw new FoundationError("VALIDATION_ERROR");
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key]!)}`)
    .join(",")}}`;
}
export interface Command {
  actor: Actor | null;
  action: Action;
  editionId: string;
  method: "POST";
  path: string;
  key: string;
  baseVersion: number;
  payload: Json;
}
export interface Audit {
  id: string;
  actorId: string;
  action: Action;
  editionId: string;
  resourceId: string;
  version: number;
}
export interface Event {
  id: string;
  type: string;
  editionId: string;
  resourceId: string;
  version: number;
}
export interface Receipt {
  fingerprint: string;
  result: Json;
}
export interface CommandTransaction {
  /** Refresh approval/assignments here so revocation also blocks cached responses. */
  actor(id: string): Promise<Actor | null>;
  /** Authoritative scope and resource, including every participant's school. */
  target(
    command: Command,
  ): Promise<{ id: string; version: number; scope: Scope }>;
  receipt(scopeKey: string): Promise<Receipt | null>;
  apply(command: Command, nextVersion: number): Promise<Json>;
  audit(record: Audit): Promise<void>;
  enqueue(event: Event): Promise<void>;
  saveReceipt(scopeKey: string, receipt: Receipt): Promise<void>;
}
export interface CommandStore {
  /** Serialize conflicting resource AND receipt keys. Roll back ALL writes on failure.
   * SQL implementation must use transactions, version CAS and unique receipt keys.
   */
  transaction<T>(run: (tx: CommandTransaction) => Promise<T>): Promise<T>;
}
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function executeCommand(
  store: CommandStore,
  command: Command,
): Promise<Json> {
  if (!command.actor) throw new FoundationError("UNAUTHENTICATED");
  if (
    !uuid.test(command.key) ||
    !Number.isSafeInteger(command.baseVersion) ||
    command.baseVersion < 1 ||
    !command.editionId ||
    !command.path.startsWith("/") ||
    command.method !== "POST"
  )
    throw new FoundationError("VALIDATION_ERROR");
  // Route adapter validates DTO before this call; include version in canonical payload identity.
  const fingerprint = createHash("sha256")
    .update(
      canonical({
        action: command.action,
        payload: command.payload,
        baseVersion: command.baseVersion,
      }),
    )
    .digest("hex");
  const scopeKey = JSON.stringify([
    command.actor.id,
    command.editionId,
    command.method,
    command.path,
    command.key,
  ]);
  const actorId = command.actor.id;
  return store.transaction(async (tx) => {
    const actor = await tx.actor(actorId);
    const target = await tx.target(command);
    if (
      target.scope.editionId !== command.editionId ||
      !allowed(actor, command.action, target.scope)
    )
      throw new FoundationError("FORBIDDEN");
    const saved = await tx.receipt(scopeKey);
    if (saved) {
      if (saved.fingerprint !== fingerprint)
        throw new FoundationError("IDEMPOTENCY_CONFLICT");
      return saved.result;
    }
    if (
      !Number.isSafeInteger(target.version) ||
      target.version !== command.baseVersion ||
      target.version >= Number.MAX_SAFE_INTEGER
    )
      throw new FoundationError("VERSION_CONFLICT");
    const version = target.version + 1;
    const result = await tx.apply({ ...command, actor }, version);
    await tx.audit({
      id: randomUUID(),
      actorId,
      action: command.action,
      editionId: command.editionId,
      resourceId: target.id,
      version,
    });
    await tx.enqueue({
      id: randomUUID(),
      type: command.action,
      editionId: command.editionId,
      resourceId: target.id,
      version,
    });
    await tx.saveReceipt(scopeKey, { fingerprint, result });
    return result;
  });
}
