import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { format } from "prettier";
import { contractValidators } from "./contracts-schema.mjs";

const source = "docs/api/core.openapi.json";
const document = JSON.parse(await readFile(source, "utf8"));
const validators = contractValidators(document);
const fixtures = JSON.parse(
  await readFile("packages/test-fixtures/a03/core.json", "utf8"),
);
for (const fixture of fixtures) {
  const validate = validators[fixture.schema];
  assert.ok(validate, `Unknown schema: ${fixture.schema}`);
  assert.ok(
    document.components.schemas[fixture.schema].examples?.some(
      (example) => JSON.stringify(example) === JSON.stringify(fixture.value),
    ),
    `Fixture differs from OpenAPI examples: ${fixture.name}`,
  );
  assert.ok(
    validate(fixture.value),
    `${fixture.name}: ${JSON.stringify(validate.errors)}`,
  );
}
const operations = new Set();
function checkRefs(value) {
  if (!value || typeof value !== "object") return;
  if (value.$ref) {
    assert.ok(
      value.$ref.startsWith("#/"),
      "Only local, reviewed refs are allowed",
    );
    assert.ok(
      value.$ref
        .slice(2)
        .split("/")
        .reduce((item, key) => item?.[key], document),
      `Unresolved reference ${value.$ref}`,
    );
  }
  for (const child of Object.values(value)) checkRefs(child);
}
checkRefs(document);
for (const [path, methods] of Object.entries(document.paths)) {
  for (const operation of Object.values(methods)) {
    assert.ok(!operations.has(operation.operationId), "Duplicate operationId");
    operations.add(operation.operationId);
    assert.ok(operation["x-owner"] && operation["x-policy"]);
    for (const placeholder of path.matchAll(/\{([^}]+)\}/g)) {
      assert.ok(
        operation.parameters.some((parameter) => {
          const resolved =
            document.components.parameters[parameter.$ref.split("/").at(-1)];
          return (
            resolved.in === "path" &&
            resolved.name === placeholder[1] &&
            resolved.required
          );
        }),
        `Missing path parameter ${path}`,
      );
    }
    if (operation.requestBody) {
      assert.ok(
        operation.parameters.some((p) => p.$ref.endsWith("/IdempotencyKey")),
      );
      assert.ok(operation.responses["409"], "Commands must define conflicts");
    }
    if (!path.startsWith("/v1/public/")) assert.ok(operation.security.length);
  }
}
const temporary = await mkdtemp(join(tmpdir(), "hkpd-contracts-"));
try {
  const output = join(temporary, "generated.ts");
  const result = spawnSync(
    process.execPath,
    ["node_modules/openapi-typescript/bin/cli.js", source, "-o", output],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  const expected = await format(await readFile(output, "utf8"), {
    parser: "typescript",
  });
  assert.equal(
    await readFile("packages/contracts/src/generated.ts", "utf8"),
    expected,
    "DTO outdated: run npm run contracts:generate, then commit the generated file",
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
console.log(
  `A03: ${Object.keys(validators).length} schemas, ${operations.size} operations, ${fixtures.length} synthetic fixtures; generated DTOs synchronized.`,
);
