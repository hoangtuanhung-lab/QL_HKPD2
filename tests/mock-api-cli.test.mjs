import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { expect, it } from "vitest";

async function listener() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}
async function close(server) {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
function launch(port) {
  const child = spawn(process.execPath, ["scripts/mock-api.mjs"], {
    env: { ...process.env, MOCK_PORT: String(port) },
    stdio: "ignore",
  });
  const done = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code));
  });
  return { child, done };
}

it("starts the documented mock CLI, responds over HTTP and releases its port on SIGTERM", async () => {
  const reservation = await listener();
  const port = reservation.address().port;
  await close(reservation);
  const { child, done } = launch(port);
  const watchdog = setTimeout(() => child.kill("SIGKILL"), 8000);
  try {
    let response;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (child.exitCode !== null)
        throw new Error("Mock CLI exited before readiness");
      try {
        response = await fetch(`http://127.0.0.1:${port}/health/mock`, {
          signal: AbortSignal.timeout(300),
        });
      } catch {
        await delay(50);
        continue;
      }
      if (response.ok) break;
      await delay(50);
    }
    expect(response?.status).toBe(200);
    expect(await response.json()).toEqual({
      service: "a03-mock",
      data: "synthetic",
      mode: "read_only",
      authentication: "not_implemented",
    });
    const data = await fetch(`http://127.0.0.1:${port}/v1/editions`);
    expect((await data.json()).items[0].name).toContain("GIẢ LẬP");
  } finally {
    child.kill("SIGTERM");
    const code = await done;
    clearTimeout(watchdog);
    expect(code).toBe(0);
  }
  const probe = createServer();
  try {
    await new Promise((resolve, reject) => {
      probe.once("error", reject);
      probe.listen(port, "127.0.0.1", resolve);
    });
  } finally {
    await close(probe);
  }
}, 10000);

it("fails on an occupied mock port while preserving the unrelated listener", async () => {
  const server = await listener();
  const { child, done } = launch(server.address().port);
  const watchdog = setTimeout(() => child.kill("SIGKILL"), 5000);
  try {
    expect(await done).toBe(1);
    expect(server.listening).toBe(true);
  } finally {
    clearTimeout(watchdog);
    await close(server);
  }
}, 8000);

it.each(["0", "80", "4010.0", "65536"])(
  "rejects invalid MOCK_PORT %s",
  async (port) => {
    const { child, done } = launch(port);
    const watchdog = setTimeout(() => child.kill("SIGKILL"), 5000);
    try {
      expect(await done).toBe(1);
    } finally {
      clearTimeout(watchdog);
    }
  },
);
