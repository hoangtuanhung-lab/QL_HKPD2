# Hội khỏe Phù Đổng Quảng Phú

Nền tảng phát triển theo plan nhóm 28 người, phiên bản 1.4. Phạm vi bàn giao hiện tại: **A02 (kiến trúc), B01 (repository/CI), B07 (môi trường)** do Codex đảm nhận ở vị trí O01 và phụ trách bổ sung A02.

**Theo yêu cầu mới của người dùng, toàn bộ tích hợp Netlify, SQL và Google được thực hiện ở bước cuối dự án.** Bản hiện tại chỉ có giao diện khởi đầu, API kiểm tra tiến trình và worker nhàn rỗi; chưa đăng nhập, lưu hồ sơ, chạy tác vụ nghiệp vụ hay lưu kết quả.

## Cài đặt

Yêu cầu Node.js 24.x và npm 11.x; không cần Docker, SQL hay tài khoản dịch vụ ở bước này.

```bash
npm ci --cache /workspace/.npm-cache
npm run env:init
npm run check
npm run secret:scan
node scripts/smoke.mjs
```

Trên máy cá nhân, có thể bỏ `--cache /workspace/.npm-cache` để dùng cache npm mặc định. `npm ci` dùng lockfile, không tự cập nhật dependency. Phiên bản trực tiếp được ghim chính xác trong `package.json`.

## Chạy phát triển

Sau `npm run build`, mở ba terminal từ thư mục repository:

```bash
npm run dev:api
npm run dev:worker
npm run dev:web
```

API dev dùng cổng 3001, web dev cổng 5173. API và worker chạy mã đã build; sau thay đổi TypeScript cần build lại. Web dev hỗ trợ cập nhật giao diện bằng Vite.

## Chạy staging cục bộ

```bash
npm run staging:api
npm run staging:worker
npm run staging:web
```

API staging dùng cổng 3002, web staging cổng 5174, phục vụ frontend đã build. Tất cả bind vào `127.0.0.1`. Đây là môi trường kiểm tra cục bộ, chưa phải staging triển khai lên dịch vụ ngoài. `env:init` tạo hai tệp cấu hình riêng với quyền 0600 và giữ nguyên tệp đã có; `env:check` từ chối dùng nhầm phạm vi hoặc trùng cổng. Tham khảo [runbook môi trường](docs/runbooks/environments.md).

`GET /health/live` xác minh API hoạt động. `GET /health/ready` trả `foundation_ready` và `integrations: deferred`: chỉ nền tảng tiến trình được kiểm tra, không xác nhận khả năng chạy nghiệp vụ. Worker hiện chỉ ghi heartbeat `idle`. Smoke test khởi chạy đồng thời hai bộ API/web/worker, kiểm tra HTTP, tài nguyên JavaScript và heartbeat, sau đó dừng các tiến trình do chính nó tạo.

## Cấu trúc và bàn giao

- `apps/web`, `apps/api`, `apps/worker`: React, Fastify và khung worker.
- `packages/`: vị trí dành cho hợp đồng, luật, UI và fixtures do chủ module bổ sung.
- `docs/architecture/`: ADR, quyền sở hữu và thay đổi phạm vi.
- `docs/runbooks/`: vận hành, quy trình PR và checklist bàn giao.
- `infra/env/`: cấu hình cục bộ được Git bỏ qua.
- `.github/workflows/ci.yml`: lint, type-check, test, build, smoke và secret scan.

Xem [hồ sơ A02/B01/B07](docs/runbooks/handover-o01.md) để phân biệt phần đã kiểm chứng và điều kiện còn thiếu. Chưa có GitHub handle của reviewer, nên CODEOWNERS chưa có mapping hiệu lực. CI và bảo vệ nhánh cần được xác minh trên GitHub trước nghiệm thu B01.
