# Hồ sơ bàn giao A02 / B01 / B07

Nguồn: plan nhóm 28 người v1.4 và CR-001–004. Người thực hiện: Codex, O01; phụ trách bổ sung A02 theo yêu cầu người dùng. Reviewer và xác nhận nhận sản phẩm: chờ L02 chỉ định. Không tự nghiệm thu.

| Bước  | Đầu vào / người cung cấp                               | Đầu ra                                       | Trạng thái                       |
| ----- | ------------------------------------------------------ | -------------------------------------------- | -------------------------------- |
| A02.1 | Plan v1.4, phân công A02, CR-004 / người dùng          | ADR stack, identity/tệp, triển khai          | Chờ review G1                    |
| B01.1 | ADR và CR-004 / A02                                    | Monorepo và lệnh cài/check/build             | Đã kiểm chứng cục bộ; chờ review |
| B01.2 | Lệnh check/build / O01                                 | CI quality/secrets, PR template              | Chờ kiểm chứng trên GitHub       |
| B01.3 | Handle reviewer và quyền admin / L02, repository owner | CODEOWNERS, ruleset, thử PR lỗi              | Chờ đầu vào                      |
| B07.1 | Kiến trúc đã chọn, CR-004 / A02, người dùng            | Cấu hình dev/staging riêng, startup và smoke | Đã kiểm chứng cục bộ; chờ review |
| B07.2 | SQL/auth/Drive/worker contract / P01/S01/S03/P03       | Staging tích hợp và bảo mật có dữ liệu giả   | Hoãn tới cuối dự án theo CR-004  |

## Kiểm chứng

Kiểm chứng ngày 11/10/2026 trong môi trường cloud hiện tại:

- Node v24.19.0, npm v11.9.0; cài lại từ lockfile bằng `npm ci` thành công.
- `env:init` giữ nguyên tệp đã có; tests từ chối trùng cổng và sai phạm vi.
- Lint/Prettier, type-check và build API/web/worker đạt.
- Vitest: **16 passed, 0 failed**, gồm readiness, cấu hình và kiểm chứng scanner từ chối token giả sinh riêng cho test, không in giá trị.
- Secretlint trên checkout hiện tại đạt, bao gồm dotfiles được Git theo dõi; không quét toàn bộ lịch sử Git.
- Smoke HTTP với dev và staging đồng thời đạt: API đúng phạm vi, web phục vụ HTML/JavaScript đã build, worker heartbeat idle. Process của smoke được dừng sau kiểm tra.

GitHub API hiện trả HTTP 403 ở egress proxy, nên chưa đọc/chỉnh ruleset, xác minh Actions hoặc tạo PR bằng API. Native Git đọc repository thành công; quyền push được kiểm chứng riêng khi bàn giao. Cần cho phép `api.github.com` trong cấu hình mạng rồi retry; không yêu cầu thêm token chỉ vì API bị chặn mạng.

Không dùng tests Flask/SQLite trước đó làm bằng chứng của stack mới. CI local pass không thay GitHub checks/ruleset; worker heartbeat không thay nghiệm thu xử lý tác vụ.

## Điều kiện còn thiếu

- Reviewer/handle thật và xác nhận nhận sản phẩm.
- GitHub Actions chạy và ruleset main/release có hiệu lực; kiểm thử PR lỗi không merge được.
- A03 và đầu vào các module để test contract/nghiệp vụ.
- Netlify/SQL/Google, cấu hình môi trường ngoài và tích hợp được hoãn theo người dùng; chưa có credential, chưa triển khai và chưa yêu cầu cung cấp ở bước này.

O01 bàn giao ADR và nền tảng cho G1/P01/P02/P03/S01/F01/Q02/Q03/O02. Thư mục VĐV là yêu cầu của S03 phối hợp các chủ module, đã ghi ADR-002, chưa tạo thư mục/tệp thật.
