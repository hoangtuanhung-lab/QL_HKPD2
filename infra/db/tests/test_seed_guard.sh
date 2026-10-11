#!/usr/bin/env bash
# TC15: seed_guard từ chối đúng; scan_sensitive phát hiện dữ liệu nhạy cảm.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/lib.sh"
S="$HERE/../scripts"
source "$S/env.sh"
export HKPD_DB_NAME="hkpd_test_guard"
export HKPD_MIGRATIONS_DIR="$HERE/fixtures/sample_ok"
"$S/pg_local.sh" start >/dev/null
"$S/db_reset.sh" >/dev/null

expect_fail_msg "TC15 APP_ENV chưa đặt bị từ chối" "chưa đặt" env -u APP_ENV "$S/seed_guard.sh"
expect_fail_msg "TC15 APP_ENV=production bị từ chối" "cấm" env APP_ENV=production "$S/seed_guard.sh"
expect_fail_msg "TC15 APP_ENV=staging bị từ chối" "cấm" env APP_ENV=staging "$S/seed_guard.sh"
expect_fail_msg "TC15 APP_ENV lạ bị từ chối" "không thuộc" env APP_ENV=foo "$S/seed_guard.sh"
expect_fail_msg "TC15 tên DB production bị từ chối" "không khớp mẫu" env APP_ENV=dev HKPD_DB_NAME=hkpd_production "$S/seed_guard.sh"
expect_fail_msg "TC15 máy chủ DB từ xa bị từ chối" "không phải cục bộ" env APP_ENV=dev PGHOST=db.example.com "$S/seed_guard.sh"
expect_pass "TC15 dev + DB dev + socket cục bộ + chưa có bảng edition: cho phép" env APP_ENV=dev "$S/seed_guard.sh"

psql_migrator -c "CREATE TABLE edition (name text)"
expect_pass "TC15 bảng edition rỗng: cho phép" env APP_ENV=test "$S/seed_guard.sh"
psql_migrator -c "INSERT INTO edition VALUES ('[DEV-SEED] Giải mẫu')"
expect_pass "TC15 chỉ có kỳ giải [DEV-SEED]: cho phép" env APP_ENV=test "$S/seed_guard.sh"
psql_migrator -c "INSERT INTO edition VALUES ('Hội khỏe Phù Đổng 2026')"
expect_fail_msg "TC15 có kỳ giải không đánh dấu giả bị từ chối" "không đánh dấu" env APP_ENV=test "$S/seed_guard.sh"
psql_migrator -c "DROP TABLE edition; CREATE TABLE edition (title text)"
expect_fail_msg "TC15 edition không có cột name bị từ chối" "không xác minh" env APP_ENV=test "$S/seed_guard.sh"

expect_fail_msg "TC15 không kết nối được DB: từ chối (fail closed)" "không kiểm tra được DB" env APP_ENV=test PGPORT=1 "$S/seed_guard.sh"

# scan_sensitive
W="$(mktemp -d)"; trap 'rm -rf "$W"' EXIT
echo "cccd giả: 000123456789" > "$W/ok1.sql"
echo "mã 20260101000001 và 1234567890123 không phải 12 số" > "$W/ok2.txt"
expect_pass "TC15 CCCD giả bắt đầu 000 và số dài khác 12 chữ số: không báo" "$S/scan_sensitive.sh" "$W"
echo "cccd: 079""123456789" > "$W/bad1.sql"   # nối chuỗi lúc chạy để mã nguồn không chứa mẫu nhạy cảm
expect_fail_msg "TC15 12 chữ số dạng CCCD thật bị phát hiện" "12 chữ số" "$S/scan_sensitive.sh" "$W"
rm "$W/bad1.sql"
echo "x 079123456789 -- scan-allow: ví dụ tài liệu" > "$W/allow.md"
expect_pass "TC15 scan-allow có chủ ý được bỏ qua" "$S/scan_sensitive.sh" "$W"
rm "$W/allow.md"
printf -- '-----BEGIN %s-----\n' "PRIVATE KEY" > "$W/key.pem"
expect_fail_msg "TC15 khóa riêng PEM bị phát hiện" "khóa riêng" "$S/scan_sensitive.sh" "$W"
rm "$W/key.pem"
printf "client_%s = '%s%s'\n" secret GOC SPX-abcdefghij12345 > "$W/cfg.env"
expect_fail_msg "TC15 secret Google bị phát hiện" "Google" "$S/scan_sensitive.sh" "$W"
rm "$W/cfg.env"
printf '%s: "%s"\n' pass""word super""secret123 > "$W/cfg.yml"
expect_fail_msg "TC15 gán password bằng chuỗi dài bị phát hiện" "secret/password" "$S/scan_sensitive.sh" "$W"
# Không in lại giá trị nhạy cảm vào log
"$S/scan_sensitive.sh" "$W" >"$W/scan.out" 2>&1 || true
if grep -q 'super''secret123' "$W/scan.out"; then not_ok "TC15 log không được in lại giá trị nhạy cảm"; else ok "TC15 log không in lại giá trị nhạy cảm"; fi

psql_admin -d postgres -c "DROP DATABASE IF EXISTS hkpd_test_guard WITH (FORCE)" >/dev/null
t_summary
