#!/usr/bin/env bash
# Chốt chặn cho seed dữ liệu giả (QT35, mục 11.3). Mặc định TỪ CHỐI (fail closed).
# Dùng trong script seed:   source seed_guard.sh && seed_guard
# Hoặc chạy trực tiếp:      ./seed_guard.sh        (thoát != 0 nếu bị từ chối)
#
# Seed dev chỉ được chạy khi TẤT CẢ đúng:
#  1. APP_ENV được đặt và thuộc {local, dev, test, ci}  (không đặt = từ chối; production/staging = từ chối)
#  2. tên DB khớp ^hkpd_(dev|test|ci)...
#  3. máy chủ DB là unix socket hoặc localhost/127.0.0.1
#  4. nếu đã có bảng edition: mọi kỳ giải phải có tên bắt đầu bằng '[DEV-SEED]' (không có kỳ giải thật)
_SG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$_SG_DIR/env.sh"

seed_guard() {
  local env="${APP_ENV:-}"
  case "$env" in
    local|dev|test|ci) ;;
    "") echo "TỪ CHỐI seed: APP_ENV chưa đặt (mặc định từ chối)." >&2; return 1 ;;
    production|prod|staging|stage|uat) echo "TỪ CHỐI seed: APP_ENV='$env' — seed dev bị cấm ở môi trường này." >&2; return 1 ;;
    *) echo "TỪ CHỐI seed: APP_ENV='$env' không thuộc {local,dev,test,ci}." >&2; return 1 ;;
  esac

  if [[ ! "$HKPD_DB_NAME" =~ ^hkpd_(dev|test|ci)[a-z0-9_]*$ ]]; then
    echo "TỪ CHỐI seed: tên DB '$HKPD_DB_NAME' không khớp mẫu dev/test/ci." >&2; return 1
  fi

  case "$PGHOST" in
    /*|localhost|127.0.0.1|::1) ;;
    *) echo "TỪ CHỐI seed: máy chủ DB '$PGHOST' không phải cục bộ." >&2; return 1 ;;
  esac

  # Kiểm dữ liệu hiện có (nếu bảng edition đã tồn tại).
  # Fail closed: không kết nối được DB thì từ chối (không được coi là "chưa có dữ liệu").
  require_db_execution
  local has_tbl
  if ! has_tbl="$(psql_migrator -At -c "SELECT to_regclass('public.edition') IS NOT NULL" 2>&1)"; then
    echo "TỪ CHỐI seed: không kiểm tra được DB." >&2; return 1
  fi
  case "$has_tbl" in t|f) ;; *) echo "TỪ CHỐI seed: không xác minh được bảng edition." >&2; return 1 ;; esac
  if [ "$has_tbl" = "t" ]; then
    local has_col real
    has_col="$(psql_migrator -At -c "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='edition' AND column_name='name'")" \
      || { echo "TỪ CHỐI seed: không đọc được cấu trúc bảng edition." >&2; return 1; }
    if [ "$has_col" != "1" ]; then
      echo "TỪ CHỐI seed: bảng edition không có cột name nên không xác minh được dữ liệu là giả." >&2; return 1
    fi
    real="$(psql_migrator -At -c "SELECT count(*) FROM edition WHERE name IS NULL OR name NOT LIKE '[DEV-SEED]%'")" \
      || { echo "TỪ CHỐI seed: không đếm được kỳ giải." >&2; return 1; }
    if [ "$real" != "0" ]; then
      echo "TỪ CHỐI seed: có $real kỳ giải không đánh dấu [DEV-SEED]; có thể là dữ liệu thật." >&2; return 1
    fi
  fi
  echo "seed_guard: cho phép seed dữ liệu GIẢ (APP_ENV=$env, DB=$HKPD_DB_NAME)."
  return 0
}

# Chạy trực tiếp
if [ "${BASH_SOURCE[0]}" = "$0" ]; then seed_guard; fi
