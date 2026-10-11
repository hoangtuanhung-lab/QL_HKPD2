import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { contractValidators } from "../scripts/contracts-schema.mjs";
import {
  athleteDto,
  registrationDto,
} from "../packages/registration/src/projection.ts";
const validators = contractValidators(
  JSON.parse(readFileSync("docs/api/core.openapi.json", "utf8")),
);
it("R02/R06 DTO projections validate against unchanged A03 and keep codes as strings", () => {
  const id = randomUUID(),
    editionId = randomUUID(),
    schoolId = randomUUID(),
    studentId = randomUUID();
  const athlete = {
    id,
    editionId,
    schoolId,
    studentId,
    name: "VĐV tổng hợp",
    studentCode: "001",
    birthYear: 2014,
    grade: 6,
    sex: "male",
    profileStatus: "approved",
    athleteCode: "01.012",
    version: 1,
  };
  expect(validators.Athlete(athleteDto(athlete))).toBe(true);
  for (const participant of [
    { kind: "athlete", athleteId: id },
    { kind: "team", teamId: randomUUID() },
  ]) {
    const registration = {
      id: randomUUID(),
      editionId,
      schoolId,
      eventId: randomUUID(),
      version: 2,
      approvedRevisionId: randomUUID(),
      revisions: [
        { id: randomUUID(), version: 2, status: "draft", participant },
      ],
    };
    expect(validators.Registration(registrationDto(registration))).toBe(true);
  }
});
