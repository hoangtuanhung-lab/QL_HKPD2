import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const listing = spawnSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { cwd: root, encoding: "utf8" },
);
if (listing.status !== 0) {
  console.error("Cannot discover repository files for secret scanning.");
  process.exitCode = 2;
} else {
  const files = [...new Set(listing.stdout.split("\0").filter(Boolean))];
  if (files.length === 0) {
    console.error("No files to scan.");
    process.exitCode = 2;
  }
  for (let offset = 0; offset < files.length; offset += 100) {
    const result = spawnSync(
      process.execPath,
      [
        "node_modules/secretlint/bin/secretlint.js",
        "--no-gitignore",
        "--no-glob",
        ...files.slice(offset, offset + 100),
      ],
      { cwd: root, stdio: "inherit" },
    );
    if (result.status !== 0) {
      process.exitCode = result.status ?? 2;
      break;
    }
  }
  if (!process.exitCode)
    console.log(
      "Current tracked/untracked project files scanned, including tracked dotfiles.",
    );
}
