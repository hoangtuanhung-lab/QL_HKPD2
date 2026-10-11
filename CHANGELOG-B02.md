# CHANGELOG B02

## 2026-10-11 (ca 1)

- Chọn B02, viết subplan và trích đoạn plan.
- Stage 1.1, 1.2, 2.1 (nháp), 4.3, 5.3 xong phần độc lập; khung 5.1, 5.2 chạy trên bộ migration mẫu.
- Sửa cycle_test.sh: lọc `\restrict`/`\unrestrict` của pg_dump bản mới.
- Thêm pg_local.sh, db_reset.sh, tests/run_all.sh.
- Chưa có migration thật (chờ A03 và các đặc tả).
- Rà soát ca 1 (docs/B02/review-B02-ca1.md): sửa 5 lỗi (scan tự báo file test, PGHOST không được kiểm, mật khẩu vai trò, lint thiếu RENAME/TYPE/TRUNCATE, chown), thêm TC-ENV và 7 test lint; stage 1.1/1.2/4.3/5.3 chuyển Chờ review.
