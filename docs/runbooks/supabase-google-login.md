# Đăng nhập Google qua Supabase

> Cập nhật tích hợp: sau migration 005/006 và frontend mới, dữ liệu nghiệp vụ dùng Supabase và tệp dùng Netlify Functions/Drive. Xem [hướng dẫn vận hành trực tuyến và giới hạn hiện tại](live-operations.md). Các mô tả bản nháp bên dưới áp dụng cho phiên bản cũ hoặc công cụ thử độc lập.

Ngày 15/10/2026 (Asia/Saigon). Người dùng đã tạo project Supabase, Google client, cấu hình URL và xác nhận mở được website Netlify. Đây là bước bắt đầu tích hợp được người dùng cho phép, thay phạm vi hoãn Google/Netlify trước đây cho phần đăng nhập này. Database nghiệp vụ, API phân quyền và Drive vẫn chưa được kết nối.

## Cấu hình Netlify

Repository `hoangtuanhung-lab/QL_HKPD2`, branch `main`, base directory để trống, build `npm run build`, publish `apps/web/dist`, Node 24. Cần merge PR chứa mã này trước khi build/deploy.

Environment variables áp dụng cho **Production / Builds**:

| Biến                            | Giá trị                                              |
| ------------------------------- | ---------------------------------------------------- |
| `VITE_SUPABASE_URL`             | `https://sflnbtnwsafncdzhkdix.supabase.co`           |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key của project; không ghi khóa vào repo |

Chấp nhận khóa `sb_publishable_...` hoặc legacy JWT có role `anon`; từ chối `sb_secret_...`/`service_role`. Đây là khóa công khai dùng trên browser, không đánh dấu là credential server. Mọi biến `VITE_...` được đóng vào JavaScript khi build, không dùng cho bí mật. Sau thay đổi biến phải build/deploy lại. Không cấu hình Google Client secret trong frontend/Netlify VITE; nó nằm trong Supabase Google provider.

Ở local, tạo `apps/web/.env.local` (Git bỏ qua) với hai biến trên rồi chạy `npm run dev:web`. Vite đọc env tại workspace web. Không có cấu hình trong **dev** thì giữ preview nghiệp vụ cũ; **production** thiếu/sai cấu hình chỉ có màn chưa sẵn sàng, không tự mở các vai trò. Không có query string nào bật preview production.

## Supabase và Google

Supabase → Authentication → Providers → Google: bật provider, nhập Client ID/secret của **HKPD Google Login**. Google Console client **Web application** dùng Authorized redirect URI:

```text
https://sflnbtnwsafncdzhkdix.supabase.co/auth/v1/callback
```

Supabase Authentication → URL Configuration:

- Site URL: `https://hkpd.netlify.app/`.
- Redirect URLs: thêm chính xác `https://hkpd.netlify.app/`.
- Khi Google project còn Testing, thêm email thử vào Audience → Test users.

App gọi SDK Supabase `signInWithOAuth(provider: google)`, PKCE, redirect về **root cùng origin** `https://hkpd.netlify.app/`. Query `?code=...` được xử lý tại root; không cần thêm SPA rewrite cho một đường dẫn callback mới. Callback của Google là địa chỉ Supabase phía trên, không phải URL Netlify. Không lấy `returnTo` từ URL để mở redirect ngoài.

SDK 2.117.3 được pin trong lockfile. Khởi tạo `flowType: pkce`, `detectSessionInUrl: false`; controller trao đổi code đúng một lần cả trong React StrictMode, xóa code/lỗi khỏi thanh địa chỉ trước exchange, từ chối implicit tokens trong hash và không hiển thị raw provider error. Refresh token và PKCE verifier do SDK quản lý; không tự in/chép token vào log, tài liệu hoặc state UI. Callback/session lỗi có thông báo chung và nút đăng nhập/đăng xuất lại. Sự kiện auth được xử lý ngoài auth lock để tránh deadlock; phiên cũ đang tải không khôi phục identity sau SIGNED_OUT.

## Cập nhật cấp quản trị đầu tiên

Để mở workspace cho tài khoản quản trị được chỉ định, làm theo [Cấp quản trị đầu tiên](first-admin.md). Các mô tả màn chờ bên dưới ghi lại trạng thái ban đầu của PR #29; PR cấp quyền bổ sung RPC đọc quyền và RLS riêng, chưa kết nối dữ liệu nghiệp vụ.

## Danh tính và quyền vào giải

Browser dùng `getSession()` chỉ để phát hiện có phiên; phải gọi `getUser()` tới Supabase để xác minh danh tính trước hiển thị đăng nhập thành công. Không tin cached user, email admin hoặc `user_metadata.role` để cấp quyền. Tài khoản xác thực hiện dừng ở **Chưa được cấp quyền vào giải**, không mount `App`, không đọc các phiếu nháp và không có bộ chọn vai trò. Đăng xuất cục bộ không xóa dữ liệu phiếu đã lưu.

Chưa có API đọc trạng thái duyệt/actor/giải hiện tại/phân công từ máy chủ. Bước kế tiếp là nối nguồn quyền tin cậy và RLS/transaction/API trước khi mở workspace theo `WorkspaceSession`; không gán mọi người thành admin để vượt bước này. Đây là đăng nhập danh tính, chưa phải hệ thống nghiệp vụ online hoàn chỉnh. Không yêu cầu Drive scope khi đăng nhập, không cấp quyền thư mục từ Google login. Client Drive riêng và kho token server sẽ thực hiện ở phần Drive.

## Kiểm tra khi deploy

1. Mở website: có logo và nút **Đăng nhập bằng Google**, không có bộ chọn vai trò hoặc bảng VĐV trước đăng nhập.
2. Bấm đăng nhập, dùng Google test user; quay lại cùng domain, code được xóa khỏi URL.
3. Hiển thị email đã xác minh và màn chờ cấp quyền. Supabase Authentication → Users có tài khoản vừa đăng nhập. Không tự tạo profile/assignment nghiệp vụ.
4. Reload vẫn xác minh được phiên; đăng xuất về nút đăng nhập. Tab khác phải nhận sự kiện đăng xuất, không giữ identity cũ.
5. Hủy Google login/lỗi callback/mất mạng: không lộ token/error description, không mở vai trò preview.

Kiểm thử tự động dùng adapter auth giả lập, không thay lượt Google OAuth thật bằng tài khoản người dùng. Môi trường Codex hiện không có hai biến Supabase và chưa thực hiện consent Google thật. Sau merge/deploy cần người dùng thực hiện các bước trên; không gửi token, Client secret hay URL có code vào chat.
