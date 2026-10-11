# Đặc tả nền A01 v0.1

Đọc cùng requirements.json và bảng truy vết. Nội dung từ plan được ghi nhận để đội có căn cứ đối chiếu; người dùng chưa duyệt lại toàn bộ nghiệp vụ này. Plan là tài liệu phân công và phương án kỹ thuật, không thay PDF/điều lệ gốc.

## Quyết định hiện hành của người dùng

- Mỗi VĐV có thư mục kết quả riêng (RQ-USER-001/CR-001). Thiết kế logic theo A03/ADR-002 là một thư mục theo cặp kỳ giải/VĐV. Quyền tải tệp và quyền sửa kết quả chính thức tách riêng; chưa xác nhận mọi VĐV có tài khoản tự tải lên.
- SQL, Google và Netlify thực hiện ở bước cuối (RQ-USER-002/CR-004). Cơ chế lưu thật, OAuth, Drive, triển khai và nghiệm thu liên quan chưa hoạt động. Không cần tích hợp các dịch vụ này để lập đặc tả hoặc viết phần độc lập.
- Chưa có số liệu người tham gia; trường tự bổ sung đăng ký theo thực tế (RQ-USER-003/CR-008). Số lượng ban đầu rỗng, tăng theo danh sách. Quy mô 7 trường/500 VĐV trong plan là tham khảo kiến trúc/fixture, không phải quota. Hạn mức từng nội dung vẫn cần điều lệ U01; không suy ra mọi nội dung được đăng ký vô hạn.
- Codex làm đầu mối kiểm tra/chỉnh sửa/đẩy mã thành viên gửi (RQ-USER-004/CR-007). QT37 cũ về reviewer khác người thực hiện được thay bằng QT37-R1; giữ PR và CI. Quy tắc này không làm mọi feature được nghiệm thu hoặc tự cho phép merge từ yêu cầu push.

## Vai trò và phạm vi cần backend thực hiện

| Vai trò từ plan | Thao tác dự kiến                                         | Giới hạn phải đối chiếu / kiểm server                                                     |
| --------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Quản trị        | Tạo/sao chép cấu hình giải, mở đăng ký, quản lý và duyệt | Không nhập/sửa điểm thay trọng tài; xác nhận thay chỉ theo trường hợp đã chốt (QT17)      |
| Nhà trường      | Hồ sơ, phiếu đăng ký, đôi/đội, gửi và sửa                | Chỉ trường được giao, đúng giải; tài khoản chưa duyệt không ghi (QT15)                    |
| Trọng tài       | Nhập/sửa bản kết quả trong checklist                     | Đúng môn/nội dung/phân công; cùng trường bị khóa đúng phạm vi (QT15–QT16)                 |
| Tổ trưởng       | Kiểm bản nhập, xác nhận đúng phiên bản                   | Không nhập/sửa điểm thay trọng tài; cùng trường vẫn được xác nhận theo quy tắc trong plan |
| Người theo dõi  | Tra cứu thành tích/bảng được công bố                     | Chỉ đọc projection cho phép, không hồ sơ riêng hoặc bản nhập chờ (QT18/QT34)              |

Đây là ma trận mô tả từ plan, chưa phải policy server đã cài đặt. Tài khoản, vai trò và quyền theo giải/môn/trường/checklist cần S01/S02/Q02 đối chiếu nguồn và kiểm API trực tiếp. Màn hình ẩn nút không thay kiểm quyền.

## Từ điển nghiệp vụ tối thiểu

| Khái niệm             | Ý nghĩa / ranh giới                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Kỳ giải (`edition`)   | Phạm vi độc lập của cấu hình, đăng ký, lịch, phân công, thi đấu, kết quả và công bố; chuyển giải phải tải lại scope |
| Trường (`school`)     | Đơn vị đăng ký chính thức với mã thống nhất; tên nhập ở phiếu nháp A04 chưa thay định danh trường server            |
| Học sinh / VĐV        | Hồ sơ gốc khác hồ sơ tham gia kỳ giải; ID kỹ thuật khác mã hiển thị và STT                                          |
| Mã VĐV                | Chuỗi giữ số 0 như `01.012`; server cấp trong phạm vi giải/trường, không cấp bằng STT trên giao diện                |
| Nội dung              | Thuộc môn/nhóm trong kỳ giải và rule snapshot; danh mục/tuổi/giới/hạn mức chưa đầy đủ U01                           |
| Đăng ký / revision    | Bản nháp, bản gửi và bản đã duyệt tách riêng; sửa đang chờ không thay bản duyệt còn hiệu lực                        |
| Đội / đôi             | Có thành viên và scope trường/nội dung; cơ cấu và hạn mức phải đối chiếu điều lệ                                    |
| Vị trí ảo             | Vị trí trên sơ đồ, không tạo VĐV hoặc điểm thi giả                                                                  |
| Bản nhập / chính thức | Submission đang chờ khác official được xác nhận; chỉ xác nhận hợp lệ đổi official                                   |
| Xếp hạng / công bố    | Bảng có nguồn và phiên bản, trạng thái sơ bộ/chốt; công khai lấy phạm vi đã công bố                                 |
| Thư mục kết quả       | Kho tệp logic riêng của VĐV, kiểm quyền theo giải/VĐV; không tự công khai khi thành tích được công bố               |

Không gộp số đăng ký, đã duyệt, thực tế thi, hợp lệ hoặc số xét huy chương thành một bộ đếm (QT10). Bộ đếm A04 chỉ đo phiếu/VĐV nháp, chưa phải số thi đấu hoặc số người duy nhất toàn hệ thống.

## Các luồng nền

1. **Tạo giải:** Admin tạo giải Nháp hoặc sao chép cấu hình được chọn; nhập tên/thời gian mới, xem trước và kiểm cấu hình rồi mở đăng ký. Không sao chép đăng ký/đội/phân công/lịch/kết quả/giải thưởng; nguồn không đổi (TG01–TG08/QT12). Các bước backend chưa triển khai.
2. **Đăng ký:** Trường lập danh sách, đối chiếu hồ sơ/danh mục/điều kiện, gửi duyệt. Sửa tạo revision mới; bản đã duyệt vẫn có hiệu lực tới quyết định hợp lệ. Vòng đời và API duyệt/trả cần chốt với R03/S01/L02; A03 mới có hợp đồng lõi, A04 mới có nháp cục bộ.
3. **Phân công:** Chọn kỳ giải/môn, tổ trưởng và trọng tài/checklist; kiểm người hợp lệ/xung đột cùng trường. U08 giữ mở về đổi checklist khi giải chạy.
4. **Thi đấu:** Dùng danh sách đã duyệt và snapshot điều lệ để tạo sơ đồ/vòng tròn, hạt giống, lịch/lượt/làn. KO nhánh cố định, ảo không phải người; vòng tròn mỗi cặp một lần, không điểm ảo. Không tự chọn thể thức/ngưỡng hoặc tiêu chí phân hạng từ thuật toán phổ biến.
5. **Chuyển hạng:** Kiểm nguồn/đích, điều kiện chưa bắt đầu, hạn mức và ngoại lệ; có thể phải xếp lại hai sơ đồ. U04 chưa chốt thao tác/quyền ghi nhận bắt đầu; lịch dự kiến không chứng minh đã bắt đầu.
6. **Kết quả:** Trọng tài nhập/gửi bản chờ; tổ trưởng xác nhận đúng bản và version. Sửa tạo bản riêng, chưa duyệt thì official cũ giữ nguyên. Xung đột phải xem lại; xác nhận không nhận điểm/huy chương do client tự tính. Chỉ official hợp lệ mở bước vòng sau.
7. **Xếp hạng/công khai:** Tính từ kết quả/trạng thái hợp lệ và rule version; sửa official làm bảng phụ thuộc về sơ bộ để tính/chốt lại. Không tự dùng tổng điểm nội dung thay quy trình môn/toàn đoàn. U02/U03/U05 cần đối chiếu trước nghiệm thu.
8. **Ngoại tuyến/tệp/vận hành:** Giữ operation ID/version/phân công, đồng bộ không tự xác nhận; giữ cả bản xung đột. Tệp kiểm quyền, backup/restore có manifest/checksum và dữ liệu/tệp/khóa cần thiết. Adapter Google/SQL/deploy giữ tới cuối theo quyết định người dùng.

Các bước lấy từ mục 4, 5, 10, 16 và 19 của plan. Chi tiết có mã QT/T/TG trong sổ nguồn; không tự thêm thời hạn, điểm, ngưỡng tuổi/giới, cân, số đội hoặc retention thành luật chính thức.

## Đầu vào và cổng còn mở

U01–U08 được giữ nguyên nội dung/đầu mối/mốc từ mục 13 của plan. U06 đã có quyết định stack ở A02, nhưng provider, chi phí và tích hợp thật vẫn hoãn; không đánh dấu U06 đóng toàn bộ. U07 ảnh hưởng mẫu in/bố cục, không chặn engine độc lập. U-BASE-001 bổ sung để theo dõi nguồn PDF/điều lệ chưa nhận, không ngụ ý người dùng chưa quyết định các câu trong PDF.

Giữ nguyên số và ví dụ trong T01–T12 dưới dạng trích dẫn, **không dùng làm golden test chuyên môn trước đối chiếu**: giới hạn môn/đội, 3–5/6+ người, 3 kg, fair-play, điểm 9/11, hệ số 3 và các ngoại lệ có thể thiếu ngữ cảnh từ PDF. Các nguồn còn thiếu chỉ khóa bước trực tiếp phụ thuộc; không khóa việc hoàn thiện tài liệu, hợp đồng hoặc phiếu nháp.
