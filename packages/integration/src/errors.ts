import { FoundationError } from "@hkpd/foundation";
import { RegistrationError } from "@hkpd/registration";
import { CompetitionError } from "@hkpd/competition";
import { ResultError } from "@hkpd/results";
/** Map known domain errors without leaking messages/PII. Unknown exceptions remain 500. */
export function apiError(error: unknown): unknown {
  if (error instanceof FoundationError) return error;
  if (!(
    error instanceof RegistrationError ||
    error instanceof CompetitionError ||
    error instanceof ResultError
  ))
    return error;
  if (error.code === "FORBIDDEN" || error.code === "NOT_FOUND")
    return new FoundationError(error.code);
  if (
    error.code === "VERSION_CONFLICT" ||
    error.code === "IDEMPOTENCY_CONFLICT"
  )
    return new FoundationError(error.code);
  if (
    [
      "EVENT_LOCKED",
      "REGISTRATION_CLOSED",
      "INVALID_STATE",
      "ROSTER_STALE",
      "SOURCE_STALE",
      "SOURCE_UNCONFIRMED",
      "LEASE_CONFLICT",
      "DRAW_UNCONFIRMED",
      "STALE_PUBLICATION",
      "LOCKED",
    ].includes(error.code)
  )
    return new FoundationError("VERSION_CONFLICT");
  return new FoundationError("VALIDATION_ERROR");
}
