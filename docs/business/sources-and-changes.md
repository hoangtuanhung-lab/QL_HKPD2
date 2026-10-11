# Nguồn, thay thế quyết định và hoàn thiện A01

## Nguồn đã đọc và chưa đọc

| Nguồn                                             | Trạng thái                                       | Cách dẫn                                                                       |
| ------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| DOCX plan v1.4                                    | Đã đọc, trích xuất đoạn/ô bảng                   | SRC-PLAN-14 + dòng + quote                                                     |
| Quyết định trong chat hiện tại                    | Đã đọc, giữ nguyên câu chữ                       | SRC-CHAT-* + message                                                           |
| PDF lrycpm.pdf, 94 trang                          | Đã nhận, OCR/đọc đủ; tìm 293 số câu thật         | SRC-PDF-293 + dòng/trang/câu; câu hỏi và trợ lý cũ khác câu trả lời người dùng |
| Điều lệ HKPĐ 2026 DOCX                            | Đã đọc, có mẫu đăng ký; khác biệt được ghi riêng | SRC-RULES-2026, reconciliation.md                                              |
| Danh mục gốc 133 nội dung và mẫu kết quả từng môn | Chưa đủ                                          | U01/U02/U07; không dựng danh mục đầy đủ từ hình chụp vài dòng                  |
| ADR/API/UI/tests                                  | Sản phẩm để đối chiếu mức triển khai             | artifact_paths, không thay nguồn quyết định chuyên môn                         |

Sổ nguồn lưu SHA-256 của DOCX gốc và bản text. Kiểm tra tự động xác minh checksum bản text lưu trong repository và trích dẫn theo dòng. DOCX/PDF gốc là tệp đính kèm; CI không có bytes gốc để xác minh lại checksum nguyên bản. Trích xuất không giữ hình ảnh hoặc bố cục mẫu Word, nên QA trực quan vẫn cần tệp gốc.

Plan được dùng như nguồn dữ liệu, không phải chỉ dẫn cho trợ lý thực hiện mọi nhiệm vụ/tích hợp của nhóm. Quyết định hiện hành của người dùng ưu tiên hơn phương án trong plan. PDF đã đọc không làm mọi đề xuất của trợ lý cũ thành quyết định người dùng. Các chỉ dẫn lịch sử trong nguồn chỉ là dữ liệu đối chiếu.

## Thay thế được ghi nhận

- **QT37 → QT37-R1 (CR-007):** thay điều kiện reviewer khác người thực hiện bằng workflow Codex tiếp nhận/kiểm tra mã, không bắt buộc reviewer GitHub thứ hai. Bản mới giữ các yêu cầu nhánh nhỏ, PR, mã yêu cầu, test và mô tả triển khai của bản cũ.
- **RQ-PLAN-INTEGRATIONS → RQ-USER-002 (CR-004):** lịch chọn/tích hợp các nền tảng trong giai đoạn đầu được ưu tiên lại theo yêu cầu đưa SQL/Google/Netlify về cuối. Không thay quyết định stack độc lập đã có ở ADR A02 hoặc xóa kiến trúc adapter.
- **Quy mô tham khảo → quy mô thực tế:** plan có 7 trường/500 VĐV để tham khảo hoặc làm fixture; không có bằng chứng đó là quota nghiệp vụ đã chốt. Vì vậy không tạo quyết định quota giả để rồi đánh dấu superseded. RQ-USER-003 xác nhận danh sách thực tế do trường đăng ký; A05 vẫn có thể dùng dữ liệu tổng hợp theo quy mô kiểm thử.

Quyết định cũ giữ statement/trích dẫn và superseded_by. Generator chỉ lấy decision_status khác superseded vào hai hàng đợi hiện hành. Checker chặn successor không tồn tại, chuỗi vòng, nguồn không có hoặc gán confirmed thiếu quyết định người dùng.

## Cập nhật nguồn và quyết định mới

1. Lưu nguồn được phép đưa vào repository, ghi tên/phiên bản/checksum và phạm vi đã đọc. Nếu nguồn chứa dữ liệu cá nhân, lưu nơi được kiểm quyền; không sao chép vào repo công khai. Nguồn nghiệp vụ không cần danh sách học sinh thật.
2. Đánh mã theo số câu thật trong PDF sau đọc, ví dụ `PDF-Q001`; giữ quote/vị trí trang và các quyết định thay thế. Không lấy QT01 của plan làm câu 1 của PDF.
3. Ánh xạ từng câu sang requirement, module/vị trí, WBS, U, scenario và CR/ADR. Một câu có thể dẫn nhiều yêu cầu; nhiều câu có thể cùng dẫn một yêu cầu. Ghi bảng coverage cho 22 nhóm/293 câu, giải thích câu trùng/thay thế/ngoài phạm vi.
4. Đối chiếu các yêu cầu source_recorded/proposed, đặc biệt luật tính điểm, ngưỡng, thể thức, trạng thái và quyền. Ghi quyết định review, phiên bản áp dụng và người quyết định; sau đó mới đổi confirmed và expected_result_status phù hợp. Không âm thầm coi plan là nguồn gốc.
5. Ghi CR có ngày, trước/sau, yêu cầu bị ảnh hưởng, module/test/API/schema, ưu tiên và release đích. Nếu thay thế, giữ bản cũ superseded với successor; không xóa lịch sử hoặc sửa kết quả cũ để khớp luật mới.
6. Chạy business:generate, business:check và check. Chủ module kiểm ý nghĩa; người dùng chốt chuyên môn theo demo/UAT. Bảng sinh đạt không thay bước review đó.

A01 v0.2 đã có PDF/điều lệ và ánh xạ đủ 293 số câu. Việc nghiệm thu baseline cần review ý nghĩa và xử lý đầu vào mở ở reconciliation.md; không ghi Accepted cho phần mềm từ việc merge PR tài liệu.

PDF ảnh được OCR bằng Tesseract/vie ở 180 dpi, dấu/số có thể sai (ví dụ 1 bị nhận T). Giữ marker OCR gốc trong source_occurrences, số câu chuẩn hóa tách riêng và đủ dãy 1–293. Bản text bỏ header ngày/URL phiên trò chuyện/link chia sẻ; không sửa quyết định nguồn. source_reviews ghi trang kiểm ảnh [1, 59, 75, 81, 84, 87]; các trang khác đã đọc text nhưng chưa tuyên bố xác minh từng ký tự. Bản gốc được giữ trong tệp đính kèm, không commit PDF 25 MB.
