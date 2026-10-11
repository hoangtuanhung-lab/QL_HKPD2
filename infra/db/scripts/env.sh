#!/usr/bin/env bash
# Biến môi trường dùng chung cho script DB. CHỈ DÙNG CHO DEV/TEST CỤC BỘ.
# Được `source` bởi các script khác; không chạy trực tiếp.
#
# Ghi đè bằng biến môi trường trước khi chạy, ví dụ:
#   HKPD_DB_NAME=hkpd_test ./db_reset.sh

DB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export DB_DIR

# Cụm PostgreSQL tạm (pg_local.sh). Chỉ nghe unix socket, không mở cổng mạng.
export HKPD_PG_DIR="${HKPD_PG_DIR:-/tmp/hkpd-pg}"
export HKPD_PG_PORT="${HKPD_PG_PORT:-54329}"
export PGHOST="${PGHOST:-$HKPD_PG_DIR/sock}"
export PGPORT="${PGPORT:-$HKPD_PG_PORT}"
export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"

# Tên DB phải khớp mẫu hkpd_(dev|test|ci)* thì script phá hủy mới chạy (xem require_safe_db).
export HKPD_DB_NAME="${HKPD_DB_NAME:-hkpd_dev}"
export HKPD_MIGRATIONS_DIR="${HKPD_MIGRATIONS_DIR:-$DB_DIR/migrations}"

# Vai trò DB (D10): migrator làm DDL; app_rw chỉ DML. Không dùng superuser cho ứng dụng.
export HKPD_DB_MIGRATOR="${HKPD_DB_MIGRATOR:-migrator}"
export HKPD_DB_APP_RW="${HKPD_DB_APP_RW:-app_rw}"

# Tìm thư mục bin của PostgreSQL (bản mới nhất nếu có nhiều bản).
if ! command -v initdb >/dev/null 2>&1; then
  _pgbin="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -n1 || true)"
  if [ -n "$_pgbin" ]; then export PATH="$_pgbin:$PATH"; fi
fi

die() { echo "LỖI: $*" >&2; exit 1; }

# CR-004: only explicit local/test activation in the final integration stage.
# Static validation does not call this function and needs no SQL installation.
require_db_execution() {
  [ "${HKPD_ENABLE_DEFERRED_DB:-}" = 1 ] || die "SQL đang hoãn theo CR-004; chưa bật HKPD_ENABLE_DEFERRED_DB=1."
  case "${APP_ENV:-}" in
    local|dev|test|ci) ;;
    *) die "APP_ENV phải là local/dev/test/ci; từ chối SQL khi chưa đặt hoặc ở staging/production." ;;
  esac
  for identifier in "$HKPD_DB_MIGRATOR" "$HKPD_DB_APP_RW"; do
    [[ "$identifier" =~ ^[a-z_][a-z0-9_]{0,62}$ ]] || die "tên vai trò DB không hợp lệ."
  done
  require_safe_db "$HKPD_DB_NAME"
}

# Từ chối chạy lệnh phá hủy trên DB không phải dev/test/ci.
require_safe_db() {
  local name="${1:-$HKPD_DB_NAME}"
  if [[ ! "$name" =~ ^hkpd_(dev|test|ci)[a-z0-9_]*$ ]]; then
    die "tên DB '$name' không khớp ^hkpd_(dev|test|ci)[a-z0-9_]*$ — từ chối thao tác phá hủy."
  fi
  [ -z "${PGHOSTADDR:-}" ] && [ -z "${PGSERVICE:-}" ] || die "không cho phép PGHOSTADDR/PGSERVICE ghi đè máy chủ DB."
  # Chỉ máy chủ cục bộ (socket hoặc localhost): tránh xóa nhầm DB trùng tên trên máy chủ dùng chung nếu PGHOST bị đặt sẵn.
  case "$PGHOST" in
    /*|localhost|127.0.0.1|::1) ;;
    *) die "máy chủ DB '$PGHOST' không phải cục bộ — từ chối thao tác phá hủy." ;;
  esac
}

# psql dưới quyền superuser cục bộ (chỉ để tạo/xóa DB và vai trò).
psql_admin() { require_db_execution; psql -X -q -U postgres -v ON_ERROR_STOP=1 "$@"; }

# psql dưới quyền migrator trên DB đích.
psql_migrator() {
  require_db_execution
  require_safe_db "${DB_OVERRIDE:-$HKPD_DB_NAME}"
  psql -X -q -U "$HKPD_DB_MIGRATOR" -d "${DB_OVERRIDE:-$HKPD_DB_NAME}" -v ON_ERROR_STOP=1 "$@"
}
