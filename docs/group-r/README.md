# Nhóm R — danh mục và đăng ký

Đầu ra cơ bản R01–R10 có lõi TypeScript trong `@hkpd/registration`, giao diện **Kiểm tra đăng ký** và kiểm thử riêng. Đây là bàn giao để tích hợp; **chưa nghiệm thu backend thật hoặc đăng ký trực tuyến đa trường**. Mỗi gói giữ `handover_prepared`/`not_accepted`. SQL, Google và Netlify vẫn ở bước cuối CR-004; chưa tạo tài khoản, dữ liệu tham gia thật hoặc thư mục Drive.

| WBS / chủ trì | Đã có                                                                                                                                                          | Còn thiếu trước nghiệm thu                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| R01 / R01     | Cây môn/nhóm/nội dung, kiểm mã/chu trình/cấu hình, kế thừa, snapshot bất biến, danh mục có đăng ký, ngừng nội dung, clone cấu hình sang ID mới và giải rỗng    | Danh mục chính thức đối chiếu điều lệ, lưu/version/endpoint thật, quyết định U08 về xóa                                                    |
| R02 / R02     | Hồ sơ theo trường/mã học sinh; master list rỗng không tạo đề nghị; master có dữ liệu giữ hồ sơ mới pending; duyệt hồ sơ; cấp mã server và outbox thư mục riêng | Repository học sinh gốc liên giải, bộ mã trường/độ rộng đã chốt, unique constraint/transaction SQL thật                                    |
| R03 / R02/S03 | CSV có preview, chuẩn hóa dòng Excel đã được parser đọc, đối chiếu mã học sinh cùng trường, CCCD chỉ trả bản che; AES-256-GCM gắn scope/key version            | Parser tệp XLSX nhị phân, import giao dịch và sửa master gốc bởi quản trị; kho khóa/quay khóa và tra CCCD cùng trường trên repository thật |
| R04 / R03     | Chặn môn thứ ba, giới tính, hạn mức trường/nội dung/nhóm; tuổi/lớp chỉ cảnh báo theo cấu hình                                                                  | Hạn mức/ngoại lệ môn được chốt theo điều lệ, tranh suất kiểm trên DB thật                                                                  |
| R05 / R03     | Một đội/trường/nội dung; cơ cấu theo cấu hình, đăng ký cá nhân trước đôi/tiếp sức; thay thành viên qua snapshot/revision mới có lý do, giữ đội duyệt cũ        | Màn hình đội, đề nghị HLV và cập nhật trọng tài theo quyền đã chốt; tích hợp lịch sử thật                                                  |
| R06 / R03     | Nháp/gửi/duyệt/trả lại; CAS/version; giữ revision duyệt cũ; hạn đăng ký kiểm bằng clock server; duyệt hồ sơ mới trước duyệt thi đấu                            | Endpoint/session thật, thông báo; khóa lifecycle R/C/K trong transaction thật và invalidation roster khi C draft                           |
| R07 / R04     | Giao diện thử danh mục phân cấp, preview CSV, lỗi/cảnh báo, gửi/duyệt/trả lại/bản sửa cho cá nhân                                                              | Trường/admin thật, API, lưu bền, giao diện đội và import file thật; chưa end-to-end                                                        |
| R08 / S02     | Kiểm trọng tài approved/checklist/cùng trường, số người hợp lệ, không có Cập nhật hộ                                                                           | Lưu tổ/phân công, kiểm lại vòng sau; nối scheduler C04 cho trùng lịch liên môn                                                             |
| R09 / S03     | Policy xem file theo giải/trường/môn/checklist, xem và tải lên biên bản là quyền riêng; metadata nhiều liên kết                                                | Endpoint upload/download, xác thực metadata từ hồ sơ/trận, quét tệp, Drive cuối dự án và quyền VĐV tự tải còn cần chốt                     |
| R10 / Q01/Q02 | Hai đăng ký tranh suất cuối chỉ một được gửi; cấp mã đồng thời với retry; kiểm rollback, receipt, thu hồi quyền, scope và DTO A03                              | Kiểm đồng thời trên DB thật với unique/lock/transaction, kiểm API trực tiếp và dữ liệu thật                                                |

## Dùng bản thử

Chạy theo README môi trường hiện có. Mở **Kiểm tra đăng ký**, nhập trường và năm, điền cấu hình mẫu để thử hoặc dán mảng `CatalogNode` JSON đã rà soát. Bấm nạp để tạo context mới rỗng. Mẫu tổng hợp không phải điều lệ hay quota sản xuất. CSV có cột `student_code,name,sex,birth_year,grade`, giới tính `male/female`; cột `cccd` tùy chọn chỉ hiện bản che trong preview. **Chỉ dùng dữ liệu tổng hợp** ở màn hình này, không nhập giấy tờ thật. Toàn bộ bản thử mất khi đổi tab hoặc tải lại; phiếu A04 được lưu riêng trong localStorage.

Xem trước rồi thêm khi tất cả dòng hợp lệ; không ghi đè hồ sơ đã có. Chọn môn/nhóm/nội dung và VĐV, thêm đăng ký thử, gửi rồi duyệt thử. Chọn VĐV khác và sửa: cột bản duyệt vẫn giữ người cũ cho tới lần duyệt mới. Nút thử không xác minh tài khoản hoặc biến dữ liệu thành chính thức. Chưa cấp mã VĐV hoặc tạo thư mục. Giao diện hiện chỉ nhập cá nhân; logic đội có trong lõi và test.

## Bàn giao tích hợp

Đọc [hợp đồng adapter](integration.md). `athleteDto` và `registrationDto` khớp A03 hiện tại; không thêm endpoint hoặc sửa DTO. `approvedEntries` đưa revision đã duyệt sang C10, giữ global `studentId` cho scheduler; từ chối tham chiếu duyệt hỏng thay vì âm thầm bỏ VĐV. K dùng cùng định danh và snapshot. O/Q nhận `packages/registration/dist`, CI build và bộ test. D02 nhận danh mục/dữ liệu sau khi adapter thật xuất bản đối chiếu; hồ sơ D chưa được đổi thành passed.

Các phép thử memory chỉ chứng minh quy tắc và hợp đồng adapter. Không thay unique constraints, session, endpoint hay UAT thật. Chưa được gắn trạng thái Accepted theo QT39/QT40.

## Ảnh kiểm tra trình duyệt

Chromium đã chạy CSV → tạo/gửi/duyệt → sửa → gửi lại: [bản B đang chờ, bản A vẫn duyệt](screenshots/pending-revision.png), rồi [chuyển sang B sau duyệt](screenshots/approved-revision.png). Chỉ dữ liệu tổng hợp trên bản phát triển; [manifest](screenshots/manifest.json) lưu hash ảnh và asset đã chạy, không phải bằng chứng UAT người dùng.

Rà soát trước I đã bổ sung gate C/K và cầu nối approved roster trong `@hkpd/integration`; xem [phản biện liên nhóm](../review/pre-i.md).
