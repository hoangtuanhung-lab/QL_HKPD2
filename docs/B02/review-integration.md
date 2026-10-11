# B02 — Kết quả kiểm khi tích hợp snapshot

Ngày 11/10/2026 (Asia/Saigon), base main `14b499a`. Các phát hiện/sửa đổi nằm trong README B02; source.zip checksum nằm trong source.json. Bản gốc ngoài repository còn trong tệp đính kèm; nội dung nhập được chuẩn hóa Markdown để đạt formatter hiện hành.

## Đối chiếu phạm vi

- B02 trong plan: dựng sạch DB, seed, rollback/recovery và mã VĐV giữ số0. Snapshot mới có tooling và migration mẫu, chưa có domain schema hoặc seed nghiệp vụ.
- A03 đã có hợp đồng; cập nhật IN-01/02/03/04/05/17 từ “chưa có” thành bằng chứng/giới hạn hiện hành. DTO không tự quyết storage schema, cipher/key, quota, full lifecycle hoặc U04/U08.
- Quy ước version integer trong bản đề xuất được đối chiếu giới hạn số nguyên JavaScript của A03; lưu bigint/check và adapter số an toàn là đề xuất storage, chưa có migration thật.
- CR-004 tiếp tục hoãn SQL thật. CR-007 cho phép Codex tiếp nhận/kiểm/chỉnh và mở PR, không bắt buộc tài khoản reviewer thứ hai. Không có approval giả hoặc tự merge.

## Kiểm chứng của lượt này

- TC16: 28/28 assertion trên bộ migration mẫu, không kết nối DB.
- Test B02 cô lập: 25 ca, gồm block tất cả runtime script mặc định trước công cụ SQL, môi trường/endpoint/role sai, lock malformed, runner exit1 với nhóm lỗi và --out, seed NULL/failure redaction, scanner, đường dẫn có khoảng trắng count sai và mật khẩu không nằm trong argv/log (mock).
- npm run check: baseline/board/contracts/db static/lint/typecheck, 95 tests trong13 files và build API/web/worker đều đạt.
- npm run secret:scan: đạt trên toàn bộ tệp được tiếp nhận. Bằng chứng lượt này trong evidence/intake-validation-20261011.txt.

Database cycle, restore, SCRAM/password và domain concurrency chưa chạy trong lượt này. Evidence của người gửi không được cộng vào số test hiện tại. Runtime scripts đã chỉnh là phần chuẩn bị cần diễn tập lại ở giai đoạn cuối; chưa xác nhận đủ khả năng dùng production.
