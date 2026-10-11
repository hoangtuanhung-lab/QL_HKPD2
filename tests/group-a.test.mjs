import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createDataset,
  assertDatasetIntegrity,
} from "../packages/test-fixtures/a05/dataset.mjs";
import { contractValidators } from "../scripts/contracts-schema.mjs";

const validators = contractValidators(
  JSON.parse(readFileSync("docs/api/core.openapi.json", "utf8")),
);
describe("A05 synthetic acceptance inputs", () => {
  it("reproduces 7 schools, 500 scoped athletes and one deferred folder per athlete", () => {
    const data = createDataset();
    expect(data).toEqual(createDataset());
    expect(data.schools).toHaveLength(7);
    expect(data.athletes).toHaveLength(500);
    expect(data.folders).toHaveLength(500);
    expect(() => assertDatasetIntegrity(data)).not.toThrow();
    for (const athlete of data.athletes)
      expect(validators.Athlete(athlete)).toBe(true);
    for (const folder of data.folders)
      expect(validators.AthleteFolder(folder)).toBe(true);
    expect(
      createDataset({ schoolCount: 8, athleteCount: 501 }).athletes,
    ).toHaveLength(501);
  });
  it("keeps one code sequence across both levels at each of two inter-level schools", () => {
    const data = createDataset();
    for (const school of data.schools.slice(0, 2)) {
      const athletes = data.athletes.filter(
        (athlete) => athlete.school_id === school.id,
      );
      const levels = new Set(
        data.profiles
          .filter((profile) => profile.school_id === school.id)
          .map((profile) => profile.level),
      );
      expect([...levels].sort()).toEqual(["primary", "secondary"]);
      expect(athletes.map((athlete) => athlete.athlete_code)).toEqual(
        athletes.map(
          (_, index) => `${school.code}.${String(index + 1).padStart(3, "0")}`,
        ),
      );
    }
  });
  it("rejects a schema-valid duplicate code and cross-school profile or cross-edition athlete", () => {
    const data = createDataset();
    const sameSchool = data.athletes.find(
      (athlete, index) =>
        index > 0 && athlete.school_id === data.athletes[0].school_id,
    );
    sameSchool.athlete_code = data.athletes[0].athlete_code;
    expect(validators.Athlete(sameSchool)).toBe(true);
    expect(() => assertDatasetIntegrity(data)).toThrow(/Duplicate/);
    const profileMismatch = createDataset();
    profileMismatch.athletes[0].student_id =
      profileMismatch.athletes[1].student_id;
    expect(() => assertDatasetIntegrity(profileMismatch)).toThrow(/scope/);
    const editionMismatch = createDataset();
    editionMismatch.athletes[0].edition_id = editionMismatch.athletes[1].id;
    expect(() => assertDatasetIntegrity(editionMismatch)).toThrow(/scope/);
  });
  it("detects missing, duplicate or wrongly addressed athlete folders", () => {
    const missing = createDataset();
    missing.folders.pop();
    expect(() => assertDatasetIntegrity(missing)).toThrow(/Missing/);
    const duplicate = createDataset();
    duplicate.folders[1] = structuredClone(duplicate.folders[0]);
    expect(() => assertDatasetIntegrity(duplicate)).toThrow(/duplicate/);
    const wrong = createDataset();
    wrong.folders[0].logical_key = wrong.folders[1].logical_key;
    expect(validators.AthleteFolder(wrong.folders[0])).toBe(true);
    expect(() => assertDatasetIntegrity(wrong)).toThrow(/Invalid/);
  });
  it("provides the 3/4/5 and 6/7/8/9 boundary inputs without executing a tournament engine", () => {
    const { cohorts } = createDataset();
    expect(
      cohorts.map((cohort) => [
        cohort.athlete_ids.length,
        cohort.expected_format,
        cohort.expected_bracket_capacity,
      ]),
    ).toEqual([
      [3, "round_robin", null],
      [4, "round_robin", null],
      [5, "round_robin", null],
      [6, "knockout", 8],
      [7, "knockout", 8],
      [8, "knockout", 8],
      [9, "knockout", 16],
    ]);
    const data = createDataset();
    data.cohorts[0].athlete_ids[0] = "unknown";
    expect(() => assertDatasetIntegrity(data)).toThrow(/cohort/);
  });
});
