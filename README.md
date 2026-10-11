# Hội khỏe Phù Đổng Quảng Phú

Nền tảng phát triển theo plan nhóm 28 người, phiên bản 1.4. Phạm vi bàn giao hiện tại: **A02 (kiến trúc), B01 (repository/CI), B07 (môi trường)** do Codex đảm nhận ở vị trí O01 và phụ trách bổ sung A02.

**Theo yêu cầu mới của người dùng, toàn bộ tích hợp Netlify, SQL và Google được thực hiện ở bước cuối dự án.** Bản hiện tại có phiếu đăng ký nháp của trường trên trình duyệt, API kiểm tra tiến trình và worker nhàn rỗi; chưa đăng nhập, lưu hồ sơ lên máy chủ hoặc lưu kết quả chính thức.

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

Có thể chạy cả ba service bằng một lệnh `npm run dev`. Với staging cục bộ, dùng `npm run staging`. Trình điều phối kiểm tra cổng, chờ HTTP readiness và dừng các service do nó tạo khi một service thoát/lỗi. Trong terminal thông thường, Ctrl+C dừng cả bộ; khi dùng công cụ cloud, gửi SIGTERM tới process `node scripts/services.mjs dev` hoặc `staging` nếu thao tác ngắt công cụ chỉ dừng lớp shell bên ngoài. Dùng `npm run doctor` để kiểm tra runtime, dependencies, build outputs và cấu hình khi khởi động thất bại.

Các lệnh từng service vẫn hỗ trợ khi cần chạy riêng:

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

Xem [hồ sơ A02/B01/B07](docs/runbooks/handover-o01.md) để phân biệt phần đã kiểm chứng và điều kiện còn thiếu. Reviewer A02/B01/B07 được chỉ định là `@hoangtuanhung-lab`. CI nền tảng đã chạy thành công trên GitHub. Repository QL_HKPD2 hiện public; chưa có ruleset, classic protection chưa đọc được qua integration và quy trình mới do Codex kiểm tra mã và không yêu cầu approval tài khoản thứ hai. Bảo vệ nhánh chưa được nghiệm thu.

## Hợp đồng A03 và repository hiện tại

Repository hiện tại là [hoangtuanhung-lab/QL_HKPD2](https://github.com/hoangtuanhung-lab/QL_HKPD2), được người dùng yêu cầu tạo lại từ nền tảng đã duyệt. A03 được bàn giao qua PR riêng; bằng chứng CI/review của repository cũ là lịch sử, không thay kiểm tra trên repository mới.

A03 cung cấp [OpenAPI lõi](docs/api/core.openapi.json), DTO TypeScript sinh tự động và [tài liệu bàn giao](docs/api/A03-contracts.md). Chạy `npm run contracts:generate` sau khi sửa OpenAPI; `npm run check` kiểm đồng bộ DTO. Endpoint nghiệp vụ mới là hợp đồng chờ review, backend hiện chỉ có health.

Để frontend phát triển song song, chạy `npm run dev:mock` để đọc dữ liệu giả theo OpenAPI. Xem [hướng dẫn mock API chỉ đọc](docs/api/mock-api.md); mock không thực hiện lệnh ghi hoặc xác thực.

O01 có thể chạy `npm run github:audit` để kiểm cấu hình GitHub chỉ đọc. Xem [runbook bảo vệ nhánh](docs/runbooks/branch-protection.md) về reviewer, quyền quản trị và nghiệm thu PR lỗi.

Nhóm có thể gửi mã từng nhiệm vụ để Codex kiểm tra, sửa và đẩy PR theo [quy trình tiếp nhận mã](docs/runbooks/code-intake.md). Không yêu cầu mua GitHub Team; chính sách PR/CI được mô tả trong runbook B01.

## Phiếu đăng ký của nhà trường — A04

Trường tự tạo phiếu theo kỳ giải, thêm/sửa/xóa VĐV và xuất/nhập JSON. Số lượng tính từ danh sách thực tế, không đặt trước số trường hoặc số người tham gia. Dữ liệu nháp lưu trên trình duyệt đang dùng; chưa gửi duyệt hoặc đồng bộ giữa các trường. Xem [hướng dẫn và phạm vi A04](docs/runbooks/A04-school-registration.md). Năm luồng còn lại đang ở mức phác thảo để nhóm phát triển tiếp.
