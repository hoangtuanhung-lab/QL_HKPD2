#!/usr/bin/env bash
# TC-ENV: chốt chặn môi trường của script phá hủy và vai trò DB (phát hiện khi rà soát B02).
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; source "$HERE/lib.sh"
S="$HERE/../scripts"
"$S/pg_local.sh" start >/dev/null
expect_fail_msg "TC-ENV db_reset từ chối máy chủ DB từ xa" "không phải cục bộ" env PGHOST=db.example.internal HKPD_DB_NAME=hkpd_dev "$S/db_reset.sh"
expect_fail_msg "TC-ENV db_reset từ chối tên DB sai mẫu" "không khớp" env HKPD_DB_NAME=hkpd_staging "$S/db_reset.sh"
expect_fail_msg "TC-ENV db_reset từ chối APP_ENV=production" "production" env APP_ENV=production "$S/db_reset.sh"
expect_fail_msg "TC-ENV pg_local từ chối APP_ENV=production" "production" env APP_ENV=production "$S/pg_local.sh" start
expect_fail_msg "TC-ENV pg_local từ chối thư mục không chứa 'hkpd'" "hkpd" env HKPD_PG_DIR=/tmp/other "$S/pg_local.sh" start
# Mật khẩu vai trò đi qua stdin (psql -c không nội suy biến). Kiểm: đặt xong, thuộc tính rolpassword có giá trị băm SCRAM.
expect_pass "TC-ENV pg_local đặt được mật khẩu vai trò từ biến môi trường" env HKPD_APP_RW_PASSWORD="mk giả 'có nháy'" "$S/pg_local.sh" start
h="$(psql -X -At -h /tmp/hkpd-pg/sock -p 54329 -U postgres -d postgres -c "select left(rolpassword,13) from pg_authid where rolname='app_rw'")"
if [ "$h" = "SCRAM-SHA-256" ]; then ok "TC-ENV mật khẩu app_rw được lưu dạng SCRAM"; else not_ok "TC-ENV mật khẩu app_rw không được đặt (thấy: '$h')"; fi
psql -X -q -h /tmp/hkpd-pg/sock -p 54329 -U postgres -d postgres -c "ALTER ROLE app_rw PASSWORD NULL" >/dev/null
t_summary
