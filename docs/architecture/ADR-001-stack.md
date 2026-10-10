# ADR-001: Kiến trúc và stack

- Ngày: 11/10/2026 (Asia/Saigon).
- WBS: A02; người thực hiện: Codex theo phân công bổ sung của người dùng.
- Trạng thái: Đã triển khai nền tảng để kiểm chứng; chờ reviewer của G1 xác nhận bàn giao.
- Nguồn: Plan phát triển HKPĐ nhóm 28 người v1.4, mục 3, 7, 17 và 18; yêu cầu tiếp theo của người dùng về hoãn các tích hợp.

## Quyết định

Dùng monorepo npm workspaces. Frontend React + TypeScript + Vite; backend Fastify + TypeScript trên Node.js 24 LTS. Backend là một ứng dụng chia module, không tách nghiệp vụ thành nhiều microservice. Worker là tiến trình Node.js riêng. Lockfile và phiên bản dependency chính xác là nguồn tái lập môi trường; không cập nhật package tự động trong setup.

Fastify cung cấp route/schema theo module và hỗ trợ kiểm thử HTTP bằng inject. React phù hợp cấu trúc UI chung và TypeScript cho hợp đồng dùng chung. Chọn một ngôn ngữ ứng dụng giảm chi phí bàn giao giữa 28 vị trí. Đổi lại, cần kiểm soát phụ thuộc workspace và review hợp đồng để tránh import xuyên ranh giới module.

API nghiệp vụ dự kiến REST `/v1`, OpenAPI 3.1, `edition_id` rõ ràng. L01/P01 cùng chủ module thiết kế DTO, giao dịch và schema tại A03; A02 không tự đặt schema nghiệp vụ. Hiện chỉ có health API, chưa có endpoint vận động viên/đăng ký/kết quả.

## Dữ liệu và tác vụ — triển khai cuối dự án

Theo định hướng trong plan, chọn PostgreSQL làm đích lưu dữ liệu, migration do P01 sở hữu. Thiết kế dự kiến dùng transaction, optimistic version và idempotency, UUID kỹ thuật riêng với mã VĐV dạng chuỗi. Chưa cài SQL client, chưa tạo database/migration/schema hay kiểm thử SQL trong repository này. Không dùng SQLite hoặc dữ liệu nhớ tạm để thay khả năng nghiệm thu lưu dữ liệu thật.

Worker dự kiến đọc transactional outbox của PostgreSQL với retry, idempotency và job status do P03 định nghĩa. Không thêm Redis ở bước đầu; đánh giá lại bằng ADR khi tải thực tế cần. Worker hiện nhàn rỗi, chưa xử lý event.

## Giới hạn kiểm chứng

Lint, type-check, unit test, build và smoke test có thể chứng minh nền tảng chạy độc lập. Chưa chứng minh nghiệp vụ, contract API v1, bảo mật tài khoản, migration, lưu dữ liệu hoặc tích hợp worker. Các module phát triển phần độc lập/fixtures theo hợp đồng; tích hợp và nghiệm thu persistence thực hiện khi đầu vào cuối dự án đầy đủ.

## Hệ quả

Bộ mẫu Flask/SQLite tạo trước khi nhận plan được giữ ngoài checkout tại `/workspace/prototypes/hkpd-flask-before-plan`, không đưa vào mã nền tảng hoặc dùng làm kết quả nghiệm thu A02.
