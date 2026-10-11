# A01 — Baseline nghiệp vụ và truy vết v0.1

Ngày ghi nhận: **11/10/2026 (Asia/Saigon)**. Codex thực hiện A01 theo yêu cầu người dùng, ở vai trò nghiệp vụ L02 trong plan. Người dùng quyết định chuyên môn; chủ module đối chiếu và tiếp tục công việc theo bảng ownership. Việc nhận A01 không gán tên thật cho 28 vị trí hoặc hoàn tất A06.

Bản này có **58 yêu cầu, 58 gói WBS, 20 kịch bản nguồn và 9 đầu vào còn mở**. Phạm vi là nguồn đã đọc: plan v1.4 và các quyết định trong hội thoại. **Chưa có PDF gốc 22 nhóm/293 câu, danh mục đầy đủ 133 nội dung hoặc điều lệ để đối chiếu; chưa thể nghiệm thu A01 toàn bộ.** Không tạo 293 yêu cầu giả hoặc suy đoán số câu. Các con số 58/20 là số bản ghi của baseline v0.1, không đại diện số chức năng hoàn thành hoặc độ bao phủ PDF.

## Tài liệu làm việc

- [Đặc tả nền và luồng](baseline.md): vai trò, định danh, trạng thái, quy tắc đã có nguồn và ranh giới triển khai.
- [Sổ yêu cầu gốc](requirements.json): nguồn chuẩn có thể xử lý bằng công cụ; mỗi yêu cầu có module, chủ trì/phối hợp, WBS, kịch bản, U và nơi đối chiếu mã/tài liệu.
- [Bảng truy vết](traceability.md): bảng đọc nhanh, bao gồm quyết định đã bị thay thế để giữ lịch sử.
- [Phạm vi hiện hành và đầu vào cần đối chiếu](current-backlog.md): tách quyết định người dùng đã xác nhận khỏi đề xuất/yêu cầu từ plan.
- [Nguồn và quy trình cập nhật](sources-and-changes.md): trích dẫn, checksum, thay thế quyết định và nhập PDF khi có.
- [Bản trích xuất plan v1.4](sources/plan-v1.4.txt): giữ nguyên văn bản trong các đoạn và ô bảng, theo thứ tự DOCX; không giữ bố cục hình ảnh của Word.

## Trạng thái và cách sử dụng

| Trường            | Giá trị               | Ý nghĩa                                                                                 |
| ----------------- | --------------------- | --------------------------------------------------------------------------------------- |
| `decision_status` | `confirmed`           | Có quyết định trực tiếp của người dùng được dẫn nguồn; không đồng nghĩa triển khai xong |
|                   | `source_recorded`     | Ghi nguyên tắc/kịch bản từ plan; cần đối chiếu tài liệu nghiệp vụ gốc và review         |
|                   | `proposed`            | Phương án đề xuất, không phải luật người dùng đã chốt                                   |
|                   | `superseded`          | Bị thay thế, chỉ giữ lịch sử; không đưa vào hàng đợi hiện hành                          |
| `delivery_status` | `not_implemented`     | Chưa có phần triển khai được ghi nhận                                                   |
|                   | `contract_only`       | Có hình dạng DTO/hợp đồng; chưa chứng minh API nghiệp vụ hoạt động                      |
|                   | `draft_ui`            | Có giao diện nháp cục bộ; chưa đăng ký chính thức                                       |
|                   | `partial`             | Có một phần mã/tài liệu; chưa đủ tiêu chí nghiệm thu yêu cầu                            |
|                   | `foundation_verified` | Chỉ dùng cho nền tảng có bằng chứng xác minh; không thay nghiệm thu nghiệp vụ           |

`artifact_paths` là nơi đối chiếu, không phải bằng chứng Accepted. `scenario_ids` T01–T12/TG01–TG08 chỉ tới kịch bản nguồn trong plan. Expected result của các kịch bản này đang `needs_source_reconciliation`; đặc biệt các ngưỡng huy chương, điểm, hạng cân, đội và điều kiện tổ chức phải được đối chiếu trước viết golden test hoặc tính kết quả thật. Kiểm thử đang chạy được nêu riêng trong runbook A03/A04 và CI.

Chủ trì mặc định là vị trí đầu tiên trong `owner_positions`; ánh xạ yêu cầu sang module/WBS là phân tích bàn giao của Codex, không phải quyết định chuyên môn mới. Mã nhân sự và mã WBS có thể trùng nhãn nhưng khác ý nghĩa: ví dụ vị trí R03 phụ trách WBS R04/R06. Tên người thật và reviewer vẫn chờ phân công theo A06.

## Cập nhật và kiểm tra

```bash
npm run business:generate
npm run business:check
npm run check
```

Sửa `requirements.json`, dẫn nguồn và CR, rồi sinh lại hai bảng. CI kiểm ID trùng, trích dẫn sai, checksum nguồn, WBS/U/kịch bản không tồn tại, tệp đối chiếu không tồn tại, chuỗi thay thế vòng và bảng sinh bị lệch. Nguồn mới không tự làm `confirmed`; phải ghi quyết định review cụ thể.

Việc kiểm cấu trúc đạt không xác nhận điều lệ đúng, ma trận quyền đã chạy, SQL/Google/Netlify đã tích hợp hoặc A01 đã đủ 293 câu. Các đầu việc độc lập tiếp tục; U chỉ chặn bước thực sự cần thông tin đó.
