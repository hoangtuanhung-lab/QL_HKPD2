import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contractValidators } from "../scripts/contracts-schema.mjs";

const spec = JSON.parse(readFileSync("docs/api/core.openapi.json", "utf8"));
const fixtures = JSON.parse(
  readFileSync("packages/test-fixtures/a03/core.json", "utf8"),
);
const validators = contractValidators(spec);
const sample = (schema) =>
  structuredClone(fixtures.find((f) => f.schema === schema).value);

describe("A03: prevent unsafe contract inputs and projections", () => {
  it("preserves display code zeros and exact decimal precision", () => {
    expect(validators.AthleteCode("01.012")).toBe(true);
    expect(validators.AthleteCode(1.012)).toBe(false);
    expect(validators.ResultValue({ kind: "time", seconds: "12.340" })).toBe(
      true,
    );
    expect(validators.ResultValue({ kind: "time", seconds: 12.34 })).toBe(
      false,
    );
    expect(validators.ResultValue({ kind: "time", seconds: "-1.00" })).toBe(
      false,
    );
  });
  it("rejects client-controlled official scores, actor and awards in confirmation", () => {
    const input = sample("ConfirmSubmission");
    expect(validators.ConfirmSubmission(input)).toBe(true);
    for (const field of [
      "payload",
      "winner_id",
      "medals",
      "total_points",
      "confirmed_by",
    ]) {
      expect(
        validators.ConfirmSubmission({
          ...input,
          [field]: sample("Submission").payload,
        }),
      ).toBe(false);
    }
  });
  it("requires exact submission and official versions, allowing zero only before first official", () => {
    const input = sample("ConfirmSubmission");
    expect(
      validators.ConfirmSubmission({ ...input, submission_version: 0 }),
    ).toBe(false);
    expect(
      validators.ConfirmSubmission({ ...input, base_official_version: 0 }),
    ).toBe(true);
    expect(
      validators.ConfirmSubmission({ ...input, base_official_version: -1 }),
    ).toBe(false);
    delete input.submission_version;
    expect(validators.ConfirmSubmission(input)).toBe(false);
    expect(validators.VersionCommand({ base_version: "2" })).toBe(false);
  });
  it("cannot encode a ghost slot as an athlete", () => {
    expect(validators.MatchSlot({ kind: "ghost" })).toBe(true);
    expect(
      validators.MatchSlot({ kind: "ghost", athlete_id: sample("Athlete").id }),
    ).toBe(false);
    expect(validators.Participant({ kind: "ghost" })).toBe(false);
  });
  it("restricts edition copying to chosen configuration, excluding operational data", () => {
    const input = sample("CopyEdition");
    for (const section of [
      "athletes",
      "registrations",
      "results",
      "assignments",
      "schedules",
      "history",
    ]) {
      expect(
        validators.CopyEdition({ ...input, configuration_sections: [section] }),
      ).toBe(false);
    }
    expect(
      validators.CopyEdition({
        ...input,
        new_edition: { ...input.new_edition, status: "registration_open" },
      }),
    ).toBe(false);
  });
  it("rejects PII, pending state and private links in public projection", () => {
    const projection = sample("PublicResult");
    for (const field of [
      "student_id",
      "date_of_birth",
      "identity_number",
      "submission_id",
      "file_ids",
      "drive_url",
    ]) {
      expect(
        validators.PublicResult({ ...projection, [field]: "private" }),
      ).toBe(false);
    }
    expect(
      validators.PublicResult({
        ...projection,
        publication_status: "pending_confirmation",
      }),
    ).toBe(false);
    expect(validators.PublicResult(sample("Submission"))).toBe(false);
  });
  it("validates each synthetic example without mutating inputs", () => {
    for (const fixture of fixtures) {
      const original = structuredClone(fixture.value);
      expect(validators[fixture.schema](fixture.value), fixture.name).toBe(
        true,
      );
      expect(fixture.value).toEqual(original);
    }
  });
  it("keeps result formats distinct and rejects malformed units, IDs and timestamps", () => {
    expect(validators.ResultValue({ kind: "distance", seconds: "1.00" })).toBe(
      false,
    );
    expect(validators.ResultValue({ kind: "sets", sets: [] })).toBe(false);
    expect(
      validators.Athlete({ ...sample("Athlete"), edition_id: "not-an-id" }),
    ).toBe(false);
    expect(
      validators.Submission({
        ...sample("Submission"),
        created_at: "yesterday",
      }),
    ).toBe(false);
  });
});
