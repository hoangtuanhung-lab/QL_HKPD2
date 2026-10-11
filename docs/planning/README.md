# A06 — Hồ sơ giao việc và môi trường

`backlog.json` là board cục bộ có phiên bản, gồm 58 WBS và đủ 28 vị trí theo plan v1.4. `backlog.md` là bảng đọc sinh tự động; `group-a:check` chặn lệch tiêu chí, chủ trì, danh sách phối hợp, phạm vi “các nhóm”, phụ thuộc và yêu cầu so với A01. `group-a:generate` kiểm cùng các điều kiện trước khi ghi bảng, nên sinh lại tài liệu không bỏ qua được lỗi phân công. Chưa tạo ticket trên dịch vụ ngoài. Giữ nguyên mã vị trí: ví dụ WBS R03 do vị trí R02/S03 chủ trì/phối hợp, không suy diễn người phụ trách từ tên WBS.

Codex nhận phần nhóm A và vai trò tích hợp theo yêu cầu người dùng. `hoangtuanhung-lab` là chủ repository, chưa phải tên thật của một trong 28 vị trí. Người dùng chưa cung cấp danh sách tên/GitHub nên roster để null; không tự gán mọi vị trí cho Codex hay tài khoản GitHub này. Khi nhận danh sách, cập nhật person_name, github_handle và backup_reviewer rồi sinh lại bảng. Phần nghiệm thu A06 “giao tên cho 28 vị trí” còn chờ dữ liệu này.

## Nhận việc (Definition of Ready)

1. Chọn WBS và lát công việc 1–3 ngày; ghi người thực hiện, đầu mối nhận và phạm vi file.
2. Đọc nguồn A01 hiện hành, CR và U liên quan; quyết định đã bị thay thế không làm đầu vào.
3. Liệt kê phiên bản sản phẩm phụ thuộc, người cung cấp và kết quả kiểm: chưa có/có nhưng chưa đạt/đủ. Contract và fixture cho phép làm phần độc lập; tích hợp cần API thật và dữ liệu tương thích.
4. Ghi tiêu chí, evidence dự kiến và cách tái hiện. Thiếu dữ liệu chỉ chặn bước trực tiếp cần dữ liệu đó; tiếp tục phần độc lập.

## Bàn giao (Definition of Done)

- Code/docs/DTO theo phiên bản yêu cầu đã ghi; thay đổi contract phải sinh DTO và cập nhật fixture cùng PR. Thay đổi luật cần quyết định người dùng và CR.
- `npm run check`, `npm run secret:scan` đạt; chạy smoke khi thay runner/build nền tảng. Có test phù hợp cho lỗi hoặc hành vi mới, không coi mock là backend đã nghiệm thu.
- Không chứa dữ liệu học sinh thật, credential hoặc giá trị môi trường bí mật. Public chỉ whitelist đã chốt; server kiểm quyền khi triển khai.
- PR ghi WBS/req, đầu ra, phiên bản đầu vào, evidence, giới hạn, U và người nhận. Mã do thành viên gửi được Codex kiểm/chỉnh/tích hợp theo CR-007; không yêu cầu tài khoản reviewer thứ hai để tiếp tục. Người dùng xem PR trước merge.
- Người nhận kiểm đầu ra, ghi “Đã nhận đủ” hoặc “Chưa đủ” kèm lý do. `handover_prepared` khác `accepted`; cổng nghiệm thu chỉ đạt khi có evidence đúng API/module thật.

## Dịch vụ và tài khoản

| Thành phần                           | Hiện tại                                                                                  | Người cung cấp / thời điểm                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| GitHub QL_HKPD2, PR, Actions         | Dùng quyền Git hiện có; không mặc định branch protection đã được GitHub thực thi          | Chủ repo + O01; không cần yêu cầu token mới khi Git đang dùng được       |
| Node 24/npm 11, React/Fastify/worker | Local dev/staging tách env, API health, worker idle; lệnh env:init/check và runner đã có  | O01; không có tài khoản trường thật                                      |
| Mock API A03                         | GET chỉ đọc từ fixture, dùng cho thiết kế giao diện; không có phiên đăng nhập/policy thật | L01/P02/Q02; không dùng nghiệm thu quyền backend                         |
| PostgreSQL/migration/outbox          | Thiết kế ADR; chưa cài SQL hoặc DB thật                                                   | P01/P03/O01, bước cuối theo CR-004; chỉ làm contract/logic độc lập trước |
| Google OIDC                          | Thiết kế; chưa đăng nhập, phê duyệt tài khoản hoặc credential thật                        | S01/O01, bước cuối                                                       |
| Google Drive/thư mục/tệp             | Hợp đồng logical folder deferred; chưa có bytes/quyền tải thật                            | S03/O02, bước cuối; không suy ra VĐV tự có tài khoản                     |
| Netlify và triển khai                | Chưa deploy; cấu hình/provider/chi phí chưa chốt                                          | O01/O02, bước cuối; không tự mua dịch vụ                                 |
| Dữ liệu trường/danh mục gốc          | Trường tự đăng ký; chưa có số lượng cố định hoặc toàn bộ 133 nội dung                     | Người dùng/BTC/R01/R02; U01 và bước D02                                  |

Không ghi secret vào board. Khi tới bước tích hợp, kiểm binding đã có rồi mới khai báo tên biến cần bổ sung trong thiết lập môi trường. B02/B03/B05/I03 và các bước tích hợp tương ứng cần cập nhật lịch theo CR-004; không đánh dấu cổng G1 đạt khi SQL/auth thật còn hoãn.

## Thứ tự thực hiện tiếp

Nhóm R/S/C/K/F/Q có thể nhận contracts/fixture/wireframe để làm phần độc lập. Ưu tiên thiết kế policy và kiểm phạm vi (S01/S02), catalog/registration validation (R01/R03), engine đối kháng/vòng tròn (C01/C02), result revision/official (K01), UI từ contract (F01/R04/C04). Ghi rõ input nhận được trước code; mở rộng API từng module qua A03. Những bước cần catalog thật/U01, thao tác bắt đầu/U04 hoặc SQL/Google vẫn giữ cổng riêng.
