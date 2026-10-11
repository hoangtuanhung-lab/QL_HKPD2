#!/usr/bin/env bash
# Cụm PostgreSQL tạm cho dev/test cục bộ. Idempotent. Chỉ nghe unix socket (không mở cổng mạng), auth=trust.
# Dùng: ./pg_local.sh start|stop|status    (start tự khởi tạo cụm nếu chưa có, và tạo vai trò migrator/app_rw)
# Mật khẩu vai trò (nếu cần) lấy từ HKPD_MIGRATOR_PASSWORD / HKPD_APP_RW_PASSWORD, không nằm trong repo (QT35).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
require_db_execution
[ "${APP_ENV:-dev}" = "production" ] && die "pg_local.sh bị cấm khi APP_ENV=production"
DATA="$HKPD_PG_DIR/data"; SOCK="$HKPD_PG_DIR/sock"
as_pg() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
ready() { pg_isready -q -h "$SOCK" -p "$HKPD_PG_PORT"; }

validate_cluster() {
  [[ "$HKPD_PG_DIR" =~ ^/tmp/hkpd-pg([_-][a-zA-Z0-9_-]+)?$ ]] || die "HKPD_PG_DIR phải là /tmp/hkpd-pg hoặc thư mục thử riêng /tmp/hkpd-pg-<suffix>."
  [ "$PGHOST" = "$SOCK" ] && [ "$PGPORT" = "$HKPD_PG_PORT" ] || die "pg_local chỉ quản lý socket/cổng của cụm riêng."
  [[ "$HKPD_PG_PORT" =~ ^[0-9]{1,5}$ ]] && (( 10#$HKPD_PG_PORT >= 1024 && 10#$HKPD_PG_PORT <= 65535 )) || die "cổng PostgreSQL thử không hợp lệ."
  for path in "$HKPD_PG_DIR" "$DATA" "$SOCK" "$HKPD_PG_DIR/pg.log"; do
    [ ! -L "$path" ] || die "không dùng symlink cho cụm thử."
  done
}
set_role_password() {
  local role="$1" value="$2" escaped
  escaped="${value//\'/\'\'}"
  # Keep the value out of process argv and suppress database error text.
  printf "SET standard_conforming_strings=on; ALTER ROLE %s PASSWORD '%s';\n" "$role" "$escaped" |
    psql_admin -d postgres >/dev/null 2>&1 || die "không đặt được mật khẩu vai trò."
}
validate_cluster
start() {
  mkdir -p "$HKPD_PG_DIR" "$SOCK"
  chmod 700 "$HKPD_PG_DIR" "$SOCK"
  if [ "$(id -u)" = 0 ]; then chown postgres:postgres "$HKPD_PG_DIR" "$SOCK"; fi
  [ -f "$DATA/PG_VERSION" ] || as_pg initdb -D "$DATA" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
  if ! ready; then
    as_pg pg_ctl -D "$DATA" -l "$HKPD_PG_DIR/pg.log" -o "-p $HKPD_PG_PORT -k $SOCK -c listen_addresses=''" -w start >/dev/null
  fi
  psql_admin -d postgres <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='$HKPD_DB_MIGRATOR') THEN CREATE ROLE $HKPD_DB_MIGRATOR LOGIN CREATEDB; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='$HKPD_DB_APP_RW')   THEN CREATE ROLE $HKPD_DB_APP_RW LOGIN; END IF;
END \$\$;
SQL
  if [ -n "${HKPD_MIGRATOR_PASSWORD:-}" ]; then set_role_password "$HKPD_DB_MIGRATOR" "$HKPD_MIGRATOR_PASSWORD"; fi
  if [ -n "${HKPD_APP_RW_PASSWORD:-}" ]; then set_role_password "$HKPD_DB_APP_RW" "$HKPD_APP_RW_PASSWORD"; fi
  echo "OK: PostgreSQL sẵn sàng (socket $SOCK, cổng $HKPD_PG_PORT)"
}
case "${1:-status}" in
  start)  start ;;
  stop)   if ready; then as_pg pg_ctl -D "$DATA" -m fast -w stop >/dev/null; fi; echo "OK: đã dừng" ;;
  status) if ready; then echo "chạy"; else echo "không chạy"; exit 1; fi ;;
  *) die "dùng: pg_local.sh start|stop|status" ;;
esac
