# A01 — Tổng hợp 22 nhóm nghiệp vụ từ nguồn mới

Sinh từ requirements.json. Mỗi nhóm dẫn câu PDF và WBS, gồm quyết định sau đã thay phần trước; các điểm chưa chốt vẫn theo U. Đây là bản đặc tả để chủ module review, chưa chứng minh các chức năng đã được lập trình.

## G01 — Phạm vi và nền tảng

Phần mềm web phục vụ xã Quảng Phú, nhiều kỳ giải qua năm. Nền tảng có thể chuyển VPS; ngân sách chưa chốt. Quy mô 7 trường/500 VĐV là ước tính lịch sử, hiện trường tự đăng ký; SQL/Google/Netlify cuối dự án theo chat mới.

Nguồn câu: PDF-Q001, PDF-Q002, PDF-Q003, PDF-Q004, PDF-Q061, PDF-Q266, PDF-Q267. WBS: A02, B07. Chủ trì/phối hợp: L01, O01.

## G02 — Kỳ giải và danh mục

Danh mục phân cấp có mã ổn định/STT hiển thị, kế thừa từ cha; thêm/import/sao chép cấu hình. Danh mục chung đầy đủ, danh mục Hội khỏe có nội dung đã lưu đăng ký. Nội dung ngừng tổ chức giữ lịch sử; chính sách xóa nội dung chưa đăng ký còn U08.

Nguồn câu: PDF-Q005, PDF-Q128, PDF-Q229, PDF-Q230, PDF-Q231, PDF-Q232, PDF-Q233, PDF-Q234, PDF-Q235, PDF-Q236. WBS: R01, B02. Chủ trì/phối hợp: R01, P01.

## G03 — Tài khoản và vai trò

Đăng nhập Gmail, quản trị duyệt tài khoản và mã đơn vị. Một tài khoản đại diện mỗi trường. Vai trò theo môn; quản trị/tổ trưởng không nhập sửa điểm, quản trị xác nhận thay khi tổ trưởng vắng tại sân. Tích hợp Google ở cuối.

Nguồn câu: PDF-Q007, PDF-Q041, PDF-Q042, PDF-Q060, PDF-Q106, PDF-Q126, PDF-Q127. WBS: B03. Chủ trì/phối hợp: S01.

## G04 — Phân công và xung đột trường

Tổ trưởng lập tổ và tick checklist nội dung; không còn Cập nhật hộ. Một trọng tài có thể ở nhiều môn, không trùng lịch. Chặn trận đối kháng/dòng thành tích cùng trường; kiểm thiếu trọng tài hợp lệ ngay khi phân công và kiểm lại vòng sau.

Nguồn câu: PDF-Q008, PDF-Q043, PDF-Q044, PDF-Q144, PDF-Q145, PDF-Q146, PDF-Q147, PDF-Q148, PDF-Q149, PDF-Q150, PDF-Q151, PDF-Q152. WBS: R08. Chủ trì/phối hợp: S02.

## G05 — Hồ sơ và nhập danh sách

Hồ sơ có mã học sinh do trường gán, mã VĐV server cấp. Nhập trực tiếp/CSV/Excel có preview. Đối chiếu trùng cùng trường; dữ liệu gốc do quản trị sửa. Danh sách xã rỗng không sinh đề nghị bổ sung; khi có danh sách, hồ sơ mới phải duyệt trước duyệt thi đấu. CCCD mã hóa/che đúng quyền.

Nguồn câu: PDF-Q010, PDF-Q011, PDF-Q136, PDF-Q137, PDF-Q139, PDF-Q140, PDF-Q141, PDF-Q142, PDF-Q143, PDF-Q155, PDF-Q157, PDF-Q158, PDF-Q159, PDF-Q160, PDF-Q161, PDF-Q162. WBS: R02, R03. Chủ trì/phối hợp: R02, S03.

## G06 — Đăng ký và kiểm điều kiện

Giới tính, hạn mức và môn thứ ba phải chặn; điều kiện tuổi/lớp cảnh báo theo cấu hình, không tự mở rộng chặn. Tuổi tính năm giải trừ năm sinh; Cờ vua kiểm lớp. Mỗi VĐV tối đa 2 môn, giới hạn nội dung theo môn/ngoại lệ; Vovinam tối đa 1 đối kháng + 1 quyền, không 2 quyền. Sửa đăng ký có revision và duyệt lại.

Nguồn câu: PDF-Q012, PDF-Q013, PDF-Q018, PDF-Q019, PDF-Q045, PDF-Q046, PDF-Q047, PDF-Q048, PDF-Q095, PDF-Q131, PDF-Q132, PDF-Q133, PDF-Q134, PDF-Q135, PDF-Q138, PDF-Q156, PDF-Q163, PDF-Q164, PDF-Q271, PDF-Q272, PDF-Q273. WBS: R04, R06, R07. Chủ trì/phối hợp: R03, R04.

## G07 — Đôi, đội và thay thành viên

Một đôi/đội mỗi trường/nội dung. Đôi/tiếp sức chọn người đã đăng ký cá nhân cùng môn, đủ cơ cấu mới gửi; nháp được bổ sung sau. Kéo co 8–12, hỗn hợp 4–6 mỗi giới; Bóng đá 5–12. Đôi/tiếp sức thay người từ danh sách hợp lệ cùng môn theo đề nghị HLV, trọng tài cập nhật và lưu lịch sử.

Nguồn câu: PDF-Q153, PDF-Q154, PDF-Q165, PDF-Q166, PDF-Q167, PDF-Q168, PDF-Q169, PDF-Q170, PDF-Q171, PDF-Q172, PDF-Q173, PDF-Q174, PDF-Q179, PDF-Q180, PDF-Q181, PDF-Q182, PDF-Q183, PDF-Q184, PDF-Q185, PDF-Q211, PDF-Q212, PDF-Q213, PDF-Q214, PDF-Q215. WBS: R05, K01. Chủ trì/phối hợp: R03, K01.

## G08 — Điều kiện tổ chức/công nhận

Cá nhân cần tối thiểu 3 VĐV/2 trường; đôi/tiếp sức/đội cần 3 trường. Thi theo thành tích cần ít nhất 3 kết quả hợp lệ/2 trường, tiếp sức/quyền đội cần 3 đội/3 trường. Thiếu điều kiện hủy, giữ lịch sử; Đẩy gậy/Vovinam có cơ chế chuyển hạng theo điều kiện.

Nguồn câu: PDF-Q014, PDF-Q092, PDF-Q094, PDF-Q252, PDF-Q253, PDF-Q254, PDF-Q288. WBS: C01, C03, K05. Chủ trì/phối hợp: R01, K03.

## G09 — Cân và chuyển hạng

Đẩy gậy/Vovinam chuyển lên hạng trên liền kề, kiểm thiếu tối đa 3 kg so cận dưới, hạn mức và cân chính thức. Tổ trưởng xác nhận; cả hai hạng chưa bắt đầu thì xếp lại cả hai sơ đồ, đổi thể thức theo số lượng. Một hạng bắt đầu thì không chuyển; kiểm đủ trường/VĐV sau chuyển, thiếu thì hủy. U04 về thao tác bắt đầu vẫn mở.

Nguồn câu: PDF-Q015, PDF-Q016, PDF-Q017, PDF-Q093, PDF-Q196, PDF-Q279, PDF-Q280, PDF-Q281, PDF-Q282, PDF-Q283, PDF-Q284, PDF-Q285, PDF-Q286, PDF-Q287, PDF-Q289. WBS: C05. Chủ trì/phối hợp: C03.

## G10 — Sơ đồ loại trực tiếp

Cá nhân đối kháng 3–5 người vòng tròn, từ 6 loại trực tiếp; môn tập thể vòng tròn. KO dùng lũy thừa 2 nhỏ nhất đủ người, vị trí ảo chỉ vòng đầu, không ảo–ảo. Chốt bốc thăm khóa cấu trúc, bỏ cuộc giữ nhánh; ngoại lệ chuyển hạng theo quyết định cuối ở G09.

Nguồn câu: PDF-Q020, PDF-Q021, PDF-Q063, PDF-Q064, PDF-Q065, PDF-Q066, PDF-Q067, PDF-Q068, PDF-Q073, PDF-Q074, PDF-Q096, PDF-Q097, PDF-Q098, PDF-Q099, PDF-Q100, PDF-Q186, PDF-Q187, PDF-Q188, PDF-Q189, PDF-Q190, PDF-Q195, PDF-Q197. WBS: C01, C06. Chủ trì/phối hợp: C01, C04.

## G11 — Hạt giống và bốc thăm

Hỗ trợ bốc thăm tự động/thủ công. Tối đa 4 hạt giống tách phần tư, 2 hạt giống tách hai nửa; ưu tiên suất miễn số 1/2 khi thiếu. Kiểm đủ danh sách/vị trí/tránh cùng trường nếu bật; ngoại lệ có xác nhận.

Nguồn câu: PDF-Q191, PDF-Q192, PDF-Q193, PDF-Q194. WBS: C02. Chủ trì/phối hợp: C01.

## G12 — Vòng tròn và tiêu chí phụ

Vòng tròn mỗi cặp một lần, số lẻ nghỉ đúng một lần, không điểm ảo. Bóng đá 3/1/0; môn không hòa 2/1, vắng/DSQ theo quyết định riêng. Tiêu chí phụ theo môn, không thêm bảng phụ đối đầu chéo ở câu 293 đã rút. Vovinam dùng cân chính thức nhẹ hơn rồi tổ trưởng; các môn khác theo thứ tự đã chốt.

Nguồn câu: PDF-Q075, PDF-Q076, PDF-Q077, PDF-Q078, PDF-Q079, PDF-Q080, PDF-Q081, PDF-Q082, PDF-Q241, PDF-Q242, PDF-Q243, PDF-Q244, PDF-Q245, PDF-Q274, PDF-Q275, PDF-Q276, PDF-Q277, PDF-Q278, PDF-Q293. WBS: C03, K04. Chủ trì/phối hợp: C02, K03.

## G13 — Lịch, lượt và vào vòng trong

Phần mềm đề xuất lịch, tổ trưởng điều chỉnh/xác nhận; kiểm trùng sân/VĐV/trọng tài toàn giải và nghỉ theo cấu hình. Chạy/bơi tổ trưởng đặt lượt/làn; phần mềm đề xuất vào vòng trong theo cấu hình từ đầu, tổ trưởng tick/bỏ tick khi hòa suất cuối rồi xác nhận.

Nguồn câu: PDF-Q006, PDF-Q023, PDF-Q024, PDF-Q101, PDF-Q102, PDF-Q116, PDF-Q117, PDF-Q118, PDF-Q119. WBS: C04, C08. Chủ trì/phối hợp: C03, C04.

## G14 — Nhập/sửa/xác nhận kết quả

Chỉ trọng tài nhập/sửa, tổ trưởng xác nhận bản cụ thể; batch không vượt quyền. Người thắng tạm thời nội bộ, vòng sau chỉ nhập khi nguồn đã xác nhận. Sửa chưa duyệt giữ official; nhảy/ném nhập tốt nhất, quyền nhập tổng điểm, bóng đá có thẻ. Cờ vua nhập kết quả cuối, giữ vị thứ từ phần mềm ngoài; không tính lại các ván.

Nguồn câu: PDF-Q009, PDF-Q022, PDF-Q026, PDF-Q028, PDF-Q029, PDF-Q056, PDF-Q062, PDF-Q103, PDF-Q104, PDF-Q105, PDF-Q112, PDF-Q113, PDF-Q114, PDF-Q120, PDF-Q121, PDF-Q122, PDF-Q123, PDF-Q124, PDF-Q125, PDF-Q227, PDF-Q228, PDF-Q269, PDF-Q270, PDF-Q290, PDF-Q291. WBS: K01, K03, K08. Chủ trì/phối hợp: K01, C04.

## G15 — Phép, truất và phục hồi

Truất chỉ nội dung liên quan, giữ trận thật, hủy điểm/huy chương của người bị truất, không hồi sinh người thua. Phép/DSQ/khôi phục có lịch sử; KO khóa phục hồi khi vòng sau đã lưu kết quả, vòng tròn phục hồi trước khóa giải và bố trí lại trận chưa diễn ra. Không đôn người thua lên chung kết; vắng phép chung kết bạc 9, bên có mặt vàng 11.

Nguồn câu: PDF-Q025, PDF-Q027, PDF-Q107, PDF-Q108, PDF-Q109, PDF-Q110, PDF-Q111, PDF-Q198, PDF-Q199, PDF-Q200, PDF-Q201, PDF-Q202, PDF-Q203, PDF-Q204, PDF-Q205, PDF-Q206, PDF-Q207, PDF-Q208, PDF-Q209, PDF-Q210, PDF-Q216, PDF-Q217, PDF-Q218, PDF-Q219, PDF-Q220, PDF-Q221, PDF-Q222, PDF-Q223. WBS: K02. Chủ trì/phối hợp: K02, K01.

## G16 — Huy chương và đếm tham gia

3–4 thực tế chỉ vàng/bạc, điểm 11/9/7/6; 5 người vàng/bạc/một đồng, 11/9/8/7/6; áp dụng đôi/đội tương ứng. Miễn vòng đầu chỉ được tính khi thi ít nhất một trận sau đó, xử thắng không là trận thật. Tách thực tế/hợp lệ; giảm đủ điều kiện thì hủy tranh đồng, giữ dữ liệu lịch sử; U05 còn chi tiết phân hạng sau hủy.

Nguồn câu: PDF-Q069, PDF-Q070, PDF-Q071, PDF-Q072, PDF-Q083, PDF-Q084, PDF-Q085, PDF-Q086, PDF-Q087, PDF-Q090, PDF-Q091, PDF-Q246, PDF-Q247, PDF-Q248, PDF-Q249, PDF-Q250, PDF-Q251, PDF-Q255, PDF-Q256, PDF-Q257, PDF-Q258, PDF-Q259, PDF-Q260, PDF-Q261, PDF-Q262. WBS: K05. Chủ trì/phối hợp: K03.

## G17 — Điểm môn/toàn đoàn và chốt

Điểm nội dung tổng thành điểm môn, xếp hạng môn rồi quy đổi 11/9/8/7/6/5/4/3/2/1 cho hạng 1–10, ngoài 10 bằng 0; Bóng đá/Kéo co hệ số 3 sau quy đổi. TH phải thực tế đá bóng, THCS thêm cả 3 Kéo co; miễn nội dung BTC hủy hợp lệ. Số VĐV phân hạng đếm thực tế một lần mỗi khối; tự tổng hợp sơ bộ, chốt đúng quyền, sửa chính thức tính/chốt lại.

Nguồn câu: PDF-Q030, PDF-Q031, PDF-Q032, PDF-Q033, PDF-Q034, PDF-Q035, PDF-Q036, PDF-Q037, PDF-Q038, PDF-Q175, PDF-Q176, PDF-Q177, PDF-Q178, PDF-Q224, PDF-Q225, PDF-Q226. WBS: K06, K07. Chủ trì/phối hợp: K04.

## G18 — Phạt và miễn phạt

Tổ trưởng quyết định phạt/miễn phạt trong môn, lưu khoản riêng có lý do. Phạt bỏ nội dung trừ sau quy đổi và hệ số vào toàn đoàn; điểm cuối min 0, giữ đầy đủ khoản phạt và thành tích để đối chiếu.

Nguồn câu: PDF-Q039, PDF-Q239, PDF-Q240. WBS: K06. Chủ trì/phối hợp: K04, K01.

## G19 — Công khai và UI bảng

Người theo dõi không cần đăng nhập, chỉ lịch/kết quả chính thức/whitelist cho phép, không hồ sơ riêng/pending. Hai khung theo mẫu, điện thoại xếp dọc; không nhập/sửa/xác nhận. Bảng có tìm/lọc/sắp xếp và giữ cây.

Nguồn câu: PDF-Q040, PDF-Q115, PDF-Q130, PDF-Q237, PDF-Q292. WBS: B06, K09. Chủ trì/phối hợp: F01, F02.

## G20 — Thông báo và khóa giải

Thông báo có liên kết đúng đối tượng/quyền. Quản trị khóa kỳ giải; mở khóa sửa phải có lý do và lịch sử, không sửa trực tiếp dữ liệu chính thức để khớp luật mới.

Nguồn câu: PDF-Q088, PDF-Q089. WBS: K10, B05. Chủ trì/phối hợp: P03, L02.

## G21 — Ngoại tuyến và tệp

Offline giữ operation/version/phân công, giữ các bản xung đột và biên bản ảnh/PDF có thể bổ sung sau; không tự thành official. Online một người nhập cùng lúc. Đổi phân công vẫn giữ bản offline để xem xét. Tệp nhiều liên kết, trường xem biên bản liên quan; lưu Google ở cuối.

Nguồn câu: PDF-Q051, PDF-Q052, PDF-Q053, PDF-Q054, PDF-Q055, PDF-Q057, PDF-Q059, PDF-Q129, PDF-Q268. WBS: I01, I02, R09. Chủ trì/phối hợp: F03, S03.

## G22 — In, sao lưu và review luật

Ưu tiên in trình duyệt có tiêu đề/ký, Excel ghi thời gian sửa. Backup giờ trong ngày thi/ngoài giải ngày, giữ 7/30 ngày và cuối giải lâu dài; restore Admin có lý do/sao lưu hiện trạng. Tích hợp cuối; nguồn web đề xuất trong PDF không phải căn cứ đã được trợ lý hiện tại xác minh.

Nguồn câu: PDF-Q049, PDF-Q050, PDF-Q058, PDF-Q238, PDF-Q263, PDF-Q264, PDF-Q265. WBS: K09, I04, A01. Chủ trì/phối hợp: F02, O02, L02.
