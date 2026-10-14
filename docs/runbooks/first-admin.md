# Cấp quản trị đầu tiên qua Supabase

Tài khoản chủ dự án đã chọn: **hoangtuanhung@gmail.com**. Đây là thao tác cấp quyền quản trị, chỉ chủ project thực hiện trong SQL Editor. Không dùng Publishable key để chạy SQL và không gửi mật khẩu, service role key hay token qua chat.

## Thực hiện

1. Merge PR chứa thay đổi này vào `main`; đợi Netlify deploy thành công. Không đổi biến môi trường đăng nhập đang hoạt động.
2. Mở `https://hkpd.netlify.app`, đăng nhập Google bằng đúng email trên ít nhất một lần. Trong Supabase project `sflnbtnwsafncdzhkdix`, vào **Authentication → Users**, kiểm tra tài khoản đã xuất hiện.
3. Vào **SQL Editor → New query**. Mở file [`001_admin_access.sql`](../../infra/supabase/001_admin_access.sql) trên GitHub, sao chép toàn bộ nội dung vào trình soạn thảo và bấm **Run**. Phải chạy thành công trước bước sau.
4. Tạo query mới, sao chép toàn bộ [`002_first_admin.sql`](../../infra/supabase/002_first_admin.sql), kiểm tra email `hoangtuanhung@gmail.com`, rồi **Run**. Script yêu cầu đúng một tài khoản đã xác minh email và có Google identity; thiếu tài khoản thì hủy transaction, không tự tạo hay cấp quyền cho tài khoản khác.
5. Quay lại website, bấm **Kiểm tra quyền** hoặc tải lại trang. Phải thấy thông báo đã xác minh quản trị và màn tổng quan. Nếu báo không đọc được quyền, kiểm tra query bước 3 và đúng project; nếu vẫn chờ cấp quyền, kiểm tra bước 4 và email đang đăng nhập.

Có thể chạy lại hai script theo thứ tự. Không sửa migration đã áp dụng để thay đổi cấu trúc: dùng migration mới cho các thay đổi tiếp theo.

## Thu hồi / kiểm chứng

Trong SQL Editor, có thể thu hồi bằng:

```sql
update public.hkpd_admin_access
set approved = false
where user_id in (
  select id from auth.users where lower(email) = 'hoangtuanhung@gmail.com'
);
```

Bấm **Kiểm tra quyền** để xác nhận trở lại màn chờ cấp quyền. Giao diện kiểm tra lại khi cửa sổ được focus và mỗi 60 giây; lỗi đọc quyền cũng đóng workspace. Chạy lại bước 4 để cấp lại. Tài khoản Google khác phải tiếp tục chờ cấp quyền và không thấy bản nháp của quản trị.

## Phạm vi hiện tại

Đây là cầu nối đầu tiên cho **quản trị giải 2026**. Chưa cấp vai trò nhà trường/trọng tài qua bảng này; các vai trò đó cần API/phân công tương ứng trước khi mở cho tài khoản thật. Không tự nâng quyền từ email, metadata Google, URL hoặc localStorage. Bảng bật RLS, tài khoản chỉ đọc được bản ghi của chính mình, `anon` không được đọc/gọi RPC và trình duyệt không có quyền ghi quyền quản trị. RPC dùng security invoker, không có đường tự cấp quyền.

Dữ liệu đăng ký, phân công, kết quả đang là bản nháp trên trình duyệt, **chưa đồng bộ Supabase hoặc Drive**. Bản nháp được tách theo tài khoản; dữ liệu preview cũ được giữ nguyên và không tự nhập vào tài khoản thật. Xóa dữ liệu trình duyệt có thể làm mất bản nháp: cần xuất phiếu để lưu. Không dùng số liệu nháp để vận hành giải thật. Chức năng đổi giải/kết chuyển cục bộ bị khóa trong phiên quản trị thật để không giả lập thay đổi giải ở máy chủ.

## Kiểm thử phát triển

- `bash infra/supabase/tests/run.sh`: PostgreSQL 17 Docker tạm, không publish port, tự xóa sau test. Kiểm tra bootstrap trước/sau Google identity, chạy lại migration, RLS, chống tự nâng quyền, thu hồi và chặn anonymous. Không kết nối project thật.
- `npm run check`: kiểm tra hợp đồng, lint, typecheck, test và build.

Các kiểm tra tự động không thay thế bước xác nhận trên Supabase/Netlify thật của chủ project.
