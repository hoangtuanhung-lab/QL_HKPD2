import { createHash, randomUUID } from "node:crypto";
import Fastify from "fastify";
import { contractValidators } from "./contracts-schema.mjs";

// Local development data only. No authentication, business commands or storage.
export function createMockApp(document, fixtures) {
  const validators = contractValidators(document);
  const bySchema = new Map();
  for (const fixture of fixtures) {
    const validate = validators[fixture.schema];
    if (!validate || !validate(fixture.value)) {
      throw new Error(`Invalid mock fixture for schema ${fixture.schema}`);
    }
    const values = bySchema.get(fixture.schema) ?? [];
    values.push(structuredClone(fixture.value));
    bySchema.set(fixture.schema, values);
  }
  const editions = new Set(
    (bySchema.get("Edition") ?? []).map((value) => value.id),
  );
  const app = Fastify({ logger: false, exposeHeadRoutes: false });
  const cursors = new Map();
  const cursorByPosition = new Map();
  function problem(reply, status, code, message) {
    return reply.code(status).type("application/problem+json").send({
      code,
      message,
      request_id: randomUUID(),
    });
  }
  app.addHook("onRequest", async (_request, reply) => {
    reply.header("X-HKPD-Mock", "synthetic-read-only");
    reply.header("Cache-Control", "no-store");
  });
  app.setNotFoundHandler((_request, reply) =>
    problem(
      reply,
      404,
      "NOT_FOUND",
      "Mock chỉ cung cấp GET từ hợp đồng A03; không có thao tác ghi.",
    ),
  );
  app.setErrorHandler((_error, _request, reply) =>
    problem(reply, 500, "INTERNAL_ERROR", "Mock không thể xử lý yêu cầu."),
  );
  app.get("/health/mock", async () => ({
    service: "a03-mock",
    data: "synthetic",
    mode: "read_only",
    authentication: "not_implemented",
  }));
  for (const [path, methods] of Object.entries(document.paths)) {
    const operation = methods.get;
    if (!operation) continue;
    const responseSchema = operation.responses["200"]?.content?.[
      "application/json"
    ]?.schema?.$ref
      ?.split("/")
      .at(-1);
    if (!responseSchema)
      throw new Error(`Missing GET response schema: ${operation.operationId}`);
    const schema = document.components.schemas[responseSchema];
    const itemSchema = schema.properties?.items?.items?.$ref?.split("/").at(-1);
    const isPage = Boolean(itemSchema);
    const values = bySchema.get(itemSchema ?? responseSchema);
    if (!values?.length)
      throw new Error(`Missing GET fixture: ${operation.operationId}`);
    const bindings = operation["x-mock-path-bindings"];
    if (!bindings)
      throw new Error(`Missing mock path bindings: ${operation.operationId}`);
    for (const parameter of operation.parameters) {
      const definition =
        document.components.parameters[parameter.$ref.split("/").at(-1)];
      if (definition.in === "path" && !bindings[definition.name]) {
        throw new Error(
          `Missing path binding: ${operation.operationId}/${definition.name}`,
        );
      }
    }
    for (const field of Object.values(bindings)) {
      if (!values.every((value) => Object.hasOwn(value, field))) {
        throw new Error(
          `Invalid mock binding field: ${operation.operationId}/${field}`,
        );
      }
    }
    app.get(path.replace(/\{([^}]+)\}/g, ":$1"), async (request, reply) => {
      if (Object.values(request.params).some((id) => !validators.Id(id))) {
        return problem(
          reply,
          400,
          "VALIDATION_ERROR",
          "ID phải là UUID hợp lệ.",
        );
      }
      const query = request.query;
      const allowedQuery = isPage ? ["cursor", "limit"] : [];
      if (Object.keys(query).some((key) => !allowedQuery.includes(key))) {
        return problem(
          reply,
          400,
          "VALIDATION_ERROR",
          "Tham số truy vấn không có trong hợp đồng.",
        );
      }
      const limit = query.limit === undefined ? 50 : Number(query.limit);
      if (
        query.limit !== undefined &&
        (typeof query.limit !== "string" ||
          !/^[1-9][0-9]*$/.test(query.limit) ||
          limit > 100)
      ) {
        return problem(
          reply,
          400,
          "VALIDATION_ERROR",
          "Limit phải là số nguyên từ 1 đến 100.",
        );
      }
      if (
        request.params.edition_id &&
        !editions.has(request.params.edition_id)
      ) {
        return problem(
          reply,
          404,
          "NOT_FOUND",
          "Không có kỳ giải này trong dữ liệu giả.",
        );
      }
      const selected = values.filter((value) =>
        Object.entries(bindings).every(
          ([parameter, field]) => value[field] === request.params[parameter],
        ),
      );
      let data;
      if (isPage) {
        const scope = createHash("sha256")
          .update(JSON.stringify([operation.operationId, request.params]))
          .digest("hex");
        let offset = 0;
        if (query.cursor !== undefined) {
          const saved =
            typeof query.cursor === "string"
              ? cursors.get(query.cursor)
              : undefined;
          if (!saved || saved.scope !== scope) {
            return problem(
              reply,
              400,
              "VALIDATION_ERROR",
              "Cursor không hợp lệ hoặc thuộc phạm vi khác.",
            );
          }
          offset = saved.offset;
        }
        const nextOffset = offset + limit;
        let next = null;
        if (nextOffset < selected.length) {
          const key = `${scope}:${nextOffset}`;
          next = cursorByPosition.get(key) ?? randomUUID();
          cursorByPosition.set(key, next);
          cursors.set(next, { scope, offset: nextOffset });
        }
        data = { items: selected.slice(offset, nextOffset), next_cursor: next };
      } else {
        data = selected[0];
        if (!data)
          return problem(
            reply,
            404,
            "NOT_FOUND",
            "Không tìm thấy tài nguyên trong dữ liệu giả của giải này.",
          );
      }
      if (!validators[responseSchema](data)) {
        throw new Error(
          `Mock response differs from schema: ${operation.operationId}`,
        );
      }
      return structuredClone(data);
    });
  }
  return app;
}
