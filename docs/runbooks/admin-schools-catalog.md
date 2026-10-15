# Quản lý trường và danh mục môn/nội dung của giải 2026

> Cập nhật tích hợp: sau migration 005/006 và frontend mới, dữ liệu nghiệp vụ dùng Supabase và tệp dùng Netlify Functions/Drive. Xem [hướng dẫn vận hành trực tuyến và giới hạn hiện tại](live-operations.md). Các mô tả bản nháp bên dưới áp dụng cho phiên bản cũ hoặc công cụ thử độc lập.

## Áp dụng trên website

1. Merge PR chứa chức năng này, đợi Netlify deploy thành công.
2. Trong Supabase project `sflnbtnwsafncdzhkdix`, mở **SQL Editor → New query**. Sao chép toàn bộ [`003_admin_schools_catalog.sql`](../../infra/supabase/003_admin_schools_catalog.sql), bấm **Run**. Migration yêu cầu cơ chế cấp quản trị 001 đã có; không cần chạy lại bootstrap 002 hoặc cấp lại tài khoản. Migration có thể chạy lại, giữ nguyên trường, lựa chọn nội dung và revision hiện có.
3. Đăng nhập quản trị tại `https://hkpd.netlify.app`, tải lại trang. Menu có **Quản lý trường**, **Danh mục môn thi**; không còn **Đăng ký VĐV** cho quản trị.
4. **Quản lý trường**: nhập mã (2–30 ký tự chữ/số/gạch dưới), tên trường và cấp học, bấm **Thêm trường**. Dùng **Sửa → Lưu trường**, hoặc **Xóa** và xác nhận. Mã trùng bị từ chối, ID trường giữ nguyên khi sửa. Không tự tạo số lượng trường hay VĐV giả.
5. **Danh mục môn thi**: chọn môn, bấm **Thêm môn vào giải** hoặc **Bỏ môn khỏi giải** để chọn/bỏ toàn bộ nội dung của môn đó. Bộ lọc cấp học/giới tính chỉ lọc bảng, không thu hẹp tác động của hai nút toàn môn. Dùng checkbox từng dòng để thêm/bớt nội dung riêng lẻ. Cuối cùng bấm **Lưu danh mục thi đấu**. Thay đổi chưa lưu có cảnh báo khi chuyển màn hình.

Chức năng thêm/bớt chọn từ **9 môn / 133 nội dung chính thức** của file Excel đã cung cấp. Không tạo mã môn/nội dung tùy ý ngoài danh mục này; muốn bổ sung nội dung nguồn cần cập nhật danh mục và điều kiện tuổi/cấp học/giới tính tương ứng. Bỏ khỏi giải không xóa danh mục nguồn, hồ sơ VĐV hoặc kết quả.

## Lưu trữ và phân quyền

Danh mục trường và lựa chọn nội dung của quản trị thật được lưu Supabase qua RPC `hkpd_admin_settings` / `hkpd_update_admin_settings`; không chuyển sang localStorage khi lỗi mạng, thiếu migration hoặc mất quyền. Ghi dữ liệu yêu cầu tài khoản đã được duyệt quản trị giải 2026. RPC ghi kiểm tra quyền tại máy chủ, `search_path` rỗng, transaction và revision chống ghi đè. Client không được ghi trực tiếp bảng để vượt revision. RLS chặn người chưa duyệt, người bị thu hồi quyền và anonymous đọc/ghi các bảng danh mục.

Bản preview dùng dữ liệu riêng trên trình duyệt và ghi rõ trạng thái đó. Trong preview, trường đã thêm xuất hiện trong bộ chọn trường đăng ký; chọn trường có thể nhập ngay vào hàng trống. Lưu VĐV đầu tiên tạo phiếu bản nháp tương ứng; các phiếu có sẵn được giữ, không tự sinh VĐV. Đổi tên danh mục không tự đổi tên các phiếu cũ. Xóa trường không xóa các phiếu nháp; UI chặn xóa khi phát hiện bản nháp VĐV gắn trường trên trình duyệt hiện tại.

**Danh sách VĐV/kết quả chưa đồng bộ lên Supabase.** Thêm trường là quản lý danh mục, không tự cấp quyền cho một email. Để mở vai trò nhà trường/trọng tài, xem [Quản lý tài khoản với migration 004](account-management.md). Việc liên kết tài khoản nhà trường với ID trường và dữ liệu đăng ký trực tuyến vẫn cần API/RLS nghiệp vụ tương ứng; không coi danh mục mới là hoàn tất luồng đăng ký chính thức. Google Drive không thay đổi.

## Hàng trống đăng ký VĐV

Màn nhà trường hiển thị sẵn một hàng trước khi chọn trường; ô nhập tạm khóa kèm hướng dẫn chọn/tạo phiếu trường. Khi chưa có phiếu, phần thiết lập phiếu mở sẵn. Chọn trường xong, hàng có thể nhập ngay. Lưu liên tiếp từng VĐV có hàng trống tiếp theo với ID mới; xóa dòng cuối vẫn giữ một hàng trống. Không lưu hàng trắng thành VĐV.

## Kiểm chứng

- `npm run check`: hợp đồng, danh mục nguồn, lint, typecheck, test và build.
- `bash infra/supabase/tests/run.sh`: PostgreSQL tạm kiểm tra cả cấp quyền và CRUD trường/danh mục, rollback khi mã trùng/sai dữ liệu, revision lỗi thời, RLS, anonymous và thu hồi quyền. Không dùng project thật.
- [Ảnh giao diện](../screenshots/admin-settings-2026-10-15/README.md) chụp bản preview bằng Chromium với dữ liệu minh họa, không phải dữ liệu thật của trường.
