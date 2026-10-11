#!/usr/bin/env bash
# Chốt chặn migration (QT36, mục 9.3 plan). Không cần DB. Thoát != 0 nếu vi phạm.
# Dùng:
#   ./check_migrations.sh [--dir DIR] [--lock FILE]              kiểm tra
#   ./check_migrations.sh [--dir DIR] [--lock FILE] --update-lock   thêm migration MỚI vào lock
#   ./check_migrations.sh ... --update-lock --force-relock          ghi đè lock cho file đã khóa
#                                                                  (CHỈ khi chưa bàn giao, ghi lý do ở ghi chú stage)
#
# Kiểm:
#  (a) tên file đúng <14 số>_<module>_<mô tả>.(up|down).sql; ID (14 số) duy nhất trong các .up
#  (b) mỗi .up có .down và ngược lại
#  (c) file đã khóa trong migrations.lock không bị đổi nội dung / không bị xóa (không sửa migration đã chạy)
#  (d) migration chưa khóa không được có ID nhỏ hơn ID lớn nhất đã khóa (không chèn vào quá khứ)
#  (e) lint file .up: không float/real/double precision; không timestamp không múi giờ;
#      không DROP COLUMN/TABLE/SCHEMA, TRUNCATE, RENAME COLUMN/TO, ALTER COLUMN TYPE (phá vỡ tương thích, mục 9.3); không ON DELETE CASCADE.
#      Ngoại lệ có chủ ý: thêm dòng `-- allow-destructive: <lý do>` hoặc `-- allow-cascade: <lý do>`
#      trong file (lý do bắt buộc, reviewer sẽ đọc).
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
for tool in perl sha256sum grep sort uniq cut basename mktemp; do
  command -v "$tool" >/dev/null 2>&1 || die "thiếu công cụ kiểm tĩnh: $tool"
done

DIR="$HKPD_MIGRATIONS_DIR"
LOCK=""
UPDATE=0
FORCE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dir) [ $# -ge 2 ] || die "--dir thiếu giá trị"; DIR="$2"; shift 2 ;;
    --lock) [ $# -ge 2 ] || die "--lock thiếu giá trị"; LOCK="$2"; shift 2 ;;
    --update-lock) UPDATE=1; shift ;;
    --force-relock) FORCE=1; shift ;;
    *) die "tham số không hợp lệ: $1" ;;
  esac
done
[ -d "$DIR" ] || die "không có thư mục migration: $DIR"
[ "$FORCE" -eq 0 ] || [ "$UPDATE" -eq 1 ] || die "--force-relock cần --update-lock"
LOCK="${LOCK:-$DIR/../migrations.lock}"
# Chuẩn hóa đường dẫn lock nếu thư mục cha tồn tại.
[ -d "$(dirname "$LOCK")" ] && LOCK="$(cd "$(dirname "$LOCK")" && pwd)/$(basename "$LOCK")"

errors=0
fail() { echo "VI PHẠM: $*" >&2; errors=$((errors+1)); }
sha() { sha256sum "$1" | cut -d' ' -f1; }

shopt -s nullglob
ups=("$DIR"/*.up.sql)
downs=("$DIR"/*.down.sql)
all=("${ups[@]}" "${downs[@]}")

# (a) tên file
name_re='^[0-9]{14}_[a-z0-9]+_[a-z0-9_]+\.(up|down)\.sql$'
for f in "${all[@]}"; do
  b="$(basename "$f")"
  [[ "$b" =~ $name_re ]] || fail "tên file sai định dạng: $b (cần <14 số>_<module>_<mô tả>.up|down.sql, chữ thường)"
done
# ID duy nhất trong các .up
dups="$(for f in "${ups[@]}"; do basename "$f" | cut -c1-14; done | sort | uniq -d)"
for d in $dups; do fail "ID migration trùng: $d"; done

# (b) cặp up/down
for f in "${ups[@]}"; do
  [ -f "${f%.up.sql}.down.sql" ] || fail "thiếu .down.sql cho $(basename "$f")"
done
for f in "${downs[@]}"; do
  [ -f "${f%.down.sql}.up.sql" ] || fail "có .down.sql nhưng thiếu .up.sql: $(basename "$f")"
done

# (c)(d) lock
declare -A locked
max_locked=""
if [ -f "$LOCK" ]; then
  while read -r hash name; do
    [ -z "${hash:-}" ] && continue
    [[ "$hash" == \#* ]] && continue
    [[ "$hash" =~ ^[0-9a-f]{64}$ && "$name" =~ $name_re ]] || { fail "dòng lock không hợp lệ"; continue; }
    [ -z "${locked[$name]:-}" ] || { fail "file bị lặp trong lock: $name"; continue; }
    locked["$name"]="$hash"
    id="${name:0:14}"
    if [ -z "$max_locked" ] || [[ "$id" > "$max_locked" ]]; then max_locked="$id"; fi
    if [ ! -f "$DIR/$name" ]; then
      fail "file đã khóa bị xóa: $name"
    elif [ "$(sha "$DIR/$name")" != "$hash" ]; then
      if [ "$UPDATE" -eq 1 ] && [ "$FORCE" -eq 1 ]; then :; else
        fail "file đã khóa bị sửa nội dung: $name (QT36: không sửa migration đã chạy; tạo migration mới)"
      fi
    fi
  done < "$LOCK"
fi
for f in "${all[@]}"; do
  b="$(basename "$f")"
  if [ -z "${locked[$b]:-}" ] && [ -n "$max_locked" ]; then
    id="${b:0:14}"
    if [[ "$id" < "$max_locked" ]]; then
      fail "migration mới $b có ID nhỏ hơn ID đã khóa lớn nhất ($max_locked): không chèn vào quá khứ"
    fi
  fi
done

# (e) lint file .up (bỏ chú thích -- và /* */ trước khi so khớp)
strip_comments() { perl -0777 -pe 's{/\*.*?\*/}{ }gs; s{--[^\n]*}{}g' "$1"; }
lint_file() {
  local f="$1" b txt raw
  b="$(basename "$f")"
  raw="$(cat "$f")"
  txt="$(strip_comments "$f")" || { fail "$b: không đọc/strip được SQL"; return; }
  if grep -Piq '\b(real|double\s+precision|float[48]?)\b' <<<"$txt"; then
    fail "$b: dùng kiểu float/real/double precision (QT11)"
  fi
  if grep -Piq '\btimestamp\b(?!\s+with\s+time\s+zone)' <<<"$txt"; then
    fail "$b: dùng timestamp không múi giờ; dùng timestamptz (D04)"
  fi
  if grep -Piq '\b(drop\s+(column|table|schema)|truncate\b|rename\s+(column|to)\b|alter\s+column\s+\S+\s+(set\s+data\s+)?type)\b' <<<"$txt"; then
    if ! grep -Piq '^\s*--\s*allow-destructive:\s*\S+' <<<"$raw"; then
      fail "$b: DROP COLUMN/TABLE/SCHEMA, TRUNCATE, RENAME hoặc đổi kiểu cột trong .up (mục 9.3: expand → backfill → chuyển đọc → loại ở release sau). Nếu có chủ ý, thêm '-- allow-destructive: <lý do>'"
    fi
  fi
  if grep -Piq '\bon\s+delete\s+cascade\b' <<<"$txt"; then
    if ! grep -Piq '^\s*--\s*allow-cascade:\s*\S+' <<<"$raw"; then
      fail "$b: ON DELETE CASCADE (D08: không xóa cứng dữ liệu nghiệp vụ). Nếu có chủ ý, thêm '-- allow-cascade: <lý do>'"
    fi
  fi
}
for f in "${ups[@]}"; do lint_file "$f"; done

# Cập nhật lock (chỉ khi không có vi phạm khác)
if [ "$UPDATE" -eq 1 ]; then
  if [ "$errors" -ne 0 ]; then
    echo "Không cập nhật lock vì còn $errors vi phạm." >&2
    exit 1
  fi
  tmp="$(mktemp)"
  echo "# migrations.lock — sha256 từng file migration đã khóa. Không sửa tay; dùng check_migrations.sh --update-lock." > "$tmp"
  for f in "${all[@]}"; do
    b="$(basename "$f")"
    if [ -n "${locked[$b]:-}" ] && [ "$FORCE" -ne 1 ]; then
      echo "${locked[$b]}  $b" >> "$tmp"
    else
      echo "$(sha "$f")  $b" >> "$tmp"
    fi
  done
  sort -k2 -o "$tmp.sorted" <(grep -v '^#' "$tmp") && { head -n1 "$tmp"; cat "$tmp.sorted"; } > "$LOCK"
  rm -f "$tmp" "$tmp.sorted"
  echo "Đã cập nhật $LOCK (${#all[@]} file)."
  exit 0
fi

if [ "$errors" -ne 0 ]; then
  echo "check_migrations: $errors vi phạm." >&2
  exit 1
fi
echo "check_migrations: OK (${#ups[@]} migration)."
