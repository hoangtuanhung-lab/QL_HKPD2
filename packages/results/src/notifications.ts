import { allowed, type Actor } from "@hkpd/foundation";
import type { NotificationLink } from "./publication.js";
/** link/participant schools from server metadata; check again when opening, never trust a notification as authority. */
export function canOpenNotification(
  actor: Actor | null,
  link: NotificationLink,
  participantSchoolIds: readonly string[],
) {
  const scope = { ...link, participantSchoolIds };
  return (
    allowed(actor, "edition.configure", scope) ||
    allowed(actor, "result.confirm", scope) ||
    allowed(actor, "result.submit", scope) ||
    participantSchoolIds.some((schoolId) =>
      allowed(actor, "school.write", { editionId: link.editionId, schoolId }),
    )
  );
}
