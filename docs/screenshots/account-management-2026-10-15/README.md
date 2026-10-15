# Quản lý tài khoản

Ảnh chụp Chromium từ mã nguồn PR, dùng email/dữ liệu giả lập và mock Supabase OAuth/RPC. Không dùng tài khoản thật, không thực hiện consent Google thật hoặc ghi vào Supabase/Netlify thật.

- [Danh sách tài khoản, tìm kiếm, trạng thái và thao tác phân quyền](quan-ly-tai-khoan.png)
- [Biểu mẫu gắn tài khoản nhà trường với trường và duyệt truy cập](phan-quyen-nha-truong.png)

Đã thao tác qua SDK Supabase trong browser với API giả lập: đăng nhập quản trị, duyệt trường, thu hồi/cấp lại, đăng xuất rồi đăng nhập bằng tài khoản nhà trường; chỉ thấy trường được giao, không thấy menu quản trị và không gọi RPC danh mục quản trị. Metadata Google giả khai role admin không cấp quyền cho nhà trường. Không có exception JavaScript.

Kiểm chứng quyền PostgreSQL/RLS và hai quản trị thu hồi chéo được chạy riêng trên PostgreSQL 17 tạm; ảnh/UI giả lập không thay thế bước nghiệm thu môi trường thật sau khi chủ dự án chọn thời điểm áp dụng.
