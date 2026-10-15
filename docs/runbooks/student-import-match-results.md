# Học sinh nền, đăng ký và kết quả theo vòng/trận

Cập nhật theo yêu cầu ngày 16/10/2026 (Asia/Saigon). Cấu hình điểm thuộc **tổ trưởng môn được phân công**, thiết lập theo nội dung trước khi tạo danh sách trận. Không tự triển khai Netlify hoặc tự áp dụng SQL lên Supabase thật.

## Áp dụng SQL và phiên bản giao diện

Sau khi 001–006 đã áp dụng thành công, chủ dự án chạy lần lượt:

1. [007_student_imports.sql](../../infra/supabase/007_student_imports.sql): dữ liệu học sinh nền, tra cứu theo CCCD, import đăng ký của quản trị.
2. [008_match_results.sql](../../infra/supabase/008_match_results.sql): danh sách trận, cấu hình điểm, xác nhận/từ chối/nhập lại, Log, khóa dữ liệu nguồn.

Mỗi file là một transaction. Chạy đúng thứ tự; không chạy lại các migration cũ hơn để sửa lỗi mà không đối chiếu phiên bản. Cả hai có lệnh thông báo làm mới schema cho PostgREST. Không xóa hồ sơ, mã VĐV, thư mục Drive hoặc kết quả cũ. Các giá trị đã xác nhận theo luồng cũ được giữ và hiển thị chỉ đọc, không tự chuyển chuỗi thành tích cũ thành tỷ số trận.

Cấu hình Google/Supabase/Netlify của [luồng vận hành trước](live-operations.md) giữ nguyên; không thêm secret. Cần triển khai đúng phiên bản sau khi review và chủ dự án chọn thời điểm. Giữ Stopped builds trong lúc kiểm tra.

## Quản trị: import học sinh nền

Menu **Dữ liệu học sinh**, tải mẫu Excel 7 cột:

| STT | HỌ VÀ TÊN | CCCD | NGÀY SINH | GIỚI TÍNH | TRƯỜNG | KHỐI |
| --- | --------- | ---- | --------- | --------- | ------ | ---- |

- CCCD là văn bản đúng 12 chữ số để giữ số 0 đầu; không dùng ô số/công thức. Ngày sinh `dd/mm/yyyy`, `yyyy-mm-dd` hoặc ô ngày Excel hợp lệ. Giới tính Nam/Nữ, khối 1–9.
- Trường dùng tên hoặc mã khớp duy nhất trong danh mục quản trị, không đoán tên gần giống. Import có xem trước, báo khác biệt với dữ liệu nền đang có và cần xác nhận trước ghi.
- Dữ liệu nền được cập nhật theo CCCD, không tự sửa hồ sơ đăng ký đã lưu. Không tự tạo số lượng trường/VĐV giả. Không xóa những học sinh không có trong file vừa nhập.
- Nhà trường chỉ tra cứu dữ liệu nền của trường được phân công, theo CCCD. Tại hàng đang sửa, nhập CCCD rồi bấm **Tra cứu học sinh** để điền tên/ngày sinh/giới tính/khối. Nếu đang nhập khác dữ liệu nền, có xác nhận trước khi điền thay.

## Quản trị: nhập danh sách đăng ký

Menu **Nhập đăng ký**, tải mẫu Excel đúng 8 cột:

| STT | Mã VĐV | TRƯỜNG | KHỐI | HỌ VÀ TÊN | CCCD | NGÀY SINH | GIỚI TÍNH |
| --- | ------ | ------ | ---- | --------- | ---- | --------- | --------- |

Mã VĐV mới để trống; máy chủ cấp khi lưu. Nếu nhập mã đã có, mã phải khớp CCCD và trường, không dùng Excel để tự cấp/sửa mã. Hồ sơ đã có được đối chiếu theo CCCD và giữ ID/mã VĐV, môn/nội dung đã chọn, ghi chú cũ. File không có môn/nội dung không làm mất đăng ký môn cũ.

File có thể chứa nhiều trường. Mỗi trường được gửi kèm revision hiện tại; tất cả ghi trong một transaction. Nếu bất kỳ dòng nào sai, trường không rõ, trùng CCCD hoặc phiếu đã khóa, không ghi dở các trường khác. Phiếu mới nhập là bản đang soạn trên máy chủ, không tự gửi/duyệt. Chỉ nhập vào phiếu đang soạn hoặc đã trả lại; không ghi đè phiếu đã gửi/duyệt.

Bảng đăng ký trong phần mềm có đúng 11 cột:

**STT, Mã VĐV, TRƯỜNG, KHỐI, HỌ VÀ TÊN, CCCD, NGÀY SINH, GIỚI TÍNH, Phân nhóm, NỘI DUNG THI ĐẤU, TRẠNG THÁI.**

Phân nhóm/nội dung chỉ đọc, lấy từ lựa chọn **Đăng ký môn** của từng VĐV; không nhập tự do vào Excel hoặc ô nội dung. Vẫn giữ một hàng trống để nhập tiếp. Trường có thể dùng mẫu mới trong bảng đăng ký của mình; file cũ chỉ được đọc để tương thích, không làm phát sinh đăng ký môn chính thức từ nguyện vọng nhập tự do.

Giới hạn kỹ thuật của mỗi tệp là 5 MB/2.000 dòng; có thể chia file. Đây không phải số lượng trường hay tổng số VĐV của giải. Nếu dữ liệu thay đổi ở nơi khác, đối chiếu và tải lại thay vì ghi đè.

## Tổ trưởng: thiết lập trước khi tạo trận

Menu **Kết quả**, chọn nội dung thuộc môn được giao. Tổ trưởng không có bộ chọn để truy cập môn ngoài phân công. Trọng tài không được tạo trận hoặc sửa cấu hình điểm. Quản trị xem được các môn nhưng việc thiết lập điểm/tạo trận thuộc tổ trưởng.

1. Với nội dung đối kháng, chọn **Loại trực tiếp** hoặc **Đấu vòng tròn**, nhập điểm thắng/hòa/thua và quy định có cho phép hòa hay không. Không dùng mặc định tự suy đoán; cấu hình được lưu theo mã môn/nội dung cùng danh sách trận.
2. Cá nhân lấy VĐV đã được duyệt đúng nội dung. Đội/cặp phải được tổ trưởng lập rõ tên và chọn thành viên cùng trường đã đăng ký/được duyệt; không tự ghép đội từ danh sách tên. Thành viên không xuất hiện ở hai đội/cặp cùng nội dung; cặp có đúng hai người. Tổ trưởng đối chiếu điều lệ và danh sách trước khi xác nhận tạo.
   Với nội dung cá nhân đối kháng: cần ít nhất 3 VĐV từ 2 trường; 3–5 VĐV dùng vòng tròn, từ 6 VĐV dùng loại trực tiếp. Đội/cặp cần ít nhất 3 đội/cặp từ 3 trường. Thứ tự xếp theo danh sách tham gia đã chọn, chưa có bốc thăm ngẫu nhiên hoặc xếp hạt giống tự động.

3. Loại trực tiếp: nhánh cố định, miễn vòng đầu nếu thiếu vị trí; không nhập điểm cho trận miễn đấu. Người thắng chỉ lên vòng sau sau khi xác nhận. Không cho hòa ở loại trực tiếp.
4. Vòng tròn: mỗi cặp gặp đúng một lần; số lượng lẻ có lượt nghỉ, không tính lượt nghỉ thành trận thắng. Giới hạn thao tác hiện tại: tối đa 16 Đội/Cặp/VĐV cho một bảng vòng tròn, 64 cho nhánh loại trực tiếp; chưa có chia nhiều bảng tự động.
5. Chạy/bơi/biểu diễn không tạo cặp đối kháng giả: chọn đơn vị thành tích (ví dụ giây, m, điểm) trước khi tạo danh sách. Mỗi dòng chỉ có VĐV/đội và kết quả bên 1; bên 2 để trống. Không ép số đo thành tỷ số hai bên.

Tổ trưởng cần kiểm tra cấu hình trước tạo; giao diện không mở sửa điểm thắng/hòa/thua sau khi đã tạo danh sách. Server cũng chặn thay danh sách trận sau khi đã có nhập điểm/yêu cầu xử lý, tránh làm mất dữ liệu thi đấu. Không tự chạy lại bốc thăm khi có thay đổi đăng ký.

## Trọng tài nhập — tổ trưởng/quản trị xác nhận

Mục **Kết quả** có bảng:

**STT, Môn, Nội dung, Vòng/trận, Đội/Cặp/VĐV 1, Trường 1, Kết quả 1, Đội/Cặp/VĐV 2, Trường 2, Kết quả 2, Trạng thái, Thao tác, Log.**

- Quản trị chọn môn → nội dung → vòng/trận. Tổ trưởng và trọng tài chỉ chọn nội dung/vòng/trận thuộc môn đã được phân công trong giải hiện tại.
- Trọng tài nhập tỷ số tổng hai bên, hoặc một số đo theo đơn vị đã cấu hình cho thi thành tích. Tỷ số/thành tích là số không âm, tối đa 3 chữ số thập phân, không tự làm tròn. Đối chiếu biên bản; chưa có bảng chi tiết từng hiệp/set hoặc tự suy ra kết quả từ các lần đo.
- **Xin xác nhận** chuyển sang **Chờ xác nhận** và khóa ô nhập. Trọng tài không có nút xác nhận/từ chối kết quả của mình.
- Tổ trưởng phụ trách hoặc quản trị **Xác nhận**; không cho cùng tài khoản nhập rồi tự xác nhận sau khi đổi vai trò. Kết quả đã xác nhận không được ghi đè trực tiếp.
- **Từ chối** cần lý do, chuyển sang **Nhập lại** và mở ô điểm cho trọng tài. Điểm cũ được giữ trong Log trước khi bỏ hiệu lực.
- **Xin nhập lại** cần lý do, chỉ gửi yêu cầu cho tổ trưởng; chưa tự mở khóa hoặc bỏ điểm đã xác nhận. Tổ trưởng bấm **Từ chối** để cho phép nhập lại.
- Khi một kết quả vòng trước bị từ chối, tất cả trận phụ thuộc mất hiệu lực, được ghi Log và phải nhập lại sau khi biết đúng đối thủ. Các nhánh độc lập không bị thay đổi. Nếu vòng trước đang xin nhập lại, server chặn nhập/xác nhận vòng sau cho đến khi xử lý.
- Trận chưa đủ đối thủ không mở nhập điểm. So sánh revision ở server ngăn hai thiết bị ghi đè hoặc xác nhận phiên bản điểm cũ. Lỗi mạng giữ điểm đang nhập; không tự bỏ những hàng khác chưa gửi khi lưu một trận.

Trạng thái hiển thị: **Chưa diễn ra → Chờ xác nhận → Xác nhận**, hoặc **Nhập lại** sau từ chối. Yêu cầu nhập lại là cờ riêng, không tự đổi trạng thái xác nhận cho đến khi tổ trưởng xử lý.

Log hiển thị thời gian Việt Nam, tài khoản thao tác, hành động, lý do và điểm trước/sau. Các lệnh của server dùng `auth.uid()` và phân công hiện tại; không tin vai trò hoặc trạng thái do client gửi. Dữ liệu nền, bảng trận và audit không cấp quyền đọc/ghi trực tiếp cho browser.

## Vòng tròn và sơ đồ

Có **Chọn trận**, **Trận trước/Trận tiếp**; loại trực tiếp có thêm bộ lọc vòng. Chuyển trận/nội dung khi có điểm chưa gửi phải xác nhận bỏ thay đổi.

Bảng theo dõi vòng tròn gồm trận đã đấu, thắng/hòa/thua, điểm theo cấu hình, điểm ghi/nhận. Khi chọn trận N, bảng tính đến số trận đó và chỉ cộng trận đã xác nhận. Khi chọn tất cả, cộng toàn bộ trận đã xác nhận. Từ chối kết quả làm loại điểm trận đó khỏi bảng cho đến lần xác nhận mới. Thứ tự hàng theo danh sách tham gia, chưa tự quyết định thứ hạng khi bằng điểm hoặc thay quy tắc tie-break của điều lệ.

Sơ đồ chỉ quan sát, không có nhập điểm/xác nhận trực tiếp. Điểm được nhập và xử lý ở bảng **Kết quả**. Phần xem kết quả của nhà trường chỉ hiện trận đã xác nhận, không có thao tác ghi điểm hoặc thông tin Log của trọng tài.

## Nghiệm thu trước khi triển khai

- Chạy `npm run check`, `bash infra/supabase/tests/run.sh`, `npm run secret:scan`.
- Thử import hai trường: một dòng sai phải không ghi trường còn lại; mã VĐV không khớp CCCD bị từ chối. Tra cứu học sinh nền của trường khác không trả dữ liệu.
- Nhập lại Excel của VĐV đã có: giữ nguyên ID, mã, nhóm/nội dung đã đăng ký. Kiểm tra bảng đúng 11 cột và Excel mới đúng 8 cột.
- Dùng hai tài khoản tổ trưởng/trọng tài khác nhau trong môn được giao. Tạo vòng tròn với điểm riêng, nhập một trận → xin xác nhận → xác nhận → xin nhập lại → từ chối → nhập lại → xác nhận; đối chiếu Log và điểm tổng sau mỗi bước.
- Tạo nhánh loại trực tiếp, xác nhận vòng đầu và vòng sau; xin nhập lại rồi từ chối trận vòng đầu. Kiểm tra vòng sau mất hiệu lực, sai phiên bản cũ bị chặn và đối thủ được cập nhật khi vòng đầu xác nhận lại.
- Thử nhập/xác nhận bằng trọng tài/tổ trưởng ngoài môn được giao, tài khoản bị thu hồi và khách chưa đăng nhập; server phải chặn.

Chưa áp dụng 007/008 hoặc triển khai lên dịch vụ thật từ môi trường phát triển. Kết quả tự động chia huy chương, tiebreak phức tạp, chi tiết từng set/hiệp và tiến trình giải nhiều bảng chưa được thay bằng những phép cộng điểm đơn giản của bảng theo dõi này.
