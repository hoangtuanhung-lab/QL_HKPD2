import type { Actor } from "@hkpd/foundation";
import { athleteCatalog } from "./athlete-catalog.generated.js";
import type { WorkspaceRole } from "./role-workspaces.js";

/** Adapter input from a verified session, never localStorage, URL or role selector. */
export interface WorkspaceSession {
  /** Supabase RPC sessions pin the server edition and isolate account drafts. */
  source?: "supabase";
  actor: Actor;
  editionId: string;
  /** Trusted mapping from database sport UUIDs to this edition's catalog codes. */
  sportCodeById?: Readonly<Record<string, string>>;
}
export function sessionRoles(session: WorkspaceSession): WorkspaceRole[] {
  if (!session.actor.approved || !session.actor.id || !session.editionId)
    return [];
  const roleMap = {
    admin: "admin",
    leader: "chief",
    referee: "referee",
    school: "school",
  } as const;
  return [
    ...new Set(
      session.actor.assignments
        .filter((a) => a.editionId === session.editionId)
        .map((a) => roleMap[a.role]),
    ),
  ];
}
export function assignedSportCodes(
  session: WorkspaceSession | undefined,
  role: WorkspaceRole,
): string[] {
  if (
    !session?.actor.approved ||
    !session.actor.id ||
    !session.editionId ||
    (role !== "chief" && role !== "referee")
  )
    return [];
  const sportCodes = new Set<string>(athleteCatalog.map((e) => e.sportCode));
  return [
    ...new Set(
      session.actor.assignments
        .filter(
          (a) =>
            a.editionId === session.editionId &&
            a.role === (role === "chief" ? "leader" : "referee") &&
            a.sportId,
        )
        .map((a) => session.sportCodeById?.[a.sportId!] ?? a.sportId!)
        .filter((code) => sportCodes.has(code)),
    ),
  ];
}
