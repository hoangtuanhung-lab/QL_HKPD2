import { expect, it } from "vitest";
import { confirmEvent } from "../packages/integration/src/index.ts";
import { approvedRegistry, bundle, confirm } from "./cross-group-fixtures.ts";
it("R global student IDs reserve unresolved KO slots across sports; DTOs keep UUID sources and exclude stale official IDs", async () => {
  const { projectEventMatches, schedulePeopleForMatch } =
    await import("../packages/integration/src/index.ts");
  const { contractValidators } =
    await import("../scripts/contracts-schema.mjs");
  const { readFileSync } = await import("node:fs");
  const registry = approvedRegistry(),
    b = confirmEvent(bundle(registry), registry, 1);
  const finalId = b.competition.draw.rounds.at(-1).matches[0].id;
  expect(new Set(schedulePeopleForMatch(b, finalId, []))).toEqual(
    new Set(registry.athletes.map((a) => a.studentId)),
  );
  const { complete } = await import("./cross-group-fixtures.ts");
  const records = complete(b);
  expect(schedulePeopleForMatch(b, finalId, records)).toHaveLength(2);
  const validate = contractValidators(
    JSON.parse(readFileSync("docs/api/core.openapi.json", "utf8")),
  ).Match;
  expect(projectEventMatches(b, records).every((dto) => validate(dto))).toBe(
    true,
  );
  const source = records.find((m) =>
    b.competition.draw.rounds[0].matches.some((d) => b.matchIds[d.id] === m.id),
  );
  const changed = records.map((m) =>
    m.id === source.id ? confirm(m, 0, 3) : m,
  );
  expect(
    projectEventMatches(b, changed).find((m) => m.id === b.matchIds[finalId])
      ?.official_result_id,
  ).toBe(null);
});
