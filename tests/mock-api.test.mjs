import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { createMockApp } from "../scripts/mock-api-app.mjs";
import { contractValidators } from "../scripts/contracts-schema.mjs";

const spec = JSON.parse(readFileSync("docs/api/core.openapi.json", "utf8"));
const fixtures = JSON.parse(
  readFileSync("packages/test-fixtures/a03/core.json", "utf8"),
);
const validators = contractValidators(spec);
const value = (schema) =>
  structuredClone(fixtures.find((fixture) => fixture.schema === schema).value);
const edition = value("Edition").id;
const athlete = value("Athlete").id;
const secondEdition = "00000000-0000-4000-8000-000000000101";
const secondAthlete = "00000000-0000-4000-8000-000000000104";
const apps = [];
function app(data = fixtures, document = spec) {
  const instance = createMockApp(document, data);
  apps.push(instance);
  return instance;
}
afterEach(async () => {
  await Promise.all(apps.splice(0).map((instance) => instance.close()));
});

describe("A03 synthetic read-only HTTP mock", () => {
  it("serves every GET operation as a schema-valid, visibly synthetic response", async () => {
    const instance = app();
    let count = 0;
    for (const [path, methods] of Object.entries(spec.paths)) {
      if (!methods.get) continue;
      const operation = methods.get;
      const responseSchema = operation.responses["200"].content[
        "application/json"
      ].schema.$ref
        .split("/")
        .at(-1);
      const itemSchema = spec.components.schemas[
        responseSchema
      ].properties?.items?.items?.$ref
        ?.split("/")
        .at(-1);
      const seed = value(itemSchema ?? responseSchema);
      const url = path.replace(
        /\{([^}]+)\}/g,
        (_match, parameter) =>
          seed[operation["x-mock-path-bindings"][parameter]],
      );
      const response = await instance.inject(url);
      expect(response.statusCode, operation.operationId).toBe(200);
      expect(
        validators[responseSchema](response.json()),
        operation.operationId,
      ).toBe(true);
      expect(response.headers["x-hkpd-mock"]).toBe("synthetic-read-only");
      expect(response.headers["cache-control"]).toBe("no-store");
      count++;
    }
    expect(count).toBe(13);
  });
  it("filters lists and details by fixture edition, including folder's athlete binding", async () => {
    const additional = [
      { schema: "Edition", value: { ...value("Edition"), id: secondEdition } },
      {
        schema: "Athlete",
        value: {
          ...value("Athlete"),
          id: secondAthlete,
          edition_id: secondEdition,
        },
      },
    ];
    const instance = app([...fixtures, ...additional]);
    const list = (
      await instance.inject(`/v1/editions/${secondEdition}/athletes`)
    ).json();
    expect(list.items.map((item) => item.id)).toEqual([secondAthlete]);
    expect(
      (
        await instance.inject(
          `/v1/editions/${edition}/athletes/${secondAthlete}`,
        )
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await instance.inject(
          `/v1/editions/${secondEdition}/athletes/${athlete}/folder`,
        )
      ).statusCode,
    ).toBe(404);
    const folder = (
      await instance.inject(
        `/v1/editions/${edition}/athletes/${athlete}/folder`,
      )
    ).json();
    expect(folder.athlete_id).toBe(athlete);
    expect(folder.logical_key).toBe(`${edition}/${athlete}`);
    expect(folder.storage_status).toBe("deferred");
  });
  it("supports pagination and rejects cursor reuse for another operation or edition", async () => {
    const extra = {
      schema: "Athlete",
      value: { ...value("Athlete"), id: secondAthlete },
    };
    const instance = app([
      ...fixtures,
      extra,
      { schema: "Edition", value: { ...value("Edition"), id: secondEdition } },
    ]);
    const path = `/v1/editions/${edition}/athletes`;
    const first = (await instance.inject(`${path}?limit=1`)).json();
    expect(first.items.map((item) => item.id)).toEqual([athlete]);
    expect(first.next_cursor).toBeTypeOf("string");
    expect(first.next_cursor).not.toContain(edition);
    const next = (
      await instance.inject(`${path}?limit=1&cursor=${first.next_cursor}`)
    ).json();
    expect(next.items.map((item) => item.id)).toEqual([secondAthlete]);
    expect(next.next_cursor).toBeNull();
    for (const wrongPath of [
      `/v1/editions/${secondEdition}/athletes`,
      `/v1/editions/${edition}/events`,
    ]) {
      expect(
        (await instance.inject(`${wrongPath}?cursor=${first.next_cursor}`))
          .statusCode,
      ).toBe(400);
    }
    expect((await instance.inject(`${path}?cursor=unknown`)).statusCode).toBe(
      400,
    );
  });
  it("never provides command effects or persists submitted data", async () => {
    const instance = app();
    const path = `/v1/editions/${edition}/athletes`;
    const before = (await instance.inject(path)).json();
    for (const [route, methods] of Object.entries(spec.paths)) {
      if (!methods.post) continue;
      const response = await instance.inject({
        method: "POST",
        url: route
          .replaceAll("{edition_id}", edition)
          .replaceAll("{resource_id}", athlete),
        payload: { display_name: "SHOULD NEVER BE SAVED" },
      });
      expect(response.statusCode).toBe(404);
      expect(validators.Problem(response.json())).toBe(true);
    }
    expect((await instance.inject(path)).json()).toEqual(before);
    expect((await instance.inject("/health/mock")).json().authentication).toBe(
      "not_implemented",
    );
  });
  it("returns only the public whitelist and rejects attempts to request extra private fields", async () => {
    const instance = app();
    const path = `/v1/public/editions/${edition}/results`;
    const response = (await instance.inject(path)).json();
    expect(response.items).toEqual([value("PublicResult")]);
    expect(response.items[0]).not.toHaveProperty("student_id");
    expect(
      (await instance.inject(`${path}?include=submissions`)).statusCode,
    ).toBe(400);
  });
  it.each(["0", "101", "-1", "1.5", "01", "NaN", "1&limit=2"])(
    "rejects invalid/ambiguous limit %s without changing fixtures",
    async (limit) => {
      const instance = app();
      const response = await instance.inject(
        `/v1/editions/${edition}/athletes?limit=${limit}`,
      );
      expect(response.statusCode).toBe(400);
      expect(validators.Problem(response.json())).toBe(true);
    },
  );
  it("rejects malformed IDs and valid IDs outside the synthetic dataset", async () => {
    const instance = app();
    expect(
      (await instance.inject("/v1/editions/not-an-id/athletes")).statusCode,
    ).toBe(400);
    expect(
      (await instance.inject(`/v1/editions/${secondEdition}/athletes`))
        .statusCode,
    ).toBe(404);
  });
  it("fails startup when fixtures or generated route bindings no longer fit the contract", () => {
    const invalid = structuredClone(fixtures);
    invalid.find((fixture) => fixture.schema === "Athlete").value.athlete_code =
      1.012;
    expect(() => createMockApp(spec, invalid)).toThrow("Invalid mock fixture");
    const changed = structuredClone(spec);
    changed.paths["/v1/editions/{edition_id}/athletes"].get[
      "x-mock-path-bindings"
    ].edition_id = "nonexistent";
    expect(() => createMockApp(changed, fixtures)).toThrow(
      "Invalid mock binding field",
    );
  });
});
