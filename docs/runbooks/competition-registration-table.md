# Danh sách đăng ký dùng cho xếp nhánh và vòng tròn

Hai màn hình quản trị **Sơ đồ thi đấu** và **Vòng tròn** có bộ chọn **Nội dung đăng ký** và cùng một bảng:

| STT | Mã VĐV | Tên VĐV | Mã trường | Tên trường |
| --- | ------ | ------- | --------- | ---------- |

- STT tăng từ 1 theo danh sách đã lọc. Mã VĐV dùng ID bản nháp ổn định của VĐV; không tạo lại mã khi đổi bộ lọc.
- Chỉ lấy phiếu đã lưu thuộc giải hiện tại. Chỉ VĐV có lựa chọn đúng mã nội dung mới xuất hiện, kể cả khi VĐV đăng ký nhiều nội dung. Nội dung đã bỏ khỏi giải không có trong bộ chọn.
- Mã/tên trường lấy từ danh mục quản trị (migration 003): ưu tiên ID trường đã liên kết, sau đó đối chiếu tên khi chỉ có một kết quả. Tên trùng nhiều trường hoặc chưa có danh mục sẽ hiển thị **Chưa có mã**, không đoán mã trường.
- Các lựa chọn bản cũ chỉ được chuyển khi khớp duy nhất với danh mục và phạm vi học sinh. Nguyện vọng nhập tự do không được coi là đăng ký; danh sách lựa chọn rỗng đã lưu không được phục hồi từ lựa chọn cũ.
- Hồ sơ đã đăng ký nhưng sai cấp học/giới tính/tuổi vẫn xuất hiện để đối chiếu, đồng thời chặn tạo vòng đấu. Thiếu mã trường cũng cần xử lý trước khi tạo.

Bấm **Tạo vòng đấu thử** sử dụng đúng các VĐV trong bảng. Giữ quy định hiện có: cá nhân 3–5 người dùng vòng tròn; loại trực tiếp 6–64 người. Chọn nội dung khác sẽ bỏ vòng đấu thử cũ và lựa chọn hạt giống. Nếu nguồn đăng ký hoặc danh mục trường thay đổi, vòng đấu không còn khớp nguồn sẽ không được hiển thị/chốt.

Nội dung đội/đôi/tiếp sức vẫn hiển thị từng VĐV đăng ký, nhưng chưa tự ghép người thành đội để bốc thăm. Cần danh sách đội/thành viên được xác nhận cho bước đó. Nội dung thi thành tích/biểu diễn cần phân lượt/làn hoặc chấm điểm, không tạo nhánh đối kháng từ danh sách VĐV này.

**Giới hạn hiện tại:** nguồn VĐV là các phiếu bản nháp đã lưu trên trình duyệt, chưa phải đăng ký chính thức đồng bộ Supabase. Trọng tài tiếp tục giữ chế độ quan sát theo phân công; thay đổi này không mở quyền thao tác quản trị cho trọng tài. Công cụ nhập danh sách thủ công vẫn phục vụ kiểm thử độc lập, không hiện trong hai trang quản trị đã nối nguồn đăng ký.

Không cần SQL hoặc biến môi trường mới; danh mục trường dùng migration 003 đã có. Theo yêu cầu chủ dự án, Netlify ở **Stopped builds**: chỉ đẩy mã/tạo PR và chạy kiểm tra; không gọi triển khai hoặc bật lại build.
