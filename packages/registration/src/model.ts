export class RegistrationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export function ensure(
  condition: unknown,
  code: string,
  message: string,
): asserts condition {
  if (!condition) throw new RegistrationError(code, message);
}
export function immutable<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(immutable);
    Object.freeze(value);
  }
  return value;
}
export type Sex = "male" | "female";
export interface Rules {
  gender?: Sex | "mixed";
  schoolQuota?: number;
  maxEventsPerSport?: number;
  categoryLimits?: Record<string, number>;
  minAge?: number;
  maxAge?: number;
  minGrade?: number;
  maxGrade?: number;
  minMembers?: number;
  maxMembers?: number;
  minEachSex?: number;
  maxEachSex?: number;
  requireIndividual?: boolean;
}
export interface CatalogNode {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  kind: "sport" | "group" | "event";
  order: number;
  active: boolean;
  participantKind?: "athlete" | "team";
  category?: string;
  rules: Rules;
}
export interface CatalogSnapshot {
  id: string;
  editionId: string;
  sourceVersion: number;
  nodes: readonly CatalogNode[];
}
export interface Student {
  id: string;
  schoolId: string;
  studentCode: string;
  name: string;
  sex: Sex;
  birthYear: number;
  grade: number;
  profileStatus: "approved" | "pending";
}
export interface Athlete extends Student {
  editionId: string;
  studentId: string;
  athleteCode: string;
  version: number;
}
export interface Team {
  id: string;
  editionId: string;
  schoolId: string;
  eventId: string;
  name: string;
  memberIds: readonly string[];
}
export type Participant =
  { kind: "athlete"; athleteId: string } | { kind: "team"; teamId: string };
export interface Revision {
  id: string;
  version: number;
  status: "draft" | "submitted" | "approved" | "returned";
  participant: Participant;
  reason?: string;
}
export interface Registration {
  id: string;
  editionId: string;
  schoolId: string;
  eventId: string;
  version: number;
  revisions: readonly Revision[];
  approvedRevisionId: string | null;
}
export interface Registry {
  editionId: string;
  year: number;
  version: number;
  registrationOpen: boolean;
  deadline: string;
  schoolCodes: Record<string, string>;
  athleteSequenceWidth: number;
  masterListPresent: boolean;
  catalog: CatalogSnapshot;
  students: readonly Student[];
  athletes: readonly Athlete[];
  teams: readonly Team[];
  registrations: readonly Registration[];
}
export const currentRevision = (r: Registration) => {
  const current = r.revisions.at(-1);
  ensure(current, "INVALID_STATE", "Đăng ký thiếu revision.");
  return current;
};
export const approvedRevision = (r: Registration) =>
  r.revisions.find((v) => v.id === r.approvedRevisionId) ?? null;
export const participantKey = (p: Participant) =>
  p.kind === "athlete" ? `athlete:${p.athleteId}` : `team:${p.teamId}`;
