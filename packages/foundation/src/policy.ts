export type Action =
  "school.write" | "result.submit" | "result.confirm" | "edition.configure";
export interface Assignment {
  editionId: string;
  role: "school" | "referee" | "leader" | "admin";
  schoolId?: string;
  sportId?: string;
  eventIds?: readonly string[];
}
/** Loaded by a trusted server session adapter, never from a command body. */
export interface Actor {
  id: string;
  approved: boolean;
  schoolId?: string;
  assignments: readonly Assignment[];
}
/** Resolve scope and participant schools from authoritative records inside the transaction. */
export interface Scope {
  editionId: string;
  schoolId?: string;
  sportId?: string;
  eventId?: string;
  participantSchoolIds?: readonly string[];
}
export function allowed(
  actor: Actor | null,
  action: Action,
  scope: Scope,
): boolean {
  if (!actor?.approved || !actor.id || !scope.editionId) return false;
  return actor.assignments.some((grant) => {
    if (grant.editionId !== scope.editionId) return false;
    switch (action) {
      case "edition.configure":
        return grant.role === "admin";
      case "school.write":
        return (
          grant.role === "school" &&
          !!scope.schoolId &&
          grant.schoolId === scope.schoolId
        );
      case "result.submit":
        return (
          grant.role === "referee" &&
          !!scope.sportId &&
          grant.sportId === scope.sportId &&
          !!scope.eventId &&
          !!grant.eventIds?.includes(scope.eventId) &&
          !!scope.participantSchoolIds?.length &&
          (!actor.schoolId ||
            !scope.participantSchoolIds.includes(actor.schoolId))
        );
      case "result.confirm":
        return (
          grant.role === "leader" &&
          !!scope.sportId &&
          grant.sportId === scope.sportId
        );
      default:
        return false;
    }
  });
}
