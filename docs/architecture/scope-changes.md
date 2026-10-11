# Nhật ký thay đổi phạm vi

| ID     | Nguồn                 | Quyết định và tác động                                                                                                                                                                 |
| ------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CR-001 | Người dùng trong chat | Mỗi VĐV có một thư mục lưu kết quả; S03/R02/K01/P01/O02 phối hợp, theo ADR-002. Chưa triển khai.                                                                                       |
| CR-002 | Người dùng trong chat | Codex nhận O01: B01 và B07.                                                                                                                                                            |
| CR-003 | Người dùng trong chat | Chưa có A02; người dùng giao Codex phụ trách bổ sung A02.                                                                                                                              |
| CR-004 | Người dùng trong chat | Tất cả nội dung liên quan Netlify, SQL và Google thực hiện cuối dự án. Hoãn các tích hợp, thay smoke database bằng smoke nền tảng; không đánh dấu các tiêu chí tích hợp đã hoàn thành. |

CR-004 được ưu tiên hơn lịch tích hợp trong plan v1.4. L02 cần điều chỉnh phụ thuộc và cổng G1/G2/G5: kiểm thử dữ liệu/quyền thật chưa thể nghiệm thu sớm khi persistence/auth được hoãn. Các phần độc lập tiếp tục; mock/fixture không thay kết quả nghiệm thu backend thật.

## CR-005 — Giao A03 cho Codex

Ngày 11/10/2026; người dùng yêu cầu “Giao tôi A03: thiết kế hợp đồng API/DTO”. Codex phụ trách thiết kế hợp đồng DTO/schema lõi của L01/P01, bên cạnh A02/B01/B07. Đầu ra: OpenAPI, DTO TypeScript sinh từ cùng nguồn, fixture giả, kiểm tra hợp đồng và tài liệu bàn giao. Không triển khai API nghiệp vụ, SQL, Netlify hoặc Google. L01/P01 và chủ module review trước ổn định hợp đồng; A01 và U nghiệp vụ chưa đầy đủ được ghi riêng, không tự đặt điều lệ. Reviewer của A03 chưa được chỉ định riêng; không mở rộng CODEOWNERS module nghiệp vụ từ reviewer A02/B01/B07.

## CR-006 — Tạo lại repository QL_HKPD2

Ngày 11/10/2026; người dùng chỉ định `https://github.com/hoangtuanhung-lab/QL_HKPD2` và yêu cầu “tạo lại cho tôi”. Repository đích được kiểm tra đang trống và quyền push/admin hiện có. Khôi phục nền tảng A02/B01/B07 đã được duyệt ở repository cũ vào main; giữ A03 ở nhánh và PR riêng để review. Bảo toàn lịch sử commit, không sao chép credential/dữ liệu học sinh; cập nhật remote, đường dẫn vận hành và cấu hình môi trường. CI/ruleset/approval cũ không được xem là trạng thái đã nghiệm thu của repository mới.

## CR-007 — Một đầu mối kiểm tra và đẩy mã

Ngày 11/10/2026; người dùng cho biết không có gói Team và giao Codex phụ trách chính: nhận mã thành viên, kiểm tra, chỉnh sửa và đẩy GitHub. Workflow không yêu cầu reviewer GitHub thứ hai; điều chỉnh ruleset đề xuất thành approval count 0, không bắt buộc CODEOWNER/latest-push approval, giữ PR, quality/secrets, xử lý threads, no bypass, chống xóa/force push và cập nhật nhánh. Không coi review Codex là review độc lập/native GitHub approval. Không mua dịch vụ; SQL/Google/Netlify vẫn ở cuối. Module owners trong plan không đổi; Codex điều phối tích hợp. Cần kiểm quyền áp dụng ruleset và nghiệm thu enforcement riêng; chưa tự merge PR mới chỉ từ yêu cầu đẩy mã.

## CR-008 — Tiếp tục nhóm A, đăng ký theo số lượng thực tế

Người dùng giao Codex tiếp tục nhóm A và yêu cầu thiết lập phần cơ bản để các trường tự đăng ký khi có danh sách, chưa có số người tham gia. Ưu tiên A04 với biểu mẫu nháp và phác thảo sáu luồng, không cố định số trường/VĐV, không dùng quy mô fixture A05 làm quota nghiệp vụ. Giữ SQL, Google và Netlify ở cuối theo CR-004. Bản nháp localStorage và JSON không thay API đăng ký trực tuyến, phân quyền, duyệt hoặc thư mục kết quả chính thức. A01 chưa đủ tài liệu gốc; không tự đặt điều lệ để hoàn thành các phần phụ thuộc.

## CR-009 — Người dùng giao Codex A01

Ngày 11/10/2026 (Asia/Saigon), người dùng yêu cầu “làm A01 cho tôi”. Codex bổ sung nhiệm vụ L02: baseline nghiệp vụ và truy vết, giữ quyền sở hữu module của nhóm. Nguồn đã có là plan v1.4 và quyết định trong chat; PDF gốc 22 nhóm/293 câu cùng điều lệ/danh mục chưa đủ. Bàn giao baseline v0.1 cho nguồn hiện có, phân biệt confirmed/source_recorded/proposed/superseded với mức triển khai, giữ quyết định bị thay thế ngoài backlog hiện hành. Không tự tạo luật hoặc đánh dấu toàn bộ A01 đã nghiệm thu khi thiếu nguồn. SQL/Google/Netlify vẫn cuối dự án; A06 và tên người thật chưa được hoàn thành từ việc giao A01.
