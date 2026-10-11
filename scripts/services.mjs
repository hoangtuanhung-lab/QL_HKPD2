import {
  assertPortAvailable,
  supervise,
  serviceSpecifications,
} from "./processes.mjs";
export { assertPortAvailable, supervise } from "./processes.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { loadEnvironments } from "./environment.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function checkReadiness(configuration, manager) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (
      manager.children.some(
        (child) => child.exitCode !== null || child.signalCode !== null,
      )
    )
      throw new Error("Service exited during startup.");
    try {
      const api = await fetch(
        `http://127.0.0.1:${configuration.API_PORT}/health/ready`,
        { signal: AbortSignal.timeout(1000) },
      );
      const body = await api.json();
      const web = await fetch(`http://127.0.0.1:${configuration.WEB_PORT}/`, {
        signal: AbortSignal.timeout(1000),
      });
      if (
        api.ok &&
        body.status === "foundation_ready" &&
        body.environment === configuration.APP_ENV &&
        web.ok
      )
        return;
    } catch {
      /* Wait for local startup without printing response/configuration values. */
    }
    await delay(250);
  }
  throw new Error("Services failed readiness checks.");
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  let manager;
  try {
    const target = process.argv[2];
    const configurations = loadEnvironments(join(root, "infra/env"));
    if (!Object.hasOwn(configurations, target))
      throw new Error("Select dev or staging.");
    const configuration = configurations[target];
    await assertPortAvailable(configuration.API_PORT);
    await assertPortAvailable(configuration.WEB_PORT);
    manager = supervise(serviceSpecifications(root, configuration));
    for (const signal of ["SIGINT", "SIGTERM"])
      process.once(signal, () => {
        void manager.stop();
      });
    await checkReadiness(configuration, manager);
    console.log(
      `${target}: local foundation running; integrations deferred. Press Ctrl+C to stop its services.`,
    );
    process.exitCode = await manager.done;
  } catch {
    console.error(
      "Service startup failed. Run npm run doctor, check build outputs and free ports; no unrelated process was stopped.",
    );
    process.exitCode = manager ? await manager.stop(1) : 1;
  }
}
