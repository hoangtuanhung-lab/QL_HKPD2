import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("secret scanner rejects a synthetic token and masks its value", () => {
  // Generated test-only pattern, not a credential issued by any provider.
  const synthetic = ["gh", "p_", randomBytes(18).toString("hex")].join("");
  const result = spawnSync(
    process.execPath,
    ["node_modules/secretlint/bin/secretlint.js", "--stdinFileName=sample.txt"],
    { input: synthetic, encoding: "utf8" },
  );
  expect(result.status).toBe(1);
  expect(result.stdout + result.stderr).not.toContain(synthetic);
});
