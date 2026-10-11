import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadEnvironments } from "./environment.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
function report(name, passed, fix) {
  console.log(
    `${passed ? "PASS" : "FAIL"}: ${name}${passed ? "" : `; ${fix}`}`,
  );
  if (!passed) failures++;
}
report(
  "Node.js 24",
  process.versions.node.split(".")[0] === "24",
  "activate Node 24",
);
const npm = spawnSync("npm", ["--version"], { encoding: "utf8" });
report(
  "npm 11",
  npm.status === 0 && npm.stdout.trim().split(".")[0] === "11",
  "use npm 11",
);
report(
  "Dependencies",
  existsSync(join(root, "node_modules/fastify/package.json")),
  "run npm ci",
);
for (const path of [
  "apps/api/dist/server.js",
  "apps/worker/dist/worker.js",
  "apps/web/dist/index.html",
]) {
  report(path, existsSync(join(root, path)), "run npm run build");
}
try {
  loadEnvironments(join(root, "infra/env"));
  report("Dev/staging scope and ports", true);
} catch {
  report(
    "Dev/staging scope and ports",
    false,
    "run npm run env:init, then check local configuration",
  );
}
console.log(
  "SQL, Google and Netlify checks are deferred; no credential values were printed.",
);
process.exitCode = failures ? 1 : 0;
