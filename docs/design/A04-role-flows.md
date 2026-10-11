# A04 — Sáu luồng theo vai trò

Wireframe văn bản có phiên bản A04-v2, đối chiếu A01-v0.2 ngày 11/10/2026 (Asia/Saigon). Đầu ra thiết kế cho F01/R04/C04/F02, chưa phải các màn hình đã kết nối backend. UI hiện chỉ thực hiện nháp đăng ký cục bộ; năm tab khác là mô tả luồng. Nguồn truy vết: Q144–150 phân công, Q190/Q195 KO, Q076 vòng tròn, Q291 xác nhận, Q130/Q292 công khai; chi tiết trong `docs/business/pdf-coverage.md`.

## 1. Nhà trường đăng ký

```text
[Kỳ giải ▼] [Trường được phép xem] [Trạng thái / hạn đăng ký]
[Hồ sơ] [Đăng ký nội dung] [Đôi / đội] [Lịch sử duyệt]
Tìm học sinh → chọn nội dung từ cây danh mục → thêm đăng ký
Bảng: Mã VĐV | Họ tên | Nội dung | Cảnh báo/lỗi | Trạng thái
[Lưu nháp] [Xem trước gửi] [Gửi quản trị]
```

Bắt đầu trống, trường nhập theo thực tế. Chọn học sinh đã có hồ sơ hoặc tạo đề nghị hồ sơ; nếu danh sách gốc tồn tại thì hồ sơ mới cần duyệt trước đăng ký thi đấu. Chọn nội dung theo catalog/rule snapshot; lỗi sai giới, môn thứ ba và vượt hạn mức chặn gửi; tuổi/lớp theo cấu hình, không tự suy diễn ngưỡng đang vướng U01. Nháp đội chưa đủ được lưu, gửi phải đủ thành viên/cơ cấu. Preview liệt kê số dòng hợp lệ, lỗi và dữ liệu sẽ gửi.

Gửi thành công → chờ duyệt; quản trị duyệt hoặc trả lại kèm lý do → trường sửa/gửi lại. Bản sửa có revision riêng; bản đã duyệt còn hiệu lực tới lúc sửa được duyệt. Lỗi version → xem bản hiện tại, giữ nháp để đối chiếu, không tự ghi đè. Quá hạn → thông báo và giữ nháp; mở lại là hành động quản trị. Sau draw không thêm người ngoài bằng sửa đăng ký; ngoại lệ thay đôi/tiếp sức dùng luồng riêng đúng môn. Nháp cục bộ hiện có không cấp mã server, không gửi/duyệt hay chứng minh điều kiện này.

## 2. Phân công trọng tài

```text
[Kỳ giải ▼] [Môn ▼] [Tổ trưởng ▼]
Trọng tài | Trường | Nội dung được tick | Xung đột / bao phủ
[Thêm người] [Kiểm tra bao phủ] [Xem trước] [Lưu phân công]
```

Quản trị chỉ định tổ trưởng theo môn; tổ trưởng chọn trọng tài và checklist đúng môn. Kiểm nội dung/trận đủ người hợp lệ, lịch và dòng cùng trường. Không có nút “Cập nhật hộ”. Cùng người có thể giữ vai trò khác theo môn; khóa nhập áp dụng dòng cùng trường, không tự cấm tổ trưởng xác nhận chỉ vì cùng trường. Lưu lỗi → tô dòng/nội dung thiếu và giữ bản nháp; lưu thành công → phiên bản phân công mới. U08 còn mở về checklist đổi giữa giải; dữ liệu offline theo quyền cũ chuyển inbox xem xét, không tự bỏ hoặc công nhận.

## 3. Sơ đồ KO

```text
[Nội dung ▼] [Danh sách đã duyệt] [Hạt giống: tự động/thủ công]
[Ưu tiên khác trường vòng 1] [Kiểm tra] [Xem trước sơ đồ]
Vòng 1 → Tứ kết → Bán kết → Chung kết
[Chốt tạo sơ đồ] [Lịch / biên bản] [Lịch sử thay đổi]
```

Lấy danh sách duyệt/rule snapshot. Đối kháng cá nhân từ 6 người dùng KO; số slot là lũy thừa 2 kế tiếp, ảo chỉ vòng đầu, không ảo–ảo; hạt giống tối đa bốn theo quy tắc đã chốt. Preview chỉ ra slot, ảo, vị trí seed và ngoại lệ khác trường, cần xác nhận để tạo. Tạo xong khóa topology; rút giữ nhánh, không dồn. Nhánh trống không được hồi sinh người thua tùy ý. Thiếu điều kiện → giữ bản trước, báo nguyên nhân, không âm thầm sửa.

Chuyển hạng là ngoại lệ: tổ trưởng yêu cầu, kiểm cả hai chưa bắt đầu, giới hạn/cân/trường rồi preview dựng lại **cả hai** và thay đổi 5↔6 trước xác nhận. Nếu hạng đã bắt đầu → chặn, không sửa draw. U04 chưa chốt người/thao tác ghi thời điểm bắt đầu; không lấy thời gian lịch làm bằng chứng. Lỗi version → tải lại hai sơ đồ để đối chiếu, không tự retry ghi.

## 4. Vòng tròn và lịch

```text
[Nội dung ▼] [Danh sách đã duyệt] [Vòng đấu ▼]
Cặp đấu | Trọng tài | Địa điểm | Giờ dự kiến | Xung đột
[Xem trước cặp đấu] [Sắp lịch] [Kiểm xung đột] [Lưu]
[Bảng điểm sơ bộ] [Quyết định phân hạng] [Chốt bảng]
```

Đối kháng cá nhân 3–5 người dùng vòng tròn, bóng đá/kéo co theo cấu hình môn; mỗi cặp đúng một lần, số lẻ nghỉ lượt không có điểm ảo. Lịch kiểm trùng người, trọng tài, địa điểm và thời gian nghỉ theo cấu hình. Xung đột → giữ lịch nháp, chỉ ra dòng; không tự chuyển sang KO hoặc bỏ cặp. Trọng tài mở trận được phân công, nhập/gửi kết quả; tổ trưởng xác nhận; bảng sơ bộ tính lại từ official.

Phân hạng theo snapshot từng môn, khác nhau giữa bóng đá/cầu/kéo co/Vovinam. Nếu tới tiêu chí bốc thăm thật → tổ trưởng ghi quyết định/biên bản, không tạo random trong trình duyệt. Vovinam cuối cùng dùng cân chính thức và quyết định tổ trưởng nếu vẫn hòa; Q293 rút đề xuất nên không thêm bảng mini đối đầu mới. DSQ/vắng và khôi phục tuân thủ nội dung/trạng thái; lưu thực đấu trước đó, không coi walkover là thực đấu. Chốt bảng chỉ khi đủ điều kiện và không còn quyết định cần nhập.

## 5. Nhập và xác nhận kết quả

```text
Trọng tài: [Trận / lượt] [Biểu mẫu đúng môn] [Tệp biên bản]
[Giữ bản nhập] [Gửi chờ xác nhận]
Tổ trưởng: [Danh sách chờ] → [Bản gửi / official cũ / chênh lệch]
[Yêu cầu nhập lại + lý do] [Xác nhận đúng bản đang xem]
```

Chỉ trọng tài được nhập/sửa theo phân công/checklist và scope; tổ trưởng xác nhận hoặc yêu cầu nhập lại. Xác nhận gửi submission ID/version và base official version, không gửi điểm/huy chương tự tính. Thành công → official mới, audit và thông báo; mở nhập vòng sau khi official đúng điều kiện. Bản sửa chưa xác nhận giữ official cũ và public cũ. Xung đột → hiển thị bản đã thay đổi, giữ bản gửi để người dùng xem lại; không lấy “gửi sau cùng thắng”. Quản trị chỉ xác nhận thay khi tổ trưởng vắng theo ngoại lệ đã chốt, không được tự nhập điểm.

Ngoại tuyến → lưu operation/version/phân công; reconnect giữ mọi biến thể, kiểm quyền lại, xung đột vào inbox. Kết quả đồng bộ không tự là official. Tệp có thể bổ sung sau, quyền tệp không cấp quyền sửa điểm. U02 giữ mở biểu mẫu/độ chính xác; không đổi DSQ/DNF thành số 0. Các giao dịch này cần API thật, hiện mới có hợp đồng và mock đọc.

## 6. Công khai hai khung

```text
Máy tính: [Sơ đồ / lịch / kết quả đã xác nhận] | [Bảng xếp hạng đã chốt]
Di động:  [Khung thứ nhất]
          [Khung thứ hai]
[Kỳ giải ▼] [Môn / nội dung ▼] [Tra mã / tên / trường]
[In dữ liệu được phép] [Trạng thái phiên bản công bố]
```

Chỉ lấy projection official trong phạm vi đã công bố, không đọc submissions/private profile. Chưa công bố → trạng thái “Chưa có dữ liệu công bố”, không dùng bản chờ để lấp khung. Không có ngày sinh, mã hồ sơ, CCCD, ảnh, tệp riêng. Sửa official làm bảng phụ thuộc về sơ bộ để tính/chốt/công bố lại; không lộ bản pending. In/xuất dùng quyền và ghi chú sửa đúng phiên bản; U07 còn cần bố cục cuối. Lỗi tải → giữ bộ lọc, cho thử lại, không giả hiển thị dữ liệu mới. Đọc public không cấp quyền tệp.

## Bàn giao UI

F01 thống nhất nhãn tiếng Việt, modal/xung đột; R04 nhận luồng 1, C04 nhận 3–5 cùng chủ module, S02 nhận 2, F02 nhận 6. Q03 dùng scenarios A05 để gắn evidence E2E khi API sẵn sàng. Mock giúp dựng giao diện; chưa thay nghiệm thu quyền server, transaction, thuật toán hoặc biểu mẫu cuối.
