import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { join } from "node:path";

export function assertPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", () =>
      reject(
        new Error(
          `Port ${port} is unavailable; choose a free port in the environment file.`,
        ),
      ),
    );
    server.listen(
      { port: Number(port), host: "127.0.0.1", exclusive: true },
      () => server.close(resolve),
    );
  });
}

export function supervise(specifications) {
  const children = [];
  let stopping = false;
  let finish;
  const done = new Promise((resolve) => {
    finish = resolve;
  });
  function stop(code = 0) {
    if (stopping) return done;
    stopping = true;
    void (async () => {
      const exits = children.map((child) =>
        child.exitCode !== null || child.signalCode !== null
          ? Promise.resolve()
          : new Promise((resolve) => child.once("close", resolve)),
      );
      for (const child of children)
        if (child.pid && child.exitCode === null && child.signalCode === null)
          child.kill("SIGTERM");
      const timer = setTimeout(() => {
        for (const child of children)
          if (child.pid && child.exitCode === null && child.signalCode === null)
            child.kill("SIGKILL");
      }, 2000);
      await Promise.all(exits);
      clearTimeout(timer);
      finish(code);
    })();
    return done;
  }
  for (const specification of specifications) {
    const child = spawn(
      specification.command,
      specification.args,
      specification.options,
    );
    children.push(child);
    child.once("error", () => {
      void stop(1);
    });
    child.once("close", (code) => {
      if (!stopping) void stop(code || 1);
    });
  }
  return { children, done, stop };
}

export function serviceSpecifications(root, configuration) {
  const env = { ...process.env, ...configuration };
  return [
    {
      name: "api",
      command: process.execPath,
      args: ["apps/api/dist/server.js"],
      options: { cwd: root, env, stdio: "inherit" },
    },
    {
      name: "worker",
      command: process.execPath,
      args: ["apps/worker/dist/worker.js"],
      options: { cwd: root, env, stdio: "inherit" },
    },
    {
      name: "web",
      command: process.execPath,
      args: [
        join(root, "node_modules/vite/bin/vite.js"),
        ...(configuration.APP_ENV === "staging" ? ["preview"] : []),
        "--host",
        "127.0.0.1",
        "--port",
        configuration.WEB_PORT,
        "--strictPort",
      ],
      options: { cwd: join(root, "apps/web"), env, stdio: "inherit" },
    },
  ];
}
