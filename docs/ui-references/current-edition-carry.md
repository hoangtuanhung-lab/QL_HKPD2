# Giải hiện tại và kết chuyển giải mới

Ngày 13/10/2026 (Asia/Saigon). Bổ sung theo yêu cầu người dùng sau phạm vi môn phân công.

Quản trị có màn **Quản lý giải**: tạo giải có tên mới/năm sau giải nguồn; ba lựa chọn kết chuyển độc lập (danh mục, trọng tài/môn, dữ liệu đăng ký), mặc định không chọn. Xem trước số nội dung/trọng tài/phiếu/VĐV rồi xác nhận. Tạo không tự đổi giải hiện tại; thao tác **Đặt làm giải hiện tại** tách riêng và có xác nhận. Quản trị tiếp tục xem phiếu lịch sử, trường/trọng tài chỉ có giải hiện tại; phân công trọng tài còn lọc đúng vai trò/người/môn trong giải đó.

`TournamentState` chứa currentId, các giải, danh mục theo giải, danh sách trọng tài chuẩn bị và liên kết draftId → editionId. Cùng nằm trong envelope nháp hiện có, dùng Web Locks/revision/token CAS với phiếu đăng ký trong một `setItem`, không lưu currentId ở key riêng. Lỗi quota/CAS không đổi giải hiện tại hoặc ghi nửa dữ liệu. Các envelope v2 không có metadata vẫn đọc được; lần đầu gắn phiếu theo tên giải chuẩn hóa, giữ dữ liệu cũ, nhận diện giải 2026 đã có để không ẩn bản đang dùng. Quản trị phải kiểm lại giải hiện tại sau di trú tên lịch sử. Không dùng tên giải làm khóa cho các giải mới.

Kết chuyển tạo draftId mới cho trường và từng VĐV, giữ nguyên bản nguồn. Chỉ sao chép hồ sơ/nguyện vọng đăng ký, không sao chép kết quả, lịch, trạng thái duyệt hoặc quyền đăng nhập. Trọng tài nháp kế thừa giữ định danh người và cần rà soát; chưa là actor/session đã được cấp quyền. Nếu không chọn danh mục, danh sách nội dung giải mới rỗng và mã nguyện vọng/phân công kế thừa được để trống, không gán vào nội dung không tồn tại.

Thông tin lớp/năm sinh giữ để trường rà soát; không tự tăng lớp hoặc đoán cấp học. Màn đăng ký môn dùng năm giải đang mở và danh mục của giải đó, kiểm tuổi/giới tính/cấp/nhóm lại trước lưu. Các mã cũ không còn phù hợp được đánh dấu chọn lại; việc kết chuyển bản nháp không xác nhận đủ điều kiện dự giải mới. Ghi chú gốc được giữ nguyên nếu việc thêm nhãn rà soát vượt giới hạn 2000 ký tự; cảnh báo rà soát vẫn có ở trang giải kế thừa.

Nhà trường không chọn tên giải khác hoặc nhập JSON thuộc giải cũ; selector trường, tổng quan, công cụ bổ sung và xuất phiếu chỉ nhận bản của giải hiện tại. Import bị chặn khi vai trò/giải đổi trong lúc đọc tệp. Giải đổi sau lỗi lưu không được áp dụng trong màn quản lý. Các quyền staff không lấy từ danh sách nháp chuẩn bị.

**Phạm vi hiện tại:** metadata và kết chuyển là bản nháp cục bộ. Chưa có migration/database/session/backend nghiệp vụ thật. Khi nối backend cần nguồn giải hiện tại do máy chủ xác nhận, edition/school scope trên mỗi API, actor mapping, transaction và operation ID durable. Không coi thay currentId ở frontend là quyền thật, không tự tạo lại thư mục Drive hay chuyển tệp/kết quả live. Các công cụ thử nghiệm chung không chứa dữ liệu lịch sử chính thức và không được mở cho staff. Cập nhật currentId từ tab khác cần tải lại; CAS chặn ghi đè nhưng không phải cơ chế đẩy cấu hình thời gian thực.
