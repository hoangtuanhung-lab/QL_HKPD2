import { allowed, type Actor } from "@hkpd/foundation";
import { ensure } from "./model.js";
export interface RefereeRow {
  eventId: string;
  sportId: string;
  participantSchoolIds: readonly string[];
  requiredReferees: number;
}
/** Actors and rows must come from trusted session/roster repositories, not request flags. */
export function validReferees(
  editionId: string,
  row: RefereeRow,
  actors: readonly Actor[],
) {
  ensure(
    row.participantSchoolIds.length &&
      Number.isSafeInteger(row.requiredReferees) &&
      row.requiredReferees > 0,
    "ASSIGNMENT_INPUT",
    "Thiếu phạm vi hoặc số trọng tài cần thiết.",
  );
  const eligible = actors.filter((actor) =>
    allowed(actor, "result.submit", {
      editionId,
      sportId: row.sportId,
      eventId: row.eventId,
      participantSchoolIds: row.participantSchoolIds,
    }),
  );
  const ids = [...new Set(eligible.map((actor) => actor.id))];
  return { eligibleIds: ids, sufficient: ids.length >= row.requiredReferees };
}
export interface FileLink {
  id: string;
  editionId: string;
  athleteIds: readonly string[];
  matchId: string | null;
  participantSchoolIds: readonly string[];
  sportId: string | null;
  eventId: string | null;
}
/** No provider URL is returned; runtime adapter must recheck access on download. */
export function canViewFile(actor: Actor | null, file: FileLink): boolean {
  if (!actor?.approved || !actor.id || !file.editionId) return false;
  return actor.assignments.some(
    (a) =>
      a.editionId === file.editionId &&
      (a.role === "admin" ||
        (a.role === "school" &&
          !!a.schoolId &&
          file.participantSchoolIds.includes(a.schoolId)) ||
        (a.role === "leader" && !!file.sportId && a.sportId === file.sportId) ||
        (a.role === "referee" &&
          !!file.sportId &&
          a.sportId === file.sportId &&
          !!file.eventId &&
          !!a.eventIds?.includes(file.eventId) &&
          (!actor.schoolId ||
            !file.participantSchoolIds.includes(actor.schoolId)))),
  );
}
export function canUploadMatchEvidence(
  actor: Actor | null,
  file: FileLink,
): boolean {
  return (
    !!file.matchId &&
    !!file.sportId &&
    !!file.eventId &&
    allowed(actor, "result.submit", {
      editionId: file.editionId,
      sportId: file.sportId,
      eventId: file.eventId,
      participantSchoolIds: file.participantSchoolIds,
    })
  );
}
