# Rà soát và sửa lỗi 14/10/2026

Nhánh `fix/review-2026-10-14`. Năm lỗi được tái hiện bằng chạy thật trước khi sửa; test hồi quy ở `tests/review-2026-10-14-regression.test.ts` (RV-01 đến RV-04) và các test Windows đã chỉnh.

| Mã    | Lỗi                                                                                                                                                            | Sửa                                                                                                                                                                                                                                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RV-01 | Ảnh VĐV lưu base64 nguyên bản vào localStorage; với ảnh ~150 KB chỉ lưu được 24 VĐV rồi `QuotaExceededError`, sau đó `DraftWriter` dừng hẳn kể cả khi bớt ảnh. | `photo-resize.ts` thu ảnh về khung 360 × 480, JPEG ≤ 60.000 ký tự. `DraftStorageFull` báo lỗi tiếng Việt; chỉ lỗi đầy bộ nhớ không chặn lần lưu sau của người dùng, vẫn qua Web Locks + CAS; xung đột/dữ liệu hỏng vẫn dừng như LOG-01. |
| RV-02 | `schoolIdentityView` che CCCD với trường và cấm quản trị, ngược PDF-Q143/Q144 đã chốt; chưa có cách đối chiếu danh sách mà không giải mã.                      | `identityView`: trường đăng ký/quản trị thấy đủ, tổ trưởng/trọng tài đúng môn thấy `3 số đầu + 4 số cuối`. `identityIndex` (HMAC-SHA256, khóa riêng) và `reconcileIdentities` đối chiếu danh sách đăng ký, kết quả không chứa CCCD.     |
| RV-03 | Nhập Excel từ chối lớp gõ số (`6`), ô rich text.                                                                                                               | Ghi chú/Lớp/Nội dung nhận số nguyên; rich text/hyperlink lấy chữ; biểu mẫu định dạng cột Lớp là văn bản; CCCD bỏ khoảng trắng/dấu chấm, ô số báo rõ lý do mất số 0.                                                                     |
| RV-04 | Giới tính `nữ`, `NỮ`, Unicode tổ hợp và tiêu đề chữ thường bị từ chối.                                                                                         | `matchKey` chuẩn hóa NFC/NFD, hoa thường, dấu, khoảng trắng cho tiêu đề và giới tính.                                                                                                                                                   |
| RV-05 | Không chạy được trên Windows: engine-strict chặn npm 12; CRLF làm `prettier --check` hỏng toàn repo; 12 test hỏng do symlink, POSIX mode, SIGTERM, Postgres.   | `engines.npm >=11 <13`; `.gitattributes` LF; `tests/link-fixture.mjs` dùng junction/copy; bỏ qua có ghi lý do phần POSIX mode, mã thoát SIGTERM, symlink tệp và cụm Postgres `/tmp`.                                                    |

## Kiểm chứng (Windows 11, Node 24.21.0, npm 12.0.1)

`npm ci`, `npm run lint`, `npm run typecheck`, `npm test` (750 đạt, 1 bỏ qua trên Windows), `npm run build`, `npm run secret:scan` đều thoát 0. `npm run db:check` cần Bash/Postgres kiểu Linux, chưa chạy trên Windows.

## Còn mở

- Bản nháp trường vẫn lưu CCCD đầy đủ trong localStorage của trình duyệt để trường xem đủ; máy dùng chung vẫn cần hồ sơ trình duyệt riêng (runbook A04). Chưa có nút xóa dữ liệu trên máy.
- API chưa có route nghiệp vụ/đăng nhập; `identityView`, `identityIndex`, `reconcileIdentities` là thư viện chờ adapter. Khóa AES và khóa HMAC phải là hai bí mật khác nhau từ kho secret.
