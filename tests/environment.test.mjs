import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  defaults,
  initialize,
  loadEnvironments,
  validateEnvironment,
} from "../scripts/environment.mjs";

const directories = [];
function temporaryDirectory() {
  const directory = mkdtempSync(join(tmpdir(), "hkpd-env-"));
  directories.push(directory);
  return directory;
}
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true });
});

it("initializes isolated configurations and preserves user edits on repeat", () => {
  const directory = temporaryDirectory();
  initialize(directory);
  expect(loadEnvironments(directory)).toEqual(defaults);
  const path = join(directory, "dev.env");
  // Windows has no POSIX mode bits; files there rely on the directory ACL.
  if (process.platform !== "win32")
    expect(statSync(path).mode & 0o777).toBe(0o600);
  writeFileSync(path, "APP_ENV=dev\nAPI_PORT=3011\nWEB_PORT=5183\n");
  const before = readFileSync(path, "utf8");
  initialize(directory);
  expect(readFileSync(path, "utf8")).toBe(before);
  expect(loadEnvironments(directory).dev.API_PORT).toBe("3011");
});
it("rejects environments sharing a port", () => {
  const directory = temporaryDirectory();
  initialize(directory);
  writeFileSync(
    join(directory, "staging.env"),
    "APP_ENV=staging\nAPI_PORT=3001\nWEB_PORT=5174\n",
  );
  expect(() => loadEnvironments(directory)).toThrow("isolated");
});
it("rejects environment scope mismatch and invalid ports", () => {
  expect(() => validateEnvironment(defaults.dev, "staging")).toThrow("scope");
  for (const API_PORT of ["0", "80", "3001.0", "65536", "invalid", "5173"]) {
    expect(() =>
      validateEnvironment({ ...defaults.dev, API_PORT }, "dev"),
    ).toThrow();
  }
});
it("does not silently replace corrupt existing configuration", () => {
  const directory = temporaryDirectory();
  initialize(directory);
  writeFileSync(join(directory, "dev.env"), "APP_ENV=wrong\n");
  initialize(directory);
  expect(() => loadEnvironments(directory)).toThrow();
});
