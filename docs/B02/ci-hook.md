# B02 — CI kiểm tĩnh

`npm run check` gọi `npm run db:check`: Bash syntax và TC16, không cài/chạy PostgreSQL. Các test Vitest B02 kiểm gate, error propagation, seed/scanner bằng công cụ giả. Pipeline quality/secrets hiện có thực thi các lệnh này; không thêm workflow deploy hoặc SQL service.

`--with-db` và HKPD_ENABLE_DEFERRED_DB chỉ dành bước tích hợp cuối theo CR-004. Sau khi chốt DB/runner/schema, O01/P01 mới thêm job PostgreSQL riêng với fixture đúng A03, cycle/recovery/concurrency và bằng chứng thật. Kết quả static/mocked không đủ đóng các cổng DB ở G1 hoặc nghiệm thu toàn bộ B02.
