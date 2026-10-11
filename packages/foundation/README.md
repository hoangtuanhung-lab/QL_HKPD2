# @hkpd/foundation

Lõi B03/B04/B05: policy theo phạm vi, transaction port cho command/audit/outbox, consumer dedup, cursor mã hóa và Problem A03. Không có SQL, OAuth hoặc queue chạy thật. Xem [bàn giao nhóm B](../../docs/group-b/README.md) trước khi nối adapter.

`npm run check` build và kiểm thử. Không dùng adapter bộ nhớ của tests trong production. Runtime API hiện dùng bộ chuẩn hóa lỗi; các cơ chế nghiệp vụ còn chờ routes và persistence.
