import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const defaults = {
  dev: { APP_ENV: "dev", API_PORT: "3001", WEB_PORT: "5173" },
  staging: { APP_ENV: "staging", API_PORT: "3002", WEB_PORT: "5174" },
};
export function validateEnvironment(values, target) {
  if (!Object.hasOwn(defaults, target) || values.APP_ENV !== target)
    throw new Error("Environment scope mismatch.");
  for (const key of ["API_PORT", "WEB_PORT"]) {
    const port = Number(values[key]);
    if (
      !Number.isInteger(port) ||
      String(port) !== values[key] ||
      port < 1024 ||
      port > 65535
    )
      throw new Error(`Invalid ${key}.`);
  }
  if (values.API_PORT === values.WEB_PORT)
    throw new Error("API and web must use distinct ports.");
  return values;
}
export function initialize(directory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  for (const [target, values] of Object.entries(defaults)) {
    const path = join(directory, `${target}.env`);
    try {
      writeFileSync(
        path,
        Object.entries(values)
          .map(([key, value]) => `${key}=${value}\n`)
          .join(""),
        { flag: "wx", mode: 0o600 },
      );
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
  }
}
export function loadEnvironments(directory) {
  const result = {};
  for (const target of Object.keys(defaults)) {
    result[target] = validateEnvironment(
      parseEnv(readFileSync(join(directory, `${target}.env`), "utf8")),
      target,
    );
  }
  const ports = Object.values(result).flatMap((values) => [
    values.API_PORT,
    values.WEB_PORT,
  ]);
  if (new Set(ports).size !== ports.length)
    throw new Error("Dev and staging ports must be isolated.");
  return result;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const [command, target = "dev"] = process.argv.slice(2);
    const directory = join(root, "infra/env");
    if (command === "init") initialize(directory);
    const configurations = loadEnvironments(directory);
    if (command === "check" || command === "init") {
      console.log(
        "Dev/staging configuration validated; values are not logged.",
      );
    } else if (
      ["api", "worker", "web"].includes(command) &&
      Object.hasOwn(defaults, target)
    ) {
      const configuration = configurations[target];
      const options = {
        cwd: root,
        stdio: "inherit",
        env: { ...process.env, ...configuration },
      };
      const child =
        command === "web"
          ? spawnSync(
              "npm",
              [
                "run",
                target === "dev" ? "dev" : "preview",
                "--workspace",
                "@hkpd/web",
                "--",
                "--port",
                configuration.WEB_PORT,
                "--strictPort",
              ],
              options,
            )
          : spawnSync(
              process.execPath,
              [
                `apps/${command}/dist/${command === "api" ? "server" : "worker"}.js`,
              ],
              options,
            );
      if (child.error) throw new Error("Failed to start service.");
      process.exitCode = child.status ?? 1;
    } else {
      throw new Error(
        "Usage: environment.mjs init|check|api|worker|web [dev|staging]",
      );
    }
  } catch {
    console.error(
      "Environment validation/startup failed; check local configuration and setup instructions.",
    );
    process.exitCode = 1;
  }
}
