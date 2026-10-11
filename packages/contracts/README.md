# @hkpd/contracts

A03: kiểu TypeScript dùng chung, sinh từ `docs/api/core.openapi.json`.

- Nhập `components` hoặc `operations` bằng `import type` từ `@hkpd/contracts`.
- Sửa OpenAPI rồi chạy `npm run contracts:generate`; không sửa `src/generated.ts` trực tiếp.
- `npm run contracts:check` kiểm schema, ví dụ và đồng bộ DTO; CI chạy trong `npm run check`.
- Đây là bản hợp đồng `0.1.0` cần review, chưa có endpoint nghiệp vụ thật. Xem `docs/api/A03-contracts.md` về scope, quyền, version, idempotency, các điểm cần chốt và người nhận bàn giao.

SQL/Netlify/Google triển khai cuối dự án theo yêu cầu người dùng.

Frontend có thể chạy `npm run dev:mock` để đọc fixtures qua HTTP theo cùng OpenAPI. Xem `docs/api/mock-api.md`; mock không có lệnh ghi/auth hoặc backend nghiệp vụ thật.
