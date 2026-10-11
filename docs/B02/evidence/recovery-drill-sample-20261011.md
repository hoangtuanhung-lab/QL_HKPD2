```
# Diễn tập recovery — 2026-10-11T04:14:21Z
Migration: /home/claude/hkpd-b02/infra/db/tests/fixtures/sample_ok
Vân tay trước (bảng | số dòng | md5):
    sample_child|1|74377b5fd5409133c308c041437006cc
    sample_item|3|9d5e2e8b8174a108049ba4f8a0abff75
    schema_migrations|3|671188a293417917d75491b34778e487
Dump trước migration: sha256=6427d84da57830d60e7aa722edfc06cd6b01fa397dcfc984e0cecbaec7740f6e
ok 1 - A. migration lỗi giữa chừng bị từ chối (exit != 0)
ok 2 - A. sau migration lỗi, dữ liệu và schema_migrations không đổi (transaction đã hoàn tác)
ok 3 - B. dữ liệu đã bị phá (xác nhận bối cảnh diễn tập)
ok 4 - B. pg_restore thành công vào DB mới
ok 5 - B. sau restore: số dòng và md5 từng bảng khớp bản trước migration
ok 6 - B. file dump không đổi (checksum khớp)
1..6
# tổng: 6, lỗi: 0
```
