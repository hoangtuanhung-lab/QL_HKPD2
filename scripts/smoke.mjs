import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { loadEnvironments } from "./environment.mjs";
import { assertPortAvailable } from "./processes.mjs";

const configurations = loadEnvironments("infra/env");
const children = [];
const output = new Map();
async function waitFor(url) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return response;
    } catch {
      /* Bounded polling for local startup. */
    }
    await delay(250);
  }
  throw new Error("Service failed local readiness check.");
}
try {
  for (const values of Object.values(configurations)) {
    await assertPortAvailable(values.API_PORT);
    await assertPortAvailable(values.WEB_PORT);
  }
  for (const target of Object.keys(configurations)) {
    const child = spawn(process.execPath, ["scripts/services.mjs", target], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    children.push(child);
    output.set(target, "");
    child.on("error", () => {});
    child.stdout.on("data", (chunk) => {
      output.set(target, (output.get(target) + chunk.toString()).slice(-16000));
    });
  }
  for (const [target, values] of Object.entries(configurations)) {
    const api = await waitFor(
      `http://127.0.0.1:${values.API_PORT}/health/ready`,
    );
    assert.deepEqual(await api.json(), {
      status: "foundation_ready",
      service: "api",
      environment: target,
      integrations: "deferred",
    });
    const page = await waitFor(`http://127.0.0.1:${values.WEB_PORT}/`);
    const html = await page.text();
    assert.ok(html.includes("Hội khỏe Phù Đổng Quảng Phú"));
    const asset = html.match(/src="([^"]+\.(?:js|tsx))"/);
    assert.ok(asset);
    const script = await fetch(
      `http://127.0.0.1:${values.WEB_PORT}${asset[1]}`,
    );
    assert.equal(script.status, 200);
    let code = await script.text();
    if (target === "dev") {
      assert.ok(code.includes("/src/App.tsx"));
      const app = await fetch(
        `http://127.0.0.1:${values.WEB_PORT}/src/App.tsx`,
      );
      assert.equal(app.status, 200);
      code = await app.text();
      assert.ok(code.includes("RoleLayout"));
      const workspace = await fetch(
        `http://127.0.0.1:${values.WEB_PORT}/src/role-workspaces.tsx`,
      );
      assert.equal(workspace.status, 200);
      code += await workspace.text();
    }
    assert.ok(code.includes("Hệ thống đang được xây dựng"));
    assert.ok(code.includes("Thêm VĐV"));
    assert.ok(code.includes("/branding/hkpd-quang-phu-2026.jpeg"));
    const logo = await fetch(
      `http://127.0.0.1:${values.WEB_PORT}/branding/hkpd-quang-phu-2026.jpeg`,
    );
    assert.equal(logo.status, 200);
    assert.ok(logo.headers.get("content-type")?.includes("image/jpeg"));
    assert.ok(output.get(target).includes('"status":"idle"'));
    console.log(`${target}: managed API/web/worker verified.`);
  }
  assert.ok(children.every((child) => child.exitCode === null));
} finally {
  const closed = children.map((child) =>
    child.exitCode !== null || child.signalCode !== null
      ? Promise.resolve()
      : new Promise((resolve) => child.once("close", resolve)),
  );
  for (const child of children) child.kill("SIGTERM");
  const watchdog = setTimeout(() => {
    for (const child of children)
      if (child.exitCode === null && child.signalCode === null)
        child.kill("SIGKILL");
  }, 5000);
  await Promise.all(closed);
  clearTimeout(watchdog);
}
for (const values of Object.values(configurations)) {
  await assertPortAvailable(values.API_PORT);
  await assertPortAvailable(values.WEB_PORT);
}
assert.ok(children.every((child) => child.exitCode === 0));
console.log("Managed shutdown verified: all selected API/web ports released.");
for (const [target, values] of Object.entries(configurations)) {
  const child = spawn(
    process.execPath,
    ["scripts/environment.mjs", "api", target],
    { stdio: "ignore" },
  );
  const closed = new Promise((resolve) => child.once("close", resolve));
  child.on("error", () => {});
  try {
    const response = await waitFor(
      `http://127.0.0.1:${values.API_PORT}/health/ready`,
    );
    assert.equal((await response.json()).environment, target);
  } finally {
    child.kill("SIGTERM");
    const watchdog = setTimeout(() => child.kill("SIGKILL"), 4000);
    await closed;
    clearTimeout(watchdog);
  }
  assert.equal(child.exitCode, 0);
  await assertPortAvailable(values.API_PORT);
}
console.log("Single-service shutdown verified: no API child left behind.");
