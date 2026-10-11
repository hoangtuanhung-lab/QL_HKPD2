# B02 — Kết quả rà đầu vào (stage 1.1)

Ngày rà: 11/10/2026 • Người rà: P01 (B02) • Quy trình: mục 18.1 plan (Phân tích → Rà phụ thuộc → Kiểm đầu vào → Quyết định)

**Phạm vi kiểm:** chỉ những gì thấy được trong phiên làm việc này: file plan docx do người dùng đính kèm. Chưa nhận được repo, link, ADR, hợp đồng hay đặc tả nào từ lập trình viên khác. Theo mục 18.1, "đã có" cần link và phiên bản; không dựa vào lời nói. Vì vậy mọi dòng dưới đây là **Chưa có** cho đến khi có bằng chứng.

Cột "Mức": Cứng = thiếu thì stage liên quan Bị chặn; Mềm = có đường làm tạm có gán nhãn giả định.

| ID    | Sản phẩm cần                                                    | Người cung cấp | Mức                                  | Kết quả kiểm                        | Link / phiên bản | Ngày kiểm  | Hạn cung cấp (đề xuất)                                   | Stage bị ảnh hưởng |
| ----- | --------------------------------------------------------------- | -------------- | ------------------------------------ | ----------------------------------- | ---------------- | ---------- | -------------------------------------------------------- | ------------------ |
| IN-01 | A03 DTO và schema lõi v1                                        | L01/P01        | Cứng                                 | Chưa có                             | —                | 11/10/2026 | Trước stage 3.2 (P01 viết phần dữ liệu ở 2.2, L01 duyệt) | 2.2, 3.2–3.8       |
| IN-02 | A01 baseline nghiệp vụ, mã yêu cầu                              | L02            | Mềm                                  | Chưa có                             | —                | 11/10/2026 | Trước 2.2 hoàn tất                                       | 2.2                |
| IN-03 | A02 ADR (PostgreSQL, runner/ORM, thư mục, auth, worker, Drive)  | L01            | Mềm (SQL thuần) / Cứng (nối runner)  | Chưa có                             | —                | 11/10/2026 | Trước 7.1                                                | 2.1, 2.3, 3.x, 7.1 |
| IN-04 | B01 repo, CODEOWNERS, CI, PostgreSQL service trong CI           | O01            | Mềm đến 6.2 / Cứng cho 7.1           | Chưa có                             | —                | 11/10/2026 | Trước 7.1                                                | 5.3 (cắm CI), 7.1  |
| IN-05 | B07 dev/staging, biến môi trường, vai trò DB                    | O01/O02        | Mềm                                  | Chưa có                             | —                | 11/10/2026 | Trước 7.2                                                | 4.3, 7.2           |
| IN-06 | Đặc tả L02: trạng thái, chiều rộng mã, U08                      | L02            | Cứng (mã VĐV, trạng thái kỳ giải)    | Chưa có                             | —                | 11/10/2026 | Trước 3.2                                                | 2.2, 3.2, 3.6, 3.7 |
| IN-07 | R01 cấu trúc danh mục, snapshot, trường được clone              | R01            | Cứng cho 3.5                         | Chưa có                             | —                | 11/10/2026 | Trước 3.5                                                | 3.5                |
| IN-08 | R02 trường VĐV, cấp mã, khóa nhận diện                          | R02            | Cứng cho 3.6                         | Chưa có                             | —                | 11/10/2026 | Trước 3.6                                                | 3.6                |
| IN-09 | R03 đăng ký/đội/revision, dạng hạn mức                          | R03            | Cứng cho bảng đếm tranh suất         | Chưa có                             | —                | 11/10/2026 | Trước 3.6                                                | 3.6                |
| IN-10 | C01–C03 draw/node/match/lịch, `started_at` (U04)                | C01, C02, C03  | Cứng cho 3.7                         | Chưa có                             | —                | 11/10/2026 | Trước 3.7                                                | 3.7                |
| IN-11 | K01 submission/official/confirmation/revision, payload theo môn | K01            | Cứng cho 3.8                         | Chưa có                             | —                | 11/10/2026 | Trước 3.8                                                | 3.8                |
| IN-12 | K02–K04 quyết định thi đấu, xếp hạng                            | K02, K03, K04  | Ngoài B02 (Wave 2)                   | Chưa có                             | —                | 11/10/2026 | Khi mở stage 3.9                                         | 3.9                |
| IN-13 | P02 idempotency, version, cách ly giao dịch, ánh xạ lỗi         | P02            | Mềm                                  | Chưa có                             | —                | 11/10/2026 | Trước 3.4                                                | 3.4                |
| IN-14 | P03 audit/outbox/job/notification, hợp đồng sự kiện             | P03            | Mềm                                  | Chưa có                             | —                | 11/10/2026 | Trước 3.4                                                | 3.4                |
| IN-15 | S01/S02 vai trò, trạng thái tài khoản, checklist, cùng trường   | S01, S02       | Cứng cho 3.3 và `referee_assignment` | Chưa có                             | —                | 11/10/2026 | Trước 3.3                                                | 3.3, 3.5           |
| IN-16 | S03 mã hóa CCCD, thông tin file/Drive                           | S03            | Cứng cho `private_identity`          | Chưa có                             | —                | 11/10/2026 | Trước 3.6                                                | 3.6, 3.9           |
| IN-17 | A05 fixtures 7 trường/500 VĐV giả                               | Q01, Q02, Q03  | Mềm                                  | Chưa có                             | —                | 11/10/2026 | Trước 4.2                                                | 4.2, 6.1           |
| IN-18 | O02 yêu cầu backup/restore                                      | O02            | Mềm                                  | Chưa có                             | —                | 11/10/2026 | Trước 5.2 bản cuối                                       | 5.2                |
| IN-19 | Tên reviewer migration/schema                                   | L02 gán        | Cứng cho 7.1                         | Chưa có (đề xuất L01; dự phòng P02) | —                | 11/10/2026 | Trước 6.2                                                | 6.2, 7.1           |

## Quyết định thực hiện theo từng stage (bước 4 mục 18.1)

| Stage    | Quyết định                             | Lý do                                                                                 |
| -------- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| 1.1      | Xong                                   | Chính tài liệu này                                                                    |
| 1.2      | Xong (độc lập)                         | Không có phụ thuộc ngoài                                                              |
| 2.1      | Xong bản nháp (độc lập)                | Chỉ dựa vào plan; các lựa chọn gắn nhãn "Đề xuất" chờ L01                             |
| 2.2      | **Bị chặn một phần**                   | Cần IN-01…IN-11, IN-15, IN-16. Có thể viết khung theo mục 4.1 nhưng không coi là chốt |
| 2.3      | Bị chặn bởi 2.2                        |                                                                                       |
| 3.1      | Sẵn sàng sau 2.1 được L01 đọc          | Không cần IN-xx cứng, nhưng cần quy ước đã duyệt                                      |
| 3.2–3.8  | **Bị chặn**                            | Mỗi stage cần IN tương ứng (xem cột "Stage bị ảnh hưởng")                             |
| 4.1      | Bị chặn bởi 3.3, 3.5                   |                                                                                       |
| 4.2      | Bị chặn bởi 3.2–3.6                    |                                                                                       |
| 4.3      | Xong (độc lập)                         | Seed guard và quét dữ liệu nhạy cảm đã có test                                        |
| 5.1      | Khung xong; chạy trên bộ migration mẫu | Chạy lại trên migration thật sau Phase 3                                              |
| 5.2      | Khung xong; chạy trên bộ mẫu           | Tinh chỉnh khi có IN-18 và migration thật                                             |
| 5.3      | Xong (độc lập); chưa cắm CI            | Cắm CI cần IN-04                                                                      |
| 6.x, 7.x | Bị chặn bởi Phase 3 và IN-19           |                                                                                       |

Quy tắc: không đánh dấu "Đủ để thực hiện" khi chưa có link và phiên bản; khi có, ghi vào bảng và cập nhật quyết định.
