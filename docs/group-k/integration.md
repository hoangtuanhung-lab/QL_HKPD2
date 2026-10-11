# K — hợp đồng tích hợp

`ResultMatch`, `ResultCommand` và `CommandReply` là domain nội bộ. **Không serialize nguyên `CommandReply.match` ra HTTP**: nó chứa lease token, bản nhập chờ, lịch sử và metadata người dùng. Route phải map DTO A03, lọc theo quyền; token chỉ trả cho phiên giữ lease. Public dùng projection whitelist riêng. Browser export bỏ service/notifications dùng Node; preview thuần không cung cấp phân quyền production.

## Session, schema và giao dịch

Mount route sau khi kiểm schema A03, xác thực actor/session server và giải từ đường dẫn. Không nhận checklist, school scope, snapshot, quyền admin-delegation, clock hoặc tổng điểm từ client. `ResultStore.transaction` phải rollback match, official history, audit, invalidation, outbox và receipt cùng nhau. `matchForUpdate` đọc khóa đúng giải; khóa mọi nguồn vòng trước/nguồn phụ thuộc theo thứ tự ổn định để so phiên bản trong cùng transaction, tránh check-then-write. `save` thực hiện CAS theo version, không gán version client làm version chính thức.

`actor` tải quyền hiện tại, kể cả replay receipt. Referee approved/checklist/môn/giải và không cùng trường mới nhập. Leader đúng phạm vi được xác nhận, kể cả cùng trường, không nhập/sửa điểm. Admin không nhập điểm; xác nhận thay chỉ khi `adminDelegation` chứng minh tổ trưởng vắng tại điểm thi, đúng trận/thời gian bằng hồ sơ server. Mặc định adapter trả false nếu chưa có hồ sơ này. Giải khóa chặn lệnh mới. Lease chỉ một actor+session, TTL kỹ thuật 10–120 giây, heartbeat bằng token, hết hạn được giành lại; thời gian do clock server cấp. Session/token không lấy từ dữ liệu công khai.

Receipt key gồm actor/session/giải/trận/action/UUID; fingerprint gồm operation và baseVersion. Replay cùng payload không ghi lần hai; đổi payload cùng key xung đột. Cần retention và unique receipt thật. Lease thay đổi version aggregate; route cần phân biệt version Match DTO và Submission/Official DTO, không tự ghép version vào field A03 sai nghĩa.

`prerequisitesCurrent` xác minh tất cả prerequisite bằng **official** hiện tại trước submit/confirm, tuyệt đối không dùng pending. `fileLinksAllowed` kiểm metadata authoritative đúng giải/trận/nội dung, quyền actor, không chỉ tin file ID. Mọi file chưa được xác minh phải bị từ chối. Permission upload biên bản và permission nhập/xác nhận tách riêng.

## Xác nhận và sửa

Submit thêm Submission; không thay official. Confirmation chỉ nhận `submission_id`, `submission_version`, `base_official_version`; từ chối body chứa bộ điểm mới. Official lấy payload đã kiểm từ submission, lưu trước/sau cùng người/thời điểm trong history; audit chứa lý do bản sửa. Return yêu cầu lý do và giữ official cũ. Confirm CAS source+submission+official version; batch xử lý từng item độc lập, không để một item sai quyền hủy item tốt hoặc bỏ qua quyền.

Xác nhận phát `OfficialResultConfirmed` với giải/trận/version và gọi `invalidateDependents` trong transaction. Adapter phải chuyển publication/rankings/điểm xuống sơ bộ, đánh dấu pending vòng sau stale và chuyển C về cần kiểm lại; chưa có consumer tích hợp. Rebuild từ toàn bộ official hiện tại, không cộng lại event delta. `invalidatePublication` bỏ event trễ/trùng, chốt lại dùng sourceVersions hiện tại và readiness thực tế. Adapter phải kiểm quyền chốt/bảng/giải; pure function không tự xác minh người gọi. `winnerFromOfficial` chỉ helper kết quả confirmed, hòa cần quyết định; chưa tự ghi slot C.

K02 helpers không có session; mọi chuyển vắng/truất/phục hồi phải được bọc lệnh server có quyền/audit/version. `playedMatchIds` chỉ lấy từ trận thực đấu đã xác nhận, không lấy bye/walkover; giữ lịch sử thật. RR phục hồi cần scheduler tạo lại trận chưa đấu, KO không hồi người đã bị loại. `excusedFinal` chưa được nối vào `awardEvent`; không dùng generic awards cho chung kết phép. Điểm absent/DSQ riêng từng môn chưa có trong RR engine.

## Công bố, tệp và thông báo

`publicResults` chỉ finalized đúng giải/source version, chủ động chọn field value và nhãn công khai; không đưa payload, audit, files, pending, CCCD, ảnh hay actor ra ngoài. Hiện A03 PublicResult chỉ athlete: team bị lỗi `PUBLIC_TEAM_CONTRACT`, cần hợp đồng riêng trước công bố đội. Nhãn public từ whitelist đã duyệt, không lấy nguyên hồ sơ. CSV có lý do/thời điểm sửa phục vụ nội bộ có quyền; không dùng nó làm public export. XLSX binary/formatting chưa có.

Thông báo chỉ ý định không PII/điểm, dedup theo giải/trận/officialVersion. Dispatcher durable phải unique-key chống gửi lặp và định nghĩa retry/delivery; helper không đảm bảo exactly-once mạng. Khi mở link, load match/schools từ server, kiểm `canOpenNotification` bằng actor hiện tại và scope authoritative; URL không cấp quyền. Driver Google/thư mục VĐV và SQL cuối dự án, không mount stub cho production.
