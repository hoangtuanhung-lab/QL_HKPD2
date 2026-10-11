import { apiError } from "@hkpd/integration";
import { FoundationError, problem } from "@hkpd/foundation";
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
  app.setErrorHandler((error, _request, reply) => {
    const normalized =
      error instanceof Error &&
      ("validation" in error ||
        ("code" in error &&
          [
            "FST_ERR_CTP_INVALID_JSON_BODY",
            "FST_ERR_CTP_EMPTY_JSON_BODY",
          ].includes(String(error.code))))
        ? new FoundationError("VALIDATION_ERROR")
        : error;
    const response = problem(apiError(normalized));
    return reply
      .code(response.status)
      .type("application/problem+json")
      .send(response.body);
  });
  app.setNotFoundHandler((_request, reply) => {
    const response = problem(new FoundationError("NOT_FOUND"));
    return reply
      .code(response.status)
      .type("application/problem+json")
      .send(response.body);
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
