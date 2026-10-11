# Tiếp nhận mã từ nhóm lập trình

Theo chỉ dẫn người dùng ngày 11/10/2026, Codex là đầu mối kiểm tra, chỉnh sửa và đẩy mã lên `hoangtuanhung-lab/QL_HKPD2`. Không bắt buộc nhóm dùng GitHub Team hoặc có tài khoản review thứ hai. Người dùng có thể gửi mã của thành viên qua hội thoại hoặc chỉ định nhánh/commit cần tích hợp.

## Nội dung mỗi lần gửi

- Mã nhiệm vụ trong plan, module và tên người thực hiện.
- Các tệp đã thay đổi (hoặc nhánh/commit), cùng commit main đã dùng làm nền nếu có.
- Chức năng đã làm, cách chạy/kiểm tra và phần còn thiếu; ghi rõ fixture/mock và API thật.

Gửi từng nhiệm vụ hoặc nhóm thay đổi liên quan để dễ đối chiếu và tránh ghi đè công việc của 28 người. Không gửi node_modules, thư mục build, credential hoặc dữ liệu học sinh thật. Các thay đổi dependency phải kèm package.json và lockfile phù hợp.

## Codex xử lý

1. Đối chiếu phạm vi với plan và hợp đồng hiện tại; đọc thay đổi trước khi chạy mã. Giữ bản gốc/lịch sử của thành viên, không reset hoặc ghi đè sửa đổi chưa bàn giao.
2. Tích hợp trong nhánh riêng từ main mới nhất. Sửa lỗi tích hợp, phân tách phần đang mock và phần thật; ghi nguồn đóng góp của thành viên trong PR khi được cung cấp, không tự đặt danh tính author.
3. Kiểm OpenAPI/DTO, kiểu dữ liệu và kiểm thử phù hợp thay đổi. Trước đẩy chạy các checks hiện có và secret scan; không sửa test/luật giải chỉ để CI xanh.
4. Đẩy nhánh và mở PR mô tả chức năng, điều chỉnh, kiểm chứng và đầu vào còn thiếu. Tránh merge nhiều PR cùng chạm contracts/schema khi chưa cập nhật nhánh.
5. Báo người dùng kết quả và liên kết PR. Chỉ merge theo chỉ dẫn phù hợp; không tạo approval GitHub giả hoặc tuyên bố đã có reviewer độc lập.

SQL, Google và Netlify giữ lịch cuối dự án. Phần module cần chúng có thể bàn giao thiết kế/adapters và fixture đúng hợp đồng nhưng không được ghi tích hợp hoàn tất. Thư mục riêng của VĐV tiếp tục dùng khóa kỳ giải/VĐV, không dùng tên làm khóa và không cấp quyền sửa official result từ quyền lưu tệp.

## Bảo vệ chất lượng

CI quality/secrets và yêu cầu PR là nền tảng workflow. Theo CR-007, ruleset đề xuất không yêu cầu approval tài khoản thứ hai. Nếu chưa bật được bảo vệ nhánh do quyền integration/UI, Codex vẫn dùng PR và kiểm CI trước hợp nhất; đây là quy trình do người quản lý thực hiện, không phải GitHub enforcement đã nghiệm thu. Xem `branch-protection.md` và `github:audit` cho trạng thái thực.
