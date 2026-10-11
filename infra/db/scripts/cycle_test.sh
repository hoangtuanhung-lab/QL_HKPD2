#!/usr/bin/env bash
# Stage 5.1 / TC02: kiểm vòng up → down → up cho TỪNG migration và cho toàn chuỗi.
# So schema bằng pg_dump --schema-only (bỏ bảng schema_migrations). Thoát != 0 nếu lệch.
# Dùng: HKPD_MIGRATIONS_DIR=... ./cycle_test.sh        (DB tạm: hkpd_ci_cycle)
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
require_db_execution
S="$(dirname "${BASH_SOURCE[0]}")"
export HKPD_DB_NAME="hkpd_ci_cycle"
require_safe_db "$HKPD_DB_NAME"
REAL_DIR="$HKPD_MIGRATIONS_DIR"
W="$(mktemp -d)"; trap 'rm -rf "$W"' EXIT
fails=0; n=0
report() { n=$((n+1)); if [ "$1" = ok ]; then echo "ok $n - $2"; else echo "not ok $n - $2"; fails=$((fails+1)); fi; }

dump() { pg_dump -s --no-owner --no-privileges -T schema_migrations -U "$HKPD_DB_MIGRATOR" -d "$HKPD_DB_NAME" | grep -v '^--' | grep -v '^$' | grep -v '^SET \|^SELECT pg_catalog.set_config' | grep -v '^\\restrict \|^\\unrestrict ' ; }
same() { diff -u "$1" "$2" >"$W/diff.txt" 2>&1; }

shopt -s nullglob
ups=("$REAL_DIR"/*.up.sql)
[ "${#ups[@]}" -gt 0 ] || { echo "Không có migration .up.sql trong $REAL_DIR"; exit 1; }

# Baseline: DB rỗng (không migration)
EMPTY="$W/empty"; mkdir -p "$EMPTY"
HKPD_MIGRATIONS_DIR="$EMPTY" "$S/db_reset.sh" >/dev/null || { echo "không dựng được DB rỗng"; exit 1; }
dump > "$W/empty.sql" || die "không dump được schema"
export HKPD_MIGRATIONS_DIR="$REAL_DIR"

# Từng migration
i=0
for f in "${ups[@]}"; do
  i=$((i+1)); b="$(basename "$f")"
  dump > "$W/before.sql"
  if ! "$S/migrate.sh" up 1 >"$W/log" 2>&1; then report not_ok "up   $b"; cat "$W/log"; continue; fi
  dump > "$W/after.sql"
  if ! "$S/migrate.sh" down 1 >"$W/log" 2>&1; then report not_ok "down $b"; cat "$W/log"; "$S/migrate.sh" up 1 >/dev/null 2>&1; continue; fi
  dump > "$W/back.sql"
  if same "$W/before.sql" "$W/back.sql"; then report ok "down $b đưa schema về đúng trạng thái trước"; else report not_ok "down $b không đưa schema về trạng thái trước"; head -n 30 "$W/diff.txt"; fi
  if ! "$S/migrate.sh" up 1 >"$W/log" 2>&1; then report not_ok "up lại $b"; cat "$W/log"; continue; fi
  dump > "$W/again.sql"
  if same "$W/after.sql" "$W/again.sql"; then report ok "up lại $b cho schema giống lần đầu"; else report not_ok "up lại $b cho schema khác lần đầu"; head -n 30 "$W/diff.txt"; fi
done

# Toàn chuỗi
dump > "$W/all.sql" || die "không dump được schema"
total="${#ups[@]}"
"$S/migrate.sh" down "$total" >"$W/log" 2>&1 || { report not_ok "lùi toàn chuỗi"; cat "$W/log"; }
dump > "$W/zero.sql" || die "không dump được schema"
if same "$W/empty.sql" "$W/zero.sql"; then report ok "lùi toàn chuỗi ($total) về DB rỗng"; else report not_ok "lùi toàn chuỗi không về DB rỗng"; head -n 30 "$W/diff.txt"; fi
"$S/migrate.sh" up all >"$W/log" 2>&1 || { report not_ok "tiến lại toàn chuỗi"; cat "$W/log"; }
dump > "$W/all2.sql" || die "không dump được schema"
if same "$W/all.sql" "$W/all2.sql"; then report ok "tiến lại toàn chuỗi cho schema giống lần đầu"; else report not_ok "tiến lại toàn chuỗi cho schema khác"; head -n 30 "$W/diff.txt"; fi

echo "1..$n"; echo "# tổng: $n, lỗi: $fails"
[ "$fails" -eq 0 ]
