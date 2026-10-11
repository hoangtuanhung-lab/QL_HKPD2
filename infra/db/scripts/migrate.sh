#!/usr/bin/env bash
# Runner migration tối thiểu bằng SQL thuần (tạm thời; thay bằng runner của ADR A02 nếu khác).
# Dùng:
#   ./migrate.sh up [N|all]     áp N migration chưa chạy (mặc định all)
#   ./migrate.sh down [N]       lùi N migration đã chạy gần nhất (mặc định 1)
#   ./migrate.sh status         liệt kê trạng thái
# Biến: HKPD_DB_NAME, HKPD_MIGRATIONS_DIR (xem env.sh).
#
# Quy ước file: <14 chữ số>_<module>_<mô tả>.up.sql và .down.sql  (ID = 14 chữ số đầu).
# Mỗi migration chạy trong MỘT transaction cùng với việc ghi vào schema_migrations.
# Migration cần chạy ngoài transaction (vd CREATE INDEX CONCURRENTLY) KHÔNG được hỗ trợ ở đây.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
require_db_execution

cmd="${1:-status}"
arg="${2:-}"
case "$cmd" in
  up) [[ "${arg:-all}" = all || "${arg:-all}" =~ ^[0-9]{1,6}$ ]] || die "số migration không hợp lệ" ;;
  down) [[ "${arg:-1}" =~ ^[0-9]{1,6}$ ]] || die "số migration không hợp lệ" ;;
  status) [ -z "$arg" ] || die "status không nhận tham số số lượng" ;;
  *) die "lệnh không hợp lệ: $cmd (up|down|status)" ;;
esac
"$DB_DIR/scripts/check_migrations.sh" --dir "$HKPD_MIGRATIONS_DIR" >/dev/null
shopt -s nullglob
up_files=("$HKPD_MIGRATIONS_DIR"/*.up.sql)

ensure_table() {
  psql_migrator -c "CREATE TABLE IF NOT EXISTS schema_migrations (
    id text PRIMARY KEY,
    filename text NOT NULL,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  );"
}

file_id() { basename "$1" | cut -c1-14; }
sha() { sha256sum "$1" | cut -d' ' -f1; }

applied_ids() { psql_migrator -At -c "SELECT id FROM schema_migrations ORDER BY id"; }

case "$cmd" in
  up)
    ensure_table
    limit="${arg:-all}"
    count=0
    latest="$(psql_migrator -At -c "SELECT coalesce(max(id),'') FROM schema_migrations")"
    for f in "${up_files[@]}"; do
      id="$(file_id "$f")"
      cs="$(sha "$f")"
      stored="$(psql_migrator -At -c "SELECT checksum FROM schema_migrations WHERE id='$id'")"
      if [ -n "$stored" ]; then
        [ "$stored" = "$cs" ] || die "migration $id đã chạy nhưng nội dung file đã đổi (QT36: không sửa migration đã chạy)."
        continue
      fi
      if [ -n "$latest" ] && [[ "$id" < "$latest" ]]; then die "migration mới có ID trong quá khứ so với DB đã áp"; fi
      if [ "$limit" != "all" ] && [ "$count" -ge "$limit" ]; then break; fi
      echo "UP   $(basename "$f")"
      psql_migrator --single-transaction -f "$f" \
        -c "INSERT INTO schema_migrations(id, filename, checksum) VALUES ('$id', '$(basename "$f")', '$cs')"
      count=$((count+1))
    done
    echo "Đã áp $count migration." ;;
  down)
    ensure_table
    n="${arg:-1}"
    for id in $(psql_migrator -At -c "SELECT id FROM schema_migrations ORDER BY id DESC LIMIT $n"); do
      [[ "$id" =~ ^[0-9]{14}$ ]] || die "ID migration đã áp không hợp lệ"
      down_files=("$HKPD_MIGRATIONS_DIR"/"$id"_*.down.sql)
      [ "${#down_files[@]}" -eq 1 ] || die "cần đúng một .down.sql cho migration $id"
      down="${down_files[0]}"
      [ -n "$down" ] || die "không có file .down.sql cho migration $id"
      echo "DOWN $(basename "$down")"
      psql_migrator --single-transaction -f "$down" \
        -c "DELETE FROM schema_migrations WHERE id='$id'"
    done ;;
  status)
    ensure_table
    applied="$(applied_ids)"
    for f in "${up_files[@]}"; do
      id="$(file_id "$f")"
      if grep -qx "$id" <<<"$applied"; then s="đã áp"; else s="chưa áp"; fi
      printf '%s  %s\n' "$s" "$(basename "$f")"
    done ;;
  *) die "lệnh không hợp lệ: $cmd (up|down|status)" ;;
esac
