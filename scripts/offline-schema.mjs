import { readFile, writeFile } from "node:fs/promises";
import prettier from "prettier";
const doc = JSON.parse(await readFile("docs/api/core.openapi.json", "utf8"));
const defs = {};
function transform(value) {
  if (Array.isArray(value)) return value.map(transform);
  if (!value || typeof value !== "object") return value;
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "discriminator") continue;
    if (key === "$ref") {
      const name = child.split("/").at(-1);
      visit(name);
      result[key] = `#/$defs/${name}`;
    } else result[key] = transform(child);
  }
  return result;
}
function visit(name) {
  if (name in defs) return;
  defs[name] = null;
  defs[name] = transform(doc.components.schemas[name]);
}
visit("SyncSubmission");
visit("SyncReceipt");
const content = await prettier.format(
  `// Generated from A03; npm run offline:schema regenerates, offline:check detects drift.\nexport const schemas = ${JSON.stringify({ $defs: defs })};\n`,
  { parser: "typescript" },
);
const path = "packages/offline/src/schema.ts";
if (process.argv.includes("--check")) {
  if ((await readFile(path, "utf8")) !== content)
    throw new Error("Offline schema drift: npm run offline:schema");
} else await writeFile(path, content);
