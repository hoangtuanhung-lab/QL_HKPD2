# ADR-002: Tài khoản, tệp và thư mục VĐV

- WBS: A02; ngày 11/10/2026; chờ review G1/G2.
- Phạm vi: quyết định thiết kế; toàn bộ triển khai Google ở bước cuối theo yêu cầu người dùng.

Google OIDC dùng cho đăng nhập, server xác minh token; phê duyệt tài khoản và policy theo giải/trường/môn/checklist do S01/S02 quản lý. Đăng nhập thành công không tự có quyền ghi dữ liệu. Thư viện OAuth, callback URL, tài khoản dự án và hạn mức được xác minh lúc thực hiện cuối dự án, không tạo giá trị giả hoặc yêu cầu credential lúc này.

Google Drive được dùng qua adapter server do S03 sở hữu. Module nghiệp vụ chỉ biết ID tệp và liên kết có kiểm quyền, không nhận credential hoặc URL Drive công khai mặc định. Dev, staging và production dùng cấu hình và thư mục gốc riêng. Không đưa CCCD, token, ngày sinh hoặc hồ sơ vào public projection/log/frontend bundle.

## Yêu cầu bổ sung của người dùng

Mỗi VĐV phải có một thư mục riêng để lưu phần kết quả. Đề xuất khóa logic `edition_id/athlete_id`, không dùng tên VĐV làm khóa. Cấu trúc hiển thị và liên kết mã VĐV giữ nguyên định danh khi tên thay đổi. Thư mục là nơi lưu tệp, không thay bản ghi kết quả chính thức trong hệ thống.

S03 chủ trì phần thư mục/adapter; R02 cung cấp athlete ID và mã hiển thị; K01 liên kết tệp với submission/official revision; P01 sở hữu schema liên kết; O02 bảo toàn manifest/bytes và kiểm phục hồi. O01 cung cấp môi trường và danh sách biến khi triển khai. Việc tạo thư mục phải idempotent, tránh tạo trùng khi retry, kiểm quyền trước tải lên/xem/tải xuống và tách giải.

Chưa có quy định rằng mỗi VĐV có tài khoản đăng nhập. Quyền tự tải tệp của VĐV, hạn mức/dung lượng/định dạng, vòng đời thư mục và liên kết tệp trận chung cần L02/S03 chốt trước triển khai. Không suy ra rằng VĐV được sửa kết quả chính thức từ quyền lưu tệp.

Tiêu chí dự kiến: hai VĐV không truy cập nhầm thư mục; hai giải không lẫn tệp; retry tạo một thư mục; tệp không tự công khai; quyền và lịch sử được kiểm; backup/restore giữ liên kết và khả năng đọc bytes. Các kiểm thử này chưa thực hiện.
