import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMockApp } from "./mock-api-app.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const rawPort = process.env.MOCK_PORT ?? "4010";
const port = Number(rawPort);
if (
  !Number.isInteger(port) ||
  String(port) !== rawPort ||
  port < 1024 ||
  port > 65535
) {
  console.error("MOCK_PORT phải là số nguyên từ 1024 đến 65535.");
  process.exitCode = 1;
} else {
  const document = JSON.parse(
    await readFile(join(root, "docs/api/core.openapi.json"), "utf8"),
  );
  const fixtures = JSON.parse(
    await readFile(join(root, "packages/test-fixtures/a03/core.json"), "utf8"),
  );
  const app = createMockApp(document, fixtures);
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    try {
      await app.close();
    } catch {
      console.error("Không thể đóng mock API.");
      process.exitCode = 1;
    }
  }
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  try {
    await app.listen({ host: "127.0.0.1", port });
    console.log(
      `A03 mock ready; port=${port}; synthetic data; GET only; no auth/storage/business commands.`,
    );
  } catch {
    console.error(
      "Không thể khởi động mock API; kiểm tra cổng và dữ liệu fixture.",
    );
    process.exitCode = 1;
    await stop();
  }
}
