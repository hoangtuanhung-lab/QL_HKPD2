import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const run = promisify(execFile);
let blocked = false;
function report(status, message) {
  console.log(`${status}: ${message}`);
  if (status === "BLOCKED" || status === "FAIL") blocked = true;
}
async function api(endpoint) {
  try {
    const { stdout } = await run("gh", ["api", endpoint], {
      maxBuffer: 2 * 1024 * 1024,
    });
    return { ok: true, data: JSON.parse(stdout) };
  } catch (error) {
    // Report only status, never credentials or raw CLI output.
    const status = /HTTP (\d+)/.exec(error.stderr ?? "")?.[1] ?? "unavailable";
    return { ok: false, status };
  }
}
function includesExpected(actual, expected) {
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      expected.every((item) =>
        actual.some((value) => includesExpected(value, item)),
      )
    );
  }
  if (expected && typeof expected === "object") {
    return (
      actual &&
      Object.entries(expected).every(([key, value]) =>
        includesExpected(actual[key], value),
      )
    );
  }
  return actual === expected;
}

async function main() {
  const args = process.argv.slice(2);
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    if (
      !["--repo", "--reviewer"].includes(key) ||
      !args[index + 1] ||
      options[key]
    ) {
      throw new Error(
        "Usage: npm run github:audit -- [--repo owner/repo] [--reviewer username]",
      );
    }
    options[key] = args[index + 1];
  }
  let repo = options["--repo"];
  if (!repo) {
    const { stdout } = await run("git", ["remote", "get-url", "origin"]);
    const remote = new URL(stdout.trim());
    if (remote.protocol !== "https:" || remote.hostname !== "github.com") {
      throw new Error("Use --repo owner/repo for a non-HTTPS origin.");
    }
    repo = remote.pathname.slice(1).replace(/\.git$/, "");
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))
    throw new Error("Invalid repository name.");
  const reviewer = options["--reviewer"];
  if (reviewer && !/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(reviewer))
    throw new Error("Invalid reviewer username.");
  const baseline = JSON.parse(
    await readFile("infra/github/main-release.ruleset.json", "utf8"),
  );
  const metadata = await api(`repos/${repo}`);
  if (!metadata.ok) {
    report("BLOCKED", `Repository metadata unavailable (${metadata.status}).`);
    return;
  }
  const branch = encodeURIComponent(metadata.data.default_branch);
  report(
    "PASS",
    `${repo}; ${metadata.data.private ? "private" : "public"}; default=${metadata.data.default_branch}.`,
  );
  const [owners, rulesets, protection, checks, actor] = await Promise.all([
    api(`repos/${repo}/codeowners/errors`),
    api(`repos/${repo}/rulesets?includes_parents=true&per_page=100`),
    api(`repos/${repo}/branches/${branch}/protection`),
    api(`repos/${repo}/commits/${branch}/check-runs?per_page=100`),
    api("user"),
  ]);
  if (!owners.ok)
    report("BLOCKED", `CODEOWNERS errors unavailable (${owners.status}).`);
  else if (owners.data.errors.length)
    report(
      "FAIL",
      `GitHub reports ${owners.data.errors.length} CODEOWNERS errors.`,
    );
  else
    report(
      "PASS",
      "GitHub reports no CODEOWNERS errors; this does not prove an independent review occurred.",
    );
  if (!checks.ok)
    report("BLOCKED", `CI checks unavailable (${checks.status}).`);
  else {
    const expected = baseline.rules.find(
      (rule) => rule.type === "required_status_checks",
    ).parameters.required_status_checks;
    for (const check of expected) {
      const actual = checks.data.check_runs.find(
        (item) =>
          item.name === check.context && item.app.id === check.integration_id,
      );
      report(
        actual?.conclusion === "success" ? "PASS" : "BLOCKED",
        `${check.context} from GitHub app ${check.integration_id}: ${actual?.conclusion || actual?.status || "not found"}.`,
      );
    }
  }
  if (!rulesets.ok)
    report("BLOCKED", `Rulesets unavailable (${rulesets.status}).`);
  else if (rulesets.data.length >= 100)
    report(
      "BLOCKED",
      "Ruleset list may be truncated; inspect pagination before concluding.",
    );
  else {
    const candidate = rulesets.data.find((rule) => rule.name === baseline.name);
    if (!candidate)
      report(
        "BLOCKED",
        `B01 baseline ruleset missing (${rulesets.data.length} rulesets listed). Other policies are not automatically equivalent.`,
      );
    else {
      const details = await api(`repos/${repo}/rulesets/${candidate.id}`);
      if (!details.ok)
        report("BLOCKED", `Ruleset details unavailable (${details.status}).`);
      else {
        const actual = details.data;
        const matches =
          actual.target === baseline.target &&
          actual.enforcement === "active" &&
          Array.isArray(actual.bypass_actors) &&
          actual.bypass_actors.length === 0 &&
          includesExpected(actual.conditions, baseline.conditions) &&
          actual.conditions.ref_name.exclude.length === 0 &&
          includesExpected(actual.rules, baseline.rules);
        report(
          matches ? "PASS" : "FAIL",
          `B01 ruleset ${candidate.id}: ${matches ? "matches baseline configuration" : "differs from baseline"}.`,
        );
      }
    }
  }
  if (protection.ok)
    report(
      "INFO",
      "Classic branch protection exists; review it alongside rulesets.",
    );
  else if (protection.status === "404")
    report("INFO", "No classic branch protection returned.");
  else
    report(
      "WARN",
      `Classic branch protection unreadable (${protection.status}); its actual state is unknown.`,
    );
  if (!reviewer)
    report(
      "INFO",
      "Single-maintainer workflow: no mandatory independent GitHub approval; reviewer nomination is optional.",
    );
  else if (!actor.ok)
    report("BLOCKED", `Authenticated actor unavailable (${actor.status}).`);
  else if (reviewer.toLowerCase() === actor.data.login.toLowerCase())
    report(
      "WARN",
      "Reviewer equals current PR creator/pusher account; cannot approve its own PR. No native approval is required by the user-selected workflow.",
    );
  else {
    const permission = await api(
      `repos/${repo}/collaborators/${reviewer}/permission`,
    );
    if (!permission.ok)
      report(
        "BLOCKED",
        `Reviewer permission unavailable (${permission.status}); owner must verify it.`,
      );
    else
      report(
        permission.data.user?.permissions?.push ? "PASS" : "BLOCKED",
        `Reviewer ${reviewer}: ${permission.data.permission}. This verifies access, not CODEOWNER nomination or an actual review.`,
      );
  }
}
try {
  await main();
} catch (error) {
  report(
    "BLOCKED",
    error.message.startsWith("Usage:")
      ? error.message
      : "Audit could not complete; verify arguments, origin, baseline file and gh availability.",
  );
}
console.log(
  "Read-only configuration audit. No GitHub settings were changed. A failing-PR acceptance test is still required to prove enforcement.",
);
process.exitCode = blocked ? 1 : 0;
