import Fastify, { LogController } from "fastify";
export function createApp(
  checkRuntime: () => Promise<void>,
  environment: string,
) {
  const app = Fastify({
    logger: {
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers.set-cookie",
      ],
    },
    logController: new LogController({ disableRequestLogging: true }),
  });
  app.get("/health/live", async () => ({
    status: "ok",
    service: "api",
    environment,
  }));
  app.get("/health/ready", async (_request, reply) => {
    try {
      await checkRuntime();
      return {
        status: "foundation_ready",
        service: "api",
        environment,
        integrations: "deferred",
      };
    } catch {
      return reply
        .code(503)
        .send({ status: "unavailable", service: "api", environment });
    }
  });
  return app;
}
