# B07: Môi trường dev/staging cục bộ

Chạy mọi lệnh ở gốc repository với Node 24/npm 11. Mỗi cloud task đã cô lập; dùng checkout có sẵn, không tạo worktree trừ khi người dùng yêu cầu.

1. `npm ci --cache /workspace/.npm-cache`
2. `npm run env:init` (chỉ tạo tệp thiếu, không ghi đè tệp hiện có).
3. `npm run env:check`.
4. `npm run check`, `npm run secret:scan`, `node scripts/smoke.mjs`.
5. Chạy từng service bằng các lệnh dev/staging trong README, ở terminal hoặc process được giám sát riêng.

| Môi trường     | Cấu hình bỏ qua bởi Git | API  | Web  |
| -------------- | ----------------------- | ---- | ---- |
| dev            | `infra/env/dev.env`     | 3001 | 5173 |
| staging cục bộ | `infra/env/staging.env` | 3002 | 5174 |

Biến hiện có: `APP_ENV`, `API_PORT`, `WEB_PORT`. Các biến đều không phải bí mật. Không cần Netlify, SQL hay Google ở giai đoạn hiện tại. Nếu đổi cổng, sửa tệp đúng phạm vi rồi `env:check`; không dùng cùng cổng giữa các process. `env:init` không sửa tệp sai; khắc phục thủ công và kiểm lại.

`health/ready` chỉ kiểm cấu hình nền tảng. Nếu smoke báo fail, kiểm Node version, cổng bị chiếm và output build. Không dừng process người khác để lấy cổng. Smoke tự dừng các process của nó; không dùng `pkill node` hoặc xóa dữ liệu khi dọn môi trường.

## Khi tích hợp cuối dự án

O01 phối hợp S01/S03/P01/P03/O02 để kiểm tra binding hiện có trước khi yêu cầu biến/secret mới. Khai báo tên và destination cần dùng, không ghi giá trị trong chat, code, log hoặc script setup. Không dùng proxy-held placeholder như raw credential cho local SQL. Cấu hình database/password thật cần luồng cấp bí mật phù hợp từng runtime.

Không dump environment hoặc credential files. Log API đã bỏ request logging và redact authorization/cookie; các module sau này phải tránh log body/URL chứa PII và dùng audit có kiểm quyền. CI quét bí mật bằng Secretlint trên checkout hiện tại; công cụ này không chứng minh toàn bộ lịch sử Git không có bí mật.

Publication môi trường cloud là thao tác riêng của người dùng. Lưu install/start instructions không chạy script hoặc publish. Snapshot không giữ process; cần khởi động lại theo start instructions.
