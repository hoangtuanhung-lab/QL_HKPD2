# Chỉ quan sát môn theo phân công

Ngày 13/10/2026 (Asia/Saigon), theo yêu cầu người dùng sau PR #28.

Tổ trưởng và trọng tài không được mặc định xem toàn bộ môn. `assignedSportCodes` lấy phân công của đúng actor đã được phê duyệt, vai trò (`leader`/`referee`) và kỳ giải; mã lạ bị bỏ, không có phân công trả danh sách rỗng. Mapping sport UUID → MaMon lấy từ adapter tin cậy của kỳ giải, không dùng tên môn hoặc dữ liệu URL/localStorage làm quyền.

Tổng quan chỉ đếm/hiển thị các môn và nội dung được giao. Bảng danh mục giao cắt phạm vi phân công trước khi lọc tìm kiếm/cấp/giới tính. Các workspace thử chung R/C/K/I chưa có dữ liệu gắn phân công nên không mount cho hai vai trò này; thay bằng màn quan sát theo môn và trạng thái chưa có dữ liệu. Không đưa hàng đợi IndexedDB chung hoặc danh sách phiếu trường vào bàn trọng tài. Quản trị vẫn có công cụ thử nghiệm chung.

`App` nhận optional `WorkspaceSession` từ adapter phiên xác thực; khi có phiên, bộ chọn chỉ chứa vai trò được cấp, không thể đổi thành quản trị để mở rộng phạm vi. Thu hồi/chuyển actor/kỳ giải cập nhật phạm vi ngay, mất phiên sau khi đã dùng phiên không quay lại bộ chọn vai trò preview đầy đủ. Không lưu quyền trong bản nháp trình duyệt.

**Giới hạn:** entrypoint hiện chưa nối đăng nhập/session thật, nên preview tổ trưởng/trọng tài có 0 môn. Đây là kiểm soát phạm vi giao diện và contract đầu vào, chưa phải nghiệm thu phân quyền API. Catalog tĩnh là tài sản frontend, không phải kho dữ liệu bí mật. Khi kết nối backend, phải cấp phiên xác thực, mapping UUID đúng kỳ giải, truy vấn dữ liệu theo phạm vi và kiểm quyền ở mỗi API/tệp; không nhận `actor` từ request body hoặc coi bộ chọn preview là xác thực. Lịch/đăng ký/kết quả theo môn chưa nối nguồn thật, nên không giả lập phân công để mở chúng.

Regression kiểm riêng Bơi/Bóng đá theo hai vai trò của cùng actor, actor khác, kỳ giải khác, mã lạ, mất phê duyệt/mất phiên và không mount các công cụ dữ liệu chung.
