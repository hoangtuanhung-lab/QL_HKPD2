import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";
const root = resolve(process.argv[2] ?? ".");
const excluded = new Set([".git", "node_modules", "dist", "coverage"]);
const rules = [
  ["12 chữ số", /(?<![0-9])(?!000)[0-9]{12}(?![0-9])/],
  ["khóa riêng", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  [
    "Google",
    /ya29\.[0-9A-Za-z_-]{20,}|GOCSPX-[0-9A-Za-z_-]{10,}|AIza[0-9A-Za-z_-]{35}/,
  ],
  [
    "secret/password",
    /(?:secret|passw(?:or)?d|token|api[_-]?key)\s*[:=]\s*["'][^"'\s]{8,}["']/i,
  ],
];
let violations = 0;
function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    // Never follow symlinks into secrets or locations outside the scan root.
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (!excluded.has(entry.name)) scan(path);
      continue;
    }
    if (
      !entry.isFile() ||
      /\.(?:zip|sha256)$/.test(entry.name) ||
      entry.name === "db-sensitive-scan.mjs" ||
      entry.name === "scan_sensitive.sh"
    )
      continue;
    const stat = lstatSync(path);
    if (stat.size > 8 * 1024 * 1024)
      throw new Error(`Scan file too large: ${relative(root, path)}`);
    const bytes = readFileSync(path);
    if (bytes.includes(0)) continue;
    bytes
      .toString("utf8")
      .split(/\r?\n/)
      .forEach((line, index) => {
        if (/scan-allow:\s*\S+/.test(line)) return;
        for (const [description, pattern] of rules)
          if (pattern.test(line)) {
            console.error(
              `VI PHẠM (${description}): ${relative(root, path)}:${index + 1}`,
            );
            violations++;
            break;
          }
      });
  }
}
try {
  scan(root);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
if (violations) process.exit(1);
console.log("scan_sensitive: OK");
