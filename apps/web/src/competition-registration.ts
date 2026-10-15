import type { ManagedSchool } from "./admin-settings.js";
import { athleteCatalog } from "./athlete-catalog.generated.js";
import {
  educationLevel,
  eligibleCatalog,
  migrateLegacyPreferences,
  scopeIssue,
} from "./athlete-catalog.js";
import type { SchoolDraft } from "./registration-draft.js";
export interface CompetitionRegistrationSource {
  editionId: string;
  year: number;
  schools: readonly SchoolDraft[];
  directory: readonly ManagedSchool[];
  catalogCodes: readonly string[];
}
export interface CompetitionRegistrationRow {
  athleteId: string;
  athleteName: string;
  schoolId: string;
  schoolCode: string | null;
  schoolName: string;
  issue: string;
}
const normalized = (name: string) =>
  name.trim().normalize("NFKC").toLocaleLowerCase("vi");
/** Exact saved selections only; free-text preferences are not a registration. */
export function competitionRegistrationRows(
  source: CompetitionRegistrationSource,
  code: string,
): CompetitionRegistrationRow[] {
  if (
    !code ||
    !source.catalogCodes.includes(code) ||
    !athleteCatalog.some((e) => e.code === code)
  )
    return [];
  return source.schools.flatMap((school) => {
    const byId = source.directory.find(
      (s) => school.draftId === `managed-school:${s.id}`,
    );
    const byName = source.directory.filter(
      (s) => normalized(s.name) === normalized(school.schoolName),
    );
    const registeredSchool =
      byId ?? (byName.length === 1 ? byName[0] : undefined);
    return school.athletes.flatMap((athlete) => {
      const scope = {
        level: educationLevel(athlete),
        gender: athlete.gender ?? ("" as const),
        birthYear: athlete.birthDate
          ? Number(athlete.birthDate.slice(0, 4))
          : null,
        year: source.year,
      };
      const eligible = eligibleCatalog(scope);
      const selections =
        athlete.catalogSelections ??
        migrateLegacyPreferences(athlete.eventSelections ?? [], eligible).codes;
      if (!selections.includes(code)) return [];
      return [
        {
          athleteId: athlete.draftId,
          athleteName: athlete.fullName,
          schoolId:
            registeredSchool?.id ?? `school:${normalized(school.schoolName)}`,
          schoolCode: registeredSchool?.code ?? null,
          schoolName: registeredSchool?.name ?? school.schoolName,
          issue:
            scopeIssue(scope) ||
            (eligible.some((e) => e.code === code)
              ? ""
              : "Cấp học, giới tính hoặc nhóm tuổi không phù hợp nội dung đã đăng ký."),
        },
      ];
    });
  });
}
