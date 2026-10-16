# Rà soát sau PR #38 — 16/10/2026

Đối chiếu bản `main` tại `ebece13` (PR #38), trước triển khai. Người dùng đã xác nhận SQL 007/008 chạy thành công; lần rà soát này không gọi RPC ghi trên project thật, không bật build/publish Netlify.

## Lỗi đã xác minh và sửa

| Mã  | Phân loại             | Tình huống trước sửa                                                                                                                               | Sau sửa                                                                                                                                   |
| --- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| R01 | Lớn — lỗi màn hình    | Nhà trường import Excel có mã VĐV không khớp CCCD. Hàm gộp ném lỗi trong React state updater, ngoài phạm vi bắt lỗi; component đăng ký bị unmount. | Kiểm tra/gộp trước updater, báo lỗi trên trang và giữ bảng cũ.                                                                            |
| R02 | Logic — mất dòng      | Mẫu Excel cũ cho phép CCCD trống. Gộp theo chuỗi trống/undefined coi các học sinh khác nhau là cùng người, ghi đè dòng trước.                      | Chỉ đối chiếu CCCD có giá trị; các dòng chưa có CCCD giữ ID riêng và vẫn cần hoàn thiện trước gửi duyệt. Không đoán người trùng theo tên. |
| R03 | Xung đột import/hồ sơ | Excel cũ có cột ghi chú rỗng ghi đè ghi chú đang lưu của VĐV đã có.                                                                                | Import thông tin đăng ký giữ ghi chú ẩn của hồ sơ đã tồn tại cùng ID, mã và nội dung đã đăng ký.                                          |
| R04 | Logic — mất cấu hình  | Chỉ đổi thể thức hoặc chọn Cho phép hòa chưa làm cờ dữ liệu chưa lưu bật lên. Chuyển nội dung có thể mất cấu hình không cảnh báo.                  | Hai thay đổi đều được theo dõi; chuyển nội dung cần xác nhận bỏ thay đổi.                                                                 |
| R05 | Logic — thiếu đội/cặp | Đã lập đủ đội/cặp, còn đang soạn đội kế tiếp nhưng nhấp Tạo danh sách trận. Chỉ các đội đã thêm được gửi, bản đang soạn bị bỏ qua.                 | Chặn tạo khi còn tên/thành viên chưa thêm; yêu cầu thêm hoặc xóa phần đang soạn, giữ nguyên các đội đã lập.                               |
| R06 | Kiểm tra phía máy chủ | Gọi RPC trực tiếp với khối 0/chữ/trống kèm `educationLevel=THCS` có thể qua kiểm tra cấp học khi đăng ký nội dung.                                 | SQL 009 yêu cầu khối 1–9 trước đối chiếu cấp học/tuổi. Vẫn hỗ trợ lớp có hậu tố như 7A; không tin cấp học client gửi để bỏ qua khối.      |

Không thấy bằng chứng lỗi làm hỏng toàn hệ thống trong phạm vi kiểm tra này. Không coi kết quả kiểm thử cô lập là chứng nhận mọi tài khoản/dịch vụ thật đã vận hành được.

## Bằng chứng kiểm thử

- Bộ hồi quy frontend mới chạy trên mã trước sửa: 4 bài thất bại và một lỗi React không được bắt, tái hiện mất dòng, lỗi trang và cấu hình/đội đang soạn.
- Kiểm tra khối qua RPC trên PostgreSQL trước SQL 009 phải thất bại với `Invalid grade accepted`; sau 009 từ chối khối sai cho cả lưu/gửi và chấp nhận 7A. Các lần gọi lỗi không tăng revision hoặc tạo hồ sơ dở.
- Bộ kiểm tra PostgreSQL chạy 001–009 trong container cô lập, thử áp dụng 009 hai lần. Các kiểm tra phân quyền, xung đột revision, import atomic, kết quả/nhập lại/vòng phụ thuộc cũ vẫn giữ.
- Kiểm tra cục bộ cuối: `npm run check` đạt 814 bài/64 tệp, lint, typecheck và build; `npm run secret:scan`, `node scripts/smoke.mjs` và `bash infra/supabase/tests/run.sh` đều đạt. Kiểm tra sau SQL 009 cũng xác nhận ba danh sách trận còn nguyên và trigger không cho mở lại phiếu đã dùng tạo trận vẫn hoạt động. Kết quả CI của PR được ghi riêng trên GitHub.

## Áp dụng sau review

Chỉ bổ sung [009_roster_grade_guard.sql](../../../infra/supabase/009_roster_grade_guard.sql) sau 008; không cần chạy lại 007/008. Migration chỉ thay hàm lưu phiếu và quyền gọi hàm, không sửa hồ sơ, kết quả, thư mục hay cấu hình điểm đã lưu. Giữ Stopped builds và Auto Publishing Locked cho đến khi chủ dự án quyết định triển khai.

Trước mở vận hành cần kiểm tra thật bằng tài khoản quản trị/nhà trường/tổ trưởng/trọng tài: import có xem trước, tra cứu đúng trường, đăng ký/gửi duyệt, cấu hình điểm, gửi–xác nhận–xin nhập lại–từ chối, và bảng vòng tròn. Chưa thực hiện kiểm tra thật trong lần này. Huy chương/tie-break, chia nhiều bảng và bốc thăm ngẫu nhiên vẫn là tính năng chưa hoàn tất như tài liệu PR #38 đã nêu.
