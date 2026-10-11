# Hướng dẫn migration và dựng DB cục bộ — B02

Phiên bản: 0.1 • 11/10/2026 • Chủ: P01. Runner trong `infra/db/scripts` là **tạm thời**; thay bằng runner của ADR A02 nếu khác (SQL thuần vẫn dùng lại được).

## 1. Dựng môi trường cục bộ — chỉ ở bước SQL cuối

```bash
export HKPD_ENABLE_DEFERRED_DB=1
export APP_ENV=test
cd infra/db/scripts
./pg_local.sh start            # khởi tạo (lần đầu) và chạy PostgreSQL tạm, chỉ socket, auth=trust
./db_reset.sh                  # xóa → tạo DB hkpd_dev → áp toàn bộ migration
./migrate.sh status            # đã áp / chưa áp
./migrate.sh up [N|all]        # áp N migration chưa chạy
./migrate.sh down [N]          # lùi N migration gần nhất
./pg_local.sh stop
```

Biến môi trường (xem `env.sh`): `HKPD_DB_NAME` (mặc định `hkpd_dev`; bắt buộc khớp `^hkpd_(dev|test|ci)…`), `HKPD_MIGRATIONS_DIR`, `HKPD_PG_DIR` (mặc định `/tmp/hkpd-pg`), `APP_ENV`. Mọi script phá hủy (`db_reset.sh`, `cycle_test.sh`, `recovery_drill.sh`) từ chối khi `APP_ENV=production`, tên DB sai mẫu, hoặc `PGHOST` không phải máy chủ cục bộ.

Lưu ý: cụm PostgreSQL ở `/tmp` mất khi môi trường làm việc bị thu hồi. Chạy lại `pg_local.sh start` là đủ; script idempotent.

## 2. Thêm migration mới

1. Tạo cặp file `infra/db/migrations/<YYYYMMDDHHMMSS>_<module>_<mô tả>.up.sql` và `.down.sql`.
2. Quy tắc ở `docs/architecture/data/conventions.md` §3: một transaction, `timestamptz`, không float, không `ON DELETE CASCADE`, không `DROP` (trừ `-- allow-destructive: <lý do>`).
3. Chạy kiểm: `./check_migrations.sh` và `../tests/run_all.sh` mặc định không cần DB. Chỉ dùng `--with-db` ở bước cuối khi đã chuẩn bị DB riêng và bật gate.
4. Khi migration được bàn giao (có tag), khóa: `./check_migrations.sh --update-lock`. Sau đó **không sửa** file; cần sửa thì tạo migration mới.

## 3. Rollback và recovery

| Tình huống                                                   | Cách xử lý                                                                                                                                                                                      |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration lỗi giữa chừng                                     | Mỗi file chạy trong một transaction cùng bản ghi `schema_migrations`, nên lỗi tự hoàn tác. Sửa file (nếu chưa bàn giao) hoặc tạo migration mới, rồi chạy lại. `recovery_drill.sh` kiểm điều này |
| Migration chạy được nhưng sai, chưa có dữ liệu thật          | `./migrate.sh down N` rồi sửa. `cycle_test.sh` đảm bảo `down` đưa schema về đúng trạng thái trước                                                                                               |
| Migration chạy được, **phá dữ liệu** hoặc không lùi lossless | Khôi phục từ bản dump **trước** migration: `pg_dump -Fc` trước khi áp; `pg_restore --no-owner --exit-on-error` vào DB mới; so số dòng và md5 từng bảng (`recovery_drill.sh` là bản mẫu)         |
| Trên môi trường chung có dữ liệu thật                        | Luôn tạo bản dump trước khi áp migration; chỉ O02 (I04) và quản trị khôi phục; quy trình đầy đủ ở runbook backup/restore (mục 12 plan)                                                          |

Snapshot người gửi ghi kết quả `recovery_drill.sh` trên **bộ migration mẫu**; lượt tiếp nhận không tái chạy SQL nên chưa xác minh lại bằng chứng này. Phải chạy lại với migration thật sau Phase 3 và với seed dev thật.

## 4. Kiểm thử hạ tầng hiện có

`infra/db/tests/run_all.sh [--out FILE]` mặc định chỉ kiểm cú pháp Bash và TC16; lỗi nhóm test trả exit khác0 kể cả khi ghi log. `npm test` chạy các ca mocked B02, không có DB thật.

`--with-db` dành bước cuối: yêu cầu gate và APP_ENV local/dev/test/ci, rồi mới chạy TC15/TC-ENV/TC02/TC17. Logs trong docs/B02/evidence là nguồn của người gửi, chưa tái kiểm ở lượt tiếp nhận. Xem docs/B02/review-integration.md.

## 5. CI hiện hành và bước cuối

`check_migrations.sh` không cần DB, chạy được ở bước lint. `cycle_test.sh` và `recovery_drill.sh` cần PostgreSQL (service container). Hiện npm run check đã gọi db:check (static-only); chưa thêm SQL service. Hướng dẫn ở `docs/B02/ci-hook.md`. O01 giữ quyền sửa pipeline.
