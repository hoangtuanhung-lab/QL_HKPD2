import { randomUUID } from "node:crypto";
const definitions = {
  VALIDATION_ERROR: [400, "Dữ liệu không hợp lệ."],
  UNAUTHENTICATED: [401, "Bạn cần đăng nhập."],
  NOT_FOUND: [404, "Không tìm thấy dữ liệu."],
  FORBIDDEN: [403, "Bạn không có quyền thực hiện thao tác này."],
  VERSION_CONFLICT: [409, "Dữ liệu đã thay đổi. Hãy tải lại trước khi sửa."],
  IDEMPOTENCY_CONFLICT: [409, "Mã thao tác đã được dùng với dữ liệu khác."],
  INTERNAL_ERROR: [500, "Không thể xử lý thao tác. Vui lòng thử lại sau."],
} as const;
export class FoundationError extends Error {
  constructor(public readonly code: keyof typeof definitions) {
    super(definitions[code][1]);
  }
}
/** Always generate a server UUID; never echo arbitrary error messages or client request IDs. */
export function problem(error: unknown) {
  const code = error instanceof FoundationError ? error.code : "INTERNAL_ERROR";
  const [status, message] = definitions[code];
  return { status, body: { code, message, request_id: randomUUID() } };
}
