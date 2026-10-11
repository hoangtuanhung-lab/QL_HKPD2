# Trích đoạn plan HKPD liên quan B02 (Database migration và seed)

> Trích nguyên văn từ file Plan_phat_trien_phan_mem_HKPD_nhom_28_nguoi.docx (lập 10/10/2026, cập nhật 11/10/2026) để ca làm việc sau không phải đọc lại cả plan (~156 KB). Số dòng gốc ghi ở mỗi đoạn. Nếu plan đổi phiên bản, đọc lại bản gốc và cập nhật file này.

---

## [Mục 2 - Cơ cấu nhóm] (dòng gốc 36-62)

# 2 Cơ cấu 7 nhóm với 28 lập trình viên

---

**Nhóm** **Số người** **Mã nhân sự và phạm vi**

---

G1 Điều phối 2 L01 kiến trúc và API; L02 nghiệp vụ,
và kiến trúc backlog, tích hợp và nghiệm thu

G2 Nền tảng và 6 P01, P02, P03 dữ liệu/API/audit; S01, S02,
bảo mật S03 tài khoản/phân công/hồ sơ và tệp

G3 Danh mục và 4 R01 danh mục; R02 hồ sơ/import; R03 đăng
đăng ký ký/duyệt/đội; R04 màn hình trường/quản trị

G4 Thi đấu và 4 C01 KO/hạt giống; C02 vòng tròn; C03
lịch lịch/cân/chuyển hạng; C04 giao diện thi đấu

G5 Kết quả và 4 K01 nhập/xác nhận; K02 trạng thái; K03 thuật
xếp hạng toán huy chương; K04 môn/toàn đoàn và chốt

G6 Giao diện 3 F01 thành phần chung; F02 công
chung và công khai/in/xuất/hướng dẫn; F03 ngoại tuyến
khai

G7 Kiểm thử và 5 Q01 thuật toán; Q02 API/quyền; Q03 E2E/UAT;
vận hành O01 CI/CD; O02 backup/restore/VPS
------------------------------------------------------------------------

---

## [Mục 3 - Kiến trúc và module] (dòng gốc 87-160)

# 3 Kiến trúc thực hiện và ranh giới module

## 3.1 Phương án kỹ thuật ban đầu

Đề xuất một backend chia module rõ ràng trong một ứng dụng, một cơ sở dữ
liệu PostgreSQL, frontend TypeScript với React, API REST có OpenAPI, xử
lý tác vụ dài bằng worker. Không cần tách nhiều microservice cho quy mô
7 trường/khoảng 500 VĐV; nhóm lớn được tổ chức bằng quyền sở hữu module
và kiểm thử hợp đồng.

Frontend triển khai Netlify theo yêu cầu. Backend và worker thiết kế
chạy độc lập, đóng gói container để chuyển VPS; chọn nơi chạy ban đầu
trong P0 sau khi kiểm tra chi phí, giới hạn nền tảng và lịch tác vụ.
Không đặt công việc sao lưu dài hoặc toàn bộ xử lý nhập Excel vào
request trình duyệt.

Google dùng cho đăng nhập; Google Drive giữ tệp và bản sao lưu qua
adapter phía server. Thay nhà cung cấp tệp hoặc chuyển database không
làm đổi mã VĐV và quy tắc tính điểm. Phiên bản thư viện, OAuth, hạn mức
dịch vụ phải được kiểm chứng khi bắt đầu code, không cố định theo thông
tin chưa kiểm tra trong plan.

## 3.2 Module và quyền sở hữu

---

**Module** **Nhóm chủ **Module khác sử dụng qua**
trì**

---

identity và S Policy API dùng user, kỳ giải, vai trò môn,
permissions checklist, trường

catalog và R/P Danh mục có phiên bản và snapshot cấu hình
editions kỳ giải

athletes và R ID nội bộ, mã VĐV hiển thị, danh sách đăng
registrations ký đã duyệt

competition và C Draw version, bracket node, round, match,
scheduling schedule version

results và K Bản nhập, quyết định xác nhận, kết quả chính
status thức và trạng thái

rankings và K Bảng điểm có phiên bản, nguồn tính và trạng
awards thái sơ bộ/chính thức

files và S Liên kết tệp có kiểm tra quyền; không phát
privacy URL Drive công khai mặc định

audit và P Sự kiện nghiệp vụ sau commit, dữ liệu thông
notifications báo theo người nhận

offline và F API đồng bộ bản nhập; public projection chỉ
public UI dữ liệu được công bố

operations O Job sao lưu, khôi phục, migration, giám sát
-------------------------------------------------------------------------

Không gọi chéo repository hoặc ghi trực tiếp bảng của module khác. Trong
giao dịch liên module, dùng service nội bộ do chủ module cung cấp. P01
quản lý migration dùng chung, nhưng chủ nghiệp vụ chịu trách nhiệm ý
nghĩa dữ liệu.

## 3.3 Cấu trúc repository đề xuất

Một monorepo: apps/web, apps/api, apps/worker; packages/contracts,
packages/rules, packages/ui, packages/test-fixtures; docs/business,
docs/architecture, docs/api, docs/runbooks; infra. Mỗi nhóm sửa thư mục
mình sở hữu. CODEOWNERS yêu cầu chủ module rà soát; contracts và
migration cần L01/P01 rà soát.

Đề xuất thống nhất formatter, lint, type-check và lệnh test từ đầu. Dùng
một framework backend được nhóm lựa chọn tại P0; không pha nhiều
framework hoặc tự tạo hai lớp xử lý cùng một nghiệp vụ.

---

## [Mục 4 - Dữ liệu và máy trạng thái] (dòng gốc 162-243)

# 4 Dữ liệu cần thiết kế trước khi chia code

## 4.1 Các nhóm bảng chính

---

**Nhóm** **Thực thể cốt lõi** **Ràng buộc cần thực hiện**

---

Kỳ giải và edition, school, catalog_node, Tách kỳ giải; mã nội dung ổn
danh mục event_definition, định; STT phân cấp chỉ để hiển
rule_version, event_snapshot thị

Tài khoản user, membership, Vai trò theo môn; checklist
role_assignment, theo nội dung; mã trường để
referee_assignment đối soát

Học sinh student_master, athlete, ID nội bộ riêng; mã VĐV duy
athlete_code_sequence, nhất trong kỳ/trường; CCCD mã
private_identity hóa

Đăng ký registration, Tách nháp/gửi/duyệt; một
registration_revision, team, đội/trường/nội dung; giới hạn
team_member trong giao dịch

Thi đấu draw, draw_version, Nhánh cố định; ảo không tạo
bracket_node, round, match, athlete; version chống ghi đè
schedule_revision

Kết quả result_submission, Bản chờ riêng; chỉ pointer
official_result, confirmation, chính thức được đổi khi xác
result_revision nhận hợp lệ

Trạng thái participation_decision, Phép/truất/khôi phục có phạm
restoration_decision, vi; cân chính thức khác cân
weight_record đăng ký

Xếp hạng ranking_run, ranking_row, Gắn nguồn/rule version; điểm
award, penalty, publication thi đấu khác điểm thành
tích/quy đổi

Tệp và file_object, file_link, Quyền xem liên kết; nhật ký
lịch sử audit_event, notification, trước--sau; phát sự kiện sau
outbox_event commit

Vận hành edit_lease, sync_submission, Khóa có hạn; idempotency; sao
backup_manifest, job_run lưu có checksum, trạng thái
khôi phục
------------------------------------------------------------------------

UUID là khóa kỹ thuật đề xuất; mã VĐV như 01.012 là chuỗi hiển thị,
không chuyển sang số và không mất số 0. Unique theo kỳ giải/trường/STT.
Cấp số trong transaction, không dùng cách đọc số lớn nhất rồi cộng ở
client.

Các trường thành tích dùng kiểu và độ chính xác theo môn; cân 0,1 kg có
thể lưu đơn vị 100 gram dạng số nguyên. Không dùng float để quyết định
bằng nhau. Quy tắc làm tròn thời gian/khoảng cách chưa chốt phải giữ
nguyên dữ liệu và đặt cấu hình được đối chiếu trước dùng chính thức.

Ảo là loại vị trí trên sơ đồ, không phải người. Số đăng ký, số đã duyệt,
số thực tế thi, số hợp lệ và số tính huy chương là các giá trị khác
nhau; không dùng một cột count cho tất cả.

## 4.2 Máy trạng thái và giao dịch

Đề xuất vòng đời đăng ký: Nháp → Gửi duyệt → Đã duyệt hoặc Trả lại; bản
sửa tạo revision mới, bản cũ duyệt vẫn có hiệu lực. Hồ sơ mới cần duyệt
dữ liệu gốc trước duyệt đăng ký khi xã có danh sách chung.

Kết quả: Bản nhập → Chờ xác nhận → Chính thức. Sửa tạo bản đề nghị
riêng; không duyệt thì bản chính thức không đổi. Xác nhận cập nhật kết
quả, audit và outbox trong cùng transaction. Nếu base version thay đổi,
báo xung đột và yêu cầu xem lại; không tự lấy bản gửi sau cùng làm đúng.

Bảng tổng hợp: Sơ bộ → Đã chốt. Khi kết quả chính thức thay đổi, đánh
dấu các bảng phụ thuộc về sơ bộ; chốt lại theo quyền. Công khai chỉ lấy
dữ liệu có phạm vi công bố đã được chốt; tuyệt đối không đọc bảng
submission trực tiếp.

Nội dung có trạng thái Chưa tổ chức, Đang thi, Hoàn thành, Hủy/Ngừng tổ
chức; cần trường started_at để kiểm tra chuyển hạng. Định nghĩa chính
xác thao tác ghi bắt đầu và người được ghi được đưa vào U04, không âm
thầm suy ra từ chỉ lịch dự kiến.

---

## [Mục 5 - Hợp đồng API] (dòng gốc 245-313)

# 5 Hợp đồng API và cách làm song song

## 5.1 Các hợp đồng tối thiểu

---

**Hợp **Đầu ra cần có trước code **Chủ trì**
đồng** tích hợp**

---

API v1 Đường dẫn, phương thức, schema L01 và chủ module
request/response, lỗi, phân  
trang, ví dụ

Quyền thao Actor, vai trò theo môn, S01/S02
tác trường, checklist, phạm vi kỳ  
giải

DTO ID, mã hiển thị, edition_id, P01/R01/R02
VĐV/nội event_id, version, nhãn nhóm  
dung

Kết quả Discriminated schema thời K01 và C04
môn gian/khoảng cách/tổng điểm/tỷ  
số/hiệp/thẻ

Đầu vào Danh sách đủ điều kiện, seed, C01/C02/K03
thuật toán bốc thăm, rule snapshot, trạng
thái

Sự kiện Event ID, loại, aggregate P03
ID/version, actor,  
occurred_at, payload version

Ngoại Client operation ID, base F03/K01/S02
tuyến version, assignment snapshot,  
payload, sync state

Public Whitelist trường dữ liệu và F02/S03/K04
view trạng thái được đọc; không hồ  
sơ nhạy cảm
------------------------------------------------------------------------

Hợp đồng ổn định v1 là điều kiện bắt đầu code song song có tích hợp.
Frontend dùng mock server sinh từ cùng hợp đồng; backend chạy contract
test với ví dụ đó. Thuật toán dùng fixtures độc lập, không chờ màn hình
xong. Mock chỉ hỗ trợ phát triển, không thay chứng cứ nghiệm thu với
backend thật.

Không đổi schema âm thầm. Thay đổi tương thích có field tùy chọn/phiên
bản; thay đổi phá vỡ cần ghi đề nghị, người dùng API liên quan và kế
hoạch chuyển đổi. Không đặt một người tạo mọi endpoint cho 28 người đợi;
chia hợp đồng theo module, L01 kiểm tra phần giao nhau.

## 5.2 Nhóm endpoint dự kiến

Các nhóm: /v1/editions, /catalog, /students, /athletes, /registrations,
/assignments, /draws, /matches, /submissions, /confirmations,
/participation-decisions, /weights, /rankings, /public, /files, /sync,
/backups. Tất cả nghiệp vụ nội bộ có edition scope; public API chỉ đọc
và trả whitelist.

Các command cần idempotency: gửi đăng ký, tạo vòng đấu, xác nhận kết
quả, chuyển hạng, hủy trận, nhận đồng bộ, tạo sao lưu. Không cho client
gửi sẵn huy chương hoặc điểm toàn đoàn để server tin nhận.

Sự kiện mẫu: RegistrationApproved, DrawFinalized,
OfficialResultConfirmed, ParticipationDecisionChanged,
WeightTransferConfirmed, EventCancelled, RankingInvalidated,
PublicationFinalized. Tính điểm chỉ được kích hoạt từ nguồn hợp lệ; dùng
outbox và deduplicate để không cộng điểm hai lần khi worker chạy lại.

---

## [Mục 7.2 - Bảng P1 (có B02)] (dòng gốc 421-466)

## 7.2 P1 Nền tảng để mở nhiều nhánh song song

---

**Mã và **Công việc và tiêu chí hoàn thành** **Phụ thuộc** **Ngày
chủ trì** công**

---

B01\ Repository CI và nhánh phát hành\ A02 4
O01 Nghiệm thu: Lint, type-check, test,  
build, secret scan chạy tự động; PR lỗi  
không được hợp nhất.

B02\ Database migration và seed\ A03 5
P01 Nghiệm thu: Dựng sạch được database,  
seed và rollback/recovery migration thử;  
mã VĐV giữ số 0.

B03\ Google login và policy nền\ A03/B02 5
S01 Nghiệm thu: Server kiểm role/môn/trường;  
tài khoản chưa duyệt bị chặn ghi dữ  
liệu.

B04\ API nền giao dịch và version\ A03/B02 5
P02 Nghiệm thu: Idempotency, optimistic  
concurrency, phân trang/lỗi chuẩn; gửi  
command lặp không ghi hai lần.

B05\ Audit outbox và worker nền\ B02/B04 5
P03 Nghiệm thu: Dữ liệu/audit/outbox commit  
cùng nhau; chạy lại event không gây tác  
dụng trùng.

B06\ Lưới modal form và mock server\ A03/A04 5
F01 Nghiệm thu: UI chung tiếng Việt,  
responsive; mock dùng contract đã thống  
nhất.

B07\ Dev staging và cấu hình bí mật\ B01 4
O01/O02 Nghiệm thu: Môi trường tách biệt, không  
có dữ liệu học sinh thật ở test, có log  
không lộ CCCD/token.

B08\ Contract test và policy matrix\ B03/B04 4
Q02 Nghiệm thu: API thực so khớp schema;  
test cấm truy cập chéo trường/môn và lỗi  
version.
---------------------------------------------------------------------------

---

## [Mục 8-9 - Phụ thuộc, quy trình ticket, migration] (dòng gốc 722-812)

# 8 Phụ thuộc và cách phân công đồng thời

Đường phụ thuộc chính: A01/A03 → B02/B03/B04 → R02/R04/R06 → C01/C03 →
K01 → K04/K05/K06 → K07/K09 → I06 → D01/D03. Nếu một mắt xích trễ, nhóm
khác vẫn có thể làm phần độc lập qua hợp đồng; không nghiệm thu giả phần
đã mock.

Ngay P0, C01/C02/K03 làm fixture và đặc tả thuật toán; F01/C04/R04 dựng
wireframe; Q tạo kịch bản; O dựng môi trường. P1 sau hợp đồng, R/S/C/K/F
mở nhánh riêng. Các nhóm G3, G4, G5 làm cả endpoint và màn hình module,
F tập trung UI dùng chung, công khai và ngoại tuyến để tránh trở thành
nút thắt frontend.

---

**Luồng bàn **Bên giao** **Bên nhận** **Điều kiện đủ**
giao**

---

Danh sách R C và S event snapshot, athlete/team
đã duyệt ID, school, eligibility,
revision

Sơ đồ lịch C/S K và F match/round ID, node links,
và phân schedule version, quyền nhập
công

Kết quả K01 K03/K04/P03 official revision, decision
chính thức scope, audit và outbox đã
commit

Xếp hạng và K04 F02 ranking version, rule version,
công bố trạng thái công bố và whitelist

Tệp sao lưu S/O O02 manifest, checksum, phiên bản
schema, ID file và khóa phục
hồi
-------------------------------------------------------------------------

Mỗi kỹ sư giữ tối đa một ticket đang code và một PR đang review. PR nhỏ
theo lát nghiệp vụ, mục tiêu 1--3 ngày làm việc; không giữ nhánh module
suốt nhiều tuần. Nhánh feature tắt mặc định cho phần chưa hoàn thiện,
nhưng kiểm thử vẫn chạy.

Họp ngắn đầu ngày trong nhóm; họp phụ thuộc liên nhóm ba lần/tuần do
L01/L02 điều phối; demo người dùng hằng tuần trên staging. Có hàng đợi
review và ít nhất một reviewer dự phòng mỗi module. L01 không phải duyệt
mọi dòng UI, chỉ thay đổi hợp đồng/kiến trúc và giao điểm rủi ro.

# 9 Quy trình phát triển cho từng ticket

## 9.1 Điều kiện nhận việc

Bắt buộc áp dụng quy trình mục 18: phân tích nhiệm vụ, xác định sản phẩm
đầu vào, kiểm tra đã có và dùng được; chỉ thực hiện bước phụ thuộc khi
đủ đầu vào. Checklist ghi người cung cấp, phiên bản và bằng chứng kiểm
tra.

Ticket có mã WBS/mã yêu cầu, mục tiêu, in/out of scope, contract
version, mock/fixture, quyền, lỗi dự kiến, acceptance scenarios, phụ
thuộc và estimate. Nếu thiếu ngưỡng luật, ticket ghi U tương ứng và chỉ
làm cấu trúc; không hardcode giá trị tự nghĩ.

## 9.2 Quy trình thực hiện

Developer tạo branch từ main, viết hoặc cập nhật contract/fixture theo
trách nhiệm, triển khai module, thêm test cho hành vi có rủi ro, chạy
local checks và gửi PR. PR mô tả hành vi trước--sau, mã yêu cầu,
migration, ảnh màn hình nếu UI, test đã chạy và cách rollout.

Reviewer chủ module kiểm nghiệp vụ, quyền server, đồng thời/version và
ảnh hưởng module khác. CI chạy test liên quan và contract. Sau merge
triển khai staging tự động, QA kiểm scenario rồi demo cho người dùng;
phản hồi tạo ticket/change request, không thay luật qua tin nhắn không
được lưu.

Definition of Done: code được review, CI qua, acceptance đạt với dữ liệu
thật của staging, audit/permission đúng, không lộ bí mật, migration/docs
cập nhật, không phá public contract, có bằng chứng test và phiên bản bàn
giao. Hoàn thành UI bằng mock chưa đủ Done của feature tích hợp.

## 9.3 Quy tắc migration và tích hợp

Mỗi migration có ID duy nhất do pipeline kiểm tra; không sửa migration
đã chạy trên môi trường chung. Dùng thêm trường/bảng → triển khai code
tương thích → backfill → chuyển đọc → loại trường cũ ở release sau.
Không drop cột đang dùng để đổi schema nhanh.

Main luôn build được; merge queue hoặc thứ tự merge do O01 quản lý khi
nhiều PR chạm schema/contracts. PR liên module có danh sách người dùng
API và kiểm thử tích hợp. Không tách nhánh theo từng lập trình viên rồi
ghép hàng loạt ở cuối phase.

---

## [Mục 11.3 - Hồ sơ nhạy cảm] (dòng gốc 927-933)

## 11.3 Hồ sơ nhạy cảm

Mã hóa CCCD phía server, khóa bí mật ngoài repository và database dump;
che số trong response theo policy. Tra cứu tự điền chỉ cùng trường, có
rate limit và audit; không ghi CCCD đầy đủ vào URL, log, thông báo hoặc
file test. Download tệp qua kiểm quyền hoặc liên kết có thời hạn, không
dùng liên kết Drive mở mọi người để tiện test.

---

## [Mục 12 - Sao lưu/phục hồi/VPS] (dòng gốc 935-960)

# 12 Sao lưu phục hồi triển khai và chuyển VPS

Job sao lưu gồm database, manifest phiên bản schema, thông tin liên
kết/tệp cần thiết và checksum. Cần xác định bản sao lưu có bảo toàn
bytes tệp và khả năng truy cập hay chỉ liên kết; mất quyền Drive không
được coi là phục hồi hoàn chỉnh. Kiểm retention theo bản mỗi giờ 7 ngày,
mỗi ngày 30 ngày, cuối giải lâu dài; không xóa bản cuối giải qua job dọn
chung.

Khôi phục có màn hình chọn bản và lý do, chỉ quản trị. Sao lưu hiện
trạng trước; tạm khóa ghi trong cửa sổ khôi phục, kiểm schema, giải
mã/tệp và số bản ghi trước công bố kết quả. Điều phối kỹ thuật chốt
phương án phục hồi trên môi trường thử trước tác động môi trường thật.

Mỗi môi trường dev/staging/production có database, OAuth config và thư
mục Drive riêng. Bí mật cấu hình được inject lúc chạy; không để thông
tin thực trong frontend bundle. Worker có job status, retry có giới hạn
và alert thất bại; theo dõi login, error, lease, sync backlog, audit và
backup.

Đường chuyển VPS: đóng gói cùng backend/worker, tạo database mục tiêu,
backup/export có schema version, khóa ghi ngắn, import/đối chiếu, chuyển
cấu hình endpoint, kiểm OAuth origin và thư mục tệp, chạy smoke test rồi
mở ghi. Nếu thất bại trước mở ghi, quay lại nguồn; nếu đã có ghi mới,
phải replay/chuyển dữ liệu theo runbook, không trỏ về bản cũ làm mất kết
quả.

---

## [Mục 13 - Mã U] (dòng gốc 962-1007)

# 13 Những thông tin cần bổ sung khi code

---

**Mã** **Thiếu hoặc cần quyết định** **Nhóm chịu trách nhiệm
và mốc**

---

U01 Tệp danh mục đầy đủ, điều lệ và hạn R01/L02 trước nghiệm
mức/nhóm tuổi/hạng cân thu R01/R04; tiếp tục
làm cơ chế import bằng
fixture

U02 Biểu mẫu từng môn, độ chính xác/làm tròn K01/L02 trước nghiệm
thành tích, điểm xử thua từng hiệp thu K03/K04; không
hardcode

U03 Quy tắc xếp hạng trường trong môn, K03/K04/L02 trước G4;
điểm/hạng ngoài phạm vi đã chốt không công bố toàn đoàn
khi chưa đối chiếu

U04 Cách ghi nhận trận đã bắt đầu và quyền C03/L02 trước nghiệm
thao tác bắt đầu thu C05; bảo toàn
nguyên tắc không chuyển
sau bắt đầu

U05 Phân hạng khi hủy trận tranh đồng và điều K03/L02 trước nghiệm
kiện chốt nội dung bị ảnh hưởng thu K05

U06 Cấu hình backend/worker/database ban đầu, L01/O01/O02 trong P0;
Drive và chi phí thực hiện thử tích hợp,
không tự mua dịch vụ

U07 Biểu mẫu in, vị trí cuối nút xác nhận và F02/C04/R04 khi demo;
thống nhất nhấp tên không cản engine nghiệp
vụ

U08 Chính sách xóa nội dung chưa có đăng ký, R01/S02/L02 trước chức
phạm vi đổi checklist khi giải chạy năng tương ứng; giữ dữ
liệu khi chưa đủ quyết
định
---------------------------------------------------------------------------

Các mã U là việc đối chiếu và cập nhật trong quá trình code theo yêu cầu
người dùng, không phải yêu cầu trả lời thêm tất cả trước khi bắt đầu.
Thông tin đã chốt trong 293 câu không bị mở lại chỉ vì developer chưa
đọc. Mỗi đề xuất mới ghi rõ lý do, phạm vi tác động và quyết định sau
review.

---

## [Mục 16.3 - Dữ liệu và định danh (QT08-QT12)] (dòng gốc 1123-1158)

## 16.3 Dữ liệu và định danh

---

**Mã** **Quy định bắt buộc** **Chủ quản và bằng
chứng**

---

QT08 ID kỹ thuật tách mã VĐV, STT và tên hiển P01/R02; test cấp mã
thị. Mã VĐV lưu chuỗi, giữ số 0 như đồng thời và giữ mã khi
01.012; cấp ở server trong transaction, có rút.
unique constraint. Không lấy số lớn nhất ở
client rồi cộng 1.

QT09 Đăng ký, sơ đồ, kết quả, xếp hạng có phạm P01 cùng R/C/K; test
vi kỳ giải. Dùng mã trường thống nhất. Đội truy cập chéo kỳ và
theo trường và nội dung; vị trí ảo không trùng đội.
tạo hồ sơ athlete.

QT10 Tách số đăng ký, đã duyệt, thực tế thi, C/K/Q01; từ điển dữ
hợp lệ và số dùng xét huy chương. Không liệu và fixtures xét
dùng một cột count cho tất cả. giải.

QT11 Thống nhất đơn vị, độ chính xác và cách K01/K03/P01; schema và
biểu diễn theo môn. Cân đăng ký khác cân test giới hạn, bằng
chính thức; bảo toàn 0,1 kg khi áp dụng. nhau.
Không dùng float thiếu kiểm soát để xét  
bằng nhau.

QT12 Clone kỳ giải chỉ sao chép cấu hình được R01/P01; test clone và
phép. Không sao chép đăng ký, sơ đồ, kết kiểm audit.
quả. Không xóa lịch sử để sửa lỗi hoặc làm
sạch màn hình.
---------------------------------------------------------------------------

Hai request tranh suất cuối phải được kiểm tra trong giao dịch; không
cấp trùng mã, không vượt hạn mức và không tạo trùng đội dù gửi đồng
thời.

---

## [Mục 16.11-16.12 - Database, nghiệm thu (QT36-QT40)] (dòng gốc 1319-1354)

## 16.11 Database và hợp nhất code

---

**Mã** **Quy định bắt buộc** **Chủ quản và bằng
chứng**

---

QT36 Migration mã duy nhất; không sửa bản đã P01/L01; CI migration
chạy ở môi trường chung. Đổi schema có và thử recovery.
tương thích và phương án dữ liệu; xóa  
cột/bảng phải rà soát nơi dùng và phục  
hồi.

QT37 Nhánh từ main, phạm vi nhỏ và cập nhật Chủ module; mẫu PR và
thường xuyên. PR ghi mục tiêu, mã yêu cầu, review lưu trong
trước--sau, migration, test và rollout. Có repository.
reviewer khác người thực hiện.

QT38 Build, type-check và test liên quan phải O01/Q; pipeline và báo
đạt. Phần chưa hoàn thiện không làm hỏng cáo kết quả.
main hoặc lộ tính năng chưa sẵn sàng. Lỗi  
có nguy cơ lặp lại cần test tái hiện.
---------------------------------------------------------------------------

## 16.12 Điều kiện nghiệm thu ticket và phase

QT39: Ticket Accepted cần đúng yêu cầu/phạm vi; kiểm quyền server; kiểm
đầu vào, trạng thái và version; tích hợp theo contract; test có bằng
chứng; reviewer chấp nhận; tài liệu/migration cập nhật; chạy được trên
staging với backend thật. UI dùng mock chỉ hoàn thành đầu việc UI, chưa
đủ nghiệm thu feature xuyên suốt.

QT40: G0 kiểm chủ quản và bộ tài liệu tối thiểu; G1 kiểm
contract/policy/schema/CI; G2 kiểm QT08--QT18 và đăng ký; G3 kiểm
QT23--QT25 và sơ đồ; G4 kiểm QT19--QT30 và kết quả; G5 kiểm QT31--QT38
và vận hành; G6 kiểm QT39 cùng bộ bàn giao. Q ghi bằng chứng, L02 theo
dõi; người dùng rà soát chuyên môn qua demo/UAT.

---

## [Mục 16.13 - Bộ tài liệu bàn giao] (dòng gốc 1356-1397)

## 16.13 Bộ tài liệu dùng chung phải bàn giao

---

**Tài liệu** **Nội dung và nơi lưu đề xuất** **Chủ quản và mốc**

---

Đặc tả và truy docs/business: quy tắc, nguồn, L02; khung P0, cập nhật
vết thay thế; yêu cầu → WBS → module mỗi CR
→ test

Ma trận phân docs/business/permissions: vai S01/S02; P0/P1 trước
quyền trò, thao tác, phạm vi, điều kiện tích hợp

Từ điển dữ liệu docs/architecture/data: trường, P01; P0/P1 và mỗi
kiểu, đơn vị, constraint, dữ liệu migration
nhạy cảm

Hợp đồng API docs/api và packages/contracts: L01/chủ module; trước
OpenAPI, schema, lỗi, quyền, code tích hợp
version, ví dụ

Bảng chuyển docs/business/states: đăng ký, R/C/K; trước ticket
trạng thái trận, kết quả, tổng hợp, kỳ giải; tương ứng
guard và tác động

Bộ quy tắc tính packages/rules và C01/C02/K03; thiết kế
toán docs/business/rules: thuật toán từ P0
có version, ví dụ và ngoại lệ

Quy chuẩn giao packages/ui và docs: nhãn, màu, F01; P0/P1 và demo
diện thành phần, mẫu khóa/lỗi/lưu

Bộ nghiệm thu packages/test-fixtures và test Q01/Q02/Q03; từ P0
suites: đầu vào, expected, nguồn  
quyết định

Phát hành và docs/runbooks: deploy, backup, O01/O02; khung P1, diễn
phục hồi restore, chuyển VPS, sự cố tập P5

Sổ thay đổi docs/business/changes: CR, tác L02/L01; từ P0
động, quyết định và version; ADR  
kỹ thuật riêng
-------------------------------------------------------------------------

---

## [Mục 17.2 - Nhóm G2 (P01 ...)] (dòng gốc 1507-1601)

## 17.2 G2 Nền tảng và bảo mật

Nhân sự: 6 người. Nhóm trưởng dự kiến P01. Mã vị trí: P01, P02, P03,
S01, S02, S03.

---

**Vị **Nhiệm vụ cá nhân** **WBS chủ trì hoặc
trí** phối hợp**

---

P01 Thiết kế lược đồ và từ điển dữ liệu; quản Chủ trì: B02. Phối
lý migration/seed; ràng buộc mã và hạn mức; hợp: A03.
rà thay đổi database của các nhóm.

P02 Viết API nền và giao dịch; chuẩn hóa Chủ trì: B04.
lỗi/phân trang; chống gửi trùng và ghi đè  
version; cung cấp cơ chế khóa và  
transaction.

P03 Viết audit, outbox, worker và thông báo; Chủ trì: B05, K10.
bảo đảm commit nhất quán, retry không Phối hợp: K07.
trùng; phối hợp tính lại khi sửa chính  
thức.

S01 Google login và phê duyệt tài khoản; policy Chủ trì: B03. Phối
theo kỳ/môn/trường; ngăn ghi khi chưa hợp: D02.
duyệt; rà quyền tài khoản thật trước phát  
hành.

S02 Phân công tổ trưởng/trọng tài và checklist Chủ trì: R08. Phối
nội dung; chặn cùng trường đúng phạm vi; hợp: I02.
kiểm thiếu trọng tài và đổi phân công khi  
offline.

S03 Mã hóa/che CCCD; tra hồ sơ cùng trường; Chủ trì: R09, I03.
kiểm quyền ảnh/PDF/biên bản; viết adapter Phối hợp: R03.
Drive, retry và tải tệp bổ sung.
-------------------------------------------------------------------------

---

**Phase** **Nhiệm vụ của nhóm** **Đầu ra và bên nhận**

---

P0 A03 phối hợp Hợp đồng DTO A03: VĐV, kỳ giải, nội dung, đăng ký,
và schema lõi trận, submission/version được định
nghĩa thống nhất.

P1 B02 chủ trì Database B02: Dựng sạch được database, seed và
migration và seed; B03 chủ rollback/recovery migration thử; mã
trì Google login và policy VĐV giữ số 0.; B03: Server kiểm
nền; B04 chủ trì API nền role/môn/trường; tài khoản chưa duyệt
giao dịch và version; B05 bị chặn ghi dữ liệu.; B04:
chủ trì Audit outbox và Idempotency, optimistic concurrency,
worker nền phân trang/lỗi chuẩn; gửi command lặp
không ghi hai lần.; B05: Dữ
liệu/audit/outbox commit cùng nhau;
chạy lại event không gây tác dụng
trùng.

P2 R03 phối hợp Import và bảo R03: Xem trước CSV/Excel; tra CCCD
vệ dữ liệu gốc; R08 chủ trì chỉ cùng trường; mã hóa và che số
Tổ trọng tài checklist và đúng quyền.; R08: Không có Cập nhật
xung đột; R09 chủ trì Tệp hộ; chặn phân công thiếu người hợp
và quyền xem hồ sơ lệ; khóa dòng cùng trường đúng phạm
vi.; R09: Ảnh/PDF gắn trận/hồ sơ;
nhiều liên kết; nhà trường chỉ xem
biên bản trận mình.

P3 Chuẩn bị hoặc tích hợp với Tài liệu/PR/test của phạm vi nhóm;
sơ đồ/lịch theo phụ thuộc ghi rõ U/CR, người nhận và phiên bản.

P4 K07 phối hợp Chốt và tính K07: Sửa kết quả chính thức chuyển
lại bảng phụ thuộc; K10 chủ bảng về sơ bộ, rebuild cho cùng kết
trì Thông báo liên kết theo quả, không cộng trùng.; K10: Mở đúng
quyền đối tượng, không rò dữ liệu qua nội
dung thông báo, job gửi lặp được
deduplicate.

P5 I02 phối hợp Xung đột và I02: Giữ mọi bản; quyền cũ đổi thì
đổi phân công offline; I03 inbox chờ xem xét; không vượt quyền
chủ trì Drive adapter thật để ghi chính thức.; I03: Đứt dịch vụ
và retries; I08 phối hợp lưu trạng thái chờ, retry không trùng
Sửa lỗi tích hợp và ổn định file/liên kết; biên bản tải sau vẫn
hợp đồng dùng được.; I08: Không còn lỗi nghiêm
trọng; test lỗi mới được thêm, không
sửa luật để làm test qua.

P6 D02 phối hợp Rà dữ liệu và D02: Mã trường, danh mục, hạn mức,
tài khoản thật; D04 phối tài khoản/rule snapshot được đối
hợp Hướng dẫn và tập huấn chiếu tệp gốc.; D04: Hướng dẫn
trường, trọng tài, tổ trưởng, quản
trị và vận hành có ảnh đúng bản phát
hành.
-----------------------------------------------------------------------------

Bàn giao liên nhóm: Bàn giao auth/policy/contracts/dữ liệu/audit/tệp cho
G3--G6; G7 nhận cấu hình và test tích hợp.

---

## [Mục 18.1-18.2 - Quy trình đầu vào, bàn giao] (dòng gốc 2024-2102)

# 18 Quy trình lập trình viên và phối hợp theo sản phẩm đầu vào

## 18.1 Quy trình bắt buộc trước khi thực hiện nhiệm vụ

Quy trình của từng lập trình viên: Phân tích công việc → Rà soát sản
phẩm của mình cần những sản phẩm nào mới thực hiện được → Kiểm tra các
sản phẩm đó đã có và dùng được chưa → Nếu đủ thì thực hiện nhiệm vụ. "Đã
có" phải có bằng chứng và phiên bản đúng; không chỉ dựa vào thông báo
miệng hoặc trạng thái người cung cấp tự đánh dấu.

---

**Bước** **Công việc của lập trình **Thông tin phải ghi vào
viên** checklist**

---

1 Phân tích Đọc WBS, đặc tả và QT; xác ID/WBS gốc, phase/bước nhỏ,
định đầu ra, phạm vi, tiêu người thực hiện/reviewer,
chí nghiệm thu. Tách bước tiêu chí và phiên bản yêu
1--3 ngày công nếu cần. cầu.

2 Rà phụ Liệt kê từng sản phẩm bắt Sản phẩm đầu vào, người cung
thuộc buộc; xác định người cung cấp, ID công việc nguồn và
cấp, người sở hữu và bước phiên bản cần nhận.
sử dụng. Phân biệt  
contract/fixture cho thiết  
kế với API/build thật cho  
tích hợp.

3 Kiểm tra Kiểm link truy cập, nội Chưa có / Có nhưng chưa đạt /
đầu vào dung/schema, phiên bản, Đủ để thực hiện; link, người
quyền, test hoặc build có kiểm, thời gian và lý do.
chạy được. Đối chiếu điều  
kiện của chính bước đang  
nhận.

4 Quyết định Đủ toàn bộ đầu vào bắt buộc Thiếu gì, ai cung cấp, hạn dự
thực hiện thì chuyển Sẵn sàng rồi kiến, hành động tiếp theo và
Đang làm. Thiếu hoặc không ticket sửa nếu cần.
đạt thì Bị chặn và liên hệ  
người cung cấp qua quy  
trình nội bộ.

5 Thực hiện Code theo hợp đồng đã kiểm; PR/build/test, phiên bản đầu
test, review và cập nhật vào thực dùng, lỗi/CR và
docs. Nếu đầu vào đổi trạng thái.
version, đánh giá lại trước
tiếp tục bước bị tác động.

6 Bàn giao Gửi đầu ra có phiên bản và Sản phẩm đầu ra, người nhận,
bằng chứng cho người nhận; xác nhận nhận, ngày kiểm và
người nhận kiểm dùng được. kết quả.
Chỉ nghiệm thu khi đáp ứng  
QT39.
-----------------------------------------------------------------------

Nếu đầu vào chưa có: không tự thay luật, không ghi tích hợp đã xong,
không làm phần phụ thuộc bằng giả định chưa thống nhất. Có thể tiếp tục
phân tích hoặc bước độc lập chỉ khi chính bước đó đã đủ đầu vào; ghi
riêng trong checklist. Mock/fixture chỉ cho phép các bước được xác định
dùng mock, không thay API thật để nghiệm thu.

Đầu việc không có phụ thuộc bên ngoài ghi "Không có phụ thuộc ngoài",
nhưng vẫn cần đặc tả và tiêu chí hợp lệ. Người thực hiện tự rà ban đầu;
reviewer/nhóm trưởng xác nhận điều kiện nhận việc khi phân công. L02 xử
lý phụ thuộc chậm liên nhóm; L01 xử lý sai hợp đồng hoặc xung đột kỹ
thuật.

## 18.2 Quy tắc bàn giao liên nhóm

Một WBS có một chủ trì; phối hợp phải có phần việc và sản phẩm riêng.
Người cung cấp thông báo đầu ra cụ thể kèm ID, phiên bản, link, test và
hạn chế còn mở. Người nhận kiểm tra và phản hồi Đã nhận đủ hoặc Chưa đủ
cùng lý do. Không coi gửi link là đã nghiệm thu. Không sửa thay module
khác âm thầm; PR cần chủ module rà soát.

Contract ổn định cho phép viết phần độc lập. API thật, dữ liệu/schema
tương thích và test đạt mới cho phép tích hợp. Thay đổi
contract/schema/rule phải liệt kê người sử dụng bị ảnh hưởng, cập nhật
phiên bản, CR/ADR và checklist phụ thuộc. Các quan hệ bên dưới là phối
hợp giữa sản phẩm, không yêu cầu đợi toàn bộ module xong; tách contract,

---

## [Mục 18.3-18.4 - Ma trận phối hợp, sản phẩm bàn giao] (dòng gốc 2105-2286)

## 18.3 Ma trận phối hợp của 28 lập trình viên

---

**Người thực **Sản phẩm cần nhận** **Sản phẩm giao và người
hiện và nguồn nhận**
đầu vào**

---

L01 nhận từ Yêu cầu có phiên bản, luồng Kiến trúc, ranh giới module,
L02, P01, chủ nghiệp vụ và đề xuất hợp đồng chung cho toàn nhóm
module schema/API

L02 nhận từ Quyết định nghiệp vụ, U/CR, Đặc tả, backlog, quyết định
Người dùng, báo cáo và bằng chứng và kết luận nghiệm thu cho
L01, trưởng toàn nhóm
nhóm

P01 nhận từ Ý nghĩa thực thể, ràng buộc Schema, migration, từ điển,
L01, R02, và nhu cầu lưu dữ liệu seed cho backend; database
R03, C01, dựng thử cho O/Q
K01, K04

P02 nhận từ Contract API, schema và API nền, lỗi, transaction,
L01, P01, S01 giao diện kiểm quyền version/idempotency cho
R/C/K/F

P03 nhận từ Schema, transaction và danh Audit/outbox/worker/thông báo
P01, P02, sách sự kiện/tác động cho module; job status cho
R03, C03, O01
K01, K04

S01 nhận từ Ma trận quyền, dữ liệu tài Login/phê duyệt/policy cho
L02, P01, khoản, OAuth và môi trường R/C/K/F/Q02
P02, O01

S02 nhận từ Nội dung, vai trò, Phân công/checklist/xung đột
S01, R01, VĐV/trường, trận và lịch cho C03/K01/F03
C01, C02, C03
-----------------------------------------------------------------------

---

**Người thực **Sản phẩm cần nhận** **Sản phẩm giao và người
hiện và nguồn nhận**
đầu vào**

---

S03 nhận từ Quyền hồ sơ/tệp, định danh, Tra cứu che số, tệp có quyền
S01, P01, ID hồ sơ/trận, Drive config và adapter cho
R02, K01, O02 R02/K01/F02/O02

R01 nhận từ Danh mục/điều lệ gốc, cấu Danh mục, hạn mức, snapshot
L02, P01, P02 trúc dữ liệu và API nền cho R03/S02/C/K

R02 nhận từ Schema học sinh/VĐV, cấp Hồ sơ/mã/import/dữ liệu gốc
P01, P02, mã, quyền CCCD, mẫu import duyệt cho R03/R04/C/K
S01, S03

R03 nhận từ Danh mục/hạn mức, hồ sơ, API đăng ký/đội/duyệt; danh
R01, R02, policy, transaction/version sách duyệt cho
S01, P02 R04/C01/C02/S02/K01

R04 nhận từ UI chung, API danh mục/hồ Màn hình trường/quản trị cho
F01, R01, sơ/đăng ký, quyền và lỗi Q03 và L02 demo
R02, R03, S01 mẫu

C01 nhận từ Danh sách duyệt, school ID, KO/draw/node/match/nhánh cho
R03, R01, thể thức/rule snapshot và C03/C04/K01/Q01
P02, L02 hạt giống

C02 nhận từ Danh sách duyệt, nội dung Round/cặp/nghỉ/match cho
R03, R01, và luật vòng tròn C03/C04/K01/K03/Q01
P02, L02
-----------------------------------------------------------------------

---

**Người thực **Sản phẩm cần nhận** **Sản phẩm giao và người
hiện và nguồn nhận**
đầu vào**

---

C03 nhận từ Trận/vòng, phân công, hạn Lịch/lượt/làn/xung đột/chuyển
C01, C02, mức, trạng thái bắt đầu và hạng cho C04/K01/P03/Q
S02, R03, K01 kết quả

C04 nhận từ UI chung, sơ đồ/vòng/lịch, UI thi đấu/lịch/nhập/xác nhận
F01, C01, trạng thái và kết quả theo cho Q03/L02
C02, C03, K01 quyền

K01 nhận từ Transaction/version/audit, API nhập/sửa/xác nhận/chính
P02, P03, policy/phân công, thức và sự kiện cho
S01, S02, match/nhánh, API tệp K02/K03/K04/C04/F03
C01, C02, S03

K02 nhận từ Kết quả/trạng thái, vòng Quyết định và tác động trạng
K01, C01, sau, luật vắng/truất/phục thái cho K01/K03/K04/C03/Q01
C02, L02 hồi

K03 nhận từ Chính thức, trạng thái, Hạng nội dung/huy chương/giải
K01, K02, vòng/cặp, rule snapshot, thích cho K04/F02/Q01
C02, R01, L02 tiêu chí xét giải

K04 nhận từ Hạng/điểm, thực tế thi, luật Tổng hợp có phiên bản/chốt/API
K03, K01, điểm môn/toàn đoàn/phạt công bố cho F02/Q01
K02, R01,  
P03, L02

F01 nhận từ Wireframe, thuật ngữ, trạng UI
L01, L02, thái, contract UI chung/màu/form/lỗi/khóa/mock
R04, C04, K01 cho R04/C04/F02/F03
-------------------------------------------------------------------------

---

**Người thực **Sản phẩm cần nhận** **Sản phẩm giao và người
hiện và nguồn nhận**
đầu vào**

---

F02 nhận từ UI, API public chỉ đã xác Theo dõi/in/Excel/hướng dẫn
F01, K01, nhận, tổng hợp và mẫu cho Q03/L02
K04, S03, L02 in/xuất

F03 nhận từ Contract sync/submission, Queue offline/sync/xung đột
K01, P02, operation/version, cho K01/Q02/Q03
S01, S02, C04 policy/phân công, luồng  
nhập

Q01 nhận từ Ví dụ nghiệp vụ đã đối Fixtures/property/regression
L02, R03, chiếu, input/output thuật và báo cáo cho chủ module/L02
C01, C02, toán, rule version  
K02, K03, K04

Q02 nhận từ OpenAPI, policy matrix, API Contract/quyền/đồng thời/bảo
L01, P02, thật, version/sync/tệp mật tests cho module/O01/L02
S01, S02,  
S03, K01, F03

Q03 nhận từ Build staging, tài khoản E2E/lỗi tái hiện/UAT/bằng
R04, C04, thử, seed, kịch bản và chứng cổng cho L02/chủ module
F02, F03, luồng hoàn chỉnh  
K01, O01, L02

O01 nhận từ Kiến trúc triển khai, CI/CD/môi trường/build/giám
L01, P01, migration, OAuth/worker sát/phát hành cho toàn nhóm
S01, P03, config, lệnh test  
Q02, Q03

O02 nhận từ Schema/export, manifest Backup/restore/runbook VPS/báo
P01, S03, tệp/Drive, môi trường, kết cáo cho O01/Q03/L02
O01, K04 quả đối chiếu
------------------------------------------------------------------------

K04 phụ thuộc quy tắc xếp hạng trường trong từng môn còn cần đối chiếu
điều lệ (U03). L02 cung cấp kết luận trước nghiệm thu phần đó; K04 chỉ
làm phần độc lập đã đủ đầu vào, không tự suy đoán.

## 18.4 Cấu trúc sản phẩm bàn giao tối thiểu

---

**Sản **Nội dung tối thiểu** **Người cung
phẩm** cấp chính**

---

Danh sách Kỳ/nội dung, athlete/team ID, mã VĐV, school R03 cùng
duyệt ID, eligibility, revision, rule snapshot R01/R02

Sơ đồ và Draw version, round/match ID, người/vị trí, C01/C02
vòng quan hệ nhánh, vị trí ảo, trạng thái khóa

Phân công Referee ID, môn/nội dung tick, phạm vi hiệu S02
lực, version, kiểm người hợp lệ

Lịch Match/lượt ID, sân/địa điểm/làn, thời gian, C03
version và xung đột

Bản nhập Submission/match ID, actor, payload theo môn, K01
base version, operation ID, trạng thái

Chính thức Official revision, bản nhập được duyệt, K01 cùng K02
người/thời gian xác nhận, trạng thái thi, sự  
kiện

Xếp hạng Version bảng/rule, nguồn kết quả, tiêu chí, K03/K04
điểm/huy chương, trạng thái sơ bộ/chốt

Phát hành Build/tag/commit, migration version, cấu O01 cùng O02/Q
hình, báo cáo test, phương án phục hồi
-------------------------------------------------------------------------

---

## [Mục 19 - Admin tạo giải mới] (dòng gốc 2334-2514)

# 19 Admin tạo giải mới và sao chép cấu hình

## 19.1 Phạm vi chức năng đã bổ sung

Admin có quyền tạo giải mới. Mỗi giải có ID riêng và quản lý độc lập về
cấu hình, đăng ký VĐV hoặc đội, lịch, sơ đồ, phân công trọng tài, kết
quả, xếp hạng và công bố. Đây là yêu cầu bổ sung vào kế hoạch; chưa phải
xác nhận chức năng đã được lập trình.

Màn hình quản lý giải có nút Tạo giải mới. Admin chọn Tạo mới hoàn toàn
hoặc Sao chép cấu hình từ giải trước, nhập thông tin, kiểm tra và lưu.
Giải mới luôn bắt đầu ở trạng thái Nháp; Admin kiểm tra cấu hình rồi mới
mở đăng ký. Tạo giải mới không làm thay đổi dữ liệu hoặc trạng thái của
giải nguồn.

Thông tin cấu hình gồm tên giải, năm tổ chức, đơn vị tổ chức, thời gian
tổ chức và thời hạn đăng ký; danh sách môn và nội dung; độ tuổi, hạn
mức, điều kiện tổ chức và phiên bản quy tắc áp dụng. Dữ liệu hoặc điều
lệ còn thiếu được ghi rõ theo mục 13; không tự điền luật chuyên môn.

## 19.2 Quy tắc tạo mới và sao chép

Tạo mới hoàn toàn tạo bản ghi giải Nháp và các cấu hình do Admin nhập.
Dữ liệu danh mục dùng chung được tham chiếu hoặc tạo snapshot theo thiết
kế ở mục 4; không đồng nghĩa sao chép hồ sơ đăng ký.

Khi sao chép, Admin chọn giải nguồn và các phần cấu hình muốn lấy, xem
trước rồi xác nhận tạo giải. Server chỉ sao chép các trường trong danh
sách cho phép; không sao chép toàn bộ cơ sở dữ liệu. Ghi nhận giải
nguồn, phiên bản cấu hình nguồn và người thực hiện trong lịch sử.

---

**Phần dữ **Xử lý khi tạo giải mới** **Chủ trì**
liệu**

---

Danh mục môn Cho phép chọn sao chép; tạo snapshot của giải R01 và P01
và nội dung mới, giữ ID giải mới riêng

Tuổi, hạn Chỉ lấy cấu hình được chọn; Admin rà soát phù R01 và L02
mức, điều hợp điều lệ giải mới trước khi mở đăng ký  
kiện tổ chức  
và quy tắc

Thông tin tên Admin nhập cho giải mới; không tự giữ thời R04 và R01
và thời gian hạn đăng ký đã hết của giải nguồn

Tài khoản Có thể dùng tài khoản chung đã được duyệt; S01 và S02
người dùng quyền thao tác phải gắn với giải mới

Phân công tổ Admin thực hiện cho giải mới; không tự sao S02
trưởng và chép phân công, checklist hoặc quyền theo  
trọng tài giải nguồn

Đăng ký VĐV Không sao chép; trường đăng ký lại trong giải R03
hoặc đội mới theo quy trình đã chốt

Sơ đồ, lịch Không sao chép; huy chương, xếp hạng và lịch C và K
và kết quả sử xác nhận của giải cũ không đi theo
------------------------------------------------------------------------

Không sửa giải nguồn khi đổi cấu hình giải mới. Rule snapshot của giải
mới có phiên bản riêng. Mã VĐV vẫn tuân thủ phạm vi kỳ giải/trường và
giữ số 0 như mục 4; không lấy mã hoặc thứ tự đăng ký cũ làm đăng ký mới.

## 19.3 Quyền và kiểm tra trước khi mở đăng ký

Server kiểm tra quyền Admin và phạm vi giải ở mọi thao tác tạo, sao
chép, sửa cấu hình và mở đăng ký. Ẩn nút trên giao diện không thay thế
kiểm tra quyền ở API. Nhà trường, trọng tài, tổ trưởng và người theo dõi
không được tạo giải mới nếu chỉ có những vai trò này.

Trước khi mở đăng ký, kiểm tra thông tin bắt buộc, mốc thời gian hợp lệ,
ít nhất một nội dung hoạt động, cấu hình tuổi/hạn mức/điều kiện và phiên
bản quy tắc cần thiết. Thiếu cấu hình bắt buộc thì giữ Nháp, chỉ rõ lỗi
để Admin sửa. Kiểm tra đủ VĐV và đủ trường tổ chức thuộc giai đoạn chốt
đăng ký và tổ chức thi đấu; không lấy điều kiện này để ngăn tạo giải
Nháp.

Hợp đồng trạng thái tối thiểu bổ sung: Nháp → Mở đăng ký. L02 và R01 đối
chiếu các trạng thái tiếp theo với quy trình đã chốt trước khi tích hợp;
không đặt lại trạng thái hoặc mở đăng ký trở lại trái điều lệ.

Mọi API và truy vấn dữ liệu của giải phải xác định edition_id. Không đọc
đăng ký, kết quả hoặc quyền từ giải đang chọn ở client mà bỏ kiểm tra
server. Trình duyệt chuyển giải phải tải lại phạm vi quyền và dữ liệu
tương ứng.

## 19.4 Phân công triển khai theo phase và đầu vào

Bổ sung các bước nhỏ dưới WBS hiện có, không đổi chủ trì hoặc tạo gói
WBS trùng. Tổng danh sách 58 gói giữ nguyên; ước lượng thời gian các gói
chịu ảnh hưởng phải được nhóm rà soát lại.

---

**Phase và vị **Đầu vào cần có** **Sản phẩm và bên nhận**
trí**

---

P0 L02 và L01 Yêu cầu tại mục 19 và Đặc tả quyền, trường, trạng thái
trong A01 A02 mô hình kỳ giải hiện có và hợp đồng tạo/sao chép cho P01
A03 R01 S01 R04 Q02

P1 P01 và P02 Đặc tả L02, hợp đồng Schema edition và snapshot;
trong B02 B04 L01 transaction/version/idempotency
cho R01 S01 C K và Q02

P2 R01 trong Schema P01, API nền API tạo giải Nháp, xem trước và
R01 P02, policy S01, cấu sao chép cấu hình cho R04 S02 Q02
hình chuyên môn L02

P2 S01 và S02 Ma trận quyền L02, ID Policy Admin và phân công theo
trong B03 R08 giải R01, API nền P02 giải; bàn giao R01 R04 K01 Q02

P2 R04 cùng F01 UI chung F01, API R01, Màn hình danh sách giải, tạo mới,
trong R07 B06 policy S01, đặc tả chọn cấu hình sao chép, kiểm tra
trường L02 và mở đăng ký cho Q03 L02

P3 C01 C02 C03 Danh sách đã duyệt và Thi đấu/lịch chỉ dùng dữ liệu
trong C01 C03 snapshot giải mới từ đúng giải; bằng chứng tích hợp
C04 R03 R01 cho Q02 Q03

P4 K01 K03 K04 Trận, phân công và kết Nhập/xác nhận/tổng hợp/công khai
F02 trong K01 quả đúng edition_id không lẫn giải; bàn giao Q02 Q03
K04 K06 K09

P5 Q02 Q03 Build O01, ít nhất hai Báo cáo kiểm thử tạo/sao
trong I05 I06 giải và tài khoản mẫu, chép/phân quyền/cách ly dữ liệu;
API/UI đã tích hợp lỗi giao đúng chủ module

P6 L02 R04 F02 Build đạt, báo cáo UAT với Admin, hướng dẫn thao tác
trong D01 D04 test, kịch bản tạo và và bằng chứng nghiệm thu
mở đăng ký
-------------------------------------------------------------------------

R01 chủ trì chức năng; P01 sở hữu schema, S01/S02 sở hữu policy và phân
công, R04 sở hữu giao diện quản lý giải. L01 rà soát hợp đồng liên
module, L02 quản lý quyết định nghiệp vụ. Mỗi bước áp dụng quy trình
kiểm đầu vào tại mục 18: nếu sản phẩm bắt buộc chưa có hoặc chưa dùng
được thì ghi Bị chặn, người cung cấp và hạn xử lý.

## 19.5 Checklist và tiêu chí nghiệm thu

---

**Mã kiểm **Kết quả phải đạt** **Chủ trì
tra** kiểm**

---

TG01 Tạo mới Admin tạo được giải có ID riêng ở trạng thái Q02 và Q03
Nháp; dữ liệu thi đấu ban đầu trống

TG02 Sao chép Chỉ cấu hình đã chọn được lấy đúng phiên bản; Q02 và Q03
có chọn lọc tên/thời gian của giải mới do Admin nhập

TG03 Dữ liệu Giải nguồn có VĐV, đội, lịch, kết quả, huy Q02
không đi theo chương và xác nhận; giải mới không chứa các  
dữ liệu này

TG04 Phân Tài khoản chỉ có vai trò trường/trọng tài/tổ Q02
quyền trưởng/người theo dõi bị từ chối cả khi gọi  
API trực tiếp

TG05 Mở đăng Thiếu thông tin hoặc cấu hình bắt buộc thì Q03 và L02
ký giữ Nháp và báo lỗi; đủ cấu hình thì Admin mở
được đăng ký

TG06 Cách ly Có hai giải cùng môn và tài khoản dùng chung; Q02 và Q03
giải đăng ký, phân công, trận, xác nhận và xếp  
hạng đúng giải, không lẫn dữ liệu

TG07 Bảo toàn Sao chép rồi sửa giải mới không đổi snapshot, Q02
giải nguồn đăng ký, kết quả, quyền hoặc trạng thái giải  
nguồn

TG08 Giao Gửi lại cùng lệnh không tạo giải trùng; lỗi Q02 và P01
dịch và lịch giữa chừng không để lại giải nửa hoàn chỉnh;  
sử audit ghi người, nguồn và phiên bản
------------------------------------------------------------------------

Checklist G1--G7 ghi các bước nhỏ mục 19.4 dưới WBS tương ứng, có người
thực hiện, đầu vào, người cung cấp, phiên bản, bằng chứng test
TG01--TG08 và người nhận sản phẩm. Không đánh dấu hoàn thành chỉ vì đã
có nút Tạo giải mới; phải nghiệm thu API, quyền server, sao chép có chọn
lọc và cách ly dữ liệu giữa các giải.
