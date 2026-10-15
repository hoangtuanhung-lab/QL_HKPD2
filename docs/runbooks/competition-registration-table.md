# Danh sách đăng ký dùng cho xếp nhánh và vòng tròn

> Cập nhật tích hợp: sau migration 005/006 và frontend mới, dữ liệu nghiệp vụ dùng Supabase và tệp dùng Netlify Functions/Drive. Xem [hướng dẫn vận hành trực tuyến và giới hạn hiện tại](live-operations.md). Các mô tả bản nháp bên dưới áp dụng cho phiên bản cũ hoặc công cụ thử độc lập.

Tên trang **Sơ đồ thi đấu** đã đổi thành **Loại trực tiếp**. Theo yêu cầu chủ dự án, **Loại trực tiếp** và **Vòng tròn** đã được bỏ khỏi menu quản trị và không thể mở qua điều hướng của vai trò này. Tổ trưởng trọng tài vẫn thấy hai mục này ở chế độ quan sát theo phân công; chưa mở công cụ tạo vòng đấu cho trọng tài.

Thành phần `CompetitionWorkspace` được giữ để phát triển và kiểm thử độc lập. Khi truyền nguồn đăng ký, thành phần có bộ chọn **Nội dung đăng ký** và cùng một bảng:

| STT | Mã VĐV | Tên VĐV | Mã trường | Tên trường |
| --- | ------ | ------- | --------- | ---------- |

- STT tăng từ 1 theo danh sách đã lọc. Mã VĐV dùng ID bản nháp ổn định của VĐV; không tạo lại mã khi đổi bộ lọc.
- Nguồn truyền vào phải giới hạn ở giải hiện tại. Chỉ VĐV có lựa chọn đúng mã nội dung mới xuất hiện, kể cả khi VĐV đăng ký nhiều nội dung. Nội dung đã bỏ khỏi giải không có trong bộ chọn.
- Mã/tên trường lấy từ danh mục quản trị (migration 003): ưu tiên ID trường đã liên kết, sau đó đối chiếu tên khi chỉ có một kết quả. Tên trùng nhiều trường hoặc chưa có danh mục sẽ hiển thị **Chưa có mã**, không đoán mã trường.
- Các lựa chọn bản cũ chỉ được chuyển khi khớp duy nhất với danh mục và phạm vi học sinh. Nguyện vọng nhập tự do không được coi là đăng ký; danh sách lựa chọn rỗng đã lưu không được phục hồi từ lựa chọn cũ.
- Hồ sơ đã đăng ký nhưng sai cấp học/giới tính/tuổi vẫn xuất hiện để đối chiếu, đồng thời chặn tạo vòng đấu. Thiếu mã trường cũng cần xử lý trước khi tạo.

Bấm **Tạo vòng đấu thử** sử dụng đúng các VĐV trong bảng. Giữ quy định hiện có: cá nhân 3–5 người dùng vòng tròn; loại trực tiếp 6–64 người. Chọn nội dung khác sẽ bỏ vòng đấu thử cũ và lựa chọn hạt giống. Nếu nguồn đăng ký hoặc danh mục trường thay đổi, vòng đấu không còn khớp nguồn sẽ không được hiển thị/chốt.

Nội dung đội/đôi/tiếp sức vẫn hiển thị từng VĐV đăng ký, nhưng chưa tự ghép người thành đội để bốc thăm. Cần danh sách đội/thành viên được xác nhận cho bước đó. Nội dung thi thành tích/biểu diễn cần phân lượt/làn hoặc chấm điểm, không tạo nhánh đối kháng từ danh sách VĐV này.

**Kiểm tra tách danh sách:** bộ lọc dùng đúng mã nội dung đã lưu, do đó môn được xác định theo danh mục của nội dung. Một VĐV đăng ký Điền kinh và hai nội dung Bơi xuất hiện một lần ở từng nội dung tương ứng; không xuất hiện ở môn chưa đăng ký. Hai học sinh trùng tên vẫn giữ hai ID riêng. Bỏ lựa chọn Bơi sẽ loại VĐV khỏi các danh sách Bơi tương ứng. Không tạo bản sao hồ sơ khi lọc. Đã bổ sung kiểm thử cho các trường hợp này.

**Giới hạn hiện tại:** nguồn VĐV là các phiếu bản nháp đã lưu trên trình duyệt theo tài khoản, chưa phải đăng ký chính thức đồng bộ Supabase. Vì vậy trường đăng ký trên máy/tài khoản của trường **chưa tự động gửi danh sách** đến quản trị hoặc trọng tài. Hiện chưa có danh sách tổng hợp theo môn trong màn hình quan sát của tổ trưởng; bộ lọc theo nội dung chỉ có trong thành phần thử độc lập khi được cấp nguồn. Cần bổ sung luồng lưu/gửi đăng ký dùng chung và truy vấn theo giải, môn được phân công trước khi nghiệm thu khả năng đồng bộ thực tế. Công cụ nhập danh sách thủ công vẫn phục vụ kiểm thử độc lập.

Không cần SQL hoặc biến môi trường mới; danh mục trường dùng migration 003 đã có. Theo yêu cầu chủ dự án, Netlify ở **Stopped builds**: chỉ đẩy mã/tạo PR và chạy kiểm tra; không gọi triển khai hoặc bật lại build.

## Lịch thi đấu và phân làn

Menu dùng tên **Lịch thi đấu**. Quản trị chỉ có công cụ quản lý lịch các môn (thời gian, địa điểm, kiểm tra trùng lịch và thời gian nghỉ); không có biểu mẫu, nút đề xuất hay bảng điều chỉnh làn.

Phân lượt/làn chạy, bơi thuộc nghiệp vụ trọng tài được phân công môn Điền kinh hoặc Bơi trong giải hiện tại. `LaneWorkspace` đã tách khỏi `ScheduleWorkspace` và chỉ được dùng kiểm thử độc lập. Chưa mở công cụ nhập danh sách thủ công này cho tài khoản trọng tài thật: cần nối nguồn đăng ký dùng chung, kiểm quyền theo môn/nội dung và lưu phân làn ở máy chủ trước. Giao diện trọng tài hiện vẫn quan sát theo phân công.

Kiểm thử xác nhận quản trị vẫn xếp lịch và phát hiện xung đột, không truy cập thao tác phân làn; thuật toán phân làn độc lập vẫn chặn trùng làn.
