import type { components } from "@hkpd/contracts";
import {
  ensure,
  approvedRevision,
  currentRevision,
  type Athlete,
  type Registration,
  type Registry,
} from "./model.js";
export const athleteDto = (a: Athlete): components["schemas"]["Athlete"] => ({
  id: a.id,
  edition_id: a.editionId,
  school_id: a.schoolId,
  student_id: a.studentId,
  display_name: a.name,
  athlete_code: a.athleteCode,
  version: a.version,
});
export function registrationDto(
  r: Registration,
): components["schemas"]["Registration"] {
  const c = currentRevision(r);
  return {
    id: r.id,
    edition_id: r.editionId,
    school_id: r.schoolId,
    event_id: r.eventId,
    version: r.version,
    approved_revision_id: r.approvedRevisionId,
    current_revision: {
      id: c.id,
      version: c.version,
      status: c.status,
      participant:
        c.participant.kind === "athlete"
          ? { kind: "athlete", athlete_id: c.participant.athleteId }
          : { kind: "team", team_id: c.participant.teamId },
    },
  };
}
/** C10 reads only the approved revision, never a pending draft. */
export function approvedEntries(state: Registry, eventId: string) {
  ensure(
    state.catalog.editionId === state.editionId,
    "ROSTER_INVALID",
    "Danh mục không cùng kỳ giải.",
  );
  return state.registrations
    .filter((r) => r.editionId === state.editionId && r.eventId === eventId)
    .flatMap((r) => {
      const approved = approvedRevision(r);
      if (!r.approvedRevisionId) return [];
      ensure(
        approved?.status === "approved",
        "ROSTER_INVALID",
        "Bản duyệt bị thiếu hoặc sai trạng thái.",
      );
      const p = approved.participant;
      if (p.kind === "athlete") {
        const a = state.athletes.find((a) => a.id === p.athleteId);
        ensure(
          a &&
            a.editionId === state.editionId &&
            a.schoolId === r.schoolId &&
            a.profileStatus === "approved",
          "ROSTER_INVALID",
          "VĐV duyệt không hợp lệ.",
        );
        return [
          {
            id: a.id,
            label: a.name,
            schoolId: a.schoolId,
            personIds: [a.studentId],
            editionId: state.editionId,
            eventId,
            approvedRevisionId: approved.id,
          },
        ];
      }
      const team = state.teams.find((t) => t.id === p.teamId);
      ensure(
        team &&
          team.editionId === state.editionId &&
          team.schoolId === r.schoolId &&
          team.eventId === eventId &&
          new Set(team.memberIds).size === team.memberIds.length &&
          team.memberIds.every((id) =>
            state.athletes.some(
              (a) =>
                a.id === id &&
                a.editionId === state.editionId &&
                a.schoolId === r.schoolId &&
                a.profileStatus === "approved",
            ),
          ),
        "ROSTER_INVALID",
        "Đội duyệt thiếu thành viên hoặc sai phạm vi.",
      );
      return [
        {
          id: team.id,
          label: team.name,
          schoolId: team.schoolId,
          personIds: team.memberIds.flatMap((id) =>
            state.athletes.filter((a) => a.id === id).map((a) => a.studentId),
          ),
          editionId: state.editionId,
          eventId,
          approvedRevisionId: approved.id,
        },
      ];
    });
}
