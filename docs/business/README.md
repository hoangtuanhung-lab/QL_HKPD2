# A01 — Baseline nghiệp vụ và truy vết v0.2

Ngày ghi nhận: **11/10/2026 (Asia/Saigon)**. Codex thực hiện A01 ở vai trò L02 theo yêu cầu người dùng; quyền sở hữu module và việc gán tên thật cho 28 vị trí giữ theo plan/A06.

Đã đọc plan v1.4, Điều lệ HKPĐ Quảng Phú 2026 và **PDF 94 trang, tìm đủ số câu 1–293**. Baseline có **93 bản ghi yêu cầu, 58 gói WBS, 20 kịch bản nguồn** và bảng ánh xạ từng câu sang **22 nhóm công việc**, module/vị trí/WBS/yêu cầu. Đây là số bản ghi/truy vết, không phải số chức năng đã triển khai. Các nguồn đã được tiếp nhận; tệp danh mục gốc 133 nội dung vẫn thiếu.

## Tài liệu làm việc

- [Tổng hợp 22 nhóm nghiệp vụ](grouped-requirements.md): bản đặc tả từ nguồn và quyết định sau, để giao chủ module review.
- [Đối chiếu 293 câu](pdf-coverage.md): số câu thật, trang PDF, nhóm, vị trí/WBS, yêu cầu và quyết định sửa sau.
- [Quyết định cuối và khác biệt điều lệ](reconciliation.md): nguồn cũ → nguồn mới, điểm đã chốt và U còn mở.
- [Đặc tả nền](baseline.md): vai trò, định danh và các luồng, đọc cùng bản cập nhật nguồn mới.
- [Sổ yêu cầu chuẩn](requirements.json), [bảng truy vết](traceability.md), [phạm vi hiện hành](current-backlog.md).
- [Nguồn và quy trình cập nhật](sources-and-changes.md).

22 nhóm do A01 tổ chức để bàn giao, không tuyên bố PDF có sẵn 22 chương. PDF là cuộc trao đổi; câu hỏi, đề xuất và diễn giải của trợ lý cũ khác quyết định người dùng. Q293 đã bị rút, không tạo bước phân hạng mới. Quyết định hiện tại trong chat ưu tiên hơn lịch sử: số lượng do trường đăng ký, SQL/Google/Netlify cuối dự án.

## Trạng thái

| Trường            | Giá trị               | Ý nghĩa                                                                                                               |
| ----------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `decision_status` | `confirmed`           | Có quyết định người dùng dẫn nguồn, từ chat hoặc câu trả lời PDF đã đọc trong ngữ cảnh; không đồng nghĩa đã lập trình |
|                   | `source_recorded`     | Ghi nguyên tắc/tổng hợp nguồn, cần chủ module review ý nghĩa; không mở lại câu đã chốt                                |
|                   | `proposed`            | Phương án đề xuất, chưa được chốt                                                                                     |
|                   | `superseded`          | Chỉ giữ lịch sử, không đưa vào hàng đợi hiện hành                                                                     |
| `delivery_status` | `not_implemented`     | Chưa có triển khai ghi nhận                                                                                           |
|                   | `contract_only`       | Có DTO/hợp đồng, chưa chứng minh API nghiệp vụ hoạt động                                                              |
|                   | `draft_ui`            | Giao diện nháp cục bộ, chưa đăng ký chính thức                                                                        |
|                   | `partial`             | Có một phần mã/tài liệu, chưa đủ nghiệm thu                                                                           |
|                   | `foundation_verified` | Chỉ nền tảng có bằng chứng xác minh, không thay nghiệm thu feature                                                    |

`artifact_paths` là nơi đối chiếu; T01–T12/TG01–TG08 là kịch bản nguồn, chưa phải test đã chạy. `source_questions` giữ đủ 293 câu, bản lặp/correction và trạng thái lịch sử ở cấp câu. Một câu có thể dẫn nhiều yêu cầu; câu có phần bị thay thế không bị xóa toàn bộ. `source_reviews` ghi 94 trang đã đọc và các trang kiểm hình ảnh quyết định quan trọng; không gọi toàn bộ OCR là bản chép đã chứng thực.

Mã vị trí khác mã WBS dù trùng nhãn; người đầu tiên trong owner_positions là chủ trì mặc định, các vị trí sau phối hợp. Ánh xạ là phân tích bàn giao, không đặt thêm điều lệ hoặc hoàn thành A06.

## Kiểm tra và cập nhật

```bash
npm run business:generate
npm run business:check
npm run check
```

Sửa JSON có nguồn/CR rồi sinh lại bốn bảng. CI kiểm checksum, quote/dòng, ID và liên kết, đủ số câu PDF, người cung cấp quyết định, chuỗi thay thế và bảng sinh lệch. Trích OCR có thể có lỗi nhận dạng; chủ module kiểm bản gốc ở trang dẫn trước dùng chi tiết chưa kiểm hình ảnh làm golden test.

A01 v0.2 hoàn thành khung baseline và ánh xạ nguồn hiện có, **chờ review chuyên môn và đầu vào còn mở**. Kiểm cấu trúc đạt không chứng minh luật/ma trận quyền/thuật toán đã chạy hoặc phần mềm đã nghiệm thu.
