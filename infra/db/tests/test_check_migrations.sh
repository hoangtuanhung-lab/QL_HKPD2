#!/usr/bin/env bash
# TC16: check_migrations.sh phát hiện đúng từng loại vi phạm và không báo oan.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/lib.sh"
CHK="$HERE/../scripts/check_migrations.sh"
OK="$HERE/fixtures/sample_ok"
W="$(mktemp -d)"; trap 'rm -rf "$W"' EXIT

fresh() { rm -rf "$W/m"; mkdir -p "$W/m"; cp "$OK"/* "$W/m/"; rm -f "$W/m.lock"; }
run() { "$CHK" --dir "$W/m" --lock "$W/m.lock" "$@"; }

fresh; expect_pass "TC16 bộ mẫu hợp lệ" run
fresh; run --update-lock >/dev/null; expect_pass "TC16 có lock, không đổi gì" run

fresh; cp "$W/m/20260101000002_sample_item.up.sql" "$W/m/20260101000002_other_dup.up.sql"; cp "$W/m/20260101000002_sample_item.down.sql" "$W/m/20260101000002_other_dup.down.sql"
expect_fail_msg "TC16 ID trùng" "ID migration trùng" run

fresh; rm "$W/m/20260101000003_sample_item_note.down.sql"
expect_fail_msg "TC16 thiếu .down" "thiếu .down.sql" run

fresh; cp "$W/m/20260101000003_sample_item_note.up.sql" "$W/m/Bad-Name.up.sql"
expect_fail_msg "TC16 tên file sai" "sai định dạng" run

fresh; echo "ALTER TABLE sample_item DROP COLUMN note;" > "$W/m/20260101000004_sample_drop.up.sql"; echo "SELECT 1;" > "$W/m/20260101000004_sample_drop.down.sql"
expect_fail_msg "TC16 DROP COLUMN trong .up" "DROP COLUMN" run
printf -- '-- allow-destructive: đã chuyển đọc ở release trước, ticket X\nALTER TABLE sample_item DROP COLUMN note;\n' > "$W/m/20260101000004_sample_drop.up.sql"
expect_pass "TC16 DROP COLUMN có allow-destructive kèm lý do" run
printf -- '-- allow-destructive:\nALTER TABLE sample_item DROP COLUMN note;\n' > "$W/m/20260101000004_sample_drop.up.sql"
expect_fail_msg "TC16 allow-destructive thiếu lý do vẫn bị chặn" "DROP COLUMN" run
for stmt in "ALTER TABLE sample_item RENAME COLUMN note TO memo;" "ALTER TABLE sample_item RENAME TO sample_item2;" "ALTER TABLE sample_item ALTER COLUMN note TYPE varchar(10);" "TRUNCATE sample_item;" "DROP SCHEMA public;"; do
  printf '%s\n' "$stmt" > "$W/m/20260101000004_sample_drop.up.sql"
  expect_fail_msg "TC16 phá vỡ tương thích bị chặn: $stmt" "TRUNCATE, RENAME" run
done
printf -- '-- allow-destructive: đã chuyển đọc ở release trước, ticket X\nALTER TABLE sample_item RENAME COLUMN note TO memo;\n' > "$W/m/20260101000004_sample_drop.up.sql"
expect_pass "TC16 RENAME có allow-destructive kèm lý do" run
printf 'CREATE TABLE sample_rename_ok (renamed_at timestamptz, truncated_note text);\n' > "$W/m/20260101000004_sample_drop.up.sql"
expect_pass "TC16 tên cột chứa 'rename/truncate' không báo oan" run

fresh; printf 'ALTER TABLE sample_item ADD COLUMN w double precision;\n' > "$W/m/20260101000004_core_f.up.sql"; echo "SELECT 1;" > "$W/m/20260101000004_core_f.down.sql"
expect_fail_msg "TC16 double precision" "float" run
printf 'ALTER TABLE sample_item ADD COLUMN w real;\n' > "$W/m/20260101000004_core_f.up.sql"
expect_fail_msg "TC16 real" "float" run
printf -- '-- cột này không dùng real hay float\nALTER TABLE sample_item ADD COLUMN w integer;\n' > "$W/m/20260101000004_core_f.up.sql"
expect_pass "TC16 từ 'real/float' chỉ trong chú thích không bị báo oan" run

fresh; printf 'ALTER TABLE sample_item ADD COLUMN t timestamp;\n' > "$W/m/20260101000004_core_t.up.sql"; echo "SELECT 1;" > "$W/m/20260101000004_core_t.down.sql"
expect_fail_msg "TC16 timestamp không múi giờ" "timestamp không múi giờ" run
printf 'ALTER TABLE sample_item ADD COLUMN t timestamp without time zone;\n' > "$W/m/20260101000004_core_t.up.sql"
expect_fail_msg "TC16 timestamp without time zone" "timestamp không múi giờ" run
printf 'ALTER TABLE sample_item ADD COLUMN t timestamp with time zone;\nALTER TABLE sample_item ADD COLUMN u timestamptz;\n' > "$W/m/20260101000004_core_t.up.sql"
expect_pass "TC16 timestamptz và timestamp with time zone hợp lệ" run

fresh; printf 'CREATE TABLE c2 (i uuid REFERENCES sample_item(id) ON DELETE CASCADE);\n' > "$W/m/20260101000004_core_c.up.sql"; echo "DROP TABLE c2;" > "$W/m/20260101000004_core_c.down.sql"
expect_fail_msg "TC16 ON DELETE CASCADE" "CASCADE" run

fresh; run --update-lock >/dev/null; echo "-- sửa trái phép" >> "$W/m/20260101000002_sample_item.up.sql"
expect_fail_msg "TC16 sửa migration đã khóa" "đã khóa bị sửa" run

fresh; run --update-lock >/dev/null; rm "$W/m/20260101000002_sample_item.up.sql" "$W/m/20260101000002_sample_item.down.sql"
expect_fail_msg "TC16 xóa migration đã khóa" "đã khóa bị xóa" run

fresh; run --update-lock >/dev/null; echo "SELECT 1;" > "$W/m/20260101000000_core_past.up.sql"; echo "SELECT 1;" > "$W/m/20260101000000_core_past.down.sql"
expect_fail_msg "TC16 chèn migration vào quá khứ" "quá khứ" run

fresh; run --update-lock >/dev/null; echo "-- sửa có chủ ý" >> "$W/m/20260101000002_sample_item.up.sql"
expect_pass "TC16 --update-lock --force-relock cho phép ghi đè lock" run --update-lock --force-relock
expect_pass "TC16 sau force-relock kiểm lại đạt" run

fresh; run --update-lock >/dev/null; printf 'ALTER TABLE sample_item ADD COLUMN z text;\n' > "$W/m/20260101000004_core_new.up.sql"; echo "ALTER TABLE sample_item DROP COLUMN z;" > "$W/m/20260101000004_core_new.down.sql"
expect_pass "TC16 thêm migration mới sau lock hợp lệ" run

t_summary
