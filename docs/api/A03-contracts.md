# A03 — Hợp đồng API và DTO lõi

Ngày 11/10/2026; phiên bản thiết kế `0.1.0`; người dùng giao Codex thực hiện A03 của L01/P01. Nguồn: plan nhóm 28 người v1.4, mục 4, 5, A03, 16.4 và 19; ADR-001/002; yêu cầu hoãn SQL, Netlify và Google tới cuối dự án.

Đầu ra là **hợp đồng để review**, chưa phải API nghiệp vụ đã chạy. A01/baseline đầy đủ và các quyết định U01–U05/U08 chưa được bàn giao; các chủ module phải review trước khi tuyên bố hợp đồng ổn định để tích hợp. Backend hiện chỉ triển khai health; các endpoint dưới đây chưa được đăng ký trong Fastify. Không có migration SQL, auth thật, lưu tệp hay tích hợp bên ngoài trong A03.

## Nguồn chung và cách sử dụng

`docs/api/core.openapi.json` là nguồn duy nhất cho API nghiệp vụ. `packages/contracts/src/generated.ts` được sinh bằng openapi-typescript; không sửa trực tiếp. `docs/api/health.openapi.yaml` mô tả riêng endpoint health đã triển khai. Các ví dụ trong OpenAPI và `packages/test-fixtures/a03/core.json` đều là dữ liệu giả, không chứa hồ sơ học sinh thật và không thể dùng như điều lệ.

```sh
npm ci
npm run contracts:generate  # sau khi sửa OpenAPI
npm run check               # gồm kiểm tra DTO không lệch nguồn, lint, types, tests, build
npm run secret:scan
```

```ts
import type { components, operations } from "@hkpd/contracts";
type AthleteDto = components["schemas"]["Athlete"];
type ConfirmationBody =
  operations["confirmSubmission"]["requestBody"]["content"]["application/json"];
```

Package chỉ xuất kiểu TypeScript, không cung cấp client/runtime validator hay triển khai API. Công cụ mock GET cho frontend nằm riêng tại `scripts/mock-api.mjs`; xem [cách dùng mock API](mock-api.md). Bộ kiểm tra dùng AJV JSON Schema 2020-12, kiểm UUID/timestamp, trường bắt buộc, union và cấm trường ngoài schema; không tự ép kiểu hoặc xóa trường. `oneOf` thực thi union; `discriminator` chỉ hướng dẫn client. Kiểm tra liên kết giữa các ID, quyền và giao dịch cần backend thật do P02/S01/S02/chủ module triển khai.

## Sáu thực thể và ranh giới dữ liệu

| Thực thể     | Chủ module | Quyết định hợp đồng                                                                                                                                                                                                    |
| ------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edition      | R01/P01    | UUID, version, thông tin giải/thời hạn; tạo mới luôn Nháp; chỉ sao chép cấu hình được chọn. Hai trạng thái đang cần trong phần hợp đồng này là `draft`, `registration_open`; vòng đời còn lại phải bổ sung qua review. |
| Athlete      | R02/P01    | `student_id` tham chiếu hồ sơ riêng; `athlete_code` là chuỗi như `01.012`; server cấp mã trong phạm vi giải/trường. DTO này là nội bộ, không dùng làm public projection.                                               |
| Event        | R01        | Phạm vi giải/môn/nhóm, loại cá nhân hoặc đội, snapshot quy tắc; trạng thái và `started_at` tường minh.                                                                                                                 |
| Registration | R03        | Aggregate version, current revision và approved revision riêng. Sửa tạo revision mới; bản đã duyệt còn hiệu lực tới khi bản mới được duyệt.                                                                            |
| Match        | C01/C02    | Giải/nội dung, các slot có participant/ghost/pending, thời gian dự kiến và thực bắt đầu riêng; pointer official nullable. Ghost không phải VĐV.                                                                        |
| Submission   | K01        | Bản nhập có version, base official version và payload; duyệt gắn chính xác cặp submission ID/version. Revision cũ bất biến để official còn tham chiếu được.                                                            |

Participant là union cá nhân/đội. ID đội là tham chiếu: schema danh sách thành viên và kiểm giới hạn thuộc R03, chưa thiết kế trong gói lõi này. Match không giả định mọi môn có đúng hai slot. DTO chính thức giữ payload và cặp ID/version đã xác nhận để không trỏ sang bản đang sửa. `version` là số nguyên dương an toàn cho JavaScript; `base_official_version=0` nghĩa là chưa có official.

## API và quyền

Tiền tố nghiệp vụ: `/v1/editions/{edition_id}`. Mỗi operation trong OpenAPI có `x-owner`, `x-policy`, trạng thái triển khai và trạng thái chuyển đổi nếu đã có trong plan.

| Endpoint (sau tiền tố giải, trừ dòng ghi rõ)                                                   | Hành vi                                                    | Quyền cần backend kiểm                                                              |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `/v1/editions` GET/POST; `/v1/editions/copy` POST                                              | Liệt kê giải được phép đọc; tạo mới hoặc sao chép cấu hình | Admin cho tạo/sao chép; kiểm quyền nguồn, ghi audit nguồn/version; tạo Nháp, ID mới |
| `/athletes`, `/events`, `/registrations`, `/matches`, `/submissions` GET; `/{resource_id}` GET | Danh sách/phân trang và chi tiết                           | Kiểm giải và trường/môn/phân công theo operation; không tin ID ở client             |
| `/athletes` POST                                                                               | Tạo định danh VĐV từ hồ sơ được phép dùng                  | Giải + trường; mã server cấp; một folder logic duy nhất                             |
| `/registrations` POST; `/{resource_id}/revisions` POST; `/{resource_id}/submit` POST           | Tạo/sửa/gửi đăng ký                                        | Giải/trường, revision/version, trạng thái, điều kiện nội dung                       |
| `/submissions` POST; `/{resource_id}/revisions` POST; `/{resource_id}/submit` POST             | Nhập/sửa/gửi kết quả chờ xác nhận                          | Phân công/checklist đúng giải/môn; không thay official                              |
| `/confirmations` POST                                                                          | Xác nhận đúng bản nhập                                     | Tổ trưởng đúng môn/checklist; kiểm cả submission version và official version        |
| `/athletes/{resource_id}/folder` GET                                                           | Đọc thông tin thư mục logic                                | Quyền tệp đúng giải/VĐV; không suy ra VĐV có tài khoản                              |
| `/sync/submissions` POST                                                                       | Nhận operation đồng bộ, trả receipt                        | Kiểm lại quyền/phân công/version; đổi quyền chuyển inbox review; không ghi official |
| `/v1/public/editions/{edition_id}/results` GET                                                 | Chỉ projection đã chốt trong phạm vi được công bố          | Không cần phiên; server lọc công bố, không đọc submissions hoặc hồ sơ riêng         |

Cơ chế cookie session là đề xuất giao diện cho S01 review, chưa có phiên thật hay Google login. S01 phải chốt CSRF/cookie và ma trận role trước triển khai. Có đăng nhập không đồng nghĩa có quyền. `edition_id` trong path và DTO phải khớp; mọi ID tham chiếu phải thuộc cùng giải và đúng quyền trường/môn. Actor lấy từ phiên server, không từ payload. Tài nguyên ngoài scope phải bị chặn trước đọc/ghi; S01 quyết định nhất quán việc trả 403/404 để tránh lộ tồn tại.

GET list dùng cursor opaque, limit mặc định 50, tối đa 100; response `{items, next_cursor}` với `null` khi hết. Backend chọn thứ tự ổn định có ID làm khóa phụ, giữ bộ lọc và scope trong cursor; kiểm cursor khi scope thay đổi. Không đưa dữ liệu PII vào cursor đọc được bởi client. Lỗi dùng `application/problem+json`, code máy và message tiếng Việt, request ID; details chỉ có field/reason đã lọc, không chứa giá trị PII/token/stack trace.

## Phiên bản, gửi lặp và xác nhận

Mọi POST trong gói này bắt buộc `Idempotency-Key` UUID. P02 lưu kết quả theo actor/giải/method/path/key, đối chiếu payload canonical; cùng key/cùng payload trả lại cùng tài nguyên/kết quả, payload khác trả 409 `IDEMPOTENCY_CONFLICT`. Retry sau response thất lạc không được ghi lần hai. Phải kiểm quyền hiện tại trước trả kết quả đã lưu. Thời hạn lưu key và xử lý request đồng thời do P02/O01 review trước triển khai; chưa tự đặt TTL. Với sync, header phải trùng `operation_id` và server kiểm điều kiện này.

Command sửa/gửi yêu cầu `base_version` của aggregate hiện tại. Sai version trả 409 `VERSION_CONFLICT`; không ghi đè theo lần gửi cuối. Tạo mới không nhận ID/code/status/actor/version do client đặt. Sau thay đổi, server tăng version; snapshot/revision đã được tham chiếu không bị sửa tại chỗ.

Ví dụ body xác nhận (kèm header Idempotency-Key):

```json
{
  "submission_id": "00000000-0000-4000-8000-000000000009",
  "submission_version": 2,
  "base_official_version": 1
}
```

Server kiểm trạng thái `pending_confirmation`, cả hai version và quyền. Lệnh không nhận payload điểm mới, winner, huy chương hoặc tổng điểm. Xác nhận ghi official, audit và outbox trong cùng transaction; invalidation các bảng phụ thuộc theo K04/P03. Chỉ official đổi sau xác nhận; bản sửa chưa duyệt không tác động official. Một submission mới hoặc revision phải giữ `base_official_version` dùng lúc nhập; cập nhật lại version nền cần thao tác xem/đối chiếu tường minh của người dùng, không tự retry xung đột.

OpenAPI hiện mô tả tạo/sửa/gửi đăng ký và nhập/xác nhận kết quả. Lệnh duyệt/trả đăng ký, bắt đầu trận, publication, thuật toán và công cụ backup thuộc các hợp đồng tiếp theo của chủ module; không suy ra chúng đã triển khai từ enum trạng thái. `DomainEvent` mới chốt envelope; payload theo từng event phải được P03/chủ module chốt trước dùng. Sync receipt không phải bằng chứng official đã ghi.

## Thành tích, dữ liệu công khai và thư mục

`ResultValue` phân biệt time (seconds), distance (metres), points, score, sets và cards. Thành tích thập phân giữ dạng chuỗi (ví dụ `12.340`), không dùng float quyết định bằng nhau. Score/sets/cards là số nguyên đếm, không phải huy chương hoặc điểm toàn đoàn. Đây là hình dạng trao đổi dự kiến: K01/C04/L02 phải đối chiếu biểu mẫu U02, độ chính xác, làm tròn, đơn vị và cách phối hợp thẻ/tỷ số trước ổn định. Server kiểm participant đủ điều kiện, không trùng entry, cùng giải/match và loại kết quả phù hợp rule snapshot; JSON Schema đơn lẻ không chứng minh những điều này. DNS/DNF/DSQ và biểu mẫu bổ sung cần hợp đồng theo điều lệ, không tự quy đổi thành số 0.

PublicResult là whitelist riêng: tên/mã hiển thị, trường, nhãn nội dung, thành tích và publication đã chốt. Không có student ID, ngày sinh, CCCD, hồ sơ, submission ID, file URL hoặc credential. F02/S03/L02 review trường được công bố trước bật public endpoint; đọc public không làm tệp đính kèm công khai.

Mỗi VĐV có một AthleteFolder theo cặp `(edition_id, athlete_id)` duy nhất. `logical_key` phải bằng `edition_id/athlete_id` (server kiểm), không đổi khi tên/mã hiển thị thay đổi. DTO có trạng thái `deferred` cho giai đoạn hiện tại và không có Google ID/URL/token. S03 triển khai tạo folder idempotent, quyền upload/download và liên kết tệp với revision cuối dự án; O02 kiểm backup/restore. Quyền lưu tệp không cấp quyền sửa kết quả chính thức; chưa xác nhận mỗi VĐV có tài khoản tự tải lên.

Sao chép giải chỉ cho phép chọn catalog, tuổi, hạn mức, điều kiện tổ chức và quy tắc. Không copy registrations/athletes/teams, phân công, lịch, kết quả, lịch sử hoặc awards. Admin nhập lại tên/thời gian; source immutable. R01 phải cung cấp bước preview/checklist trước mở đăng ký, không thuộc API lõi đã hoàn thành ở đây.

## Bàn giao và kiểm chứng

| Người nhận          | Cần review/tiếp tục                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------- |
| L01/P01/L02         | Sáu DTO, A01 traceability, trạng thái giải, cách lưu revision; đóng U nghiệp vụ phù hợp  |
| P02/S01/S02         | Giao dịch/version/idempotency/cursor/error; ma trận quyền, CSRF; cách ly giải/trường/môn |
| R01/R02/R03/C01/C02 | Catalog và lifecycle, code giữ số 0, participant đội/ghost, đăng ký sửa riêng            |
| K01/C04/K04/P03     | Định dạng thành tích, official/confirmation/invalidation, event payload riêng            |
| S03/F02/F03/O02     | Folder logic, whitelist công khai, sync inbox, backup liên kết tệp                       |
| Q02                 | Schema examples + direct API tests sau khi backend được triển khai                       |

Kiểm tra hiện có: toàn bộ schema và refs, ví dụ giả, operation ID duy nhất/path parameters, command idempotency/conflict; so DTO sinh ra với bản commit. Test âm chặn số hóa code/float, client tự truyền huy chương/actor vào xác nhận, sai version, ghost thành VĐV, copy dữ liệu thi đấu, PII/pending vào public và malformed ID/timestamp. Đây là **kiểm tra hợp đồng**, chưa kiểm quyền server, transaction, khóa đồng thời hay tích hợp Google. Những kiểm tra đó là đầu ra tiếp theo của B04/B08 và chủ module, chưa được nghiệm thu.

Thay đổi schema phải sửa OpenAPI, fixture liên quan và sinh lại DTO trong cùng PR; CI chặn DTO lệch nguồn. Thay đổi phá vỡ cần CR, phiên bản và danh sách người dùng bị tác động; khi review xong mới đánh dấu ổn định. Không sửa hợp đồng âm thầm để module riêng dễ chạy.
