// Synthetic identities only. Never imported by application startup or production seed.
const id = (number) =>
  `a0500000-0000-4000-8000-${String(number).padStart(12, "0")}`;

export function createDataset({ schoolCount = 7, athleteCount = 500 } = {}) {
  if (!Number.isInteger(schoolCount) || schoolCount < 1 || schoolCount > 99)
    throw new RangeError("Fixture schoolCount must be 1–99");
  if (
    !Number.isInteger(athleteCount) ||
    athleteCount < 0 ||
    athleteCount > schoolCount * 999
  )
    throw new RangeError(
      "Fixture athleteCount exceeds three-digit test code space",
    );
  const editionId = id(1);
  const schools = Array.from({ length: schoolCount }, (_, index) => ({
    id: id(100 + index),
    display_name: `TRƯỜNG GIẢ LẬP ${String(index + 1).padStart(2, "0")}`,
    code: String(index + 1).padStart(2, "0"),
    levels:
      index < 2
        ? ["primary", "secondary"]
        : [index % 2 ? "primary" : "secondary"],
  }));
  const profiles = [];
  const athletes = Array.from({ length: athleteCount }, (_, index) => {
    const school = schools[index % schoolCount];
    const sequence = Math.floor(index / schoolCount) + 1;
    const level = school.levels[(sequence - 1) % school.levels.length];
    const studentId = id(20000 + index);
    profiles.push({ id: studentId, school_id: school.id, level });
    return {
      id: id(10000 + index),
      edition_id: editionId,
      school_id: school.id,
      student_id: studentId,
      display_name: `VĐV GIẢ LẬP ${String(index + 1).padStart(4, "0")}`,
      athlete_code: `${school.code}.${String(sequence).padStart(3, "0")}`,
      version: 1,
    };
  });
  const folders = athletes.map((athlete, index) => ({
    id: id(30000 + index),
    edition_id: editionId,
    athlete_id: athlete.id,
    logical_key: `${editionId}/${athlete.id}`,
    storage_status: "deferred",
    version: 1,
  }));
  const cohorts = [3, 4, 5, 6, 7, 8, 9]
    .filter((count) => count <= athleteCount)
    .map((count) => ({
      id: `individual-combat-${count}`,
      participant_kind: "individual_combat",
      athlete_ids: athletes.slice(0, count).map((athlete) => athlete.id),
      expected_format: count <= 5 ? "round_robin" : "knockout",
      // Acceptance oracle from Q190, not an implemented tournament engine.
      expected_bracket_capacity:
        count <= 5 ? null : 2 ** Math.ceil(Math.log2(count)),
      source_question_ids: ["PDF-Q076", "PDF-Q190"],
    }));
  return {
    synthetic: true,
    fixture_version: "A05-v1",
    edition_id: editionId,
    schools,
    profiles,
    athletes,
    folders,
    cohorts,
  };
}

export function assertDatasetIntegrity(dataset) {
  const schoolIds = new Set(dataset.schools.map((school) => school.id));
  const profiles = new Map(
    dataset.profiles.map((profile) => [profile.id, profile]),
  );
  const athleteIds = new Set();
  const codes = new Set();
  for (const athlete of dataset.athletes) {
    const key = `${athlete.edition_id}/${athlete.school_id}/${athlete.athlete_code}`;
    if (athleteIds.has(athlete.id) || codes.has(key))
      throw new Error("Duplicate athlete ID or scoped code");
    athleteIds.add(athlete.id);
    codes.add(key);
    if (
      athlete.edition_id !== dataset.edition_id ||
      !schoolIds.has(athlete.school_id) ||
      profiles.get(athlete.student_id)?.school_id !== athlete.school_id
    )
      throw new Error("Athlete reference outside edition/school/profile scope");
  }
  if (
    schoolIds.size !== dataset.schools.length ||
    profiles.size !== dataset.profiles.length
  )
    throw new Error("Duplicate school/profile ID");
  const folderKeys = new Set();
  const folderIds = new Set();
  for (const folder of dataset.folders) {
    if (
      !athleteIds.has(folder.athlete_id) ||
      folder.edition_id !== dataset.edition_id ||
      folder.logical_key !== `${dataset.edition_id}/${folder.athlete_id}` ||
      folderKeys.has(folder.logical_key) ||
      folderIds.has(folder.id)
    )
      throw new Error("Invalid or duplicate athlete folder");
    folderKeys.add(folder.logical_key);
    folderIds.add(folder.id);
  }
  if (folderKeys.size !== athleteIds.size)
    throw new Error("Missing athlete folder");
  for (const cohort of dataset.cohorts) {
    if (
      new Set(cohort.athlete_ids).size !== cohort.athlete_ids.length ||
      cohort.athlete_ids.some((athleteId) => !athleteIds.has(athleteId))
    )
      throw new Error("Invalid cohort participant reference");
  }
}
