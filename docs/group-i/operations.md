# I04/I07 — Chuẩn bị backup, restore và chuyển VPS

Không gọi SQL/Google/Netlify hoặc thay dữ liệu live. `operations.ts` chỉ kiểm manifest/chính sách; chưa scheduler/xóa/restore/deploy. Manifest checksum kiểm toàn vẹn byte, **không** xác thực nguồn hoặc thay chữ ký/key custody; manifest và byte phải lấy từ nơi backup trusted có quyền riêng.

## Backup cuối dự án

- Trong thi đấu mỗi giờ giữ 7 ngày; ngoài thi đấu mỗi ngày giữ 30 ngày. `retentionExpired` chỉ trả eligibility theo mốc tuổi, không xóa. Archive cuối giải giữ lâu dài, không auto-delete. Không xóa bản duy nhất kiểm chứng được, bản đang được dùng restore/hold hoặc dependencies; quyết định nơi lưu/archive expiry chờ O02/người dùng.
- Worker lấy coherent snapshot SQL và mapping file/provider/permissions từ cùng watermark; backup mã hóa, secret/key riêng, schema/migration version, key version, edition, SHA-256/byte count và recordCounts. Không gom bí mật/CCCD vào log hoặc repo. Đối chiếu mapping/thư mục VĐV là bước bắt buộc, không dùng chỉ số file count thay hash/content.
- Persist manifest và receipt sau commit provider, alert nếu trễ/lỗi. Scheduling, clock/time zone, missed runs/catch-up, durable locking và giải pháp kho byte phải nghiệm thu riêng. Chính sách retry không thay kiểm checksum/reconciliation.

## Restore

1. Admin hiện tại, lý do/audit/request ID; thông báo/maintenance, dừng ghi và worker claim, coherent pre-restore backup **hiện trạng**, verify checksum và count. `prepareRestore` không tự kiểm role và không thực hiện restore. Bản hiện trạng phải được tạo từ môi trường đích độc lập, không trỏ lại byte bản cần phục hồi.
2. Verify byte/hash trusted; edition/schema/key đúng hoặc migration/key chuyển đổi được review riêng. Helper cơ bản fail-closed khi khác version; không tự migrate/đổi key. Mặc định helper yêu cầu backup hiện trạng không quá 5 phút (safeguard kỹ thuật để bắt bản cũ, chưa là tiêu chí nghiệp vụ); target không ở tương lai. Không lấy timestamp client để chứng minh backup mới.
3. Restore vào nơi cách ly, kiểm foreign keys/record counts, official versions, audit/outbox/receipt, publication source versions, file mapping/hash/private permissions, thư mục mỗi VĐV. Chạy T01–T12/TG01–TG08 với server thật rồi xin quyết định cutover.
4. Nếu lỗi: rollback từ pre-restore snapshot, kiểm lại nguồn và queue/inbox; không phát lại thông báo hay upload trùng. Chỉ mở ghi khi kiểm xong, lưu biên bản reviewer. Không đưa dữ liệu thật vào môi trường dev thử.

## Chuyển VPS / I07

Dùng container/runbook B07 hiện có, pin artifact commit/digest. Chuẩn bị secrets ngoài image, private network, SQL migration immutable QT36, backup trên và rehearsal từ snapshot cách ly. Dừng writes/worker, export coherent checkpoint trước và sau độc lập; kiểm cùng byte digest và counts qua `assertMigrationUnchanged` cho bản export canonical ổn định cùng edition/schema/key. Helper không kiểm container đang chạy hoặc mapping Drive chưa export; serialization/timestamp/nondeterminism phải chuẩn hóa ngoài helper, không sửa checksum kỳ vọng để cho qua.

Giữ provider IDs/file hashes, logical folder/link keys, ownership/quyền và receipt IDs. Kiểm health/readiness nền tảng riêng với kết quả nghiệp vụ. Smoke foundation và SQL static checks hiện tại không thay migrate/restore real. Tập hợp count/hash/export diff, container digest, thời gian downtime, lỗi tái hiện và biên bản rollback; chưa có chứng cứ chuyển VPS/Drive thật trong PR này. Netlify/Google/SQL chỉ triển khai khi bước cuối được bắt đầu.
