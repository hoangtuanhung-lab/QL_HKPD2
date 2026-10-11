import { resolveEvent } from "./catalog.js";
import {
  approvedRevision,
  currentRevision,
  participantKey,
  type Athlete,
  type Participant,
  type Registration,
  type Registry,
} from "./model.js";
export interface RuleIssue {
  code: string;
  message: string;
}
export interface RuleResult {
  valid: boolean;
  errors: RuleIssue[];
  warnings: RuleIssue[];
}
export function members(
  state: Registry,
  participant: Participant,
): readonly Athlete[] {
  if (participant.kind === "athlete")
    return state.athletes.filter((a) => a.id === participant.athleteId);
  const team = state.teams.find((t) => t.id === participant.teamId);
  return team
    ? team.memberIds.flatMap((id) => state.athletes.filter((a) => a.id === id))
    : [];
}
export function reservations(registration: Registration) {
  const revisions = [
    approvedRevision(registration),
    currentRevision(registration),
  ].filter((r) => r && (r.status === "approved" || r.status === "submitted"));
  return revisions
    .flatMap((r) => (r ? [r.participant] : []))
    .filter(
      (p, i, all) =>
        all.findIndex((q) => participantKey(q) === participantKey(p)) === i,
    );
}
export function validateRegistration(
  state: Registry,
  registration: Registration,
  phase: "draft" | "submit" | "approve",
): RuleResult {
  const errors: RuleIssue[] = [],
    warnings: RuleIssue[] = [];
  const error = (code: string, message: string) =>
    errors.push({ code, message });
  const warning = (code: string, message: string) =>
    warnings.push({ code, message });
  if (
    registration.editionId !== state.editionId ||
    state.catalog.editionId !== state.editionId
  )
    error("SCOPE_MISMATCH", "Đăng ký/danh mục không cùng kỳ giải.");
  const participant = currentRevision(registration).participant;
  const { node, sportId, rules, active } = resolveEvent(
    state.catalog,
    registration.eventId,
  );
  if (!active) error("EVENT_SUSPENDED", "Nội dung hoặc môn đã ngừng tổ chức.");
  if (node.participantKind !== participant.kind)
    error("PARTICIPANT_KIND", "Loại VĐV/đội không phù hợp nội dung.");
  if (
    phase !== "draft" &&
    (rules.schoolQuota === undefined || rules.maxEventsPerSport === undefined)
  )
    error(
      "RULE_NOT_CONFIGURED",
      "Chưa chốt hạn mức trường hoặc nội dung mỗi môn.",
    );
  const people = members(state, participant);
  if (participant.kind === "athlete" && people.length !== 1)
    error("ATHLETE_NOT_FOUND", "Không tìm thấy VĐV.");
  if (participant.kind === "team") {
    const team = state.teams.find((t) => t.id === participant.teamId);
    if (
      !team ||
      team.schoolId !== registration.schoolId ||
      team.editionId !== state.editionId ||
      team.eventId !== registration.eventId ||
      new Set(team.memberIds).size !== team.memberIds.length ||
      people.length !== team.memberIds.length
    )
      error("TEAM_SCOPE", "Thành viên đội thiếu, trùng hoặc sai phạm vi.");
    if (rules.minMembers === undefined || rules.maxMembers === undefined)
      error("TEAM_RULE_MISSING", "Đội cần cấu hình cơ cấu được chốt.");
    else if (
      people.length < rules.minMembers ||
      people.length > rules.maxMembers
    )
      (phase === "draft" ? warning : error)(
        "TEAM_SIZE",
        "Đội chưa đủ cơ cấu theo cấu hình.",
      );
    if (rules.gender === "mixed") {
      if (rules.minEachSex === undefined || rules.maxEachSex === undefined)
        error("TEAM_RULE_MISSING", "Đội hỗn hợp thiếu cơ cấu mỗi giới.");
      else
        for (const sex of ["male", "female"] as const) {
          const count = people.filter((a) => a.sex === sex).length;
          if (count < rules.minEachSex || count > rules.maxEachSex)
            (phase === "draft" ? warning : error)(
              "TEAM_GENDER_COUNT",
              "Đội hỗn hợp chưa đủ số lượng mỗi giới.",
            );
        }
    }
  }
  const other = state.registrations.filter((r) => r.id !== registration.id);
  for (const person of people) {
    if (
      person.editionId !== state.editionId ||
      person.schoolId !== registration.schoolId
    )
      error("ATHLETE_SCOPE", "VĐV không thuộc trường/kỳ giải.");
    if (rules.gender && rules.gender !== "mixed" && rules.gender !== person.sex)
      error("GENDER", "Giới tính không phù hợp nội dung.");
    if (phase !== "draft" && person.profileStatus !== "approved")
      (phase === "approve" ? error : warning)(
        "PROFILE_PENDING",
        "Hồ sơ gốc mới cần được duyệt trước thi đấu.",
      );
    const age = state.year - person.birthYear;
    if (
      (rules.minAge !== undefined && age < rules.minAge) ||
      (rules.maxAge !== undefined && age > rules.maxAge)
    )
      warning(
        "AGE_WARNING",
        "Tuổi theo năm giải ngoài khoảng cấu hình; cần rà soát.",
      );
    if (
      (rules.minGrade !== undefined && person.grade < rules.minGrade) ||
      (rules.maxGrade !== undefined && person.grade > rules.maxGrade)
    )
      warning("GRADE_WARNING", "Lớp ngoài khoảng cấu hình; cần rà soát.");
    const events = new Set<string>([registration.eventId]);
    for (const r of other)
      for (const p of reservations(r))
        if (members(state, p).some((a) => a.id === person.id))
          events.add(r.eventId);
    // An old approved revision remains effective while its replacement is pending.
    const old = approvedRevision(registration);
    if (old && members(state, old.participant).some((a) => a.id === person.id))
      events.add(registration.eventId);
    const resolved = [...events].map((id) => resolveEvent(state.catalog, id));
    if (new Set(resolved.map((e) => e.sportId)).size > 2)
      error("THIRD_SPORT", "Mỗi VĐV tối đa hai môn.");
    const sameSport = resolved.filter((e) => e.sportId === sportId);
    if (
      rules.maxEventsPerSport !== undefined &&
      sameSport.length > rules.maxEventsPerSport
    )
      error("SPORT_EVENT_LIMIT", "Vượt số nội dung mỗi môn.");
    for (const [category, limit] of Object.entries(rules.categoryLimits ?? {}))
      if (sameSport.filter((e) => e.node.category === category).length > limit)
        error("CATEGORY_LIMIT", "Vượt giới hạn nhóm nội dung theo cấu hình.");
    if (
      participant.kind === "team" &&
      rules.requireIndividual &&
      !other.some(
        (r) =>
          resolveEvent(state.catalog, r.eventId).sportId === sportId &&
          reservations(r).some(
            (p) => p.kind === "athlete" && p.athleteId === person.id,
          ),
      )
    )
      (phase === "draft" ? warning : error)(
        "INDIVIDUAL_REQUIRED",
        "Thành viên phải có đăng ký cá nhân cùng môn đã gửi/duyệt.",
      );
  }
  const used = other.filter(
    (r) =>
      r.schoolId === registration.schoolId &&
      r.eventId === registration.eventId &&
      reservations(r).length,
  );
  if (rules.schoolQuota !== undefined && used.length + 1 > rules.schoolQuota)
    error("SCHOOL_QUOTA", "Vượt hạn mức trường/nội dung.");
  if (
    participant.kind === "team" &&
    other.some(
      (r) =>
        r.schoolId === registration.schoolId &&
        r.eventId === registration.eventId,
    )
  )
    error("TEAM_UNIQUE", "Mỗi trường chỉ một đôi/đội trong nội dung.");
  if (
    other.some(
      (r) =>
        r.eventId === registration.eventId &&
        [currentRevision(r).participant, ...reservations(r)].some(
          (p) => participantKey(p) === participantKey(participant),
        ),
    )
  )
    error("DUPLICATE_REGISTRATION", "VĐV/đội đã có đăng ký nội dung này.");
  return { valid: !errors.length, errors, warnings };
}
