# Nối I01–I03 với B/R/C/K

## Local queue

`IndexedDbQueue.open(window.indexedDB)` fail-closed, không fallback memory hoặc báo đã lưu nếu transaction abort/quota/đóng connection. `append(scope, SyncSubmission)` chỉ thêm bản bất biến; sửa tạo operation UUID mới nhưng vẫn giữ bản cũ. Scope UUID, schema A03 và receipt được kiểm runtime. `offline-schema.mjs` sinh schema closure từ A03; `offline:check` chạy trong CI để phát hiện drift. Không coerce/bỏ unknown fields. Receipt kiểm đúng schema A03, không tự thu hẹp trường submission_id nullable theo status. Lõi inbox trong PR phát accepted kèm submission ID mới và các trạng thái review/conflict với null; consumer vẫn nhận đủ nhánh nullable A03.

`flushQueue(store,scope,currentScope,transport)` được gọi rõ ràng, kiểm scope trước mỗi request và sau response. Timeout vẫn giữ cùng operation ID; receipt sai operation/schema hoặc lỗi ghi receipt không đánh dấu đã gửi. Request đang bay khi logout có thể đã được nhận dưới phiên cũ, nên server kiểm session, CSRF và actor hiện tại trước mọi thao tác. Không tự flush khi login bằng tài khoản khác. Nhiều tab có thể gửi cùng operation; server transaction deduplicate; queue không giả vờ bảo đảm một request HTTP duy nhất. Không bảo đảm thứ tự giữa UUID của nhiều bản: mỗi bản giữ version gốc, bản lệch version vào conflict để xét.

Transport phải gửi đúng `POST /v1/editions/{edition_id}/sync/submissions` A03, `Idempotency-Key = operation_id`, authenticated cookie/CSRF và AbortSignal. Server từ chối header/body operation lệch nhau. Không nhận actorId từ body, không đưa token trong queue/log/URL. `accepted` HTTP 202 chỉ là bản pending. Chưa mount route/transport thật vì session và persistence chờ CR-004; `/health/*` vẫn là API runtime hiện có. Tab thử không gọi endpoint nghiệp vụ giả.

## Server inbox

`receiveOffline(InboxStore, trustedScope, unknownInput)`:

1. Kiểm schema/capture bản immutable; fingerprint canonical JSON + SHA-256.
2. Reload approved actor từ phiên trusted; khóa/lấy match edition đúng scope và snapshot **do server từng cấp** cho chính actor, edition, event, sport. `maySubmit` chứng minh snapshot từng có quyền submit; adapter không tạo từ client hoặc chỉ tin UUID client. Giữ snapshot/tombstone lịch sử đủ lâu để nhận bản chờ, không xóa khi đổi phân công. Mất approval tài khoản bị chặn; lưu local vẫn giữ. Đổi assignment của tài khoản còn approved được giữ trong inbox.
3. Kiểm lại quyền hiện tại bằng B policy và `assignmentCurrent` (version/thu hồi/role/checklist hiện tại). Snapshot cũ không cấp quyền. Bản quyền đổi → review_required, giữ nguyên request, không ghi match.
4. Version trận/official lệch, pending khác, lease online còn hiệu lực/không rõ expiry → conflict. K nguồn vòng trước/tệp liên kết không đúng → review_required. Payload đúng schema nhưng không đúng rule/participants/precision/khóa trận → review_required. Các bản cùng operation nhưng khác nội dung → 409, không ghi đè bản đầu.
5. Accepted qua chính `submitPreview` K, append pending và tăng match version; **không gọi confirm, không sửa official, không invalidate publication hoặc phát OfficialResultConfirmed**. Giao dịch ghi match + inbox immutable + receipt + audit atomically, khóa trận/CAS và UNIQUE(actor,edition,operation). Lỗi insert phải rollback pending. Khi xác nhận sau này dùng K command với leader/delegation, version, source/file checks và outbox sẵn có.

Port `InboxTransaction` là hợp đồng, chưa có production memory store. Adapter SQL cuối dự án phải dùng cùng transaction/module service với K/B, không copy hai bản state hoặc gọi HTTP trong transaction. Tải actor, assignment và source/file metadata đáng tin, kiểm permission không dựa trên payload. `find` phải trả record đúng scope; không cho reader truy cập toàn bộ inbox. Review inbox chỉ leader hiện tại của sport/event (admin theo quyền/delegation đã chốt), actor cũ chỉ đọc bản của chính mình khi còn được phép; không mở endpoint công khai.

`offlineProblem` map lỗi known sang Problem B (400/403/404/409), lỗi store/provider/factory lạ thành 500 thông điệp chung và request UUID server. Không log payload/reason/tệp/private snapshot. Rate/body limits và giới hạn inbox phải triển khai cùng endpoint để chống resource abuse; chưa có kết quả kiểm tải HTTP.

## File intent / I03 để cuối

R02 tiếp tục sinh `athlete.folder.requested` một lần cho `(edition_id,athlete_id)`. `athleteFolderIntent` cho key ổn định private/deferred; không tạo Drive, không suy ra một thư mục chung cho trường. Dispatcher thật dùng durable unique logical key + provider metadata key, lookup/upsert trước retry để tránh tạo trùng sau timeout. Không coi local receipt là chứng cứ provider đã commit. Nếu không xác định commit được, manual_review và đối chiếu thay tạo mới.

Retry policy 1s,2s,… tối đa 300s, tối đa 8 lần rồi manual_review; đây là mặc định kỹ thuật, chưa là SLA P0. Worker sẽ thêm jitter/rate-limit/Retry-After và khóa claim durable; permanent permission/input lỗi đi manual_review, không xóa dữ liệu. Sau sự cố job/tệp pending giữ reference riêng, không xóa result pending. Upload biên bản bổ sung phải dùng R09 quyền hiện tại + match/edition authoritative và multi-link idempotency, không tin đường dẫn thư mục từ browser. Test provider thật/đứt mạng/files và worker chưa được chạy.

Validator AJV hiện compile schema khi mở bundle phát triển. Trước CSP production không cho eval cần chuyển sang validator standalone sinh ở build và chạy parity test A03; không nới CSP để làm test qua.
