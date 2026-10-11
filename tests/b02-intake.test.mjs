import { afterEach, expect, it } from "vitest";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
  symlinkSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
const temporary = [];
const scripts = "infra/db/scripts";
function workspace() {
  const root = mkdtempSync(join(tmpdir(), "hkpd-b02-test-"));
  temporary.push(root);
  return root;
}
afterEach(() => {
  for (const root of temporary.splice(0))
    rmSync(root, { recursive: true, force: true });
});
function run(script, args = [], env = {}) {
  // Explicitly clear activation and libpq overrides inherited from the host.
  return spawnSync("bash", [script, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      HKPD_ENABLE_DEFERRED_DB: "",
      APP_ENV: "",
      PGHOST: "",
      PGPORT: "",
      PGHOSTADDR: "",
      PGSERVICE: "",
      ...env,
    },
  });
}
it.each([
  "pg_local.sh",
  "db_reset.sh",
  "migrate.sh",
  "cycle_test.sh",
  "recovery_drill.sh",
])("B02 blocks %s before a SQL tool can execute", (name) => {
  const root = workspace();
  const marker = join(root, "called");
  for (const tool of [
    "psql",
    "pg_ctl",
    "initdb",
    "pg_dump",
    "pg_restore",
    "pg_isready",
  ])
    writeFileSync(
      join(root, tool),
      '#!/bin/sh\nprintf called >> "$B02_MARKER"\nexit 99\n',
      { mode: 0o755 },
    );
  const result = run(`${scripts}/${name}`, [], {
    PATH: `${root}:${process.env.PATH}`,
    B02_MARKER: marker,
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("CR-004");
  expect(existsSync(marker)).toBe(false);
});
it.each(["", "staging", "production", "prod", "unknown"])(
  "B02 refuses enabled SQL in disallowed APP_ENV=%s",
  (appEnv) => {
    const result = run(`${scripts}/migrate.sh`, [], {
      HKPD_ENABLE_DEFERRED_DB: "1",
      APP_ENV: appEnv,
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("APP_ENV phải");
  },
);
it.each([
  { PGHOST: "remote.example" },
  { PGHOSTADDR: "remote.example" },
  { PGSERVICE: "shared" },
  { HKPD_DB_NAME: "hkpd_production" },
  { HKPD_DB_MIGRATOR: "invalid-role" },
])(
  "B02 blocks unsafe endpoint/identifier configuration %j",
  (configuration) => {
    const result = run(`${scripts}/db_reset.sh`, [], {
      HKPD_ENABLE_DEFERRED_DB: "1",
      APP_ENV: "test",
      ...configuration,
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("LỖI:");
  },
);
it("B02 rejects a nonexistent migration directory, incomplete options and malformed locks", () => {
  const root = workspace();
  const directory = join(root, "migrations");
  mkdirSync(directory);
  const checker = `${scripts}/check_migrations.sh`;
  expect(run(checker, ["--dir", join(root, "missing")]).status).not.toBe(0);
  expect(run(checker, ["--dir"]).status).not.toBe(0);
  const lock = join(root, "migrations.lock");
  writeFileSync(lock, "bad-hash ../../outside.sql\n");
  const result = run(checker, ["--dir", directory, "--lock", lock]);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("lock không hợp lệ");
});
it("B02 runner propagates a failed group to its exit status, including --out", () => {
  const root = workspace();
  cpSync("infra/db", join(root, "db"), { recursive: true });
  writeFileSync(
    join(root, "db/tests/test_check_migrations.sh"),
    "#!/bin/bash\necho intentional-failure\nexit 1\n",
  );
  const output = join(root, "report.txt");
  const result = run(join(root, "db/tests/run_all.sh"), ["--out", output]);
  expect(result.status).toBe(1);
  expect(readFileSync(output, "utf8")).toContain("tổng nhóm lỗi: 1");
});
it("B02 seed check fails closed on null edition names and suppresses connection error details", () => {
  const root = workspace();
  const marker = join(root, "query");
  writeFileSync(
    join(root, "psql"),
    `#!/bin/bash
if [ "$B02_FAIL_CONNECTION" = 1 ]; then echo "$B02_PRIVATE_ERROR" >&2; exit 1; fi
case "$*" in
 *to_regclass*) echo t ;;
 *information_schema*) echo 1 ;;
 *"name IS NULL"*) printf checked > "$B02_MARKER"; echo 1 ;;
 *) echo 0 ;;
esac
`,
    { mode: 0o755 },
  );
  const env = {
    PATH: `${root}:${process.env.PATH}`,
    HKPD_ENABLE_DEFERRED_DB: "1",
    APP_ENV: "test",
    B02_MARKER: marker,
  };
  const result = run(`${scripts}/seed_guard.sh`, [], env);
  expect(result.status).not.toBe(0);
  expect(existsSync(marker)).toBe(true);
  expect(result.stderr).toContain("không đánh dấu");
  const privateError = "synthetic-private-connection-detail";
  const failure = run(`${scripts}/seed_guard.sh`, [], {
    ...env,
    B02_FAIL_CONNECTION: "1",
    B02_PRIVATE_ERROR: privateError,
  });
  expect(failure.status).not.toBe(0);
  expect(failure.stderr).toContain("không kiểm tra được DB");
  expect(failure.stderr).not.toContain(privateError);
});
it("B02 sensitive scanner detects fake test secrets without printing values and ignores symlink targets", () => {
  const root = workspace();
  const input = join(root, "input");
  mkdirSync(input);
  const candidate = ["GOC", "SPX-", "synthetic", "1234567890"].join("");
  writeFileSync(join(input, "candidate.txt"), candidate);
  const scan = () => run(`${scripts}/scan_sensitive.sh`, [input]);
  const result = scan();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("candidate.txt:1");
  expect(result.stderr).not.toContain(candidate);
  writeFileSync(
    join(input, "candidate.txt"),
    `${candidate} # scan-allow: deliberately synthetic test fixture`,
  );
  expect(scan().status).toBe(0);
  writeFileSync(join(input, "candidate.txt"), `${candidate} # scan-allow`);
  expect(scan().status).toBe(1);
  writeFileSync(join(input, "candidate.txt"), "safe");
  const outside = join(root, "outside.txt");
  writeFileSync(outside, candidate);
  symlinkSync(outside, join(input, "linked.txt"));
  expect(scan().status).toBe(0);
});
it.each(["/tmp/other", "/tmp/hkpd-pg/child", "/tmp/hkpd-pg-'quoted"])(
  "B02 rejects unsafe cluster directory %s before creating it",
  (directory) => {
    const result = run(`${scripts}/pg_local.sh`, ["start"], {
      HKPD_ENABLE_DEFERRED_DB: "1",
      APP_ENV: "test",
      HKPD_PG_DIR: directory,
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("HKPD_PG_DIR phải");
  },
);
it("B02 validates migration count before invoking psql", () => {
  const result = run(`${scripts}/migrate.sh`, ["down", "1;SELECT 1"], {
    HKPD_ENABLE_DEFERRED_DB: "1",
    APP_ENV: "test",
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("số migration không hợp lệ");
});
it("B02 handles migration directories with spaces without splitting file paths", () => {
  const root = workspace();
  const directory = join(root, "migrations with spaces");
  cpSync("infra/db/tests/fixtures/sample_ok", directory, { recursive: true });
  const calls = join(root, "calls");
  writeFileSync(
    join(root, "psql"),
    '#!/bin/bash\nwhile [ $# -gt 0 ]; do\n if [ "$1" = -f ]; then printf "%s\\n" "$2" >> "$B02_CALLS"; shift 2; else shift; fi\ndone\n',
    { mode: 0o755 },
  );
  const result = run(`${scripts}/migrate.sh`, ["up", "all"], {
    HKPD_ENABLE_DEFERRED_DB: "1",
    APP_ENV: "test",
    HKPD_MIGRATIONS_DIR: directory,
    PATH: `${root}:${process.env.PATH}`,
    B02_CALLS: calls,
  });
  expect(result.status).toBe(0);
  expect(readFileSync(calls, "utf8").trim().split("\n")).toHaveLength(3);
  expect(readFileSync(calls, "utf8")).toContain(
    "migrations with spaces/20260101000001_core_foundation.up.sql",
  );
});
it("B02 keeps optional role passwords out of argv and suppresses database error details", () => {
  const root = workspace();
  const cluster = mkdtempSync(join(tmpdir(), "hkpd-pg-intake-"));
  temporary.push(cluster);
  const calls = join(root, "calls");
  const stdin = join(root, "stdin");
  for (const [name, body] of Object.entries({
    id: "echo 1000",
    initdb: "exit 0",
    pg_isready: "exit 0",
    psql: 'printf "%s\\n" "$*" >> "$B02_CALLS"; cat >> "$B02_STDIN"; if [ "$B02_FAIL_PASSWORD" = 1 ]; then echo "$HKPD_APP_RW_PASSWORD" >&2; exit 1; fi',
  }))
    writeFileSync(join(root, name), `#!/bin/bash\n${body}\n`, { mode: 0o755 });
  const value = "synthetic 'quote' \\ value";
  const env = {
    PATH: `${root}:${process.env.PATH}`,
    HKPD_ENABLE_DEFERRED_DB: "1",
    APP_ENV: "test",
    HKPD_PG_DIR: cluster,
    HKPD_APP_RW_PASSWORD: value,
    B02_CALLS: calls,
    B02_STDIN: stdin,
  };
  const result = run(`${scripts}/pg_local.sh`, ["start"], env);
  expect(result.status).toBe(0);
  expect(readFileSync(calls, "utf8")).not.toContain(value);
  expect(readFileSync(stdin, "utf8")).toContain(
    "PASSWORD 'synthetic ''quote'' \\ value'",
  );
  // Fail only password commands so that initial role setup succeeds.
  writeFileSync(
    join(root, "psql"),
    '#!/bin/bash\ninput="$(cat)"\nif [[ "$input" == *"ALTER ROLE"* ]]; then echo "$HKPD_APP_RW_PASSWORD" >&2; exit 1; fi\n',
    { mode: 0o755 },
  );
  const failure = run(`${scripts}/pg_local.sh`, ["start"], env);
  expect(failure.status).not.toBe(0);
  expect(failure.stderr).toContain("không đặt được mật khẩu");
  expect(failure.stderr).not.toContain(value);
});
