# A04 — Phiếu đăng ký cơ bản của nhà trường

Theo yêu cầu người dùng, chưa biết số trường hoặc số VĐV: dữ liệu ban đầu rỗng, số lượng tính từ phiếu đã nhập. Không áp dụng 7 trường/500 VĐV của bộ fixture A05 thành hạn mức nghiệp vụ.

Chạy `npm ci`, `npm run env:init`, `npm run build`, rồi `npm run dev` theo README. Trên máy cá nhân, mở web tại cổng dev được cấu hình. Trong cloud, kiểm tra bằng bộ test và smoke, không coi địa chỉ loopback là liên kết truy cập từ máy người dùng.

## Luồng dùng được

1. Nhập tên kỳ giải và trường, bấm **Tạo / mở phiếu nháp**. Cùng tên trường và kỳ giải sau chuẩn hóa sẽ mở phiếu hiện có. Khác kỳ giải tạo phiếu riêng.
2. Nhập họ tên, lớp/nhóm học, nội dung muốn tham gia rồi **Thêm VĐV**. Có thể sửa, hủy sửa, xóa và bổ sung khi có danh sách. Hai học sinh trùng tên vẫn là hai bản ghi.
3. Chọn phiếu trường để xem danh sách riêng. Các bộ đếm phản ánh phiếu theo kỳ giải, tổng VĐV nháp và số VĐV của phiếu đang mở; không phải số người duy nhất trong toàn hệ thống.
4. **Xuất phiếu đăng ký** tạo JSON của trường đang mở. **Nhập phiếu từ tệp** phục hồi phiếu đúng định dạng phiên bản 1. Tệp sai hoặc trùng trường/kỳ giải bị từ chối toàn bộ, giữ bản hiện có; chưa hỗ trợ ghép hai phiếu cùng trường.

Bản nháp lưu bằng localStorage của trình duyệt/origin hiện tại, không đồng bộ giữa máy hoặc giữa cổng dev/staging. Khi dùng máy chung, các phiếu nháp có thể được người dùng chung trình duyệt xem; dùng hồ sơ trình duyệt riêng và xuất phiếu trước khi đổi máy hoặc xóa dữ liệu trình duyệt. Nếu lưu thất bại, danh sách còn trong phiên và có thể xuất tệp. Dữ liệu lưu hỏng được giữ nguyên, không bị tự ghi đè.

## Phác thảo các vai trò

| Màn hình         | Vai trò dự kiến     | Luồng                                                                   |
| ---------------- | ------------------- | ----------------------------------------------------------------------- |
| Đăng ký VĐV      | Nhà trường          | Tạo phiếu → nhập/sửa danh sách → bàn giao bản nháp                      |
| Phân công        | Quản trị/điều phối  | Kỳ giải/môn → tổ trưởng/trọng tài/checklist → rà soát                   |
| Sơ đồ thi đấu    | Điều phối           | Đăng ký đã duyệt → cấu hình vòng đấu → kiểm tra vị trí ảo/chốt          |
| Vòng tròn        | Điều phối           | Danh sách đủ điều kiện → bảng/lịch → rà soát trùng lịch                 |
| Xác nhận kết quả | Trọng tài/tổ trưởng | Bản nhập → kiểm phiên bản → xác nhận; bản sửa chưa duyệt giữ kết quả cũ |
| Công khai        | Người theo dõi      | Kỳ giải đã công bố → thành tích/bảng đã chốt → dữ liệu công khai        |

Năm màn hình ngoài đăng ký chỉ là phác thảo luồng, chưa có thao tác nghiệp vụ. Không giả lập phân quyền hoặc công bố danh sách nháp. A04 chưa nghiệm thu đầy đủ với R02/R03/R04 và chủ module; cần bổ sung tương tác nghiệp vụ theo A01 và điều lệ được chốt.

## Giao diện dữ liệu để phát triển tiếp

`apps/web/src/registration-draft.ts` quản lý định dạng trao đổi **nháp cục bộ**, độc lập DTO API A03. JSON có `format`, `formatVersion`, `editionName`, `schoolName`, `athletes` (họ tên/lớp/nguyện vọng). Không nhận ID máy chủ, mã VĐV, trạng thái duyệt hoặc thông tin thư mục trong tệp nhập. ID nháp chỉ dùng trong phiên, được tạo lại khi tải; STT không phải mã VĐV. React hiển thị nội dung dưới dạng văn bản.

Khi có API và tài khoản, chủ module đăng ký sẽ nối danh mục kỳ giải/trường/nội dung chính thức, kiểm quyền tại máy chủ, kiểm điều kiện, gửi duyệt và cấp mã từ server. Nguyện vọng hiện là văn bản tự do, chưa xác nhận đủ điều kiện hoặc thay thế danh mục. Chưa có đăng ký trực tuyến đa trường, đăng nhập, lưu chính thức hoặc tính kết quả.

Yêu cầu mỗi VĐV có thư mục kết quả vẫn theo ADR-002 và hợp đồng A03; bản này chưa tạo thư mục chính thức. SQL, Google và Netlify giữ ở bước cuối theo CR-004.

## Kiểm chứng

`npm run check` bao gồm kiểm thử tương tác biểu mẫu, giữ dữ liệu theo trường/kỳ giải, chỉnh sửa/xóa, phục hồi sau tải lại, nhập lỗi/trùng, xuất JSON, bộ đếm và lỗi lưu trình duyệt. Kịch bản tổng hợp 8 trường/501 VĐV kiểm tra không áp đặt quy mô fixture; không chứa dữ liệu học sinh thật. `node scripts/smoke.mjs` kiểm dev/staging cùng API/worker và dừng tiến trình.
