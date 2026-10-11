import { FoundationError, problem } from "@hkpd/foundation";
import { OfflineError } from "./model.js";
/** Transport boundary for future sync route; never leak payloads, snapshots, raw storage/provider errors. */
export function offlineProblem(error: unknown) {
  if (!(error instanceof OfflineError)) return problem(error);
  const code = error.code;
  if (
    code === "FORBIDDEN" ||
    code === "NOT_FOUND" ||
    code === "IDEMPOTENCY_CONFLICT"
  )
    return problem(new FoundationError(code));
  if (code === "INVALID_SCOPE" || code === "INVALID_SYNC_SUBMISSION")
    return problem(new FoundationError("VALIDATION_ERROR"));
  return problem(new FoundationError("INTERNAL_ERROR"));
}
