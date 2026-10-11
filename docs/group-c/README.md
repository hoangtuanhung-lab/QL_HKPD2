# Nhóm C — bộ thi đấu, lịch và giao diện

Bàn giao ngày 11/10/2026 (Asia/Saigon), theo plan v1.4, A01-v0.2 và A03. Codex thực hiện theo yêu cầu người dùng. Nhánh này dựa trên main sau khi người dùng merge nhóm B/PR #9; không tự merge PR A06 #7. Đây là mã lõi và giao diện thử, chưa phải nghiệm thu API nghiệp vụ với danh sách duyệt, tài khoản và persistence thật.

| WBS | Vị trí trong plan | Đầu ra                                                                                                                                                                                 | Còn thiếu để nghiệm thu                                                                         |
| --- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| C01 | C01               | KO 6–64, lũy thừa 2, nhánh cố định, ảo chỉ vòng đầu, không ảo–ảo; khóa ngay khi chốt, bỏ cuộc giữ cấu trúc                                                                             | Ghi sơ đồ/trận thực, nối kết quả K và server command                                            |
| C02 | C01               | Tự động/thủ công, tối đa 4 hạt giống, 2 khác nửa/3–4 khác phần tư, ưu tiên miễn 1/2; max-flow tránh cùng trường và lý do ngoại lệ                                                      | Quyết định ngoại lệ bởi tổ trưởng có quyền thật; danh sách R06 đã chốt                          |
| C03 | C02               | Vòng tròn mỗi cặp một lần; số lẻ nghỉ đúng một lần; nghỉ không sinh trận/điểm                                                                                                          | Điểm/xếp hạng và tiêu chí phụ do K04/K03; xác nhận kết quả K                                    |
| C04 | C03               | Kiểm sân/người/trọng tài liên môn, thời gian nghỉ, phụ thuộc vòng; đề xuất lịch tham lam, version và notification intent                                                               | Dữ liệu toàn giải, phân công R08, lịch/múi giờ cấu hình; lưu/duyệt/thông báo thật               |
| C05 | C03               | Cân 0,1 kg, thiếu tối đa 3 kg so cận dưới; chuyển lên liền kề trong cùng nhóm tuổi/giới tính/môn; quota theo cấu hình, cân chính thức, tổ trưởng; xếp lại hai hạng/hủy thiếu điều kiện | Danh mục R01 và đăng ký R04; ghi cân/actual-start thật theo U04; API command và transaction SQL |
| C06 | C04               | SVG đủ vòng, cha cân giữa hai nhánh con, đường nối cố định, ô điểm hai bên theo cặp và “Thắng trận”; danh sách vị trí, hạt giống, khóa UI                                              | Review trình duyệt/điện thoại; hiển thị projection kết quả chính thức từ K                      |
| C07 | C04               | Hai khung lịch/xếp hạng Việt hóa, chọn vòng, Trận 1/2 từng vòng, nghỉ; CSS xếp dọc trên mobile                                                                                         | Nối bảng xếp hạng chính thức/tie-break K04, kiểm theo mẫu với Q03 trên trình duyệt thật         |
| C08 | C04/C03           | Form thêm/sửa lịch, cảnh báo/chặn chốt xung đột, đề xuất lại lịch; lượt/làn và kiểm chỉnh làn; intent thông báo                                                                        | Tổ trưởng có quyền thật, adapter thông báo/lịch toàn giải, phiên bản lịch persist               |
| C09 | Q01               | Kiểm bất biến KO N=6..64 qua nhiều seed/random; vòng tròn N=3..64; fixture hồi quy 14/4/2 và chuyển 5↔6                                                                                | Property tests với dữ liệu catalogue/roster thực, hồi quy lỗi tích hợp tương lai                |
| C10 | Q02/Q03           | Transaction ports đọc roster approved và cân chính thức; move registration/two draws/history/schedule invalidation/outbox; projection Match A03 có kiểm schema                         | R07/R08/R04/R06 chưa có API hoàn chỉnh; integration/UAT trên server và SQL thật chưa chạy       |

## Quy tắc đã đối chiếu

- `RQ-PDF-G10`, `RQ-PDF-KO`, PDF Q190/Q195: KO dùng 8/16/32/64 vị trí, khóa ngay sau chốt; bỏ cuộc không dồn chỗ hoặc vẽ lại. Trận thắng do K xác nhận, không tự công nhận bye hoặc sinh điểm ở C.
- `RQ-PDF-G11`, Q191–194: seed 1 đầu sơ đồ, seed 2 cuối, seed 3 cuối nửa trên, seed 4 đầu nửa dưới (đây là quy ước kỹ thuật bố trí hợp lệ, không phải trích vị trí cụ thể từ nguồn). Miễn theo thứ tự hạt giống; phân bố cân đối hai nửa/phần tư. Thủ công không tự sửa kết quả bốc thăm.
- `RQ-PDF-G08/G10/G12`: cá nhân đối kháng 3–5 vòng tròn, từ 6 KO; đội vòng tròn. Cá nhân cần 3 người/2 trường, đội cần 3 đội/3 trường. Không áp dụng bộ này cho cờ vua/thi thành tích. Bộ vòng tròn hỗ trợ 3–64 đối tượng để dùng cho đội; giới hạn 64 của bộ tạo không phải quota đăng ký trường/VĐV toàn phần mềm.
- `RQ-PDF-TRANSFER`, Q286–289 là quyết định cuối, thay cách thêm vào vị trí ảo: chuyển khi cả hai hạng chưa bắt đầu, tổ trưởng xác nhận, xếp lại cả hai, kiểm đủ người/trường, hủy nếu thiếu. Chuyển 5↔6 đổi thể thức. Sơ đồ mới trở về nháp để rà soát/chốt; lịch cũ phải hủy và đề xuất lại, không âm thầm dùng lịch cũ. Bản cũ lưu trong archive.
- `RQ-PDF-G09`: cân chính thức đến 0,1 kg, không dùng cân nhà trường khai; phép so sánh dùng số nguyên phần mười. Đích trên liền kề trong cùng class-family R01, thiếu không quá 3 kg, quota trường theo cấu hình. Hỗ trợ cận dưới 0 và hạng cuối không có cận trên (`upperKg: null`); không tự suy ra danh mục hạng cân.
- `RQ-PDF-G13`: thời gian nghỉ do tổ trưởng cấu hình, không đặt một số phút mặc định cho mọi môn. Trùng người được kiểm toàn giải kể cả người thi môn A làm trọng tài môn B. Chưa suy ra started_at từ lịch dự kiến; U04 còn mở về thao tác ghi bắt đầu.

## Lõi và cách nối server

`@hkpd/competition` có build Node và source browser, không thêm thư viện ngoài. `npm ci` rồi `npm run check`; pretest/prebuild build foundation/competition trước apps. UI web nạp package qua điều kiện browser; API/worker tương lai dùng bản dist. Không có API competition được đăng ký ở runtime hiện tại.

`automaticKnockout` dùng CSPRNG mặc định; tests inject RNG cố định để tái lập fixture. Max-flow giải chính xác việc ghép trường với vị trí seed/bye đã chọn. Nếu không ghép được, cần quyết định ngoại lệ hoặc thay cấu hình/bốc thăm; không tuyên bố mọi bố trí khác đều bất khả thi. Bốc thăm thực phải lưu snapshot trước trả kết quả, receipt/idempotency B04 và quyết định tổ trưởng để replay không sinh sơ đồ khác.

`confirmDraw`, `replaceDraftDraw`, `withdraw` có expected version và snapshot bất biến. Chốt khóa ngay cả chưa có trận bắt đầu. C05 là đường ngoại lệ riêng được kiểm cân/phân công/version, không được gọi lại hàm tạo tổng quát để né khóa.

`drawFromApproved` dùng `CompetitionStore`: server resolve session actor, kiểm quyền trong transaction, đọc approved entries theo kỳ/nội dung, lưu immutable approvedRevisionId references. Chưa duyệt hoặc tham chiếu sai kỳ/nội dung bị chặn. Adapter phải lock roster/event/version và đọc đúng approved revision còn hiệu lực, không dùng current revision đang sửa/chờ duyệt. Các trường label/school/membership phải lấy từ bản ghi authoritative.

`transferFromOfficial` dùng `WeightTransferStore`: canManage phải kiểm tài khoản được duyệt và phân công tổ trưởng; đọc actual-start cả hai hạng và mọi match liên quan dưới khóa ổn định; quota/class-family/cân lấy từ bản ghi server. Body không được truyền cờ approved/leaderConfirmed/officialWeightVerified, sportCode hay quota. Pure `transferWeight` là tầng domain bên trong, không phải route nhận body trực tiếp. Không tự phát kết quả truất quyền; khi chuyển bị chặn cần quy trình K xác nhận đúng nội dung.

Transaction port phải cập nhật đăng ký R04 (`moveRegistration` trả approvedRevisionId mới), CAS cả hai hạng, archive gắn actor/official weigh-in, hủy lịch cả hai và enqueue intent cùng transaction. Handler lỗi rollback mọi phần. Adapter phải chuyển liên kết cân chính thức theo quy tắc R04/K, không cho một VĐV thuộc hai hạng cùng lúc. Tests dùng adapter bộ nhớ riêng, không đưa vào production và không chứng minh SQL locking/concurrency đa tiến trình. B04 receipt và policy hiện tại phải nối trong cùng transaction, không lồng một transaction độc lập để phá tính nguyên tử.

`projectMatches` tạo DTO A03 Match (UUID, participant/ghost/pending source_match_id, kết quả và thời điểm bắt đầu null). Logical match ID `event:r:m` chỉ có ý nghĩa trong một draw revision; adapter cấp UUID MỚI cho mọi trận khi xếp lại, bảo lưu old UUIDs/archive và map winner references. Không dùng lại UUID cũ hoặc gửi logical IDs ra v1. Edition/school/team membership scope phải được adapter kiểm trước projection; mapper không xác thực session hay quyền đọc. Không đổi file OpenAPI/generated A03.

## Lịch và lượt/làn

`proposeSchedule` nhận nhiệm vụ có thời lượng/sân khả dụng/rest/dependencies và lịch đã có của toàn giải; tìm lịch tham lam bảo thủ trong cửa sổ UTC. Không phải solver tối ưu; không tìm được lịch thì tổ trưởng điều chỉnh. Kiểm timeline `[start,end)` nên hai trận sát nhau không trùng sân, nhưng người vẫn phải đủ nghỉ theo max cấu hình hai trận. UTC yêu cầu ISO canonical; UI nhập và hiển thị giờ Việt Nam (UTC+7), chuyển sang UTC trước kiểm, độc lập múi giờ trình duyệt.

Participant/referee IDs phải là mã NGƯỜI thống nhất do adapter resolve, không lẫn athlete UUID và account UUID của cùng người. Đội phải mở rộng đủ thành viên; trận KO chưa biết người đi tiếp cần đưa toàn bộ người có khả năng tham dự vào conflict set và khai báo phụ thuộc, không giả định chưa có người thì không xung đột. Checklist, cùng trường của trọng tài và quyền sân/môn là R08/S01, không thay bằng kiểm lịch.

`reviseSchedule` có expected version, chặn xung đột và trả notification intent. Adapter commit lịch/outbox và xử lý thông báo B05, không gửi trực tiếp trước commit. `assignLanes`/`validateLanes` chia lượt từ 1, mỗi làn duy nhất trong lượt; số làn là cấu hình nhập (helper hiện hỗ trợ 1–16, không tự giả định số làn sân thực). Không chọn người vào vòng sau, không tự tạo hoặc xác nhận thành tích.

## Giao diện thử và giới hạn

Menu “Sơ đồ thi đấu”, “Vòng tròn”, “Lịch và phân làn” mở giao diện C. Nhập danh sách `Mã;Tên;Mã trường;Mã người` để thử; đội nhập mọi mã người cách nhau bằng dấu phẩy. Không tự lấy phiếu đăng ký nháp A04 làm approved roster. Chốt/ngoại lệ/bỏ cuộc/lịch/làn trên UI chỉ đổi bản thử tại màn hình; chưa lưu server hoặc gửi quyết định. Đổi tab hoặc tải lại có thể mất bản thử; chỉ phiếu đăng ký trường A04 lưu localStorage như trước.

Score và standings không có dữ liệu thì hiển thị “—”; RoundRobinView nhận projection standings từ K, không tự đặt tie-break/số điểm. Không nhập điểm hoặc có nút cập nhật hộ. SVG cuộn khi nhiều vòng, parent cân giữa; bảng/lịch hai khung có CSS mobile xếp dọc. DOM tests không chứng minh trực quan/focus/browser/mobile thật; Q03 cần review khi đủ bản tích hợp. Không có browser automation capability trong môi trường này.

Giữ CR-004: chưa SQL thật, OAuth/Google Drive/Netlify. Thư mục VĐV vẫn ánh xạ logic đã bàn giao trước, không tự tạo Google folder. R01/R04/R06/R07/R08 còn thiếu, nên C01–C10 có đầu ra bàn giao nhưng `acceptance_status` vẫn `not_accepted`. Không tự giải các U01/U04/U05/U07/U08 hoặc tạo dữ liệu học sinh thật.

## Kiểm chứng cục bộ

- `npm run check`: đạt baseline/truy vết/backlog/contracts, 28 kiểm tĩnh B02, lint/typecheck, **320 tests / 21 files** (178 tests mới nhóm C) và build API/web/worker/foundation/competition.
- `npm run secret:scan`: đạt.
- `npm run env:init` + `node scripts/smoke.mjs`: dev/staging API/web/worker đạt, dừng sạch, cổng được giải phóng và không để lại API child.
- Không chạy SQL/Google/Netlify, API competition với dữ liệu duyệt thật hoặc nghiệm thu trình duyệt/mobile.

Cầu nối snapshot R/C/K, global người lập lịch và DTO trận đã được bổ sung ở `@hkpd/integration`; xem [rà soát trước I](../review/pre-i.md). Chưa có adapter server/durable store hoặc frontend online.
