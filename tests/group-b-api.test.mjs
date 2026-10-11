import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createApp } from "../apps/api/src/app.ts";
import { FoundationError } from "@hkpd/foundation";
import { contractValidators } from "../scripts/contracts-schema.mjs";
const validators = contractValidators(
  JSON.parse(readFileSync("docs/api/core.openapi.json", "utf8")),
);
describe("B08 deployed error adapter, using injected test-only failure routes", () => {
  it.each([
    ["UNAUTHENTICATED", 401],
    ["FORBIDDEN", 403],
    ["VERSION_CONFLICT", 409],
    ["IDEMPOTENCY_CONFLICT", 409],
  ])("returns A03 Problem for %s", async (code, status) => {
    const app = createApp(async () => {}, "dev");
    app.post("/test-only", async () => {
      throw new FoundationError(code);
    });
    try {
      const response = await app.inject({ method: "POST", url: "/test-only" });
      expect(response.statusCode).toBe(status);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json",
      );
      expect(validators.Problem(response.json())).toBe(true);
      expect(response.json().code).toBe(code);
    } finally {
      await app.close();
    }
  });
  it("sanitizes unexpected exceptions and never echoes the requested private path", async () => {
    const app = createApp(async () => {}, "dev");
    app.get("/test-only", async () => {
      throw new Error("private-student-data");
    });
    try {
      const failure = await app.inject("/test-only");
      expect(failure.statusCode).toBe(500);
      expect(validators.Problem(failure.json())).toBe(true);
      expect(failure.body).not.toContain("private-student-data");
      const missing = await app.inject("/private-student-data");
      expect(missing.statusCode).toBe(404);
      expect(validators.Problem(missing.json())).toBe(true);
      expect(missing.body).not.toContain("private-student-data");
    } finally {
      await app.close();
    }
  });
  it("maps Fastify schema errors to a sanitized 400 Problem", async () => {
    const app = createApp(async () => {}, "dev");
    app.post(
      "/test-only",
      {
        schema: {
          body: {
            type: "object",
            required: ["name"],
            additionalProperties: false,
            properties: { name: { type: "string" } },
          },
        },
      },
      async () => ({ ok: true }),
    );
    try {
      const response = await app.inject({
        method: "POST",
        url: "/test-only",
        payload: { token: "private-student-data" },
      });
      expect(response.statusCode).toBe(400);
      expect(validators.Problem(response.json())).toBe(true);
      expect(response.body).not.toContain("private-student-data");
    } finally {
      await app.close();
    }
  });
  it("returns validation Problem for malformed JSON instead of a server error", async () => {
    const app = createApp(async () => {}, "dev");
    app.post("/test-only", async () => ({ ok: true }));
    try {
      const response = await app.inject({
        method: "POST",
        url: "/test-only",
        headers: { "content-type": "application/json" },
        payload: '{"private-student-data":',
      });
      expect(response.statusCode).toBe(400);
      expect(validators.Problem(response.json())).toBe(true);
      expect(response.body).not.toContain("private-student-data");
    } finally {
      await app.close();
    }
  });
});
