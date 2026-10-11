import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { expect, it } from "vitest";
import { assertPortAvailable, supervise } from "../scripts/services.mjs";

const idle = {
  command: process.execPath,
  args: ["-e", "setInterval(()=>{},1000)"],
  options: { stdio: "ignore" },
};

it("rejects an occupied port and preserves the process using it", async () => {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    await expect(assertPortAvailable(server.address().port)).rejects.toThrow(
      "unavailable",
    );
    expect(server.listening).toBe(true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
it("stops sibling services when one exits with failure", async () => {
  const manager = supervise([
    idle,
    { ...idle, args: ["-e", "process.exit(7)"] },
  ]);
  try {
    expect(await manager.done).toBe(7);
    expect(manager.children[0].signalCode).toBe("SIGTERM");
  } finally {
    await manager.stop();
  }
});
it("handles a missing executable and cleans up the other service", async () => {
  const manager = supervise([
    idle,
    {
      command: "/nonexistent-hkpd-program",
      args: [],
      options: { stdio: "ignore" },
    },
  ]);
  try {
    expect(await manager.done).toBe(1);
  } finally {
    await manager.stop();
  }
});
it("stops only its own services and allows repeat shutdown", async () => {
  const unrelated = spawn(idle.command, idle.args, idle.options);
  const manager = supervise([idle, idle]);
  try {
    await once(unrelated, "spawn");
    expect(await manager.stop()).toBe(0);
    expect(await manager.stop()).toBe(0);
    expect(unrelated.exitCode).toBe(null);
    expect(unrelated.signalCode).toBe(null);
    expect(
      manager.children.every((child) => child.signalCode === "SIGTERM"),
    ).toBe(true);
  } finally {
    unrelated.kill();
    await once(unrelated, "close");
    await manager.stop();
  }
});
