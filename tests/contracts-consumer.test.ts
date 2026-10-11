import type { components, operations } from "@hkpd/contracts";
import { expect, expectTypeOf, it } from "vitest";

type Confirmation = operations["confirmSubmission"];

it("exports workspace DTOs and typed command headers for consumers", () => {
  const parameters: Confirmation["parameters"] = {
    path: { edition_id: "00000000-0000-4000-8000-000000000001" },
    header: { "Idempotency-Key": "00000000-0000-4000-8000-000000000015" },
  };
  const body: Confirmation["requestBody"]["content"]["application/json"] = {
    submission_id: "00000000-0000-4000-8000-000000000009",
    submission_version: 2,
    base_official_version: 1,
  };
  expectTypeOf(body).toEqualTypeOf<
    components["schemas"]["ConfirmSubmission"]
  >();
  expect(parameters.header["Idempotency-Key"]).toBeDefined();
  expect(JSON.parse(JSON.stringify(body))).toEqual(body);
});
