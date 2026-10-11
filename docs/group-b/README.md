# Nhóm B — rà soát và phần nền bổ sung

Đối chiếu plan v1.4, A01-v0.2, A03 và main sau PR #8; ngày 11/10/2026 (Asia/Saigon). Codex thực hiện bổ sung theo yêu cầu người dùng; không thay danh sách 28 vị trí. Bảng này ghi đầu ra thực tế, không tuyên bố nghiệm thu toàn bộ nhóm B.

| WBS | Vị trí  | Đầu ra hiện có                                                                                                                                          | Phần còn thiếu để nghiệm thu                                                                                                                       |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| B01 | O01     | CI lint/typecheck/test/build, quét bí mật, quy trình nhận code/PR                                                                                       | Quy tắc bảo vệ nhánh GitHub chưa kiểm chứng cưỡng chế; phụ thuộc gói tài khoản                                                                     |
| B02 | P01     | PR #8: migration/seed tooling, kiểm tĩnh, cổng CR-004                                                                                                   | Schema nghiệp vụ, seed giả, migration/rollback/recovery PostgreSQL thật ở bước cuối                                                                |
| B03 | S01     | `packages/foundation/src/policy.ts`: quyền theo kỳ/trường/môn/checklist, tài khoản được duyệt, chặn trọng tài cùng trường                               | Google login/session/CSRF; tải phân công từ dữ liệu thật; nối mọi route và kiểm mọi tham chiếu DTO                                                 |
| B04 | P02     | Lệnh qua transaction port, receipt theo actor/kỳ/method/path/key, hash payload chuẩn hóa, kiểm version; cursor mã hóa và lỗi Problem thực trong Fastify | Adapter SQL với unique/CAS/locking; routes nghiệp vụ; truy vấn phân trang ổn định và phạm vi dữ liệu thật                                          |
| B05 | P03     | Audit/outbox/receipt cùng callback giao dịch; consumer receipt chống xử lý lặp, handler lỗi được retry sau rollback                                     | Poll/claim/lease/retry/backoff/dead-letter; persistence; mapping sang DomainEvent A03; job nghiệp vụ và adapter tác dụng bên ngoài                 |
| B06 | F01     | FormField/DataGrid/Modal dùng chung, form trường đã dùng FormField; mock GET A03 có sẵn                                                                 | Kiểm trình duyệt thật cho focus, bàn phím, màn hình nhỏ; tích hợp lưới/modal vào các màn hình nghiệp vụ sau này; mock command khi module được chốt |
| B07 | O01/O02 | Dev/staging độc lập, env ignored, dữ liệu giả, log không tự ghi request/header nhạy cảm                                                                 | Cấu hình môi trường triển khai thật, nhà cung cấp API/worker; Netlify và bí mật Google/SQL ở cuối                                                  |
| B08 | Q02     | Policy matrix, command/worker/cursor tests, schema Problem kiểm qua Fastify inject                                                                      | Acceptance trên API nghiệp vụ với session và SQL thật, concurrency đa tiến trình, kiểm dữ liệu chéo trường/môn end-to-end                          |

## Hợp đồng bàn giao cho backend

`@hkpd/foundation` là thư viện TypeScript, không phải cơ sở dữ liệu hay hệ thống đăng nhập. Chạy `npm ci`, `npm run check`; `pretest` và `prebuild` tự build thư viện trước khi API sử dụng. Để chạy test riêng trên checkout sạch, build thư viện trước: `npm run build --workspace @hkpd/foundation`.

1. Route xác thực session trên server, chọn action và đường dẫn chuẩn theo operation, kiểm DTO A03 trước khi gọi `executeCommand`. Không lấy actor, action, edition hoặc phạm vi quyền tùy ý từ body. Edition/path lấy từ route đã xác thực; mọi ID tham chiếu trong payload phải được kiểm tra cùng phạm vi. API hiện chỉ có health, chưa có endpoint ghi nghiệp vụ.
2. Transaction adapter đọc lại approval/phân công hiện hành qua `actor()`, resolve resource/scope/participant schools từ bản ghi server qua `target()`. Thiếu danh sách trường tham gia sẽ chặn nhập kết quả. Với đội phải resolve toàn bộ thành viên; không tin trường do client gửi. Policy là lớp nền, không thay state machine hay quy tắc tuổi/hạn mức/xác nhận đúng snapshot.
3. `transaction()` phải serialize cả resource và khóa receipt (actor, edition, method, path, key), rollback data/audit/outbox/receipt khi bất kỳ bước nào lỗi. SQL cuối dự án cần CAS version, unique constraints và chiến lược khóa/deadlock; kiểm quyền và lookup receipt cũng nằm trong transaction. `apply()` phải ghi phiên bản mới bằng CAS và trả projection phù hợp quyền, không trực tiếp phát tác dụng bên ngoài.
4. Quyền được kiểm trước replay. Payload khác hoặc base_version khác khi dùng lại key trả 409. Payload hợp lệ là JSON đã qua DTO validator, giữ chuỗi mã/decimal; không gửi class, cyclic object, undefined hay bigint. Receipt giữ đúng JSON projection và cần chính sách retention ở adapter cuối.
5. Audit và outbox intent chỉ có ID/action/version; không sao chép CCCD/token/payload học sinh. Intent nội bộ chưa phải envelope `DomainEvent` A03; adapter tương lai thêm occurred_at, schema_version và payload riêng từng module. Không log exception/command body.
6. `deliver()` chống lặp theo (consumer,eventId) trong transaction. Handler chỉ ghi qua tx; external API cần idempotency riêng. Đây không phải cam kết exactly-once với Google/email/HTTP. Queue polling và scheduler chưa chạy; worker runtime vẫn idle.
7. `CursorCodec` dùng AES-256-GCM, key 32 byte từ cấu hình bí mật, scope gồm actor/edition/operation/filters, hạn mặc định 15 phút. Không có key mặc định hay secret mới trong repo. Adapter phải kiểm quyền hiện tại mỗi trang, đưa tất cả filter/scope vào binding, giới hạn 1–100 (mặc định 50), query thứ tự ổn định có ID tie-breaker và parse query nghiêm ngặt. Không dùng codec phía trình duyệt.
8. Fastify trả `application/problem+json` với code/message Việt/request UUID server cho lỗi; exception không biết trả thông báo cố định. Health readiness giữ response chuyên biệt đã có. Production không đăng ký bất kỳ `/test-only` route nào.

## UI bàn giao cho F01 và các nhóm nhận

`@hkpd/ui` export `FormField`, `DataGrid<T>` và `Modal`; labels, hint/error liên kết ID; ô bảng render ReactNode; vùng bảng cuộn ngang; dialog native hỗ trợ modal và trả focus về nút mở khi đóng. Parent điều khiển `open`/`onClose`. Nội dung trả dạng string được React escape, không dùng HTML thô.

CSS form/dialog hiện nằm trong app web (`apps/web/src/style.css`); module nhận cần nạp stylesheet hoặc cung cấp theme tương đương. `Modal` cần trình duyệt hỗ trợ native `<dialog>`. Tests jsdom chỉ kiểm lifecycle bằng dialog giả, không chứng minh focus trap hay bố cục mobile thật. Mock chỉ có GET read-only dữ liệu giả, không mô phỏng đăng nhập/quyền/giao dịch production.

## Kiểm chứng và giới hạn

Các bài test mới nằm ở `tests/group-b-foundation.test.ts`, `tests/group-b-api.test.mjs`, `tests/group-b-ui.test.ts`. Adapter bộ nhớ chỉ tồn tại trong test, kiểm orchestration/rollback/dedup theo hợp đồng port; không được đưa vào API chạy thật. B08 kiểm Problem thật qua Fastify inject và schema A03; route lỗi được thêm riêng trong test, không chứng minh endpoint nghiệp vụ đã hoàn thành.

Giữ CR-004: chưa cài/chạy SQL, OAuth/Google Drive hoặc Netlify. Thư mục kết quả VĐV tiếp tục là ánh xạ logic `(edition_id, athlete_id)`, chưa lưu file lên Google. Không ấn định số trường/VĐV và không có dữ liệu học sinh thật.

PR A06 #7 đang độc lập; không tự merge hay gộp sửa A06 vào công việc này. B03–B06/B08 chuyển sang `handover_prepared`; `acceptance_status` vẫn `not_accepted`. Người nhận giữ nguyên vị trí trong plan, chưa có tên/GitHub của từng người.

Kiểm chứng cục bộ trên nhánh bàn giao:

- `npm run check`: đạt business/group-a/contracts checks, 28 kiểm tra tĩnh B02, lint, typecheck, **142 tests / 16 files** và build API/web/worker/foundation.
- `npm run secret:scan`: đạt.
- `npm run env:init` và `node scripts/smoke.mjs`: dev/staging API/web/worker đạt; dừng dịch vụ giải phóng cổng và không để lại API child.
- Không chạy SQL thật, Google/Netlify hoặc browser acceptance; không thay quy tắc GitHub trả phí.
