# Rà soát liên nhóm trước nhóm I

Ngày 11/10/2026. Phạm vi A/B/R/C/K/D và điều kiện đầu vào I theo plan v1.4. Các nhóm chưa được đổi thành Accepted; không chạy SQL, Google, Netlify theo CR-004. Nhóm K #13 đã được merge vào main; PR rà soát kế thừa mã đã merge, không tự merge PR khác.

## Các lỗi đã sửa

| ID     | Mức | Phản biện / ảnh hưởng trước sửa                                                                                          | Sửa và chứng cứ                                                                                                                                                         |
| ------ | --- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REV-01 | Cao | C chốt sơ đồ chỉ so ID/trường; thành viên đội thay đổi vẫn giữ lịch theo người cũ                                        | So đủ personIds khi chốt/thay sơ đồ, chặn entrant đã withdrawn; `cross-group-defects.test.ts`                                                                           |
| REV-02 | Cao | Projection A03 cho phép hai entrant ánh xạ chung một athlete/team UUID                                                   | Chặn ánh xạ trùng trước tạo DTO; test alias                                                                                                                             |
| REV-03 | Cao | K chọn submission trong array nhưng không so edition/event/match; bản nhập lẫn scope có thể được duyệt nếu payload trùng | So cả giải/nội dung/trận trước xác nhận; test sai giải                                                                                                                  |
| REV-04 | Cao | R không đọc trạng thái C/K trước sửa/gửi/duyệt; có thể thay đăng ký sau chốt sơ đồ                                       | Port eventLifecycle bắt buộc, kiểm scope và khóa trong cùng transaction; chặn khi đã chốt/bắt đầu/có bản kết quả, giữ return không thay approved; test cả ba tình huống |
| REV-05 | Cao | B04 kiểm quyền actor mới nhưng đưa actor cũ trong command vào apply; adapter có thể dùng grant cũ/giả                    | apply nhận actor vừa tải từ server; test actor cũ có admin nhưng actor hiện tại chỉ school                                                                              |
| REV-06 | Vừa | Error handler B chỉ hiểu FoundationError; lỗi quyền/version/validation R/C/K sẽ thành 500 khi nối route                  | apiError map class lỗi đã biết sang problem 400/403/404/409, không lộ message; unknown vẫn 500; test Fastify inject                                                     |

REV-01/02/03 đã có test thất bại trên mã trước sửa (3/3), rồi chạy lại sau sửa. Những lỗi còn lại được kiểm bằng regression test mới. File test là chứng cứ chương trình, không phải chứng cứ API/UAT toàn giải thật.

## Các điểm nối đã bổ sung

`@hkpd/integration` cung cấp luồng dùng chung, server gọi từ dữ liệu authoritative:

1. `prepareEvent` lấy **approved revision** R, danh mục/môn đúng giải, UUID trận cấp một lần, global student IDs cho C. `confirmEvent` đối chiếu lại snapshot/roster/revision/thành viên rồi chốt C; bản sửa R pending vẫn giữ roster approved cũ, approved mới khiến draft stale.
2. `projectEvent` giải slot cố định C từ **official K hiện tại**; miễn chỉ đi tiếp theo cấu trúc, không có bản điểm hoặc tăng actual. Trận vòng sau giữ toàn bộ prerequisite official versions, chỉ tạo ResultMatch khi C đã chốt và đủ nguồn. Không ghi đè record có lịch sử.
3. `schedulePeopleForMatch` đưa global student IDs của mọi VĐV/thành viên đội có thể vào trận KO chưa rõ người, để C04 kiểm trùng liên môn. Khi nguồn đã xác nhận thì thu hẹp về người thật; kết quả hòa chưa quyết định vẫn giữ phạm vi bảo thủ.
4. `projectEventMatches` xuất DTO A03 với UUID nguồn cố định; official stale không xuất official_result_id. `publicationReadiness` loại nguồn stale và giữ allResultsConfirmed=false nếu còn pending/blocked hoặc C chưa chốt/hủy. **Không tự tuyên bố rankingsResolved**: chốt công bố còn phải tính/kiểm K04–K06 thực tế.
5. `deliverResultConfirmed` dùng B05 receipt giao dịch, load official hiện tại, kiểm scope/version, đánh dấu trận phụ thuộc stale, chuyển publication về provisional và yêu cầu rebuild từ sourceVersions hiện hành. Duplicate không chạy handler lần hai; sự kiện trễ không lùi phiên bản. Rollback publication/invalidation/rebuild request/receipt cùng nhau.
6. R eventLifecycle đọc từ C/K qua `registrationLifecycle`; K prerequisitesCurrent nối graph hiện hành trước ghi. Test thực thi executeResult với lease cũ sau khi nguồn thay đổi và xác nhận không có ghi mới.

Đọc [hợp đồng adapter](integration-contract.md). Không có memory adapter trong package production. Test stores chỉ mô phỏng serialize/rollback. API ứng dụng vẫn chỉ có health routes; đã nối error handler, chưa mount business routes. Worker vẫn idle; consumer mới chưa polling. Các tab thử A04/R/C/K vẫn có context riêng, chưa thành giao diện đăng ký online liên trường.

## Rà trạng thái tất cả nhóm

| Nhóm    | Đã rà                                                                                                                  | Thiếu / điều kiện tiếp theo                                                                                                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01–A06 | Baseline, nguồn, superseded, DTO generated, WBS/28 vị trí, 20 case nguồn và 10 spec bổ sung A05; guards vẫn chạy       | Chốt các open issue/rule snapshot chính thức, tên người nhận/reviewer, kiểm đầy đủ luồng vai trò trên backend thật                                                                                      |
| B01–B08 | CI/secrets/build, policy, command CAS/receipt, worker/outbox, env dev/staging; B02 chỉ kiểm tĩnh                       | Session authoritative/approved/assignments và routes R/C/K; durable transactions/constraints/audit/outbox; SQL/Google cuối dự án                                                                        |
| R01–R10 | Danh mục, quota/hồ sơ/revision/đội/CCCD/file policy, projection approved; thêm gate C/K                                | Mã trường/width được duyệt, import XLSX, master thật; atomic invalidation khi thay roster draft, file/Drive cuối dự án                                                                                  |
| C01–C10 | KO/RR/invariants, cùng trường/hạt giống, cân chuyển hạng, UTC/lịch/global person IDs; bridge R/K                       | Lưu sơ đồ/lịch/actual-start/cân, quyền ngoại lệ, giao dịch chuyển đăng ký+hạng và quyền/phân công server; template UI thật                                                                              |
| K01–K11 | Lease/confirmation/history, exact decimal, RR/medals/team points/public whitelist, API errors và graph source versions | Luật racket/precision/6+ và U02/U03/U05, K02 vắng/truất/chung kết phép, ledger/public team DTO/XLSX; chốt lại trận đã đấu khi nguồn sửa cần quyết định, không tự xóa lịch sử                            |
| D01–D05 | Gate release, reconciliation, manifest/checklist; audit hiện tại vẫn blocked đúng thiết kế                             | 20 UAT nguồn chưa chạy thật; 10 spec bổ sung A05 cũng chưa chứng minh trên backend thật; dữ liệu/tài khoản/backup/rollback/RC và tập huấn người dùng                                                    |
| I01–I08 | Kiểm dependency và phạm vi; chưa thực hiện I trong lượt này                                                            | I01/I02 cần routes/session/assignment/version rõ để queue không giả chính thức; I03/I04/I07 dịch vụ/backup/deploy cuối dự án; I05/I06 cần môi trường và diễn tập thật; I08 tiếp tục lỗi tích hợp còn mở |

7 trường/500 VĐV A05 là fixture tổng hợp, không phải số tham gia hay quota. Runtime đăng ký khởi đầu rỗng; trường tự nhập. Thư mục riêng theo `(edition_id,athlete_id)` là logical folder/outbox R02; chưa tạo Drive, chưa cấp quyền tải của VĐV. Không đổi yêu cầu này thành số thư mục thật đã tạo.

## Các phản biện còn mở trước dùng thật

- Chưa có API/session/durable state: health smoke hoặc preview không chứng minh đăng ký/xác nhận online. Các quyết định actor/scope/clock/roster/versions/file links phải đọc lại trong transaction; tuyệt đối không tin flags trong body.
- K correction đổi người đi tiếp nhưng vòng sau đã có official: bridge giữ record/lịch sử và đánh dấu stale, không tự phát người thắng mới hay overwrite; cần workflow tổ trưởng đối chiếu, audit và revision tiếp theo trước chốt lại.
- R thay roster khi C draft: phải tái dựng/chốt lại draft và invalidation lịch trong cùng transaction. Chuyển hạng C05 là workflow đặc biệt, không lách gate R bằng request trường; cần C transfer command có quyền/cân chính thức và lock hai hạng.
- Consumer nhận envelope B05 `{id,type,editionId,resourceId,version}`. K enqueue port có matchId/officialVersion, adapter phải map sang resourceId/version và cấp event ID **một lần tại lúc ghi outbox**, không cấp lại mỗi retry. rebuild request upsert theo scope/source fingerprint; tính từ official hiện hành, không cộng delta khi replay.
- Phân hạng, vắng/truất, tranh đồng hủy, điểm toàn đoàn và DTO đội chưa hoàn chỉnh. Không lấy helper generic làm kết quả hợp lệ ở mọi môn; thiếu cấu hình giữ unresolved và không công bố.
- UAT/release/restore chưa qua. Không chạy release production, tạo RC hoặc chuyển manifest sang passed để vượt cổng.

Các fix và bridge cho phép tiếp tục phát triển I với hợp đồng rõ hơn; **không chứng minh hệ thống đã sẵn sàng vận hành**.

## Kết quả kiểm chứng

`npm run check` qua: 463 test/35 file, trong đó 22 test liên nhóm mới; source/backlog/contracts, 28 kiểm tra B02 tĩnh, lint/typecheck và build toàn workspace đều qua. Quét secret và smoke dev/staging API/web/worker/shutdown qua. `node scripts/release-readiness.mjs` trả 2/ready=false đúng vì hồ sơ còn pending; không coi đó là lỗi môi trường hoặc trạng thái Accepted. [Verification](verification.json) ghi phạm vi; chưa chạy SQL/Google/Netlify hoặc backend UAT.
