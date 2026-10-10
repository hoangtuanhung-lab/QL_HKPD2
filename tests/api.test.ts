import { describe, expect, it } from "vitest";
import { createApp } from "../apps/api/src/app.js";
import { runtimeConfig } from "../apps/api/src/config.js";

describe("Foundation API", () => {
  it("reports environment and distinguishes foundation from application readiness", async () => {
    const app = createApp(async () => {}, "staging");
    try {
      expect((await app.inject("/health/live")).json()).toEqual({
        status: "ok",
        service: "api",
        environment: "staging",
      });
      const ready = await app.inject("/health/ready");
      expect(ready.statusCode).toBe(200);
      expect(ready.json()).toEqual({
        status: "foundation_ready",
        service: "api",
        environment: "staging",
        integrations: "deferred",
      });
      expect((await app.inject("/v1/athletes")).statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
  it("fails readiness without exposing underlying configuration", async () => {
    const app = createApp(async () => {
      throw new Error("private runtime detail");
    }, "dev");
    try {
      const response = await app.inject("/health/ready");
      expect(response.statusCode).toBe(503);
      expect(response.body).not.toContain("private runtime detail");
      expect((await app.inject("/health/live")).statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
  it.each(["", "production", "invalid"])(
    "rejects unknown environment %s",
    (APP_ENV) => {
      expect(() => runtimeConfig({ APP_ENV, API_PORT: "3001" })).toThrow();
    },
  );
  it.each(["", "NaN", "80", "65536", "3001.5", "3001.0"])(
    "rejects invalid port %s",
    (API_PORT) => {
      expect(() => runtimeConfig({ APP_ENV: "dev", API_PORT })).toThrow();
    },
  );
});
