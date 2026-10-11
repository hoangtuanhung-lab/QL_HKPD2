#!/usr/bin/env bash
# Stage 5.2 / TC17: diễn tập recovery. Trả lời hai câu hỏi:
#  A. Migration lỗi giữa chừng có để lại dấu vết không?       (kỳ vọng: không — mỗi migration chạy trong 1 transaction)
#  B. Migration "thành công nhưng phá dữ liệu" khôi phục được từ bản dump trước migration không? (kỳ vọng: khớp 100%)
# Dùng: HKPD_MIGRATIONS_DIR=... ./recovery_drill.sh [--seed FILE.sql] [--faulty-up FILE --faulty-down FILE] [--destructive FILE.sql] [--out FILE.md]
# Mặc định dùng bộ mẫu trong tests/fixtures/drill. Với migration thật: truyền --seed (seed dev) và file lỗi/phá hủy phù hợp.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
require_db_execution
S="$(dirname "${BASH_SOURCE[0]}")"
F="$DB_DIR/tests/fixtures/drill"
SEED="$F/seed.sql"; DESTR="$F/destructive.sql"; FUP="$F/faulty.up.sql"; FDOWN="$F/faulty.down.sql"; OUT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --seed) SEED="$2"; shift 2 ;; --destructive) DESTR="$2"; shift 2 ;;
    --faulty-up) FUP="$2"; shift 2 ;; --faulty-down) FDOWN="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;; *) die "tham số không hợp lệ: $1" ;;
  esac
done
export HKPD_DB_NAME="hkpd_ci_drill"; RESTORED="hkpd_ci_drill_restored"
require_safe_db "$HKPD_DB_NAME"; require_safe_db "$RESTORED"
W="$(mktemp -d)"; trap 'rm -rf "$W"' EXIT
fails=0; n=0; LOG="$W/report.txt"
say() { echo "$*" | tee -a "$LOG"; }
check() { n=$((n+1)); if [ "$1" = ok ]; then say "ok $n - $2"; else say "not ok $n - $2"; fails=$((fails+1)); fi; }

# Vân tay dữ liệu: số dòng + md5 nội dung từng bảng + nội dung schema_migrations (trừ thời gian áp).
fingerprint() {
  local db="$1" t tables
  tables="$(psql -X -q -At -U "$HKPD_DB_MIGRATOR" -d "$db" -v ON_ERROR_STOP=1 -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'schema_migrations' ORDER BY 1")" || return 1
  for t in $tables; do
    [[ "$t" =~ ^[a-z_][a-z0-9_]*$ ]] || return 1
    psql -X -q -At -U "$HKPD_DB_MIGRATOR" -d "$db" -c "SELECT '$t', count(*), md5(coalesce(string_agg(x::text,'|' ORDER BY x::text),'')) FROM public.\"$t\" x" || return 1
  done
  psql -X -q -At -U "$HKPD_DB_MIGRATOR" -d "$db" -c "SELECT 'schema_migrations', count(*), md5(coalesce(string_agg(id||filename||checksum,'|' ORDER BY id),'')) FROM schema_migrations"
}

say "# Diễn tập recovery — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
say "Migration: $HKPD_MIGRATIONS_DIR"
"$S/db_reset.sh" >/dev/null 2>&1 || { say "không dựng được DB"; exit 1; }
psql_migrator -f "$SEED" >/dev/null || { say "seed lỗi"; exit 1; }
fingerprint "$HKPD_DB_NAME" > "$W/fp_before.txt" || die "không đọc được vân tay DB"
say "Vân tay trước (bảng | số dòng | md5):"; sed 's/^/    /' "$W/fp_before.txt" | tee -a "$LOG" >/dev/null

# Bản dump trước migration
pg_dump -Fc -U "$HKPD_DB_MIGRATOR" -d "$HKPD_DB_NAME" -f "$W/before.dump" || { say "pg_dump lỗi"; exit 1; }
DUMP_SHA="$(sha256sum "$W/before.dump" | cut -d' ' -f1)"
say "Dump trước migration: sha256=$DUMP_SHA"

# A. Migration lỗi giữa chừng
mkdir -p "$W/mig"; cp "$HKPD_MIGRATIONS_DIR"/* "$W/mig/"
cp "$FUP" "$W/mig/29990101000000_drill_faulty.up.sql"; cp "$FDOWN" "$W/mig/29990101000000_drill_faulty.down.sql"
if HKPD_MIGRATIONS_DIR="$W/mig" "$S/migrate.sh" up all >"$W/faulty.log" 2>&1; then
  check not_ok "A. migration lỗi đáng lẽ phải thất bại"
else
  check ok "A. migration lỗi giữa chừng bị từ chối (exit != 0)"
fi
fingerprint "$HKPD_DB_NAME" > "$W/fp_a.txt" || die "không đọc được vân tay DB"
if diff -q "$W/fp_before.txt" "$W/fp_a.txt" >/dev/null; then check ok "A. sau migration lỗi, dữ liệu và schema_migrations không đổi (transaction đã hoàn tác)"; else check not_ok "A. migration lỗi để lại dấu vết"; diff "$W/fp_before.txt" "$W/fp_a.txt" | tee -a "$LOG"; fi

# B. Migration thành công nhưng phá dữ liệu → restore
psql_migrator -f "$DESTR" >/dev/null 2>&1 || { say "destructive.sql lỗi"; exit 1; }
fingerprint "$HKPD_DB_NAME" > "$W/fp_broken.txt" || die "không đọc được vân tay DB"
if diff -q "$W/fp_before.txt" "$W/fp_broken.txt" >/dev/null; then check not_ok "B. bước phá dữ liệu không làm đổi dữ liệu (diễn tập vô nghĩa)"; else check ok "B. dữ liệu đã bị phá (xác nhận bối cảnh diễn tập)"; fi

psql_admin -d postgres -c "DROP DATABASE IF EXISTS \"$RESTORED\" WITH (FORCE)" || die "thao tác DB diễn tập thất bại"
psql_admin -d postgres -c "CREATE DATABASE \"$RESTORED\" OWNER $HKPD_DB_MIGRATOR TEMPLATE template0 LC_COLLATE 'C.UTF-8' LC_CTYPE 'C.UTF-8'" || die "thao tác DB diễn tập thất bại"
if pg_restore -U "$HKPD_DB_MIGRATOR" -d "$RESTORED" --no-owner --exit-on-error "$W/before.dump" >"$W/restore.log" 2>&1; then
  check ok "B. pg_restore thành công vào DB mới"
else
  check not_ok "B. pg_restore thất bại"; tail -n 10 "$W/restore.log" | tee -a "$LOG"
fi
fingerprint "$RESTORED" > "$W/fp_restored.txt" || die "không đọc được vân tay DB"
if diff -q "$W/fp_before.txt" "$W/fp_restored.txt" >/dev/null; then check ok "B. sau restore: số dòng và md5 từng bảng khớp bản trước migration"; else check not_ok "B. sau restore dữ liệu không khớp"; diff "$W/fp_before.txt" "$W/fp_restored.txt" | tee -a "$LOG"; fi
if [ "$(sha256sum "$W/before.dump" | cut -d' ' -f1)" = "$DUMP_SHA" ]; then check ok "B. file dump không đổi (checksum khớp)"; else check not_ok "B. checksum dump đổi"; fi

psql_admin -d postgres -c "DROP DATABASE IF EXISTS \"$RESTORED\" WITH (FORCE)" >/dev/null || die "thao tác DB diễn tập thất bại"
psql_admin -d postgres -c "DROP DATABASE IF EXISTS \"$HKPD_DB_NAME\" WITH (FORCE)" >/dev/null || die "thao tác DB diễn tập thất bại"
say "1..$n"; say "# tổng: $n, lỗi: $fails"
[ -n "$OUT" ] && { mkdir -p "$(dirname "$OUT")"; { echo '```'; cat "$LOG"; echo '```'; } > "$OUT"; }
[ "$fails" -eq 0 ]
