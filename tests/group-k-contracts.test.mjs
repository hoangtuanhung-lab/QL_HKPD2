import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { contractValidators } from "../scripts/contracts-schema.mjs";
import {
  submitPreview,
  confirmPreview,
  publicValue,
} from "../packages/results/src/index.ts";
import { match, score, ids, clock } from "./group-k-fixtures.ts";
const validators = contractValidators(
  JSON.parse(readFileSync("docs/api/core.openapi.json", "utf8")),
);
it("K01 submission and official snapshots validate A03, new external rank is additive", () => {
  const s = submitPreview(match(), score(), ids.ref, clock(), ids.athleteA);
  expect(validators.Submission(s.submissions[0])).toBe(true);
  const o = confirmPreview(
    s,
    {
      submission_id: ids.athleteA,
      submission_version: 1,
      base_official_version: 0,
    },
    ids.leader,
    clock(),
    ids.athleteB,
  );
  expect(validators.OfficialResult(o.official)).toBe(true);
  expect(validators.ResultValue({ kind: "external_rank", rank: 3 })).toBe(true);
  expect(validators.ResultValue({ kind: "external_rank", rank: 0 })).toBe(
    false,
  );
  expect(
    validators.ResultValue({ kind: "score", scored: 0, conceded: 1 }),
  ).toBe(true);
});
it("K09 value whitelist strips private extras even from malformed repository records", () => {
  expect(
    publicValue({
      kind: "score",
      scored: 2,
      conceded: 1,
      cccd: "private-marker",
    }),
  ).toEqual({ kind: "score", scored: 2, conceded: 1 });
  expect(
    publicValue({
      kind: "sets",
      sets: [{ scored: 1, conceded: 0, token: "private-marker" }],
    }),
  ).toEqual({ kind: "sets", sets: [{ scored: 1, conceded: 0 }] });
});
