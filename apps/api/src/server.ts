import { createApp } from "./app.js";
import { runtimeConfig } from "./config.js";
const config = runtimeConfig(process.env);
const app = createApp(async () => {
  runtimeConfig(process.env);
}, config.environment);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void app.close();
  });
try {
  await app.listen({ host: "127.0.0.1", port: config.port });
} catch {
  console.error(
    "API startup failed; check configuration and port availability.",
  );
  await app.close();
  process.exitCode = 1;
}
