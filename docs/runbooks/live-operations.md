# Kết nối vận hành HKPĐ 2026

Ngày 15/10/2026 (Asia/Saigon). Repository `hoangtuanhung-lab/QL_HKPD2`, website `https://hkpd.netlify.app`, Supabase `https://sflnbtnwsafncdzhkdix.supabase.co`.

> Luồng kết quả trong tài liệu này mô tả bản 001–006. Phiên bản mới dùng [học sinh nền, import đăng ký và kết quả vòng/trận (007–008)](student-import-match-results.md), thay cách nhập/duyệt kết quả cũ và bổ sung đội/cặp. Giữ phần cấu hình dịch vụ bên dưới; xem tài liệu mới để vận hành kết quả.

## Mã nguồn đã nối

Bản production có cấu hình Supabase dùng `LiveWorkspace`, không lấy bản nháp `localStorage` làm dữ liệu chính thức. Bản preview dev và các công cụ thử cũ vẫn độc lập. Thiếu backend, mất quyền, lỗi migration hoặc mất mạng sẽ báo lỗi; không mở dữ liệu thử thay thế.

- Nhà trường chỉ có trường được giao. Nhập hàng, chọn nội dung, **Lưu lên hệ thống**, rồi **Gửi duyệt đăng ký**. Chỉ bấm đĩa mềm của từng hàng chưa gửi lên máy chủ. Bảng luôn giữ hàng trống để nhập tiếp.
- Server cấp mã VĐV ổn định, kiểm trùng mã định danh, môn được mở, tối đa hai môn, cấp học, tuổi, giới tính, nhóm tuổi và cấp học trường. Khi gửi duyệt cần mã định danh, ngày sinh, lớp và ít nhất một nội dung hợp lệ.
- Phiếu đã gửi không sửa trực tiếp. Quản trị **Duyệt** hoặc **Trả lại** có lý do. Chỉ phiếu đã duyệt xuất hiện cho trọng tài theo môn được giao. Không trả lại phiếu khi đã có phân làn/kết quả liên quan để tránh làm sai dữ liệu thi đấu.
- Quản trị lưu lịch từng nội dung: địa điểm, bắt đầu/kết thúc theo giờ Việt Nam. Server chặn trùng địa điểm hoặc VĐV đã duyệt trong khoảng lịch giao nhau. Đây là lịch theo nội dung, chưa thay bộ xếp từng trận hoặc cấu hình nghỉ giữa trận. Duyệt phiếu cũng kiểm tra VĐV có bị trùng các lịch đã xếp hay không; không bỏ nội dung đã có lịch/làn/kết quả khỏi danh mục để tránh che dữ liệu thi đấu.
- Trọng tài/tổ trưởng phụ trách Điền kinh hoặc Bơi nhập lượt/làn cho **nội dung cá nhân chạy/bơi**. Server từ chối môn ngoài phân công, hồ sơ chưa duyệt, làn trùng, số làn không hợp lệ. Quản trị không có quyền ghi phân làn, kể cả gọi RPC trực tiếp.
- Trọng tài nhập thành tích cá nhân theo biên bản, kèm đơn vị. Quản trị đối chiếu và xác nhận; trọng tài không tự xác nhận. Kết quả đã xác nhận bị khóa, trường chỉ đọc kết quả đã xác nhận. Không tự suy ra huy chương/xếp hạng từ chuỗi thành tích nhập tay.
- Các màn hình có **Tải lại dữ liệu**, tự đọc lại khi lấy nét/quãng 60 giây nếu không có thay đổi chưa lưu. Đây là tải lại có kiểm soát, không phải Supabase Realtime. Lỗi ghi hoặc trùng revision giữ nội dung đang nhập; đối chiếu trước khi tải lại.
- Ảnh/biên bản lưu qua Netlify Functions vào Drive. Mỗi VĐV có một mapping thư mục duy nhất; thư mục vật lý được tạo khi mở hồ sơ lần đầu. Tạo lại sau lỗi dùng cùng ID đã giữ trong Supabase. Không cấp quyền `anyone` hoặc trả URL chia sẻ Drive. Thư mục gốc/thư mục VĐV có quyền công khai hoặc domain bị từ chối.
- Tải ảnh tại **Hồ sơ và biên bản VĐV — Google Drive** sau khi lưu VĐV lên hệ thống. Không còn lưu ảnh base64 trong phiếu online. Chấp nhận JPG/PNG/PDF có chữ ký tệp phù hợp, tối đa 4 MB/tệp. Tệp tải xuống luôn đi qua kiểm quyền, không dùng URL công khai.

Các tài khoản trường dùng chung một trường cùng đọc/ghi phiếu trường đó; revision chống ghi đè đồng thời. Danh sách trọng tài bỏ CCCD và ghi chú riêng, chỉ giữ nội dung thuộc môn được giao. Mỗi lượt ghi nghiệp vụ có audit actor từ `auth.uid()`; không tin vai trò, mã trường, trạng thái hoặc mã VĐV tự gán từ client. Bảng nghiệp vụ và ID thư mục Drive không mở đọc/ghi trực tiếp cho browser.

## Phần chủ dự án cần áp dụng

Mã đã viết/kiểm thử không tự tạo migration trên project thật hoặc thay cấu hình Netlify. Codex chưa có credential quản trị Supabase/Netlify/Drive trong môi trường; không xác nhận những bước dưới đây đã chạy trên dịch vụ thật.

### 1. Supabase SQL Editor

Đăng nhập đúng project `sflnbtnwsafncdzhkdix`, role owner/postgres. Mỗi file là một transaction, chạy **đúng thứ tự**, kiểm tra kết quả thành công trước file tiếp theo:

1. Nếu chưa áp dụng: [003 — trường và danh mục](../../infra/supabase/003_admin_schools_catalog.sql).
2. Nếu chưa áp dụng: [004 — tài khoản và phân công](../../infra/supabase/004_account_management.sql).
3. [005 — đăng ký, lịch, phân làn, kết quả dùng chung](../../infra/supabase/005_live_operations.sql).
4. [006 — phân quyền tệp và mapping Drive](../../infra/supabase/006_drive_files.sql).

001/002 phải có từ bước cấp quản trị đầu tiên. File 005 chứa metadata danh mục chính thức, được kiểm tra tự động với danh mục Excel. Các file không chép tài khoản/dữ liệu kiểm thử vào production, không xóa dữ liệu cũ. Lặp lại migration không đặt lại revision hoặc mapping Drive.

Đăng nhập Google bằng tài khoản quản trị. Các trường và trọng tài cần đăng nhập ít nhất một lần; quản trị vào **Quản lý tài khoản** cấp đúng vai trò/trường/môn. Danh mục trường không tự tạo tài khoản Google.

### 2. Google Drive API và client của ban tổ chức

Google OAuth đăng nhập Supabase tiếp tục giữ callback:

```text
https://sflnbtnwsafncdzhkdix.supabase.co/auth/v1/callback
```

Drive dùng **client Web application riêng** của project HKPĐ, không đưa Client secret vào frontend. Bật **Google Drive API**. Thêm Authorized redirect URI cho công cụ cấp quyền trên máy của chủ Drive:

```text
http://127.0.0.1:43821/oauth/callback
```

Client dùng Google Auth Platform cùng project, scope `https://www.googleapis.com/auth/drive`. Dùng tài khoản sở hữu thư mục gốc `1BBWEsER65uW2-SAoekHTRrZ6CqbsTxjR`. Phạm vi Drive này cần để truy cập thư mục gốc có sẵn; đăng nhập Google thông thường không cung cấp refresh token Drive cho máy chủ.

Trên **máy của chủ thư mục**, có Node 24 và bản checkout mã nguồn, tạo tệp riêng `.env.drive.local` ở gốc repository với hai biến `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`. Hai tệp `.env.drive.local` và `.env.drive.tokens` được Git bỏ qua; không gửi lên GitHub hoặc vào chat. Chạy:

```bash
node --env-file=.env.drive.local scripts/connect-drive.mjs
```

Mở URL Google mà lệnh hiển thị, kiểm tra đúng client HKPĐ, đăng nhập tài khoản chủ Drive và cấp quyền. Callback lưu token **chỉ vào `.env.drive.tokens`**, không in token trong terminal hoặc trang callback. Thêm giá trị token vào Netlify theo bảng bên dưới. Công cụ từ chối ghi đè tệp token đã có; giữ bản cũ để đối chiếu trước khi tự thay bằng token mới.

Nếu Google app đang **Testing**, thêm email chủ Drive vào Test users. Refresh token cho Drive của app External/Testing thường hết hạn sau 7 ngày; cần cấu hình trạng thái xuất bản/verification phù hợp chính sách Google trước vận hành dài hạn. Khi token bị thu hồi/hết hạn, cấp lại bằng cùng công cụ và cập nhật Netlify. Không bật chia sẻ công khai thư mục gốc để xử lý lỗi quyền.

### 3. Netlify Environment variables

Đối chiếu [mẫu tên biến](../../infra/env/netlify.env.example). Các giá trị trống cần nhập tại Netlify, không nhập bí mật trong mã hoặc chat.

| Biến                            | Scope                          | Nguồn                                                                                    |
| ------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Builds / Production            | URL Supabase ở đầu tài liệu                                                              |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Builds / Production            | Supabase publishable key hoặc anon key                                                   |
| `SUPABASE_URL`                  | Functions / Production         | Cùng project với frontend                                                                |
| `SUPABASE_PUBLISHABLE_KEY`      | Functions / Production         | Cùng publishable key                                                                     |
| `SUPABASE_SERVICE_ROLE_KEY`     | Functions / Production, secret | Supabase secret API key hoặc legacy service_role key; chỉ máy chủ dùng cho mapping Drive |
| `GOOGLE_DRIVE_CLIENT_ID`        | Functions / Production         | Client Drive riêng                                                                       |
| `GOOGLE_DRIVE_CLIENT_SECRET`    | Functions / Production, secret | Client Drive riêng                                                                       |
| `GOOGLE_DRIVE_REFRESH_TOKEN`    | Functions / Production, secret | Tệp riêng sinh bằng công cụ phía trên                                                    |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID`   | Functions / Production         | `1BBWEsER65uW2-SAoekHTRrZ6CqbsTxjR` nếu đúng thư mục gốc đã chọn                         |

Không đặt service role, Client secret hoặc refresh token trong biến `VITE_...`; biến VITE được nhúng vào JavaScript trình duyệt. Nếu tài khoản Netlify không có bộ chọn scope, vẫn giữ **tên biến máy chủ không có tiền tố VITE**. Không in các giá trị bí mật khi kiểm tra.

`netlify.toml` đã đặt Node 24, build `npm run build`, publish `apps/web/dist`, functions `netlify/functions`. Hai function là `athlete-files` và `integration-status`, không cần một máy chủ Fastify chạy thường trực cho luồng hiện tại. API/worker nền cũ không được coi là đã nối production. Không thêm rewrite SPA bắt các đường `/.netlify/functions/*`.

### 4. Merge, triển khai có chủ động và nghiệm thu

Chủ dự án đã yêu cầu dừng deploy tự động; **giữ Stopped builds và Auto Publishing Locked trong lúc review**. Push/PR không phải bằng chứng website đã cập nhật. Sau khi các cấu hình và SQL đã áp dụng, chủ dự án quyết định mở build/triển khai một phiên bản được duyệt. Không bấm Trigger deploy với kỳ vọng nó chạy được khi build vẫn Stopped. Có thể mở build tạm để triển khai phiên bản đã chọn rồi dừng lại; không tự bật auto publishing lâu dài.

Sau khi phiên bản mới thực sự được triển khai:

1. Đăng nhập quản trị → Tổng quan → **Kiểm tra kết nối hệ thống**. Supabase và Drive phải đạt. Chỉ quản trị được gọi endpoint kiểm tra; endpoint không trả secret. Nút này kiểm tra kết nối đọc, không thay thử ghi tệp.
2. Quản trị thêm ít nhất hai trường, cấp tài khoản mỗi trường và một trọng tài Điền kinh/Bơi. Đăng nhập các tài khoản ở hai trình duyệt riêng.
3. Trường A nhập hồ sơ hợp lệ và chọn hai môn → **Lưu lên hệ thống** → tải lại trang, đối chiếu dữ liệu còn nguyên → **Gửi duyệt**. Trường B không thấy/sửa được phiếu A. Chưa duyệt thì trọng tài chưa thấy danh sách.
4. Quản trị **Duyệt**; trọng tài tải lại thấy đúng nội dung được giao và mã VĐV server cấp. Kiểm tra học sinh Tiểu học không chọn/gửi `DK_THCS_NAM_TC_1500M`.
5. Quản trị lưu lịch; thử hai nội dung có cùng VĐV trùng giờ ở hai địa điểm để xác nhận server chặn. Trọng tài chạy/bơi lưu phân làn; thử trùng lượt/làn để xác nhận chặn. Quản trị không có biểu mẫu phân làn.
6. Trọng tài gửi thành tích cá nhân; trường chưa thấy kết quả chờ. Quản trị đối chiếu biên bản và xác nhận; trường tải lại thấy kết quả đã xác nhận. Kết quả xác nhận không bị ghi đè bằng lần gửi lại.
7. Chọn VĐV → tải ảnh PNG/JPG hoặc PDF → tải lại danh sách tệp → tải xuống. Kiểm tra trong Drive chỉ có một thư mục cho VĐV dù mở lại nhiều lần; không có chia sẻ công khai. Thử tài khoản trường khác/trọng tài ngoài phân công phải bị từ chối.
8. Thu hồi tài khoản trọng tài; Kiểm tra quyền/tải lại phải mất quyền. Đăng xuất rồi đăng nhập lại không khôi phục dữ liệu từ bản nháp trình duyệt.

## Giới hạn chưa được nghiệm thu cho giải đầy đủ

- Đang giới hạn **giải 2026**. Chưa có API tạo giải mới/kết chuyển trực tuyến.
- Chưa nối lưu/chốt nhánh loại trực tiếp, vòng tròn, thành viên đội/đôi/tiếp sức hoặc tiến trình trận. Các màn trọng tài liên quan chỉ xem danh sách đăng ký đã duyệt; không tự ghép người thành đội.
- Kết quả online hiện là **thành tích cá nhân nhập tay theo biên bản**. Chưa tính huy chương, thứ hạng, tie-break hoặc xác nhận kết quả đội/đối kháng; chưa có luồng sửa kết quả đã xác nhận. Không sử dụng luồng này thay quy trình trận/trao giải còn thiếu.
- Mục Công khai hiện chỉ cho tài khoản có quyền xem kết quả đã xác nhận, chưa phải trang công bố ẩn danh. Ngoại tuyến chưa nối hàng đợi với dữ liệu thật. Không coi công cụ thử cũ là đã chạy online.
- Không tự nhập các bản nháp cũ vào server để tránh gửi nhầm trường/giải. Nhà trường đối chiếu và nhập/Excel trong phiếu đúng trường, chọn lại nội dung trước gửi duyệt.
- Tệp tải lên hiện được đặt tên máy chủ; không tự chèn ảnh Drive vào ô ảnh của dialog. Không tự chuyển ảnh base64 cũ lên Drive.

Đạt kiểm thử tự động chưa có nghĩa đã nghiệm thu vận hành toàn bộ giải. Cần thực hiện các bước trên với tài khoản và dịch vụ thật, đồng thời hoàn tất các nghiệp vụ còn thiếu trước khi mở giải đầy đủ.

## Kiểm thử trong repository

- `npm run check`: mã nguồn, hợp đồng, danh mục SQL/Excel, lint/typecheck, kiểm thử UI/adapter/domain và build.
- `bash infra/supabase/tests/run.sh`: PostgreSQL 17 cô lập, lặp migration, phân quyền/RLS, sửa chéo trường, CAS, duyệt, catalog đóng, scope trọng tài, lịch/làn/kết quả và quyền tệp. Không dùng project thật.
- `npm run secret:scan`: quét mã nguồn/tài liệu.
- Google/Netlify được giả lập trong kiểm thử handler; chưa thực hiện consent chủ Drive hoặc upload vào thư mục thật từ môi trường Codex.
