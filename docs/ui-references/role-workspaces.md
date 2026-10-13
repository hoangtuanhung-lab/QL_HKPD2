# Bốn bàn làm việc và logo Hội khỏe

Ngày 13/10/2026 (Asia/Saigon). Người dùng yêu cầu cập nhật giao diện Quản trị, Tổ trưởng trọng tài, Trọng tài và Nhà trường; dùng logo trong ZIP `Gemini_Generated_Images_rc_bbc1fcb488bb9a8c_2.zip`. ZIP chỉ có một ảnh JPEG logo, không có mẫu màn hình hoặc hướng dẫn triển khai. Ảnh được dùng nguyên bản tại `apps/web/public/branding/hkpd-quang-phu-2026.jpeg`.

## Giao diện

- Quản trị: tổng quan phiếu trường/VĐV nháp và danh mục, bảng trường tìm kiếm được, điều hướng kiểm tra đăng ký, phân công, sơ đồ, lịch, kết quả và ngoại tuyến.
- Tổ trưởng trọng tài: tổng quan tổ trọng tài, phân công, rà soát đăng ký, sơ đồ và lịch, kiểm tra kết quả và ngoại tuyến. Khi chưa kết nối phân công, số trận/người được giao hiển thị chưa có dữ liệu.
- Trọng tài: bàn làm việc với lịch, kết quả, ngoại tuyến và tra cứu danh mục. Không tự gán trận hoặc dựng kết quả minh họa thành dữ liệu chính thức.
- Nhà trường: giữ màn đăng ký VĐV dạng bảng, Excel, ảnh và bảng đăng ký môn sáu cột. Thêm tổng quan phiếu nháp, danh mục, lịch và công khai. Mặc định mở đăng ký VĐV.

Logo có ở thanh thương hiệu của cả bốn vai trò, đầu trang đăng ký VĐV, cửa sổ đăng ký môn và favicon. Bố cục co giãn; menu chuyển sang hàng cuộn trên màn nhỏ, các bảng rộng cuộn trong vùng riêng.

## Phạm vi và dữ liệu

Bộ chọn **Xem giao diện vai trò** chỉ thay bố cục/điều hướng, không đăng nhập hoặc cấp quyền. Chưa thay API/session, chưa kết nối Supabase/Google/Drive/Netlify. Các số trường/VĐV là phiếu nháp trên trình duyệt, không phải đăng ký đã duyệt; danh mục dùng đủ 9 môn/133 nội dung Excel hiện có. Phân công và công khai còn là luồng phác thảo; chức năng thi đấu/kết quả/ngoại tuyến giữ chế độ thử hiện tại. Phân quyền phải kiểm phía máy chủ khi nối backend.

Các nút mở workspace hiện có; không tạo số liệu/tài khoản/đăng ký chính thức giả. Chuyển vai trò/trang khi bảng VĐV có thay đổi chưa lưu giữ cơ chế xác nhận trước khi rời. Các bản đã lưu giữ nguyên trong storage/CAS. Test điều hướng C/I/K được cập nhật để chọn đúng vai trò trước khi mở workspace, vẫn giữ các khẳng định nghiệp vụ và lưu dữ liệu.

Xem [ảnh ứng dụng thực tế](../screenshots/role-workspaces-2026-10-13/README.md).
