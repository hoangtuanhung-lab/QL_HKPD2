import { expect, it } from "vitest";
import { createApp } from "../apps/api/src/app.js";
import { RegistrationError } from "@hkpd/registration";
import { CompetitionError } from "@hkpd/competition";
import { ResultError } from "@hkpd/results";
it.each([
  [new RegistrationError("EVENT_LOCKED", "private-marker"), 409],
  [new CompetitionError("FORBIDDEN", "private-marker"), 403],
  [new ResultError("VERSION_CONFLICT", "private-marker"), 409],
  [new RegistrationError("NOT_FOUND", "private-marker"), 404],
  [new ResultError("PRECISION", "private-marker"), 400],
  [Object.assign(new Error("private-marker"), { code: "FORBIDDEN" }), 500],
])(
  "API maps domain %s to %i without exposing domain messages",
  async (error, status) => {
    const app = createApp(async () => {}, "dev");
    app.get("/test-domain", async () => {
      throw error;
    });
    try {
      const r = await app.inject({ method: "GET", url: "/test-domain" });
      expect(r.statusCode).toBe(status);
      expect(r.headers["content-type"]).toContain("application/problem+json");
      expect(r.body).not.toContain("private-marker");
      expect(r.json().request_id).toMatch(/^[a-f0-9-]{36}$/);
    } finally {
      await app.close();
    }
  },
);
