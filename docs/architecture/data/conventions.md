# Quy ước dữ liệu và migration (ADR-DB nháp) — B02

Phiên bản: 0.1 (nháp) • Ngày: 11/10/2026 • Người soạn: P01 • Người cần duyệt: L01 (QT05), các mục có người xác nhận riêng ghi ở cột "Xác nhận"
Trạng thái: **Đề xuất**. Chưa có quyết định nào ở đây được người có thẩm quyền xác nhận. Mọi quy ước dưới đây là phương án kỹ thuật của B02; không đổi quy tắc nghiệp vụ (mục 16, đoạn mở đầu). ADR chính thức do A02 (L01) quyết; nếu khác, quy ước này được cập nhật theo ADR.

Nguồn: mục 3.1–3.3, 4.1–4.2, 9.3, 11.3, 16.3, 16.11, 19.2–19.3 của plan; các quy tắc kiểm thử tự động ở `infra/db/scripts/check_migrations.sh`.

## 1. Quy ước chung

| ID  | Quy ước                                                                                                                                                                                                                                                               | Lý do (plan)                                                                            | Kiểm bằng                    | Xác nhận                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------ |
| D01 | Khóa chính kỹ thuật là UUID (`uuid primary key default gen_random_uuid()`). Mã hiển thị (mã VĐV, mã nội dung, mã trường) là cột riêng, không làm khóa                                                                                                                 | Mục 4.1: "UUID là khóa kỹ thuật đề xuất"; QT08 tách ID kỹ thuật khỏi mã hiển thị        | Test schema                  | L01                                  |
| D02 | Trạng thái dùng `text` + `CHECK (... IN (...))`, không dùng kiểu `ENUM`                                                                                                                                                                                               | Thêm giá trị bằng migration thường (expand), tránh `ALTER TYPE` không lùi được; mục 9.3 | Review; TC14                 | L01                                  |
| D03 | Bảng thuộc kỳ giải có `edition_id uuid not null`. Bảng con tham chiếu cha cùng kỳ bằng **FK ghép** `(edition_id, id)`; cha có `UNIQUE (edition_id, id)`                                                                                                               | QT09: phạm vi kỳ giải; mục 19.3 mọi truy vấn có `edition_id`. DB chặn nối chéo kỳ       | TC09                         | L01, P01                             |
| D04 | Thời gian là `timestamptz` (lưu UTC). Bảng gốc có thể sửa có `version bigint not null default 1` với CHECK từ 1 đến 9007199254740991 và adapter trả số JavaScript an toàn (optimistic concurrency, B04 kiểm) và `created_at`, `updated_at` (trigger `set_updated_at`) | Mục 4.2, 5.2 (version chống ghi đè); lint chặn `timestamp` không múi giờ                | `check_migrations.sh`; TC10  | P02                                  |
| D05 | Mã VĐV lưu `text`, sinh bằng hàm trong transaction (khóa dòng bộ đếm theo kỳ/trường), unique `(edition_id, school_id, seq)` và `(edition_id, athlete_code)`. **Không** dùng cột generated có `lpad` (cắt chữ số khi STT vượt độ rộng). Không tái sử dụng mã khi rút   | Mục 4.1 (01.012 là chuỗi; cấp số trong transaction), QT08                               | TC04–TC08                    | R02, L02 (chiều rộng, thời điểm cấp) |
| D06 | Không dùng `real`, `double precision`, `float`. Cân lưu số nguyên đơn vị 100 g (cột đặt tên có hậu tố `_100g`). Thành tích lưu theo kiểu và độ chính xác từng môn; không làm tròn ở DB (U02)                                                                          | Mục 4.1, QT11                                                                           | `check_migrations.sh`; TC10  | K01                                  |
| D07 | CCCD: chỉ `bytea` đã mã hóa + `key_id` + giá trị tra cứu băm (blind index) ở bảng `private_identity`; mã hóa ở ứng dụng; khóa không nằm trong DB, dump hoặc repo. Ngày sinh nằm cùng bảng này                                                                         | Mục 11.3, QT34, QT35; mục 16.10                                                         | TC15                         | S03                                  |
| D08 | Không xóa cứng bảng nghiệp vụ: FK `ON DELETE RESTRICT`; dùng trạng thái hoặc `archived_at`. Không `ON DELETE CASCADE` trừ ngoại lệ có lý do                                                                                                                           | QT12, QT19; chốt chặn `check_migrations.sh`                                             | Lint; review                 | L02 (U08)                            |
| D09 | Payload kết quả `jsonb` kèm `payload_schema_version` và `result_kind`. Không cột điểm chung cho bản nhập/bản sửa/chính thức                                                                                                                                           | QT19–QT20; mục 5.1 (discriminated schema)                                               | TC13                         | K01                                  |
| D10 | Hai vai trò DB: `migrator` (DDL, chủ DB) và `app_rw` (DML). Ứng dụng không dùng superuser. Mật khẩu lấy từ biến môi trường; không có trong repo                                                                                                                       | QT35; mục 12                                                                            | `pg_local.sh`; review        | O01/B07                              |
| D11 | Tên file migration: `<YYYYMMDDHHMMSS>_<module>_<mô tả>.up.sql` và `.down.sql`; chữ thường; ID là 14 chữ số đầu và phải duy nhất; mỗi `.up` phải có `.down`; mỗi file chạy trong **một transaction**                                                                   | QT36, mục 9.3                                                                           | `check_migrations.sh` (TC16) | L01 (A02), O01 (B01)                 |
| D12 | Phạm vi nghiệm thu B02 là lõi theo A03 và bảng hạ tầng cho B03/B04/B05. Xếp hạng, quyết định thi đấu, tệp, thông báo, lease, đồng bộ, sao lưu là Wave 2 (stage 3.9)                                                                                                   | Mục 4.1, 17.2; tránh đoán luật (U03, U05)                                               | Subplan §2.3                 | L01, L02                             |
| D13 | Một schema (`public`) trong giai đoạn đầu; ranh giới module thể hiện bằng module trong tên migration và chủ sở hữu trong từ điển, không bằng schema riêng                                                                                                             | Mục 3.2 (không gọi chéo repository), đơn giản hóa runner                                | Review                       | L01                                  |

## 2. Đặt tên

- Bảng, cột: `snake_case`, tiếng Anh, **giữ đúng tên thực thể ở mục 4.1** (`edition`, `school`, `athlete`, `registration_revision`, …). Không tự đổi tên trường hoặc ý nghĩa trạng thái (tinh thần QT13).
- Khóa ngoại: `<bảng_đơn>_id` (ví dụ `athlete_id`). Cột cùng kỳ giải luôn là `edition_id`.
- Ràng buộc: `pk_<bảng>`, `fk_<bảng>_<tham_chiếu>`, `uq_<bảng>_<cột>`, `ck_<bảng>_<ý>`; index: `ix_<bảng>_<cột>`.
- Giá trị trạng thái trong DB là tiếng Anh viết thường (`draft`, `registration_open`); nhãn tiếng Việt hiển thị do UI (F01, QT28).
- Module trong tên file: `core`, `edition`, `identity`, `audit`, `catalog`, `athlete`, `competition`, `results`, `ops`.

## 3. Quy tắc migration (mục 9.3, QT36)

1. Không sửa migration đã chạy ở môi trường chung. Sai → migration mới. `migrations.lock` ghi checksum và CI từ chối khi file đã khóa bị đổi.
2. Không chèn migration có ID nhỏ hơn ID lớn nhất đã khóa.
3. Thêm trường/bảng → triển khai mã tương thích → backfill → chuyển đọc → loại trường cũ ở **release sau**. Không `DROP COLUMN/DROP TABLE` trong migration thường. Phá vỡ tương thích gồm `DROP COLUMN/TABLE/SCHEMA`, `TRUNCATE`, `RENAME COLUMN/TO`, `ALTER COLUMN … TYPE`. Ngoại lệ ghi `-- allow-destructive: <lý do>` (có hiệu lực cho **cả file**, nên mỗi file ngoại lệ chỉ nên chứa một thay đổi) và reviewer đọc.
4. Mỗi `.down.sql` đưa schema về đúng trạng thái trước (`cycle_test.sh` so bằng `pg_dump -s`). Migration không thể lùi mà không mất dữ liệu phải nói rõ ở đầu file và dùng khôi phục từ bản dump (xem `migration-guide.md`).
5. Mỗi migration một transaction. Không dùng lệnh cần chạy ngoài transaction (như `CREATE INDEX CONCURRENTLY`) trong runner tạm; nếu cần, tách quy trình riêng và ghi ADR.
6. Migration chỉ chứa DDL và dữ liệu cấu trúc bắt buộc. Dữ liệu mẫu để ở `seed/`. Không bao giờ chứa dữ liệu học sinh thật (QT35).
7. Tương thích PostgreSQL ≥ 15 cho đến khi ADR (A02) chốt phiên bản. Log của snapshot người gửi ghi PostgreSQL16; lượt tiếp nhận không cài/chạy PostgreSQL. Phiên bản thật sẽ được chốt ở bước SQL cuối.

## 4. Dữ liệu nhạy cảm và seed

- CCCD, token, khóa không xuất hiện trong URL, log, thông báo, file test, dump trong repo. `scan_sensitive.sh` quét mẫu 12 chữ số dạng CCCD thật, khóa riêng PEM, secret Google, mật khẩu gán chuỗi dài.
- Dữ liệu giả có CCCD dạng rõ ràng không hợp lệ (bắt đầu `000` hoặc độ dài khác 12) và kỳ giải đánh dấu `[DEV-SEED]`.
- Seed dev chỉ chạy qua `seed_guard`: chỉ chạy khi `APP_ENV` ∈ {`local`,`dev`,`test`,`ci`} (chưa đặt, `production`, `staging` hoặc giá trị lạ đều bị từ chối), từ chối khi tên DB sai mẫu, khi DB ở xa (không phải socket cục bộ), khi đã có kỳ giải không phải `[DEV-SEED]`, và khi không kết nối được (fail closed).

## 5. Việc còn chờ

| Việc                                       | Chờ ai    | Ghi chú                                                   |
| ------------------------------------------ | --------- | --------------------------------------------------------- |
| Duyệt D01–D13                              | L01       | Sau duyệt, đổi "Đề xuất" thành "Đã xác nhận bởi … ngày …" |
| Chiều rộng mã trường/STT; thời điểm cấp mã | L02/R02   | Ảnh hưởng D05 và TC06                                     |
| Cơ chế mã hóa và blind index               | S03       | Ảnh hưởng D07                                             |
| ADR về runner/thư mục                      | L01 (A02) | Ảnh hưởng D11, D13                                        |

## Đối chiếu A03 khi tiếp nhận

Đây là quy ước đề xuất về storage, không thay OpenAPI. Version là số nguyên dương an toàn JavaScript; DB/adapter phải giữ đúng giới hạn, không trả bigint string vào DTO version. Thành tích theo ResultValue là chuỗi thập phân chính xác; numeric/đơn vị nội bộ phải round-trip đúng chuỗi và precision được K01 chốt qua U02. Không dùng float để xét hòa.

Registration current revision và approved revision phải tách; Submission revision đã được official tham chiếu phải bất biến. Xác nhận chỉ exact submission ID/version/base official version, không copy payload pending vào official trước xác nhận. FK/version/rule snapshot cùng edition là đầu vào thiết kế, chưa có schema nghiệp vụ ở bộ mẫu sample_item.

Thông tin folder dùng khóa edition_id/athlete_id và trạng thái deferred ở giai đoạn này. Catalog/tuổi/quota còn U01; thời điểm bắt đầu U04; U08 chưa tự đóng. Độ rộng mã trong A05 là quy ước fixture, không quyết định storage truncation hoặc quota thật. Xem docs/B02/README.md về chốt thực thi và phần chưa kiểm chứng.
