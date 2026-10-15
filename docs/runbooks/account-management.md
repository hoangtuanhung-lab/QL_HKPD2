# Quản lý tài khoản và phân quyền giải 2026

> Cập nhật tích hợp: sau migration 005/006 và frontend mới, dữ liệu nghiệp vụ dùng Supabase và tệp dùng Netlify Functions/Drive. Xem [hướng dẫn vận hành trực tuyến và giới hạn hiện tại](live-operations.md). Các mô tả bản nháp bên dưới áp dụng cho phiên bản cũ hoặc công cụ thử độc lập.

## Chuẩn bị và áp dụng

Mục **Quản lý tài khoản** nằm trong menu quản trị. Chỉ tài khoản quản trị đã được duyệt được tải danh sách và lưu phân quyền; người dùng mới đăng nhập Google vẫn chờ cấp quyền.

Chức năng cần migration [`004_account_management.sql`](../../infra/supabase/004_account_management.sql), sau 001 và 003. Khi chủ dự án chọn thời điểm áp dụng, chạy toàn bộ file trong Supabase SQL Editor rồi dùng bản frontend chứa PR này. Không cần khóa service role, biến môi trường mới hay cấu hình lại Google. Không chạy lại migration 001/002/003 chỉ để bật chức năng mới. Có thể chạy lại 004: giữ phân quyền hiện có, không tự duyệt lại người đã bị thu hồi.

**Netlify giữ Stopped builds theo yêu cầu.** PR chỉ chứa mã, kiểm thử và SQL để xem xét; không bật build, không kích hoạt deploy, không chạy SQL vào Supabase thật từ môi trường phát triển.

## Thao tác quản trị

1. Người dùng đăng nhập Google trên website ít nhất một lần. Quản trị bấm **Tải lại tài khoản** để thấy email; có thể tìm email hoặc lọc trạng thái.
2. Bấm **Phân quyền** tại tài khoản cần duyệt. Mỗi tài khoản có một vai trò cho giải hiện tại:
   - **Nhà trường**: phải chọn một trường từ danh mục; không truy cập phiếu của trường khác.
   - **Tổ trưởng trọng tài / Trọng tài**: phải chọn ít nhất một môn; chỉ quan sát môn phân công. Môn không có nội dung đang mở không hiện dữ liệu thi đấu.
   - **Quản trị**: được quản lý danh mục và tài khoản của giải, có bước xác nhận rõ khi cấp quyền này.
   - **Chưa cấp vai trò**: không được truy cập giải.
3. Đánh dấu **Cho phép truy cập giải 2026**, bấm **Lưu quyền tài khoản**. Vai trò/trường/môn và trạng thái duyệt chỉ có hiệu lực khi lưu thành công.
4. **Thu hồi quyền** yêu cầu xác nhận, giữ danh tính Google và bản nháp, dừng quyền truy cập giải. Có thể cấp lại bằng biểu mẫu. Không xóa Google user hoặc quản lý mật khẩu tại đây.
5. Người dùng bấm **Kiểm tra quyền** hoặc đăng nhập lại. Quyền máy chủ kiểm tra theo từng request; giao diện cũng đọc lại khi focus và mỗi 60 giây. Đang bị thu hồi quyền thì không tự chuyển sang chế độ preview.

Tài khoản đang thao tác không thể sửa/thu hồi quyền của chính mình; máy chủ cũng chặn, kể cả gọi RPC ngoài giao diện. Các thay đổi quyền được tuần tự hóa và kiểm tra lại người gọi sau khi chờ transaction khác, tránh hai quản trị đồng thời thu hồi nhau làm mất toàn bộ quyền quản trị. Chủ project có thể dùng bootstrap owner-run 002 để khôi phục quản trị đầu tiên trong tình huống cần phục hồi; không cung cấp đường tự cấp quyền qua email ở frontend.

## Bảo vệ dữ liệu và tính nhất quán

- Chỉ cấp quyền đang hoạt động cho Google user đã xác minh; người dùng đã được quản lý vẫn xuất hiện để thu hồi kể cả sau khi bỏ liên kết Google. ID người dùng, không phải email hay metadata tự khai, là khóa gán quyền.
- Các RPC quản trị kiểm tra `auth.uid()` với bảng quyền do máy chủ sở hữu. Người thường không đọc được danh sách email; không có quyền ghi trực tiếp bảng phân quyền hoặc audit.
- Bảng quyền bật RLS, người dùng chỉ đọc được dòng của chính mình. Phiên workspace chỉ nhận vai trò, trường/môn và danh mục của giải hiện tại cho đúng user đã xác minh.
- Mỗi lần lưu có revision chống ghi đè. Nếu báo dữ liệu đổi ở nơi khác, tải lại trước khi sửa tiếp; lỗi không được báo thành công. Request frontend quá 20 giây có thông báo và hướng dẫn tải lại để đối chiếu kết quả.
- Có audit riêng ghi người thao tác, người được thay đổi và quyền trước/sau trong cùng transaction. Không ghi mật khẩu/token. Chủ project xem bằng SQL Editor khi cần; không mở audit rộng cho người dùng.
- Trường đang gắn với tài khoản không được xóa. Đổi phân công hoặc chọn vai trò trống (không duyệt) để bỏ liên kết trước khi xóa trường. Chỉ thu hồi quyền vẫn giữ liên kết trường để có thể cấp lại.

## Phạm vi nghiệp vụ hiện tại

Phân quyền và danh mục trường/môn lưu Supabase. **Dữ liệu VĐV/kết quả vẫn là bản nháp trên trình duyệt, chưa đồng bộ hoặc chia sẻ giữa các tài khoản.** Mở tài khoản nhà trường không hoàn tất API đăng ký chính thức; các API đó vẫn cần lưu dữ liệu và RLS nghiệp vụ riêng trước khi dùng cho giải thật. Không đổi tích hợp Drive.

Nhà trường chỉ thấy bản nháp gắn đúng ID trường được phân công, trong giải hiện tại và vùng lưu riêng của tài khoản. Tên trường được cố định theo máy chủ; nhập JSON trường khác bị chặn. Việc đổi phân công không xóa các bản nháp cũ nhưng chúng không hiện trong trường mới. Trọng tài giữ giao diện quan sát, không tự mở các công cụ quản trị/thử nghiệm không giới hạn môn.

## Kiểm chứng

- `npm run check`: kiểm tra toàn dự án, frontend role/scope, menu, duyệt/thu hồi, lỗi revision, request timeout, ràng buộc trường và nhập JSON.
- `bash infra/supabase/tests/run.sh`: PostgreSQL 17 tạm, kiểm tra người chưa duyệt/tài khoản khác/anonymous, chống tự nâng quyền, Google user chưa xác minh, role/school/sport validation, thu hồi, audit/rollback và hai phiên SQL thu hồi chéo đồng thời. Không kết nối project thật.
