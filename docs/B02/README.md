# B02 — Tiếp nhận snapshot và chuẩn bị migration/seed

Ngày tiếp nhận: 11/10/2026 (Asia/Saigon). Nguồn `B02_snapshot_review_20261011.zip`, checksum trong `source.json`; chưa nhận tên thật/tài khoản tác giả hoặc base commit của người gửi. Tài liệu nguồn ghi vai trò P01/B02. Codex kiểm/chỉnh/tích hợp theo CR-007.

**Trạng thái: bàn giao phần chuẩn bị, chưa nghiệm thu toàn bộ B02.** Gói không có migration/schema nghiệp vụ thật, seed thật hay PostgreSQL driver của ứng dụng. Mọi SQL/Google/Netlify thực thi giữ tới cuối theo CR-004. Các file SQL ở tests/fixtures chỉ là mẫu; migrations và seed thật hiện trống.

## Phần được tích hợp

- Quy ước dữ liệu nháp và hướng dẫn migration, đối chiếu A03 hiện hành.
- Checker không cần DB: tên/cặp up–down, ID trùng, hash lock, cấm chèn vào quá khứ và lint DDL nguy hiểm.
- Runner/môi trường/seed/cycle/recovery chuẩn bị cho giai đoạn cuối, khóa mặc định. Chưa cài hoặc khởi động PostgreSQL trong lần tiếp nhận này.
- 28 assertion TC16 của tác giả, cùng test hồi quy/mock về gate môi trường, cấu hình đích, lỗi runner, seed fail closed, scanner và đường dẫn có khoảng trắng. Mock SQL chỉ xử lý chuỗi lệnh trong chương trình giả; không kết nối DB.

```bash
npm run db:check      # Bash syntax + TC16; không khởi động DB
npm test             # Bao gồm các test B02 cô lập/mocked
npm run secret:scan  # Scanner chính của repository
```

Kiểm tĩnh yêu cầu Bash, GNU grep/sha256sum và Perl có sẵn trên runner Linux; thiếu công cụ phải báo lỗi. Không cần PostgreSQL cho phần này.

`npm run check` đã bao gồm `db:check`; CI kế thừa lệnh này. Không thêm PostgreSQL service, tài khoản hoặc credential trong CI. Cấu hình cloud đã dùng npm run check nên không cần đổi script cài đặt.

## Những lỗi đã chỉnh khi tiếp nhận

1. Counter của run_all.sh nằm trong pipeline subshell nên mất trạng thái lỗi: đổi sang ghi log trong shell chính, trả đúng exit status, kể cả `--out`.
2. Lệnh DB thiếu gate thống nhất: yêu cầu `HKPD_ENABLE_DEFERRED_DB=1` và APP_ENV local/dev/test/ci; chặn PGHOSTADDR/PGSERVICE ghi đè, tên DB/role sai và endpoint từ xa. Cờ chưa được bật trong setup/CI.
3. pg_local.sh dùng su/bash -c với chuỗi môi trường: đổi sang argv trực tiếp; giới hạn thư mục cụm thử riêng, từ chối symlink và bỏ chown đệ quy. Mật khẩu tùy chọn chỉ qua stdin, không truyền -v p trong argv, không in lỗi DB chứa giá trị. auth trust chỉ là cụm thử socket riêng, không phải cấu hình production.
4. Cấu hình tìm PostgreSQL có thể thoát sớm khi chưa cài binary: phần kiểm tĩnh hoạt động khi không có DB.
5. Migration runner tách đường dẫn bằng word splitting và nhận count chưa kiểm: dùng array, preflight checker, kiểm count/ID và không chèn vào quá khứ so với DB đã áp.
6. Seed guard bỏ lọt edition.name NULL và có thể in lỗi kết nối: fail closed với NULL/kết quả kiểm không xác định, không in chi tiết kết nối.
7. Checker có thể báo đạt với thư mục không tồn tại: chặn missing dir/options và lock malformed/duplicate.
8. Dump/fingerprint lỗi có thể làm so sánh bản rỗng sai: lỗi đọc schema/fingerprint hoặc thao tác DB phải dừng diễn tập.
9. Scanner phụ B02 không theo symlink, chỉ in vị trí, chỉ nhận scan-allow có lý do. Secret scan chính vẫn bắt buộc; regex lint/scanner không thay review SQL hay bảo mật thực tế.

## Nguồn lịch sử và đầu vào hiện hành

`input-check.md` là đánh giá hiện hành. `snapshot/input-check-original.md`, `review-B02-ca1.md`, `stages/`, `evidence/`, `subplan_B02_database_migration_seed.md` và `B02_plan_extract.md` là tài liệu của snapshot người gửi. Các câu “Chưa có A03”, “dev PostgreSQL16”, “đã chạy recovery” hoặc yêu cầu reviewer độc lập trong đó phản ánh bối cảnh nguồn; không phải kết quả của lượt tiếp nhận này hoặc chỉ dẫn thay thế CR-004/CR-007.

Kết quả DB thật trong infra-tests/recovery-drill ở evidence do người gửi ghi, Codex chưa tái kiểm. intake-validation-20261011.txt ghi riêng kiểm tra static/mocked của lần tiếp nhận này. Không dùng log ấy để tuyên bố AC1 dựng DB sạch, AC2 seed, AC3 recovery hay AC4 mã VĐV giữ số 0 đã nghiệm thu trên hệ thống hiện tại. Xem `review-integration.md` cho bằng chứng của lượt tiếp nhận.

## Cổng tích hợp cuối dự án

Chốt schema/storage mapping từ A03 và chủ module, phiên bản PostgreSQL/runner, số lượng/độ rộng mã, immutable registration/submission revisions, bản official, quyền DB và dữ liệu giả đúng định dạng. Sau đó mới chuẩn bị DB riêng và bật cờ để chạy `bash infra/db/tests/run_all.sh --with-db` trên bộ mẫu rồi trên migration nghiệp vụ thật. TC15/TC-ENV/TC02/TC17 cần chạy lại với toolchain/cấu hình mới; không mặc định kết quả cũ vẫn đúng.

Runner tạm chưa có khóa advisory giữa hai runner đồng thời, chưa quản lý migration ngoài transaction và chưa chứng minh down checksum/history hoặc phục hồi toàn bộ object. Không dùng cho môi trường chung/production trước khi các cổng này được chốt và test thực tế đạt.
