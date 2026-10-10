import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { loadEnvironments } from "./environment.mjs";

const configurations = loadEnvironments("infra/env");
const children = [];
const workerLogs = new Map();
function start(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  children.push(child);
  child.on("error", () => {});
  return child;
}
async function waitFor(url) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return response;
    } catch {
      /* Poll only local startup; overall wait is bounded. */
    }
    await delay(250);
  }
  throw new Error("Service failed local readiness check.");
}
try {
  for (const [target, values] of Object.entries(configurations)) {
    const env = { ...process.env, ...values };
    start(process.execPath, ["apps/api/dist/server.js"], { env });
    const worker = start(process.execPath, ["apps/worker/dist/worker.js"], {
      env,
    });
    workerLogs.set(target, "");
    worker.stdout.on("data", (chunk) => {
      workerLogs.set(target, workerLogs.get(target) + chunk.toString());
    });
    start(
      process.execPath,
      [
        "../../node_modules/vite/bin/vite.js",
        "preview",
        "--host",
        "127.0.0.1",
        "--port",
        values.WEB_PORT,
        "--strictPort",
      ],
      { cwd: "apps/web", env },
    );
  }
  for (const [target, values] of Object.entries(configurations)) {
    const response = await waitFor(
      `http://127.0.0.1:${values.API_PORT}/health/ready`,
    );
    assert.deepEqual(await response.json(), {
      status: "foundation_ready",
      service: "api",
      environment: target,
      integrations: "deferred",
    });
    const page = await waitFor(`http://127.0.0.1:${values.WEB_PORT}/`);
    const html = await page.text();
    assert.ok(html.includes("Hội khỏe Phù Đổng Quảng Phú"));
    const asset = html.match(/src="([^"]+\.js)"/);
    assert.ok(asset);
    const script = await fetch(
      `http://127.0.0.1:${values.WEB_PORT}${asset[1]}`,
    );
    assert.equal(script.status, 200);
    assert.ok((await script.text()).includes("Hệ thống đang được xây dựng"));
    assert.ok(workerLogs.get(target).includes('"status":"idle"'));
    console.log(`${target}: API, built web assets and idle worker verified.`);
  }
  assert.ok(children.every((child) => child.exitCode === null));
} finally {
  for (const child of children) child.kill("SIGTERM");
  await delay(500);
  for (const child of children)
    if (child.exitCode === null) child.kill("SIGKILL");
}
