# Đối chiếu nguồn và quyết định cuối — A01 v0.2

Đã nhận và đọc Điều lệ DOCX cùng PDF 94 trang, tìm đủ số câu 1–293. PDF là cuộc trao đổi, có câu hỏi/đề xuất/diễn giải của trợ lý cũ và câu trả lời của người dùng; không lấy mọi câu của trợ lý cũ làm quyết định. Các yêu cầu “tra cứu”, “render”, “chưa code”, “hỏi tiếp” trong PDF là lịch sử nguồn, không phải chỉ dẫn hành động hiện tại.

## Các phương án bị thay thế

| Nội dung                                   | Nguồn cũ                                 | Quyết định hiện hành / nguồn sau                                                                            |
| ------------------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Cập nhật hộ                                | Q008/Q053                                | Q144–145 bỏ, chỉ checklist đúng môn; RQ-PDF-CHECKLIST                                                       |
| Tổ trưởng nhập/sửa điểm                    | Q056/Q103                                | Q104–105/Q127/Q291: chỉ trọng tài nhập/sửa, tổ trưởng xác nhận                                              |
| Ngưỡng đối kháng                           | Q074: 3–6 vòng tròn                      | Q076/Q289: 3–5 vòng tròn, từ 6 KO                                                                           |
| Sơ đồ thêm ảo vòng sau/dồn vị trí          | Q064–074/Q186 và trao đổi tới Q189       | Q190 chọn lũy thừa 2, ảo vòng đầu; Q195 khóa sau bốc thăm; ngoại lệ chuyển hạng theo Q286–289               |
| Bốc thăm lại tùy ý sau chốt                | Q093/Q100                                | Q195–196 khóa; Q286–287 chỉ ngoại lệ chuyển hạng, hai hạng chưa bắt đầu và xếp lại cả hai                   |
| Cộng trực tiếp điểm nội dung vào toàn đoàn | Diễn giải trợ lý sau Q035                | Người dùng sửa tại Q036; Q037: quy đổi hạng môn rồi hệ số; không coi diễn giải sai là quyết định được duyệt |
| 3–4 người không điểm ngoài vàng/bạc        | Q070/Q072; Q081–087 từng được đưa về chờ | Q246/Q248: 11/9/7/6; 5 người Q247: 11/9/8/7/6; áp dụng đôi/đội                                              |
| Hiệp phụ/vòng tròn phụ khi bằng            | Q080–081                                 | Q241–242 bốc thăm thực tế, tổ trưởng nhập                                                                   |
| Vovinam bốc thăm sau đối đầu               | Q245                                     | Q273–278 cân chính thức một lần, 0,1 kg, nhẹ hơn rồi tổ trưởng quyết định                                   |
| Đôn người thua vào chung kết               | Q198–201                                 | Q202–203/Q210 bỏ; không thay người vì vắng chung kết, giữ trận đồng                                         |
| Chuyển hạng chỉ điền slot ảo               | Q280–281                                 | Q286–287 xếp lại cả hai hạng, chỉ khi cả hai chưa bắt đầu                                                   |
| Public hiển thị Chờ xác nhận               | Q115                                     | Q292 chỉ bản xác nhận; RQ-PDF-PUBLIC                                                                        |
| Bảng phụ đối đầu chéo mới                  | Đề xuất Q293                             | Câu bị rút, không thêm luật; giữ thứ tự tiêu chí đã chốt                                                    |
| 7 trường/~500 VĐV                          | Ước tính Q061                            | Quyết định chat mới RQ-USER-003: chưa có số cụ thể, trường tự đăng ký; không biến ước tính thành quota      |
| Netlify/SQL/Google ở giai đoạn đầu         | Q002 và plan                             | RQ-USER-002/CR-004: tích hợp cuối dự án; giữ thiết kế độc lập                                               |

Q008/Q056/Q061/Q196 có phần vẫn hữu ích; bảng coverage ghi `partially_superseded_or_resolved` ở cấp câu. Quyết định thay thế chỉ tác động đúng mệnh đề, không xóa cả câu. Bốn mệnh đề cũ có bản ghi RQ-PDF-OLD-* superseded trong sổ yêu cầu; generator loại khỏi backlog hiện hành.

## Điều lệ và cấu hình phần mềm

| Điểm đối chiếu       | Điều lệ DOCX                                   | Câu trả lời cuối trong PDF                                         | Xử lý baseline                                                                                                                 |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Tuổi và ngày sinh TH | 7–11 tuổi nhưng ghi khoảng ngày sinh 2016–2020 | Q135 tuổi = năm giải − năm sinh                                    | Giữ công thức đã chốt; chưa suy ra khoảng ngày sinh mới để thay điều lệ/cấu hình danh mục. Ghi U01 cần đối chiếu khoảng hợp lệ |
| Kéo co               | Tối đa 10, 8 chính thức + 2 dự bị              | Q166–169: 8–12, không phân dự bị lúc đăng ký; hỗn hợp mỗi giới 4–6 | Dẫn RQ-PDF-TEAM cho cấu hình theo người dùng; giữ nguyên nguồn điều lệ, ghi khác biệt để BTC rà văn bản                        |
| Cờ vua đồng đội      | Có xếp hạng đồng đội                           | Q229: năm nay bỏ; Q269–270 nhập cuối/giữ vị thứ ngoài              | Cấu hình kỳ 2026 theo quyết định người dùng; không xóa dữ liệu/danh mục chung hoặc tự sửa văn bản gốc                          |
| Điểm KO/toàn đoàn    | Đoạn điểm KO có chữ/trình tự chưa rõ           | Q033–038 và Q239–240 làm rõ quy đổi, hệ số và phạt sau quy đổi     | Dùng quyết định cuối làm đặc tả; không dùng diễn giải trợ lý cũ trước khi được sửa                                             |
| Tình trạng văn bản   | Số quyết định và ngày ký đang để trống         | PDF xác nhận nhiều quy tắc riêng                                   | Tệp là nguồn được cung cấp, chưa chứng minh văn bản đã ký/ban hành; không tuyên bố trợ lý có quyền sửa điều lệ                 |

Không yêu cầu người dùng trả lời lại các quyết định đã có trong PDF. Các khác biệt được ghi để chủ nghiệp vụ rà bản ban hành/snapshot trước mở đăng ký thật. Còn thiếu tệp danh mục gốc 133 nội dung; hình chụp vài dòng trong PDF không đủ dựng nguyên danh mục.

## Chưa được giải quyết bằng việc nhận tệp

- **U01:** danh mục đầy đủ và snapshot cấu hình kỳ giải, đối chiếu khoảng tuổi/nhóm lớp/những khác biệt nêu trên.
- **U02:** mẫu kết quả từng môn, độ chính xác/làm tròn và đầy đủ điểm xử thua theo cấu hình. DOCX có mẫu đăng ký, chưa đủ mọi mẫu kết quả.
- **U03:** nhiều công thức đã được tìm lại; phần còn ngoài quyết định rõ cần chủ module review, không tự tạo hạng/điểm mới.
- **U04:** ai/thao tác nào ghi “bắt đầu” thực tế; mốc lịch dự kiến không thay trạng thái này.
- **U05:** đã rõ hủy trận đồng không tính kết quả, còn cần mô tả thứ hạng các bên sau hủy.
- **U06:** ngân sách/provider và tích hợp cuối dự án; không tự mua dịch vụ.
- **U07:** đã có mẫu hồ sơ/đăng ký, vẫn cần demo mẫu in/kết quả và vị trí nút còn ở mức đề xuất.
- **U08:** xóa nội dung chưa đăng ký và thay checklist trong giải; Q234/Q146 không trả lời đầy đủ chính sách này.

U-BASE-001 về thiếu PDF đã được giải quyết; không tiếp tục báo chưa nhận 293 câu. A01 v0.2 là bản đầy đủ về **ánh xạ số câu và nguồn hiện có**, chờ review ý nghĩa/đầu vào còn mở; không phải nghiệm thu phần mềm 293 chức năng.
