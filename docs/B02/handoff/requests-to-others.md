# B02 — Yêu cầu sản phẩm đầu vào gửi các bên (stage 1.1)

Người gửi: P01 (chủ trì B02) • Ngày: 11/10/2026 • Người điều phối phụ thuộc liên nhóm: L02 (xử lý chậm), L01 (sai hợp đồng/kỹ thuật)

Nguyên tắc: gửi kèm **ID công việc nguồn, phiên bản, link, test/ví dụ, hạn chế còn mở**. Gửi link chưa phải nghiệm thu; người nhận (P01) kiểm và trả lời "Đã nhận đủ" hoặc "Chưa đủ + lý do" (mục 18.2).

Nếu bạn chưa thể cung cấp đủ, vui lòng gửi **phần có thể cung cấp ngay**, kể cả bản nháp có đánh dấu. P01 sẽ ghi rõ là giả định, không coi là chốt.

## L01 (A03, A02, reviewer)

1. **A03**: DTO và schema lõi v1 cho VĐV, kỳ giải, nội dung, đăng ký, trận, submission/version (id, mã hiển thị, `edition_id`, `event_id`, version, nhãn nhóm). P01 sẽ soạn phần dữ liệu ở stage 2.2 và gửi L01 duyệt; nếu L01 đã có bản, gửi trước để P01 không làm trùng.
2. **A02**: ADR về PostgreSQL (phiên bản), công cụ chạy migration/ORM, thư mục đặt migration và tên file, quy ước schema. Nếu chưa chốt, P01 giữ SQL thuần theo `<14 số>_<module>_<mô tả>.up|down.sql`; xin xác nhận đề xuất D11.
3. Duyệt `docs/architecture/data/conventions.md` (D01–D12). Xác nhận D12: B02 giao lõi + hạ tầng; Wave 2 làm bằng migration cộng thêm.
4. Nhận làm reviewer migration/schema (QT05, QT37) hoặc chỉ định người khác.

## L02 (A01, đặc tả)

1. Vòng đời trạng thái kỳ giải sau `Nháp → Mở đăng ký` (mục 19.3), chiều rộng mã trường và STT của mã VĐV (ví dụ `01.012`), thời điểm cấp mã (khi tạo hồ sơ hay khi duyệt).
2. Quyết định cho U04 (nghĩa của "đã bắt đầu"), U08 (xóa nội dung chưa có đăng ký, đổi checklist khi giải chạy).
3. Gán tên reviewer (IN-19) và xác nhận D12.

## O01 (B01, B07)

1. Link repo monorepo, thư mục chủ định cho migration, CODEOWNERS, lệnh test, CI (có PostgreSQL service không).
2. Tên biến môi trường và vai trò DB cho dev/staging (B07). P01 đang dùng tạm: `APP_ENV`, `HKPD_DB_NAME`, vai trò `migrator` và `app_rw`.
3. Sau khi B01 sẵn sàng, P01 gửi `check_migrations.sh` và hướng dẫn cắm CI (`docs/B02/ci-hook.md`); O01 giữ quyền sửa pipeline.

## S01, S02, S03

1. **S01/S02**: vai trò theo môn/trường, trạng thái tài khoản (`pending/approved/blocked`?), checklist theo nội dung, mô tả `referee_assignment`, quy tắc cùng trường (ma trận phân quyền ở `docs/business/permissions`).
2. **S03**: cơ chế mã hóa CCCD (thuật toán, `key_id`, cách tra cứu trùng cùng trường, ví dụ blind index), thông tin tệp/Drive cần lưu.

## R01, R02, R03

1. **R01**: cấu trúc danh mục (hai danh mục, kế thừa, hạn mức, ngừng tổ chức), nội dung `event_snapshot`, danh sách trường được phép clone (QT12).
2. **R02**: trường học sinh/VĐV, quy tắc cấp mã, khóa nhận diện hồ sơ trùng.
3. **R03**: trường đăng ký/đội/thành viên/revision, dạng hạn mức/đếm theo trường và nội dung. Cần xác nhận P01 có tạo bảng đếm tranh suất không.

## C01, C02, C03, K01

1. **C01–C03**: trường `draw`, `draw_version`, `round`, `bracket_node`, `match`, `schedule_revision`; cách biểu diễn "ảo", khóa sơ đồ, nghĩa `started_at` (U04).
2. **K01**: trường submission/official/confirmation/revision, schema payload theo môn, `operation_id`, `base_version`.

## P02, P03

1. **P02**: hình dạng `idempotency_key`, ngữ nghĩa `version`, mức cách ly giao dịch, ánh xạ SQLSTATE → lỗi API.
2. **P03**: cột `audit_event`, `outbox_event`, `job_run`, `notification`; hợp đồng sự kiện (event id, loại, aggregate id/version, actor, `occurred_at`, payload version); cách khử trùng.

## Q01, Q02, Q03 (A05) và O02

1. **Q**: fixtures 7 trường, 500 VĐV giả, gồm liên cấp, trùng mã, 3–5 và 6+ VĐV.
2. **O02**: định dạng export/backup mong muốn, bảng `backup_manifest`, kỳ vọng restore. P01 đang dùng `pg_dump -Fc` / `pg_restore`.

## K02, K03, K04 (Wave 2, chưa gấp)

Đặc tả bảng participation/restoration/weight/ranking/award/penalty/publication khi sẵn sàng, để P01 mở stage 3.9.
