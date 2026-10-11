# Subplan B02 — Database migration và seed

| Mục                             | Nội dung                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| WBS                             | **B02** — Database migration và seed (Phase dự án P1 "Nền tảng"; cổng G1)              |
| Vị trí nhận                     | **P01** (G2 Nền tảng và bảo mật; nhóm trưởng G2)                                       |
| Nghiệm thu gốc (mục 7.2 plan)   | _Dựng sạch được database, seed và rollback/recovery migration thử; mã VĐV giữ số 0._   |
| Phụ thuộc gốc                   | A03 (Hợp đồng DTO và schema lõi — L01/P01)                                             |
| Ước lượng gốc                   | 5 ngày công (chưa gồm thời gian chờ duyệt/sửa lại)                                     |
| Ngày lập subplan                | 11/10/2026                                                                             |
| Plan nguồn                      | Plan_phat_trien_phan_mem_HKPD_nhom_28_nguoi.docx (lập 10/10/2026, cập nhật 11/10/2026) |
| Trích đoạn plan dùng cho ca sau | `B02_plan_extract.md` (đi kèm file này — không cần đọc lại cả plan)                    |

**Cách đọc tài liệu này:** §0 là bảng điều khiển (trạng thái + nhật ký ca) — mở ca nào cũng đọc §0 trước. §1–§4 là phân tích và đầu vào. §5 là các phase/stage. §6–§8 là quy trình ca, rủi ro, câu hỏi mở.

---

## 0. Bảng điều khiển (cập nhật cuối mỗi ca)

### 0.1 Trạng thái stage

Trạng thái dùng đúng chuỗi của plan (mục 18.5): Chưa phân tích → Đang rà đầu vào → Sẵn sàng / Bị chặn → Đang làm → Chờ review → Chờ tích hợp/nghiệm thu → Đã nghiệm thu.

| Stage | Tên                                        | Ngày công | Trạng thái       | Ca làm | Ghi chú ngắn                                                                    |
| ----- | ------------------------------------------ | --------- | ---------------- | ------ | ------------------------------------------------------------------------------- |
| 1.1   | Nhận việc, rà đầu vào                      | 0.2       | Chờ review       | 1      | 19 IN đều Chưa có; `input-check.md`. Người thực hiện không tự nghiệm thu (QT37) |
| 1.2   | Dựng workspace và PostgreSQL cục bộ        | 0.2       | Chờ review       | 1      | Có sẵn script từ trước, đã giữ làm gốc                                          |
| 2.1   | Quy ước dữ liệu (ADR-DB nháp)              | 0.25      | Chờ review       | 1      | L01 duyệt D01–D13                                                               |
| 2.2   | Từ điển dữ liệu và ERD                     | 0.5       | Bị chặn một phần | —      | Chờ IN-01…IN-11, IN-15, IN-16                                                   |
| 2.3   | Kế hoạch migration                         | 0.25      | Bị chặn          | —      | Chờ 2.2                                                                         |
| 3.1   | Migration nền (hàm chung)                  | 0.15      | Bị chặn          | —      |                                                                                 |
| 3.2   | Edition và school                          | 0.15      | Bị chặn          | —      |                                                                                 |
| 3.3   | Identity (user, quyền)                     | 0.2       | Bị chặn          | —      |                                                                                 |
| 3.4   | Audit, outbox, idempotency, job            | 0.25      | Bị chặn          | —      | **Mốc bàn giao M1**                                                             |
| 3.5   | Danh mục, snapshot, phân công trọng tài    | 0.3       | Bị chặn          | —      |                                                                                 |
| 3.6   | VĐV, đăng ký, đội, cấp mã                  | 0.35      | Bị chặn          | —      | **Mốc bàn giao M2**                                                             |
| 3.7   | Thi đấu (draw, round, match, lịch)         | 0.2       | Bị chặn          | —      |                                                                                 |
| 3.8   | Kết quả (submission → chính thức)          | 0.15      | Bị chặn          | —      | **Mốc bàn giao M3**                                                             |
| 4.1   | Seed tham chiếu                            | 0.1       | Bị chặn          | —      | Chờ 3.3, 3.5                                                                    |
| 4.2   | Seed dev (7 trường, ~500 VĐV giả)          | 0.3       | Bị chặn          | —      | Chờ 3.2–3.6                                                                     |
| 4.3   | Chốt chặn an toàn cho seed                 | 0.1       | Chờ review       | 1      | TC15 19/19; phần độc lập xong; cắm vào seed ở 4.2                               |
| 5.1   | Down migration và vòng up→down→up          | 0.2       | Khung xong       | 1      | TC02 8/8 trên bộ mẫu; chạy lại với migration thật                               |
| 5.2   | Diễn tập recovery (dump/restore)           | 0.15      | Khung xong       | 1      | TC17 6/6 trên bộ mẫu; chạy lại với migration thật                               |
| 5.3   | Chốt chặn migration (ID, checksum, lint)   | 0.15      | Chờ review       | 1      | TC16 28/28; phần độc lập xong; chưa cắm CI (cần B01)                            |
| 6.1   | Bộ kiểm thử database                       | 0.4       | Chưa phân tích   | —      |                                                                                 |
| 6.2   | Bằng chứng và tự rà (QT39)                 | 0.2       | Chưa phân tích   | —      |                                                                                 |
| 7.1   | Gói PR và tài liệu                         | 0.15      | Chưa phân tích   | —      |                                                                                 |
| 7.2   | Bàn giao liên nhóm và đóng B02             | 0.1       | Chưa phân tích   | —      |                                                                                 |
| 3.9   | _(Tùy chọn, ngoài ngân sách)_ Khung Wave 2 | —         | Chưa phân tích   | —      | Chỉ làm khi đủ đầu vào IN-11, IN-12, IN-14, IN-16, IN-18                        |
|       | **Tổng**                                   | **5.0**   |                  |        |                                                                                 |

### 0.2 Việc có thể làm ngay cả khi đầu vào còn thiếu

Các stage này không cần A03/ADR/repo nên có thể chạy khi các stage khác đang Bị chặn: **1.1, 1.2, 2.1, 4.3, 5.3**, và phần khung của 5.2. Mọi stage khác chỉ chuyển Sẵn sàng khi đủ đầu vào (mục 18.1 plan; xem §3).

### 0.3 Nhật ký ca làm việc (thêm dòng mới ở cuối)

| Ca  | Ngày       | Stage làm                              | Kết quả                                                                                                                                                                                                   | File đã xuất                                                                       | Việc dở / bước kế tiếp                                                            |
| --- | ---------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 0   | 11/10/2026 | Nhận việc, viết subplan                | Đã chọn B02, viết subplan + trích đoạn plan                                                                                                                                                               | `subplan_B02_database_migration_seed.md`, `B02_plan_extract.md`                    | Bắt đầu stage 1.1                                                                 |
| 1   | 11/10/2026 | 1.1, 1.2, 2.1, 4.3, 5.3, khung 5.1/5.2 | Làm phần độc lập. Phát hiện workspace có sẵn script chốt chặn/seed guard/cycle/drill từ trước (không rõ ai tạo, không có ghi chú); đã chạy lại, đạt hết; sửa lỗi `\restrict` của pg_dump trong cycle_test | `hkpd-b02/` (scripts, tests, docs/B02, conventions, migration-guide), zip snapshot | Chờ A03/ADR/đặc tả để mở Phase 3; chờ L01 duyệt 2.1; viết `ci-hook.md` khi có B01 |

### 0.4 Quyết định và giả định đang mở

Ghi mỗi quyết định thiết kế chưa được người có thẩm quyền xác nhận. Không coi là chốt cho đến khi có tên và ngày xác nhận (QT02, QT03).

| ID   | Nội dung                        | Mặc định đề xuất                                                                                                                                     | Người xác nhận       | Trạng thái                                                 |
| ---- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------- |
| D01  | Khóa chính                      | UUID (`gen_random_uuid()`), không dùng mã hiển thị làm khóa                                                                                          | L01                  | Đề xuất                                                    |
| D02  | Kiểu trạng thái                 | `text` + `CHECK` (dễ mở rộng bằng migration; tránh `ALTER TYPE` của enum)                                                                            | L01                  | Đề xuất                                                    |
| D03  | Cách ly kỳ giải                 | Mọi bảng thuộc kỳ giải có `edition_id`; tham chiếu giữa các bảng dùng FK ghép `(edition_id, id)` để DB chặn nối chéo kỳ                              | L01, P01             | Đề xuất                                                    |
| D04  | Thời gian và phiên bản          | `timestamptz` (UTC); bảng gốc có thể sửa có `version integer not null default 1` cho optimistic concurrency                                          | P02                  | Đề xuất                                                    |
| D05  | Mã VĐV                          | Lưu **text**; sinh bằng hàm trong transaction; không dùng cột generated có `lpad` (cắt chữ số khi STT ≥ 1000); không tái sử dụng mã khi rút          | R02, L02             | Đề xuất — chiều rộng mã trường và STT cần L02/R02 xác nhận |
| D06  | Số liệu                         | Không dùng `real/double precision/float`; cân đăng ký/chính thức lưu số nguyên đơn vị 100 g (QT11)                                                   | K01                  | Đề xuất                                                    |
| D07  | CCCD                            | Chỉ lưu `bytea` đã mã hóa + `key_id` + chỉ mục tra cứu băm (blind index); mã hóa ở ứng dụng; khóa không nằm trong DB/dump/repo (mục 11.3, QT34/QT35) | S03                  | Đề xuất — cần S03 xác nhận cơ chế                          |
| D08  | Xóa dữ liệu                     | Không xóa cứng bảng nghiệp vụ; FK `ON DELETE RESTRICT`; dùng trạng thái/`archived_at` (QT12, QT19)                                                   | L02 (U08)            | Đề xuất                                                    |
| D09  | Payload kết quả                 | `jsonb` + `payload_schema_version` + `result_kind`; K01 định nghĩa schema theo môn, B02 không hardcode làm tròn (U02)                                | K01                  | Đề xuất                                                    |
| D10  | Vai trò DB                      | Tách `migrator` (DDL) và `app_rw` (DML); không dùng superuser ở ứng dụng; mật khẩu từ biến môi trường                                                | O01/B07              | Đề xuất                                                    |
| D11  | Đường dẫn và tên file migration | `infra/db/migrations/<YYYYMMDDHHMMSS>_<module>_<mô tả>.up.sql` và `.down.sql`; SQL thuần để không phụ thuộc runner                                   | L01 (A02), O01 (B01) | Đề xuất — đổi nếu ADR/repo quy định khác                   |
| D11b | ID migration                    | 14 chữ số đầu của tên file (đã khớp `check_migrations.sh` và `migrate.sh`); mỗi file một transaction                                                 | L01 (A02)            | Đề xuất                                                    |
| D12  | Phạm vi nghiệm thu B02          | Lõi theo A03 + bảng hạ tầng cho B03/B04/B05; phần xếp hạng, quyết định thi đấu, tệp, thông báo, sao lưu, lease, sync là "Wave 2" (stage 3.9)         | L01, L02             | Đề xuất — xem §2.3                                         |
| D13  | Schema                          | Một schema `public`; ranh giới module thể hiện bằng module trong tên migration                                                                       | L01                  | Đề xuất                                                    |

---

## 1. Nhận nhiệm vụ

### 1.1 Lý do chọn B02

- Người dùng báo **O01, A02, B01, B07** đã có người nhận. Hiểu là: vị trí O01 (kèm B01, B07) và gói A02 không thuộc phần tôi. B02 không trùng gói nào trong số đó.
- B02 nằm trên **đường phụ thuộc chính** của plan (mục 8: A01/A03 → B02/B03/B04 → R02/R04/R06 → …). B03, B04, B05, R01, R02 đều ghi phụ thuộc B02, nên giao sớm một lược đồ đúng là việc có giá trị nhất và mở nhánh song song sớm nhất.
- B02 chạy và kiểm chứng được hoàn toàn trong môi trường này (PostgreSQL 16 có sẵn; `pgbench` có sẵn cho kiểm thử đồng thời). Docker **không** có, nên phần container thuộc B01/B07/I07.
- Việc kỹ thuật độc lập với luật giải chưa chốt: chỉ dựng cấu trúc, không tự đặt ngưỡng (U01–U08).

### 1.2 Phạm vi

**Trong phạm vi (In):**

- Migration (up và down) cho các nhóm bảng ở mục 4.1 plan thuộc lõi B02 (§2.3), gồm ràng buộc, unique, FK, index.
- Hàm cấp mã VĐV trong transaction và test giữ số 0.
- Cấu trúc `edition` + snapshot cấu hình + nhật ký tạo/sao chép giải (mục 19, bước "P1 P01 và P02 trong B02 B04").
- Seed tham chiếu (an toàn mọi môi trường) và seed dev (dữ liệu giả).
- Rollback/recovery migration thử; công cụ chặn sai quy tắc migration (ID duy nhất, không sửa migration đã chạy, không drop cột đang dùng).
- Từ điển dữ liệu (`docs/architecture/data`), ERD, hướng dẫn migration.

**Ngoài phạm vi (Out):**

- Mã hóa/giải mã CCCD, Google login, policy (B03, S01, S03).
- API, giao dịch, kiểm tra version/idempotency ở tầng ứng dụng (B04). B02 chỉ cung cấp cột và ràng buộc để B04 dùng.
- Worker, gửi thông báo (B05). B02 chỉ tạo bảng.
- Thuật toán sơ đồ, vòng tròn, xếp hạng, huy chương (C, K).
- Cấu hình CI, container, môi trường staging (B01, B07 — người khác đã nhận).
- Dữ liệu thật của học sinh. Không bao giờ vào seed hay test (QT35).
- Hardcode hạn mức, nhóm tuổi, hạng cân, làm tròn thành tích (U01, U02): chỉ dựng chỗ lưu.

### 1.3 Tiêu chí nghiệm thu → bằng chứng

| Mã  | Tiêu chí (từ plan)                                       | Bằng chứng B02 phải tạo                                                                                     | Kiểm thử   |
| --- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------- |
| AC1 | Dựng sạch được database                                  | Log `db_reset` từ DB rỗng chạy hết up, hai lần liên tiếp; schema dump xác định                              | TC01       |
| AC2 | Seed chạy được                                           | Log seed tham chiếu + dev; chạy hai lần cho cùng số dòng; số liệu 7 trường/~500 VĐV giả                     | TC03       |
| AC3 | Rollback/recovery migration thử                          | Log vòng up→down→up từng migration và toàn chuỗi; biên bản diễn tập dump→migration lỗi→restore→đối chiếu    | TC02, TC17 |
| AC4 | Mã VĐV giữ số 0                                          | Test round-trip `01.012`; 100 request đồng thời không trùng; STT ≥ 1000 không cắt; mã không bị cast sang số | TC04–TC08  |
| AC5 | QT36: ID migration duy nhất, không sửa migration đã chạy | Tệp `migrations.lock` + script kiểm                                                                         | TC16       |
| AC6 | QT09: phạm vi kỳ giải                                    | Test FK ghép từ chối nối chéo kỳ                                                                            | TC09       |
| AC7 | QT11: không float                                        | Truy vấn `information_schema` không có cột float                                                            | TC10       |
| AC8 | QT35: không dữ liệu thật, không bí mật                   | Seed từ chối chạy ở production; quét repo không có CCCD/khóa                                                | TC15       |
| AC9 | G1: "database seed chạy được"                            | Gói bàn giao + hướng dẫn chạy                                                                               | 7.1        |

### 1.4 Quy tắc plan áp dụng

QT08, QT09, QT10, QT11, QT12, QT13, QT35, QT36, QT37, QT39. Plus mục 9.3 (expand → backfill → chuyển đọc → loại ở release sau; không drop cột đang dùng), mục 11.3, mục 12, mục 4.1–4.2, mục 19.2–19.3.

### 1.5 Mã U liên quan (không tự quyết)

| U   | Ảnh hưởng tới B02                                         | Cách xử lý                                                                                                               |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| U01 | Hạn mức, nhóm tuổi, hạng cân, danh mục đầy đủ             | Chỉ tạo chỗ lưu cấu hình (`event_snapshot.config jsonb` hoặc bảng hạn mức); seed dùng nội dung **mẫu có cờ `is_sample`** |
| U02 | Làm tròn thời gian/khoảng cách, điểm xử thua              | Lưu nguyên giá trị; không CHECK theo luật làm tròn                                                                       |
| U04 | Thế nào là "trận đã bắt đầu", ai ghi                      | Có cột `started_at` nullable ở `match` / nội dung theo mục 4.2; nghĩa của cột chờ L02                                    |
| U06 | Cấu hình DB/backend ban đầu, chi phí                      | Dùng PostgreSQL theo mục 3.1; không phụ thuộc nhà cung cấp                                                               |
| U08 | Xóa nội dung chưa có đăng ký, đổi checklist khi giải chạy | Mặc định không xóa cứng (D08); chờ L02                                                                                   |

---

## 2. Phân tích kỹ thuật

### 2.1 Thực thể theo mục 4.1 và nhóm migration

| Nhóm (mục 4.1)       | Bảng cốt lõi                                                                                                       | Stage        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------ |
| Kỳ giải và danh mục  | edition, school, catalog_node, event_definition, rule_version, event_snapshot (+ `edition_creation_log`)           | 3.2, 3.5     |
| Tài khoản            | user, membership, role_assignment, referee_assignment                                                              | 3.3, 3.5     |
| Học sinh             | student_master, athlete, athlete_code_sequence, private_identity                                                   | 3.6          |
| Đăng ký              | registration, registration_revision, team, team_member                                                             | 3.6          |
| Thi đấu              | draw, draw_version, bracket_node, round, match, schedule_revision                                                  | 3.7          |
| Kết quả              | result_submission, official_result, confirmation, result_revision                                                  | 3.8          |
| Tệp và lịch sử       | audit_event, outbox_event (lõi); file_object, file_link, notification (Wave 2)                                     | 3.4; 3.9     |
| Vận hành             | idempotency_key, job_run (lõi); edit_lease, sync_submission, backup_manifest (Wave 2)                              | 3.4; 3.9     |
| Trạng thái, Xếp hạng | participation_decision, restoration_decision, weight_record, ranking_run, ranking_row, award, penalty, publication | Wave 2 (3.9) |

`edition_creation_log` và `idempotency_key` không có tên trong mục 4.1; tôi thêm vì mục 19.2 (ghi giải nguồn, phiên bản cấu hình nguồn, người thực hiện) và mục 5.2 (command idempotent) cần chỗ lưu. Ghi vào từ điển là đề xuất, chờ L01/P02 xác nhận.

### 2.2 Điểm thiết kế cần làm đúng (từ plan)

1. **Mã VĐV** (QT08, mục 4.1): `01.012` là chuỗi hiển thị; unique theo kỳ giải/trường/STT; cấp trong transaction. Cách làm: bảng `athlete_code_sequence(edition_id, school_id, last_seq)`; hàm cấp mã dùng `INSERT … ON CONFLICT DO UPDATE SET last_seq = last_seq + 1 RETURNING` (khóa dòng, an toàn tranh chấp); unique `(edition_id, school_id, seq)` và `(edition_id, athlete_code)`. Rút VĐV không trả mã.
2. **Cách ly kỳ giải** (QT09, mục 19.3): D03.
3. **Số đăng ký/đã duyệt/thực tế thi/hợp lệ/tính huy chương khác nhau** (QT10): schema không có cột `count` dùng chung; các số này sinh từ truy vấn/bảng của module K sau này (Wave 2).
4. **Ảo không phải người** (QT09, mục 4.1): `bracket_node.slot_kind` ∈ {`athlete`, `virtual`}; `CHECK` athlete_id có giá trị khi và chỉ khi `slot_kind='athlete'`. Không tạo hàng `athlete` cho ảo.
5. **Bản nhập, bản sửa, chính thức tách riêng** (QT19–QT20, mục 4.2): `result_submission` (nhiều bản), `official_result` (một dòng/trận, chỉ con trỏ tới bản đã xác nhận, cùng trận — ràng buộc bằng FK ghép), `result_revision` (đề nghị sửa). Không có một cột điểm chung.
6. **Đơn vị** (QT11): cân lưu số nguyên đơn vị 100 g; thành tích trong `jsonb`, không float.
7. **Đăng ký có revision** (mục 4.2): bản duyệt cũ vẫn hiệu lực khi có bản sửa chờ duyệt → `registration.approved_revision_id` tách khỏi `registration.current_revision_id`.
8. **Trạng thái kỳ giải** (mục 19.3): chỉ có hợp đồng tối thiểu `Nháp → Mở đăng ký` (`draft`, `registration_open`); CHECK chỉ liệt kê hai giá trị này, mở rộng bằng migration sau khi L02 và R01 đối chiếu. Không tự thêm trạng thái.
9. **Clone kỳ giải** (QT12, mục 19.2): `edition.source_edition_id`, `source_config_version`, `edition_creation_log(edition_id, source_edition_id, copied_parts jsonb, actor, created_at)`. Không có đường sao chép đăng ký/sơ đồ/kết quả ở tầng schema (không FK nào hướng tới việc đó).
10. **Tranh suất cuối** (mục 16.3, T01): DB hỗ trợ bằng khóa dòng. Đề xuất bảng đếm theo `(edition_id, school_id, event_id)` để R03/R04 khóa `FOR UPDATE` trong transaction. Hạn mức lấy từ snapshot cấu hình (U01), **không hardcode**. Cần R03/R01 xác nhận trước khi tạo (IN-08, IN-09).
11. **Hồ sơ nhạy cảm** (mục 11.3, QT34): `private_identity` tách bảng riêng, quyền DB tách; không cột CCCD dạng text. Ngày sinh để trong bảng này vì công khai không có ngày sinh.
12. **Không sửa migration đã chạy; không drop cột đang dùng** (QT36, mục 9.3): chốt chặn ở stage 5.3.

### 2.3 Lý do chia "lõi" và "Wave 2" (D12)

Plan nói A03 xác định "VĐV, kỳ giải, nội dung, đăng ký, trận, submission/version" và G1 chỉ cần "schema lõi, database seed chạy được". Các bảng xếp hạng, quyết định vắng/truất, tệp, thông báo, lease, đồng bộ, sao lưu phụ thuộc quy tắc (U03, U05), hợp đồng ngoại tuyến (F03/K01/S02) hoặc nhà cung cấp tệp (S03/O02) chưa có. Tạo sớm = đoán luật. Vì vậy B02 giao lõi + hạ tầng cho B03/B04/B05; Wave 2 làm bằng migration cộng thêm (additive) theo mục 9.3 khi chủ module cung cấp đặc tả, P01 rà (mục 17.2: P01 "rà thay đổi database của các nhóm"). **Cần L01/L02 xác nhận D12 ở stage 1.1.** Nếu họ muốn đủ toàn bộ trong B02, mở rộng ngân sách (CR) thay vì nén.

---

## 3. Sản phẩm cần có từ lập trình viên khác

Trạng thái ban đầu của mọi dòng là **Chưa kiểm** (chưa thấy repo/artefact). Stage 1.1 điền cột "Kết quả kiểm" theo mục 18.1: _Chưa có / Có nhưng chưa đạt / Đủ để thực hiện_, kèm link, người kiểm, ngày, lý do. "Mềm" = có thể bắt đầu bằng fixture/giả định có ghi nhãn và thay sau; "Cứng" = thiếu thì Bị chặn.

| ID    | Sản phẩm cần                                                                                                                                                               | Người cung cấp (nguồn)                                                        | Dùng ở stage                         | Mức                                                     | Cách kiểm                                                                     | Nếu thiếu                                                                                                      |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| IN-01 | **A03** — DTO và schema lõi v1: VĐV, kỳ giải, nội dung, đăng ký, trận, submission/version; id, mã hiển thị, `edition_id`, `event_id`, version, nhãn nhóm                   | L01/P01 (P01 là đồng chủ trì: phần dữ liệu do chính tôi viết nhưng L01 duyệt) | 2.2, 3.2–3.8                         | **Cứng**                                                | File trong `docs/api` hoặc `packages/contracts`, có version/tag; L01 xác nhận | Soạn đề xuất schema trong 2.2 và nộp L01 như phần P01 của A03; không chuyển Sẵn sàng cho 3.x đến khi L01 duyệt |
| IN-02 | **A01** — baseline nghiệp vụ, mã yêu cầu, danh sách quyết định bị thay thế                                                                                                 | L02                                                                           | 2.2 (cột "mã yêu cầu")               | Mềm                                                     | Bảng traceability có version                                                  | Ghi "chưa có mã yêu cầu" vào từ điển; bổ sung sau                                                              |
| IN-03 | **A02** — ADR stack: PostgreSQL phiên bản, backend framework, ORM/runner migration, vị trí thư mục, auth, worker, Drive adapter                                            | **L01 (đã giao người khác)**                                                  | 2.1, 2.3, 3.x (nối runner), 5.1, 7.1 | Mềm cho SQL thuần; **Cứng** cho nối runner chính thức   | ADR đã duyệt trong `docs/architecture`                                        | Viết SQL thuần tương thích PostgreSQL ≥ 15; script kiểm riêng bằng `psql`; ghi D11 là "đề xuất"                |
| IN-04 | **B01** — monorepo, cấu trúc thư mục, CODEOWNERS, lệnh lint/test, CI chạy được, PostgreSQL service trong CI                                                                | **O01 (đã giao người khác)**                                                  | 5.3 (cắm chốt chặn), 7.1 (PR)        | Mềm đến 6.2; **Cứng** cho 7.1                           | Link repo, tag, một lần CI xanh                                               | Làm trong workspace cục bộ mô phỏng cùng cấu trúc; xuất patch/zip để áp vào repo sau                           |
| IN-05 | **B07** — dev/staging có DB riêng, quy ước biến môi trường (`APP_ENV`, chuỗi kết nối), vai trò DB, cấm dữ liệu thật ở test, log không lộ CCCD/token                        | **O01/O02 (đã giao người khác)**                                              | 4.3, 7.2                             | Mềm                                                     | Tài liệu môi trường + một DB staging truy cập được                            | Dùng tên biến đề xuất (D10) và ghi lại để B07 hợp nhất                                                         |
| IN-06 | **Đặc tả L02**: vòng đời trạng thái (4.2, 19.3), chiều rộng mã trường/STT, cách hiểu "đủ điều kiện", U08                                                                   | L02                                                                           | 2.2, 3.2, 3.6, 3.7                   | **Cứng** cho quy tắc mã VĐV (D05) và trạng thái kỳ giải | Văn bản có ngày, người quyết                                                  | Dùng tối thiểu của plan (`draft`, `registration_open`; `01.012` làm ví dụ); đánh dấu giả định trong §0.4       |
| IN-07 | **R01** — cấu trúc danh mục (hai danh mục, kế thừa, hạn mức, ngừng tổ chức; STT phân cấp chỉ hiển thị), nội dung `event_snapshot`, danh sách trường được phép clone (QT12) | R01                                                                           | 3.5, 3.2                             | **Cứng** cho 3.5                                        | Đặc tả cột + ví dụ                                                            | Dựng khung `catalog_node/event_definition` theo mục 4.1; cấu hình để `jsonb`; ghi CR cho R01                   |
| IN-08 | **R02** — trường học sinh/VĐV, quy tắc cấp mã (cấp khi tạo hay khi duyệt), khóa nhận diện hồ sơ trùng, import                                                              | R02                                                                           | 3.6                                  | **Cứng** cho 3.6                                        | Đặc tả cột + ví dụ                                                            | Dựng theo mục 4.1; thời điểm cấp mã để R02 chọn — hàm cấp mã độc lập thời điểm gọi                             |
| IN-09 | **R03** — trường đăng ký/đội/thành viên/revision, dạng hạn mức/đếm theo trường và nội dung                                                                                 | R03                                                                           | 3.6                                  | **Cứng** cho bảng đếm tranh suất                        | Đặc tả + ví dụ                                                                | Không tạo bảng đếm; chỉ ghi đề xuất vào CR                                                                     |
| IN-10 | **C01/C02/C03** — trường draw, draw_version, node, round, match, schedule_revision; cách biểu diễn "ảo", khóa sơ đồ, nghĩa `started_at` (U04)                              | C01, C02, C03                                                                 | 3.7                                  | **Cứng** cho 3.7                                        | Đặc tả + ví dụ node                                                           | Dựng theo mục 4.1; để cột mở rộng `jsonb`; ghi CR                                                              |
| IN-11 | **K01** — trường result_submission/official_result/confirmation/result_revision; schema payload theo môn; trạng thái; `operation_id`, `base_version`                       | K01                                                                           | 3.8                                  | **Cứng** cho 3.8                                        | Đặc tả + schema payload mẫu                                                   | Dựng cấu trúc tối thiểu theo mục 4.2 và 18.4; payload là `jsonb`                                               |
| IN-12 | **K02/K03/K04** — participation/restoration/weight/ranking/award/penalty/publication                                                                                       | K02, K03, K04                                                                 | 3.9 (Wave 2)                         | Ngoài B02                                               | Đặc tả                                                                        | Ghi CR; không làm trong B02                                                                                    |
| IN-13 | **P02 (B04)** — hình dạng bảng `idempotency_key`, ngữ nghĩa `version`, mức cách ly giao dịch, cách ánh xạ SQLSTATE → lỗi API                                               | P02                                                                           | 3.4                                  | Mềm                                                     | Đặc tả ngắn                                                                   | Dùng mặc định D04 và đề xuất cột `(actor, endpoint, key)` unique + `request_hash`                              |
| IN-14 | **P03 (B05)** — cột audit/outbox/job_run/notification, hợp đồng sự kiện (event id, loại, aggregate id/version, actor, `occurred_at`, payload version), cách khử trùng      | P03                                                                           | 3.4                                  | Mềm                                                     | Đặc tả ngắn                                                                   | Dùng mục 5.1 plan làm cột tối thiểu; P03 mở rộng bằng migration cộng thêm                                      |
| IN-15 | **S01/S02** — vai trò theo môn/trường, trạng thái tài khoản (chưa duyệt → chặn ghi), checklist theo nội dung, quy tắc cùng trường                                          | S01, S02                                                                      | 3.3, 3.5                             | **Cứng** cho 3.3 và `referee_assignment`                | Ma trận phân quyền (`docs/business/permissions`)                              | Dựng `user/membership/role_assignment` tối thiểu; để `referee_assignment` chờ                                  |
| IN-16 | **S03** — cơ chế mã hóa CCCD (thuật toán, `key_id`, chỉ mục tra cứu), thông tin file/Drive                                                                                 | S03                                                                           | 3.6, 3.9                             | **Cứng** cho `private_identity`                         | Đặc tả ngắn                                                                   | Tạo cột `bytea` theo D07 và đánh dấu giả định; không lưu CCCD dạng text trong mọi trường hợp                   |
| IN-17 | **A05** (Q01/Q02/Q03) — fixtures 7 trường, 500 VĐV giả; liên cấp, trùng mã, 3–5 và 6+ VĐV                                                                                  | Q01, Q02, Q03                                                                 | 4.2, 6.1                             | Mềm                                                     | File `packages/test-fixtures` có version                                      | Sinh dữ liệu giả xác định (seed cố định) trong 4.2; sau thay bằng A05                                          |
| IN-18 | **O02** — yêu cầu backup/restore: định dạng export, bảng `backup_manifest`, phiên bản schema, kỳ vọng restore                                                              | O02                                                                           | 5.2                                  | Mềm                                                     | Ghi chú yêu cầu                                                               | Dùng `pg_dump -Fc` + `pg_restore`; ghi để O02 (I04) tinh chỉnh                                                 |
| IN-19 | **Reviewer** — tên người rà migration/schema (QT05: L01/P01; QT37: không tự duyệt)                                                                                         | L02 gán; đề xuất **L01**, dự phòng **P02**                                    | 6.2, 7.1                             | **Cứng** cho 7.1                                        | Tên trong board                                                               | Dừng ở "Chờ review"; không tự duyệt                                                                            |

**Quy ước:** các giả định ở cột "Nếu thiếu" luôn ghi vào §0.4 với nhãn "giả định", kèm người cần xác nhận. Mock/fixture không được dùng để báo "đã tích hợp" (mục 18.1).

---

## 4. Sản phẩm B02 giao cho người khác

| Mốc              | Khi nào        | Nội dung                                                                                                   | Người nhận                                                        | Điều kiện đủ (mục 8 và 18.4 plan)                        |
| ---------------- | -------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------- |
| **M1** (sau 3.4) | Cuối stage 3.4 | Nền, edition/school, identity, audit/outbox/idempotency/job_run; script dựng DB; seed tham chiếu tối thiểu | P02 (B04), S01 (B03), P03 (B05), O01 (cắm CI)                     | Chạy `db_reset` sạch; từ điển các bảng này; tag `b02-m1` |
| **M2** (sau 3.6) | Cuối stage 3.6 | Danh mục/snapshot/phân công, VĐV/đăng ký/đội/cấp mã                                                        | R01, R02, R03, S02, Q01/Q02                                       | Test đồng thời cấp mã đạt; tag `b02-m2`                  |
| **M3** (sau 3.8) | Cuối stage 3.8 | Thi đấu, kết quả                                                                                           | C01–C03, K01, F03 (đọc), Q                                        | Tag `b02-m3`                                             |
| **Cuối** (7.2)   | Hết stage 7.2  | Gói đầy đủ + từ điển + hướng dẫn + bằng chứng                                                              | L01 (review), L02 (traceability), O01/O02, Q01/Q02/Q03, toàn nhóm | QT39, người nhận ghi "Đã nhận đủ" (mục 18.2)             |

Thông báo bàn giao ghi: ID, phiên bản (tag + ID migration cuối), link/đường dẫn file, test đã chạy, hạn chế còn mở. Gửi link chưa phải nghiệm thu (mục 18.2).

---

## 5. Phase và stage

**Quy ước chung cho mọi stage**

- Mỗi stage có: Đầu vào → Việc làm → **Đầu ra (file)** → Xong khi → Kiểm chứng → **Ghi chú ca** (file `docs/B02/stages/<ID>.md`, mẫu ở §6.3).
- Một stage là điểm dừng an toàn nhỏ nhất. Nếu hết lượt giữa chừng: ghi vào file ghi chú stage "đã làm đến đâu / lệnh chạy lại / việc còn lại", rồi làm quy trình kết ca (§6.2).
- Không sửa migration đã chốt ở stage trước. Cần sửa → migration mới (QT36); riêng trong workspace cục bộ **trước** khi có tag `b02-m1`, được phép viết lại file chưa bàn giao nhưng phải ghi lý do ở file ghi chú stage và cập nhật `migrations.lock`.
- Mọi dữ liệu seed là giả và đánh dấu rõ. Không có CCCD/token/khóa thật ở bất kỳ file nào.
- Không commit/push git trừ khi người dùng yêu cầu. Lịch sử thay đổi bằng `CHANGELOG-B02.md` và gói zip có checksum.

**Cấu trúc thư mục workspace** (mô phỏng monorepo mục 3.3 để áp vào repo thật bằng copy/patch):

```
hkpd-b02/
  infra/db/
    migrations/        # <ts>_<module>_<mô tả>.up.sql / .down.sql
    migrations.lock    # sha256 từng file (stage 5.3)
    seed/reference/    # an toàn mọi môi trường
    seed/dev/          # dữ liệu giả; cấm production
    scripts/           # env.sh, migrate.sh (runner tạm), pg_local.sh, db_reset.sh, check_migrations.sh, cycle_test.sh, recovery_drill.sh, seed_guard.sh, scan_sensitive.sh
    tests/             # run_all.sh, test_*.sh, fixtures/ (bộ migration mẫu), sau này *.sql và pgbench/*.sql
  docs/architecture/data/   # conventions.md, data-dictionary.md, erd.mmd, migration-guide.md
  docs/B02/
    subplan_B02_database_migration_seed.md   # bản sao subplan
    input-check.md       # kết quả rà đầu vào (1.1)
    stages/<ID>.md       # ghi chú từng stage
    evidence/            # log test, biên bản diễn tập
    handoff/             # thông báo bàn giao đã gửi / xác nhận nhận
  CHANGELOG-B02.md
```

---

### Phase 1 — Nhận việc và dựng nền (0.4 ngày)

#### Stage 1.1 — Nhận việc, rà đầu vào (0.2)

- **Đầu vào:** subplan này, `B02_plan_extract.md`, kết quả liên lạc với các bên ở §3.
- **Việc làm:** (1) Đọc lại tiêu chí B02 và QT áp dụng (§1.3–1.4). (2) Tạo `input-check.md` với 19 dòng IN-xx: người cung cấp, ID công việc nguồn, phiên bản cần/nhận, link, kết quả kiểm (Chưa có / Có nhưng chưa đạt / Đủ), người/ngày kiểm, hạn cung cấp. (3) Soạn thông điệp yêu cầu cho từng người cung cấp (A03, ADR, B01, đặc tả R/C/K/S, reviewer) — liệt kê chính xác cần gì. (4) Xác nhận D12 (lõi/Wave 2) với L01/L02; xác nhận reviewer. (5) Quyết định stage nào Sẵn sàng/Bị chặn.
- **Đầu ra:** `docs/B02/input-check.md`; `docs/B02/handoff/requests-to-others.md` (nội dung đã soạn); `docs/B02/stages/1.1.md`.
- **Xong khi:** mỗi IN có trạng thái và hành động; mọi stage có nhãn Sẵn sàng/Bị chặn kèm lý do; §0.4 cập nhật.
- **Kiểm chứng:** tự rà lại từng dòng IN có link/bằng chứng hoặc ghi "Chưa có".
- **Lưu ý:** không đánh dấu "Đủ" theo lời nói; cần link và phiên bản (mục 18.1).

#### Stage 1.2 — Dựng workspace và PostgreSQL cục bộ (0.2)

- **Đầu vào:** không có phụ thuộc ngoài.
- **Việc làm:** tạo cấu trúc thư mục ở trên; viết `scripts/pg_local.sh` khởi tạo cụm PostgreSQL tạm (chạy `initdb`/`pg_ctl` dưới người dùng `postgres`, vì `root` bị từ chối), tạo DB `hkpd_dev`, vai trò `migrator`/`app_rw` với mật khẩu từ biến môi trường (D10); `db_reset.sh` (drop → create → chạy toàn bộ `.up.sql` theo thứ tự tên file); `migrate.sh up|down|status` (runner tạm bằng SQL thuần, mỗi file một transaction); bảng theo dõi `schema_migrations(id, filename, checksum, applied_at)`; thay bằng runner của A02 khi có.
- **Đầu ra:** các script trên; `docs/architecture/data/migration-guide.md` (bản đầu: cách dựng, cách thêm migration); `docs/B02/stages/1.2.md`.
- **Xong khi:** `pg_local.sh` rồi `db_reset.sh` chạy được trên cụm rỗng với migration giả (một bảng thử) và `db_down.sh` lùi được.
- **Kiểm chứng:** `psql -c "select version()"`; `db_reset.sh && db_reset.sh` (chạy hai lần liên tiếp).
- **Lưu ý ca sau:** cụm PostgreSQL trong container này mất khi container bị thu hồi; ca sau chạy lại `pg_local.sh` là đủ (script phải idempotent).

---

### Phase 2 — Thiết kế (1.0 ngày)

#### Stage 2.1 — Quy ước dữ liệu / ADR-DB nháp (0.25)

- **Đầu vào:** mục 3, 4, 9.3, 16.3; IN-03 (nếu có).
- **Việc làm:** viết `conventions.md` từ D01–D12 (§0.4): đặt tên bảng/cột (giữ đúng tên thực thể mục 4.1, QT13 tinh thần "không tự đổi tên"), kiểu dữ liệu, `edition_id`, FK ghép, `version`, `created_at/updated_at`, trigger `updated_at`, CHECK cho trạng thái, cấm float, `ON DELETE RESTRICT`, quy ước ID migration (D11), vai trò DB (D10), tương thích PostgreSQL ≥ 15. Mỗi quyết định: lựa chọn, lý do, người cần xác nhận.
- **Đầu ra:** `docs/architecture/data/conventions.md`; `docs/B02/stages/2.1.md`.
- **Xong khi:** mọi D01–D12 có tên người xác nhận hoặc nhãn "Đề xuất — chờ …"; gửi L01 đọc.
- **Kiểm chứng:** L01 trả lời hoặc ghi "chưa phản hồi" kèm ngày.

#### Stage 2.2 — Từ điển dữ liệu và ERD (0.5)

- **Đầu vào:** **IN-01 (A03)**, IN-02, IN-06…IN-11, IN-15, IN-16 (càng đủ càng tốt); mục 4.1, 4.2, 18.4, 19.2.
- **Việc làm:** cho từng bảng lõi (§2.1): cột, kiểu, null, mặc định, ràng buộc, đơn vị, cờ nhạy cảm, module chủ, mã yêu cầu/QT, nguồn (A03 version hoặc "giả định P01"). Lập bảng "ràng buộc phải thực hiện" (cột 3 mục 4.1) và phân loại: **DB bắt buộc** (unique/FK/CHECK) và **ứng dụng bắt buộc** (ghi rõ ai làm). Vẽ ERD Mermaid theo nhóm. Danh sách câu hỏi mở gửi chủ module.
- **Đầu ra:** `docs/architecture/data/data-dictionary.md`; `docs/architecture/data/erd.mmd`; `docs/B02/open-questions.md`; `docs/B02/stages/2.2.md`.
- **Xong khi:** mọi bảng lõi có đủ cột; mọi cột nghiệp vụ không chắc được gắn nhãn "giả định" + người xác nhận; L01 nhận bản để duyệt (A03).
- **Kiểm chứng:** đối chiếu từng thực thể mục 4.1 với từ điển (không sót); đối chiếu từng "ràng buộc cần thực hiện" có hành động.
- **Lưu ý:** nếu A03 chưa có, từ điển này là đề xuất P01 cho A03 — nộp L01, không tự coi là chốt.

#### Stage 2.3 — Kế hoạch migration (0.25)

- **Đầu vào:** 2.1, 2.2.
- **Việc làm:** quyết định thứ tự bảng theo phụ thuộc FK; ánh xạ mỗi nhóm bảng → file migration (ID, module, nội dung, `down` tương ứng); quy tắc expand/contract (mục 9.3); định dạng `migrations.lock`; danh sách "chốt chặn" cần có ở 5.3; điểm giao M1/M2/M3.
- **Đầu ra:** `docs/architecture/data/migration-plan.md`; `docs/B02/stages/2.3.md`.
- **Xong khi:** danh sách file migration dự kiến khớp với stage 3.1–3.8.
- **Kiểm chứng:** vẽ đồ thị phụ thuộc FK từ ERD; không có vòng.

---

### Phase 3 — Migration (1.75 ngày)

**Điều kiện chung vào Phase 3:** IN-01 (A03 v1 hoặc đề xuất P01 đã được L01 xem xét); với từng stage, các IN-xx ghi ở dòng "Đầu vào". Mỗi stage thêm file `.up.sql` **và** `.down.sql`, cập nhật `migrations.lock` và từ điển, chạy `tests/run_all.sh` phần liên quan.

#### Stage 3.1 — Migration nền (0.15)

- **Đầu vào:** 2.1, 2.3.
- **Việc làm:** schema/search_path theo conventions; hàm chung `set_updated_at()`, hàm hỗ trợ kiểm tra; quyền mặc định cho `migrator`/`app_rw` (D10); không bật extension không cần thiết.
- **Đầu ra:** `migrations/*_core_foundation.{up,down}.sql`; `stages/3.1.md`.
- **Xong khi:** `db_reset.sh` sạch; `down` đưa DB về rỗng.

#### Stage 3.2 — Edition và school (0.15)

- **Đầu vào:** IN-01, IN-06 (trạng thái), IN-07 (trường được clone).
- **Việc làm:** `edition` (UUID, tên, năm, đơn vị tổ chức, thời gian tổ chức, thời hạn đăng ký, `status` CHECK chỉ `draft`/`registration_open`, `config_version`, `source_edition_id`, `source_config_version`, `created_by`, `version`); `school` (mã trường thống nhất, tên, cấp) và liên kết trường–kỳ giải theo A03; `edition_creation_log` (nguồn, phần đã sao chép, người thực hiện).
- **Đầu ra:** migration `*_edition_school.{up,down}.sql`; cập nhật từ điển; `stages/3.2.md`.
- **Xong khi:** test: tạo hai kỳ giải không ảnh hưởng nhau; trạng thái ngoài hai giá trị bị chặn; `source_edition_id` không tự tham chiếu.
- **Lưu ý:** không thêm trạng thái `closed/finished…` khi L02 chưa chốt (mục 19.3).

#### Stage 3.3 — Identity (0.2)

- **Đầu vào:** IN-15 (S01/S02), IN-01.
- **Việc làm:** `user` (khóa `google_sub` unique, email, trạng thái `pending/approved/blocked` theo S01 — nếu chưa có thì ghi giả định), `membership` (user–trường/kỳ), `role_assignment` (vai trò, phạm vi kỳ/môn/trường). Không có trường mật khẩu. Không chứa token.
- **Đầu ra:** `*_identity.{up,down}.sql`; từ điển; `stages/3.3.md`.
- **Xong khi:** unique `google_sub`, FK ghép theo edition; tài khoản `pending` có thể tạo nhưng có cột để B03 chặn ghi (B03 kiểm tra ở policy, không ở đây).

#### Stage 3.4 — Audit, outbox, idempotency, job (0.25) — **Mốc M1**

- **Đầu vào:** IN-13 (P02), IN-14 (P03); mục 5.1 (sự kiện), 5.2 (command idempotent), 4.1 (audit_event, outbox_event).
- **Việc làm:** `audit_event` (actor, thực thể, id, trước/sau `jsonb`, thời gian, `edition_id`), `outbox_event` (event id, loại, aggregate type/id/version, actor, `occurred_at`, payload `jsonb`, `payload_version`, trạng thái, số lần thử, `dedupe_key` unique, `processed_at`), `idempotency_key` (actor, endpoint, key unique + `request_hash`, trạng thái, tham chiếu phản hồi), `job_run` (loại, trạng thái, số lần thử, thời gian, lỗi — **không PII trong lỗi**). Index cho hàng đợi outbox chưa xử lý.
- **Đầu ra:** `*_audit_outbox_idempotency.{up,down}.sql`; từ điển; `stages/3.4.md`; **gói M1** (`b02-m1`, xem §4).
- **Xong khi:** test unique `dedupe_key` và `idempotency_key`; chèn trùng bị từ chối; tag M1 và thông báo P02, S01, P03, O01 gửi kèm cách chạy.
- **Lưu ý:** cột có thể bổ sung bởi P02/P03 bằng migration cộng thêm; B02 không giữ độc quyền ý nghĩa nghiệp vụ (mục 3.2).

#### Stage 3.5 — Danh mục, snapshot, phân công trọng tài (0.3)

- **Đầu vào:** IN-07 (R01), IN-15 (S02), IN-06, IN-01.
- **Việc làm:** `catalog_node` (cây, STT phân cấp chỉ để hiển thị, không là khóa), `event_definition` (mã nội dung **ổn định**, trạng thái ngừng tổ chức), `rule_version` (phiên bản quy tắc), `event_snapshot` (kỳ giải + nội dung + rule version + cấu hình `jsonb` như hạn mức/tuổi/điều kiện — **chỉ chỗ lưu, không giá trị**), `referee_assignment` (người, môn/nội dung được tick, kỳ giải, hiệu lực từ–đến, `version`).
- **Đầu ra:** `*_catalog_snapshot.{up,down}.sql`; `*_referee_assignment.{up,down}.sql`; từ điển; `stages/3.5.md`.
- **Xong khi:** mã nội dung unique trong catalog; snapshot gắn `edition_id`; test: sửa cấu hình giải mới không đổi snapshot giải nguồn (TG07 ở mức schema: các bảng snapshot không dùng chung dòng giữa hai kỳ).
- **Lưu ý:** không chèn hạn mức/độ tuổi vào bảng (U01).

#### Stage 3.6 — VĐV, đăng ký, đội, cấp mã (0.35) — **Mốc M2**

- **Đầu vào:** IN-08 (R02), IN-09 (R03), IN-16 (S03), IN-06 (D05), IN-01; mục 4.1, 4.2, 16.3.
- **Việc làm:** `student_master`; `athlete` (ID nội bộ, `edition_id`, `school_id`, `seq` int, `athlete_code` text, trạng thái); `athlete_code_sequence`; hàm `allocate_athlete_code(edition, school)` (khóa dòng, trả `athlete_code`, không cắt chữ số, không tái sử dụng); `private_identity` (cột `bytea` mã hóa, `key_id`, chỉ mục tra cứu, ngày sinh; tách quyền); `registration`, `registration_revision`, `team`, `team_member`. Unique `(edition_id, school_id, seq)`, `(edition_id, athlete_code)`; một đội/trường/nội dung (partial unique, loại bản đã rút); `approved_revision_id` tách `current_revision_id`. Bảng đếm tranh suất chỉ khi IN-09 xác nhận.
- **Đầu ra:** `*_athlete_registration.{up,down}.sql`; `*_athlete_code_fn.{up,down}.sql`; từ điển; `stages/3.6.md`; **gói M2** (`b02-m2`).
- **Xong khi:** TC04–TC08 và TC09 qua; M2 gửi R01, R02, R03, S02, Q01/Q02.
- **Lưu ý:** mã luôn là text; không cast sang số ở bất kỳ view/hàm nào; đây là điểm trọng yếu của AC4.

#### Stage 3.7 — Thi đấu: draw, round, match, lịch (0.2)

- **Đầu vào:** IN-10 (C01–C03), IN-01; mục 4.1, 4.2; U04.
- **Việc làm:** `draw`, `draw_version` (version, trạng thái, khóa sau chốt), `round`, `bracket_node` (`slot_kind` athlete/virtual + CHECK), `match` (node/cặp, `started_at` nullable, trạng thái), `schedule_revision` (version lịch; sân/thời gian — chi tiết theo C03). Unique vị trí trong vòng của một draw version. Không tạo `athlete` cho ảo.
- **Đầu ra:** `*_competition.{up,down}.sql`; từ điển; `stages/3.7.md`.
- **Xong khi:** TC11, TC12 qua; ghi trong từ điển nghĩa tạm của `started_at` và người xác nhận (U04).

#### Stage 3.8 — Kết quả: submission → chính thức (0.15) — **Mốc M3**

- **Đầu vào:** IN-11 (K01), IN-01; mục 4.2, 18.4; QT19–QT20.
- **Việc làm:** `result_submission` (trận, actor, `payload jsonb`, `payload_schema_version`, `result_kind`, `base_version`, `operation_id` unique, trạng thái), `official_result` (một dòng/trận; `submission_id` trỏ **bản đã xác nhận của cùng trận** — FK ghép), `confirmation` (submission id, version cần xác nhận, người xác nhận, thời gian), `result_revision` (đề nghị sửa riêng). Không cột điểm chung; không float.
- **Đầu ra:** `*_results.{up,down}.sql`; từ điển; `stages/3.8.md`; **gói M3** (`b02-m3`).
- **Xong khi:** TC13 qua; M3 gửi C01–C03, K01, F03, Q.
- **Lưu ý:** DB chỉ chặn được những gì cheap (trùng, nối chéo trận). Quy tắc "chỉ xác nhận hợp lệ mới đổi chính thức" do K01/P02 giữ trong transaction (QT19) — ghi rõ trong từ điển, không vờ như DB đã làm.

#### Stage 3.9 — _(Tùy chọn, ngoài ngân sách)_ Khung Wave 2

- Chỉ làm khi chủ module cung cấp đặc tả: participation/restoration/weight (K02), ranking/award/penalty/publication (K03/K04), `file_object/file_link/notification` (S03/P03), `edit_lease/sync_submission` (K01/F03), `backup_manifest` (O02). Mỗi nhóm một migration cộng thêm, tạo CR/ticket riêng, P01 rà. Ghi vào bảng 0.1 khi bắt đầu.

---

### Phase 4 — Seed (0.5 ngày)

#### Stage 4.1 — Seed tham chiếu (0.1)

- **Đầu vào:** 3.3, 3.5; IN-15 (danh sách vai trò).
- **Việc làm:** `seed/reference/*.sql` (idempotent, `ON CONFLICT DO NOTHING`): vai trò, các hằng tham chiếu cần thiết, bản ghi `rule_version` khởi đầu **rỗng/nhãn mẫu**. Không chứa luật chuyên môn.
- **Đầu ra:** `seed/reference/`; `stages/4.1.md`.
- **Xong khi:** chạy hai lần cho cùng số dòng.

#### Stage 4.2 — Seed dev: 7 trường, ~500 VĐV giả (0.3)

- **Đầu vào:** IN-17 (A05) nếu có; 3.2–3.6.
- **Việc làm:** trình sinh dữ liệu xác định (seed cố định) tạo: kỳ giải `[DEV-SEED]`, 7 trường tên giả (`Trường Mẫu 01…07`), nội dung **mẫu** cờ `is_sample`, ~500 VĐV giả (tên giả, CCCD giả **không hợp lệ rõ ràng**, đi qua hàm cấp mã), trường hợp bắt buộc theo A05: trường liên cấp, mã trùng giữa hai kỳ (hợp lệ), mã trùng trong một kỳ (bị chặn — dùng trong test, không trong seed), nội dung 3–5 và 6+ VĐV, một học sinh hai môn, đội. Không tạo kết quả giả "như thật".
- **Đầu ra:** `seed/dev/`; `docs/B02/seed-README.md` (cách chạy, dữ liệu gì, vì sao giả); `stages/4.2.md`.
- **Xong khi:** `db_reset.sh && seed` cho đúng số lượng; mã có số 0 đầu hiện đúng (`01.001`…); chạy lại cho cùng số dòng.
- **Lưu ý:** khi A05 có, thay trình sinh bằng fixtures chính thức hoặc đối chiếu; ghi lại.

#### Stage 4.3 — Chốt chặn an toàn cho seed (0.1)

- **Đầu vào:** IN-05 (nếu có); D10.
- **Việc làm:** script seed dev chỉ chạy khi `APP_ENV` ∈ {local, dev, test, ci}, tên DB khớp `hkpd_(dev|test|ci)…`, DB ở máy cục bộ, và mọi kỳ giải hiện có đều mang nhãn `[DEV-SEED]` (fail closed); quét repo cấm mẫu CCCD 12 chữ số hợp lệ ngoài danh sách giả; seed in rõ "DỮ LIỆU GIẢ".
- **Đầu ra:** `scripts/seed_guard.sh`; `stages/4.3.md`.
- **Xong khi:** TC15 qua (production → từ chối, exit ≠ 0).

---

### Phase 5 — Rollback, recovery và chốt chặn migration (0.5 ngày)

#### Stage 5.1 — Down migration và vòng up→down→up (0.2)

- **Đầu vào:** 3.x.
- **Việc làm:** kiểm tra mọi `.down.sql` đưa schema về đúng trạng thái trước; script `cycle_test.sh`: với từng migration — up, dump schema, down, so schema với trước, up lại, so với sau; và toàn chuỗi. Ghi rõ migration nào **không thể lùi lossless** nếu có (phải có cảnh báo trong file).
- **Đầu ra:** `scripts/cycle_test.sh`; `evidence/cycle-test-<ngày>.log`; `stages/5.1.md`.
- **Xong khi:** mọi migration lùi/tiến sạch; log đính kèm.

#### Stage 5.2 — Diễn tập recovery (0.15)

- **Đầu vào:** IN-18 (O02) nếu có; 5.1.
- **Việc làm:** `recovery_drill.sh`: dựng DB + seed → `pg_dump -Fc` → áp một migration cố ý lỗi giữa chừng → khôi phục từ dump vào DB mới → so số bản ghi và checksum bảng trọng yếu → ghi biên bản. Mô tả khi nào dùng `down` và khi nào dùng restore (migration phá dữ liệu).
- **Đầu ra:** `scripts/recovery_drill.sh`; `evidence/recovery-drill-<ngày>.md`; mục "Recovery" trong `migration-guide.md`; `stages/5.2.md`.
- **Xong khi:** đối chiếu trước–sau khớp; hướng dẫn rõ.

#### Stage 5.3 — Chốt chặn migration: ID, checksum, lint (0.15)

- **Đầu vào:** D11; IN-04 (để cắm vào CI — làm sau).
- **Việc làm:** `check_migrations.sh` kiểm: (a) ID duy nhất và đúng định dạng; (b) mỗi `.up` có `.down`; (c) checksum `migrations.lock` không đổi với file đã khóa (QT36 "không sửa migration đã chạy"); (d) lint: không `DROP COLUMN/DROP TABLE` trong migration mới ngoài danh sách cho phép có ghi chú (mục 9.3), không `float/real/double precision`, không `ON DELETE CASCADE` nghiệp vụ, không `timestamp without time zone`; (e) mã thoát ≠ 0 khi vi phạm. Viết hướng dẫn cho O01 cắm vào CI (không tự sửa CI của B01).
- **Đầu ra:** `scripts/check_migrations.sh`; `migrations.lock`; `docs/B02/ci-hook.md`; `stages/5.3.md`.
- **Xong khi:** TC16 qua với cả ca đúng và ca vi phạm.

---

### Phase 6 — Kiểm thử và nghiệm thu (0.6 ngày)

#### Stage 6.1 — Bộ kiểm thử database (0.4)

- **Đầu vào:** 3.x, 4.x, 5.x.
- **Việc làm:** `tests/run_all.sh` chạy các TC dưới đây trên DB sạch, in kết quả dạng TAP (`ok`/`not ok`), thoát ≠ 0 nếu lỗi. Test đồng thời dùng `pgbench` với script tùy chỉnh gọi `allocate_athlete_code`.

| TC   | Nội dung                                                                                                    | AC              |
| ---- | ----------------------------------------------------------------------------------------------------------- | --------------- |
| TC01 | Dựng sạch từ DB rỗng, hai lần liên tiếp                                                                     | AC1             |
| TC02 | up→down→up từng migration và toàn chuỗi                                                                     | AC3             |
| TC03 | Seed chạy hai lần cho cùng số dòng; đúng số trường/VĐV                                                      | AC2             |
| TC04 | `01.012` lưu và đọc lại giữ số 0; kiểu cột là text                                                          | AC4             |
| TC05 | 100 kết nối đồng thời cấp mã cùng `(edition, school)`: không trùng, liên tục                                | AC4             |
| TC06 | STT ≥ 1000 không bị cắt chữ số                                                                              | AC4             |
| TC07 | VĐV rút: mã không được cấp lại                                                                              | AC4             |
| TC08 | Cùng mã ở hai kỳ giải hợp lệ; cùng mã trong một kỳ bị từ chối                                               | AC4, AC6        |
| TC09 | FK ghép từ chối nối chéo kỳ giải (đăng ký ↔ athlete, match ↔ draw…)                                         | AC6             |
| TC10 | Không có cột `real/double precision/float`; mọi thời gian là `timestamptz`                                  | AC7             |
| TC11 | `bracket_node`: ảo không có athlete; athlete phải có athlete_id; không có hàng `athlete` cho ảo             | QT09            |
| TC12 | Unique vị trí trong vòng của draw version                                                                   | QT24 (cấu trúc) |
| TC13 | Một `official_result` mỗi trận; con trỏ chỉ tới bản đã xác nhận của cùng trận; trùng `operation_id` bị chặn | QT19–QT20       |
| TC14 | Trùng `dedupe_key`/`idempotency_key` bị chặn; trạng thái kỳ giải ngoài hai giá trị bị chặn                  | 3.2, 3.4        |
| TC15 | Seed dev từ chối khi `APP_ENV=production`; không cột CCCD dạng text; quét repo không có CCCD thật           | AC8             |
| TC16 | `check_migrations.sh`: ID trùng, migration bị sửa, thiếu `.down`, DROP COLUMN, float → thất bại đúng        | AC5             |
| TC17 | Diễn tập recovery khớp trước–sau                                                                            | AC3             |

- **Đầu ra:** `tests/`; `evidence/test-report-<ngày>.txt`; `stages/6.1.md`.
- **Xong khi:** tất cả TC `ok`; test sai thì sửa code hoặc đối chiếu đặc tả, **không sửa luật/test để qua** (mục 16.7, 10).

#### Stage 6.2 — Bằng chứng và tự rà theo QT39 (0.2)

- **Đầu vào:** 6.1.
- **Việc làm:** lập `evidence/B02-acceptance.md` đối chiếu AC1–AC9 với log; chạy checklist trước hợp nhất (mục 16.14) cho migration: nguồn nghiệp vụ; phạm vi kỳ/trường/môn; trạng thái; transaction/version/idempotency; tác động kết quả chính thức; privacy/audit; tương thích contract/migration; test và tài liệu — mục nào không áp dụng ghi lý do, không ghi "đạt" chung chung. Liệt kê U/CR còn mở và các giả định (§0.4).
- **Đầu ra:** `evidence/B02-acceptance.md`; `stages/6.2.md`.
- **Xong khi:** trạng thái **Chờ review** (người thực hiện không tự duyệt — QT37; reviewer đề xuất L01).

---

### Phase 7 — Bàn giao (0.25 ngày)

#### Stage 7.1 — Gói PR và tài liệu (0.15)

- **Đầu vào:** 6.2; IN-04 (repo), IN-19 (reviewer).
- **Việc làm:** đóng gói để áp vào repo (cấu trúc `infra/db`, `docs/architecture/data`, `docs/B02`); mô tả PR đủ mục: hành vi trước–sau, mã yêu cầu/QT, migration, test đã chạy, cách rollout, ảnh/log; đề xuất dòng CODEOWNERS (migration cần L01/P01 duyệt, QT05); cập nhật `CHANGELOG-B02.md`.
- **Đầu ra:** `B02_package_<tag>.zip` (+ sha256), `docs/B02/pr-description.md`; `stages/7.1.md`.
- **Xong khi:** reviewer đã nhận; nếu repo chưa có, ghi "chờ B01" và giữ gói sẵn.

#### Stage 7.2 — Bàn giao liên nhóm và đóng B02 (0.1)

- **Đầu vào:** 7.1, review đạt.
- **Việc làm:** gửi từng người nhận (§4) thông báo có ID, phiên bản, đường dẫn, test, hạn chế; ghi "Đã nhận đủ / Chưa đủ" (mục 18.2) vào `docs/B02/handoff/`; chuyển trạng thái **Đã nghiệm thu** chỉ khi QT39 đủ; cập nhật G1 (database seed chạy được); chuyển danh sách mở (U/CR, Wave 2) cho L02/L01.
- **Đầu ra:** `docs/B02/handoff/ack-<người>.md`; `stages/7.2.md`.
- **Xong khi:** mọi người nhận chính (P02, S01, P03, R01–R03, O01, O02, Q) xác nhận hoặc có lý do chưa.

---

## 6. Quy trình theo ca (để tiếp tục khi hết lượt)

### 6.1 Mở ca

1. Đọc §0 (bảng trạng thái, nhật ký ca, quyết định mở).
2. Đọc `docs/B02/stages/<stage đang làm>.md` (nếu có) và `input-check.md`.
3. Chạy lại môi trường: `infra/db/scripts/pg_local.sh` (idempotent) rồi `db_reset.sh`, rồi `tests/run_all.sh` (để biết mốc xanh gần nhất).
4. Rà lại đầu vào của stage sắp làm (mục 18.1): vẫn đúng phiên bản? Nếu đầu vào đổi, đánh giá lại bước bị tác động.
5. Chỉ đọc lại phần plan cần thiết trong `B02_plan_extract.md`; chỉ mở docx gốc khi nghi plan đã đổi phiên bản.

### 6.2 Kết ca (bắt buộc, kể cả khi dở stage)

1. Ghi/cập nhật `docs/B02/stages/<ID>.md` (mẫu §6.3).
2. Cập nhật bảng §0.1 (trạng thái, ca), thêm dòng vào nhật ký §0.3, cập nhật §0.4 nếu có quyết định/giả định mới.
3. Chạy `tests/run_all.sh` và `check_migrations.sh` (khi đã có); lưu log vào `evidence/`.
4. Tạo `B02_snapshot_<stage>_<yyyymmdd>.zip` (toàn bộ `hkpd-b02/` + subplan + extract) và `.sha256`.
5. **Gửi file cho người dùng bằng công cụ gửi file** (zip + subplan cập nhật + ghi chú stage). Container có thể bị thu hồi, nên bản gửi cho người dùng là bản duy nhất chắc chắn còn.
6. Ca sau: người dùng đính kèm lại zip/subplan; mở ca theo §6.1.

### 6.3 Mẫu ghi chú stage (`docs/B02/stages/<ID>.md`)

```
# Stage <ID> — <tên>        Trạng thái: <Đang làm / Chờ review / Xong>
Ca: <số> — Ngày: <dd/mm/yyyy>
Đầu vào thực dùng: <IN-xx, người cung cấp, phiên bản, link, kết quả kiểm>
Đã làm: <gạch đầu dòng>
File tạo/sửa: <đường dẫn>
Quyết định/giả định mới: <ID §0.4>
Cách chạy lại / kiểm: <lệnh chính xác>
Kết quả kiểm: <ok/not ok, log>
Còn lại / bước kế tiếp: <cụ thể, đủ để người khác tiếp tục không cần hỏi>
Bị chặn bởi: <ai, cần gì, hạn>
```

---

## 7. Rủi ro và cách xử lý

| Rủi ro                             | Ảnh hưởng                   | Cách xử lý                                                                                            |
| ---------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------- |
| A03 trễ hoặc khác đề xuất          | Phải sửa migration          | Giữ migration nhỏ theo nhóm; trước tag `b02-m1` được viết lại; sau tag chỉ migration cộng thêm (QT36) |
| ADR chọn runner/ORM khác SQL thuần | Phải bọc lại                | SQL thuần vào được hầu hết runner; viết `migration-guide.md` kèm cách ánh xạ                          |
| Đoán luật khi thiếu U01/U02/U04    | Sai nghiệp vụ, vi phạm QT02 | Chỉ dựng chỗ lưu; mọi giả định vào §0.4 có người xác nhận                                             |
| Tranh chấp cấp mã                  | Mã trùng/mất số 0           | Khóa dòng + unique + TC05–TC06; mã là text                                                            |
| Quá nhiều bảng cho 5 ngày công     | Trễ G1                      | Giao theo mốc M1–M3; Wave 2 tách ra (D12); báo L02 nếu đầu vào đến muộn                               |
| Container bị thu hồi, mất tiến độ  | Mất công                    | Kết ca bắt buộc §6.2, zip gửi người dùng                                                              |
| Lẫn dữ liệu thật vào seed/test     | Vi phạm QT35, lộ hồ sơ      | 4.3, TC15, seed chỉ giả                                                                               |
| Migration phá dữ liệu              | Mất dữ liệu                 | 5.1, 5.2; expand/contract; không drop cột đang dùng                                                   |
| Tự duyệt mã của mình               | Vi phạm QT37                | Dừng ở Chờ review; cần reviewer ≠ người thực hiện                                                     |

---

## 8. Câu hỏi mở cho người dùng, L01, L02

1. (Người dùng) Xác nhận chọn **B02** (P01) và cách hiểu "O01, A02, B01, B07 đã được phân công".
2. (L01/L02) Xác nhận D12: B02 giao lõi + hạ tầng; Wave 2 làm sau bằng migration cộng thêm.
3. (L02) Tên reviewer (đề xuất L01; dự phòng P02).
4. (L02/R02) Định dạng mã VĐV: số chữ số của mã trường và STT; cấp mã khi tạo hồ sơ hay khi duyệt.
5. (L01) Đường dẫn thư mục migration/tên file nếu ADR hoặc repo quy định khác D11.
6. (Người dùng) Nếu đã có repo monorepo (B01), cho biết cách truy cập; hiện tại tôi làm trong workspace cục bộ mô phỏng cùng cấu trúc.

Không câu nào chặn Phase 1–2; chỉ câu 1 và 2 cần trả lời trước Phase 3.
