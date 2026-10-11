#!/usr/bin/env bash
# Default: static checks only (CR-004). --with-db is reserved for final integration.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
S="$HERE/../scripts"
SAMPLE="$HERE/fixtures/sample_ok"
OUT=""; WITH_DB=0
while [ $# -gt 0 ]; do
  case "$1" in
    --out) [ $# -ge 2 ] || { echo "--out needs a file" >&2; exit 2; }; OUT="$2"; shift 2 ;;
    --with-db) WITH_DB=1; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done
source "$S/env.sh"
if [ "$WITH_DB" -eq 1 ]; then require_db_execution; fi
LOG="$(mktemp)"; trap 'rm -f "$LOG"' EXIT
fails=0
run() {
  echo "## $1"; shift
  "$@" 2>&1
  local rc=$?
  if [ "$rc" -ne 0 ]; then fails=$((fails+1)); fi
  echo "## kết thúc (exit $rc)"; echo
}
main() {
  echo "# B02 kiểm thử — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  for file in "$S"/*.sh "$HERE"/*.sh; do run "Bash syntax $(basename "$file")" bash -n "$file"; done
  run "TC16 check_migrations (không cần DB)" bash "$HERE/test_check_migrations.sh"
  if [ "$WITH_DB" -eq 1 ]; then
    "$S/pg_local.sh" start || return 1
    run "TC15 seed_guard" bash "$HERE/test_seed_guard.sh"
    run "TC-ENV" bash "$HERE/test_env_guard.sh"
    HKPD_MIGRATIONS_DIR="$SAMPLE" run "TC02 cycle_test (bộ mẫu)" "$S/cycle_test.sh"
    HKPD_MIGRATIONS_DIR="$SAMPLE" run "TC17 recovery_drill (bộ mẫu)" "$S/recovery_drill.sh"
  else
    echo "# SQL/seed/cycle/recovery thật chưa chạy: hoãn theo CR-004."
  fi
  echo "# tổng nhóm lỗi: $fails"
  [ "$fails" -eq 0 ]
}
# Keep counters in this shell; piping main into tee would lose failures in a subshell.
main >"$LOG" 2>&1
rc=$?
if [ -n "$OUT" ]; then
  tee "$OUT" <"$LOG" || exit 1
else
  cat "$LOG" || exit 1
fi
exit "$rc"
