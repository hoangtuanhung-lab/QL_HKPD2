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
