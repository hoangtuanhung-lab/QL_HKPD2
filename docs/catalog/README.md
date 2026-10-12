# Danh mục đăng ký nhận ngày 13/10/2026

Nguồn: `DanhMuc_Mon_NoiDung_HKPD (1).xlsx` do người dùng gửi. Bản nguyên gốc lưu tại [DanhMuc_Mon_NoiDung_HKPD.xlsx](DanhMuc_Mon_NoiDung_HKPD.xlsx); SHA-256 của Excel và mẫu TSX nằm trong [source-manifest.json](source-manifest.json). Có 133 dòng nội dung, 133 mã `MaND` duy nhất, 9 môn; các hàng chỉ định dạng nhưng không có dữ liệu không được nhập. Đây là tệp danh mục đầy đủ trước đó được ghi nhận còn thiếu trong hồ sơ A01 ngày 11/10; việc nhận tệp không tự xác nhận nghiệm thu tất cả quota/điều lệ.

Màn đăng ký dùng `MaND` của dòng được chọn cho cột **Mã môn**, không tự ghép mã giả. `MaMon` dùng để phân loại môn. Các cột khác, bao gồm hình thức, số người/đội và ghi chú hạn mức, được giữ nguyên trong dữ liệu generated để đối chiếu; không suy diễn quota/member count từ các số hoặc dòng có ghi “giả định”.

## Lọc trên màn hình

- Cấp học lấy từ lớp 1–5/6–9 hoặc trường cấp học được khai báo khi chưa suy ra được; cấp học đã biết không được đổi bằng dropdown đăng ký. Năm sinh và giới tính hiển thị ở thông tin chung. Thiếu thông tin sẽ chặn chọn môn.
- Tuổi = 2026 − năm sinh. Theo yêu cầu hiện tại, TH phải dưới 11 tuổi, THCS không nhận học sinh dưới 11 tuổi; cấp học/năm sinh mâu thuẫn sẽ báo cần kiểm tra, không tự chuyển cấp.
- Lọc môn và nội dung theo cấp học, giới tính. Nội dung Nam - nữ xuất hiện cho cả nam và nữ. Nữ không có lựa chọn Bóng đá; nam TH nhận `BD_TH`, nam THCS nhận `BD_THCS`.
- `Nhóm` rỗng hoặc `Cả cấp` không tạo phân nhóm cho môn chỉ có các giá trị này, nên Bóng đá/Điền kinh/Đẩy gậy/Kéo co/Vovinam khóa Phân nhóm. Bóng đá có đúng một nội dung phù hợp và được tự điền ngay khi chọn môn. Với Bơi/Đá cầu/Cờ vua/Cầu lông, chỉ hiển thị nhóm tuổi phù hợp; `Cả cấp` vẫn là lựa chọn riêng cho nội dung tiếp sức chung.
- **Nhãn nhóm trong Excel là căn cứ tuổi**, không suy từ hậu tố mã. Tệp có nhãn 6–8, 9–10, 11–12, 13–14 tuổi dù một số mã còn mang `0709`, `1011`, `1213`, `1415`. Không sửa các mã đã cung cấp và không thay bằng nhóm tuổi của danh sách tham khảo cũ.
- Đổi môn xóa phân nhóm/nội dung phía sau; đổi nhóm xóa nội dung. Thêm nội dung kế thừa môn và nhóm của dòng cuối, để trống nội dung mới. Chặn mã trùng, mã sai môn/nhóm/cấp/giới tính và môn thứ ba khi lưu.

Danh mục phục vụ bản nháp Web cho kỳ giải 2026. Chưa mount business API, chuyển dữ liệu vào snapshot/UUID của nhóm R hay chạy database. Quota trường, thành viên đội/đôi, hạng cân thực tế và quyền duyệt chính thức vẫn thuộc bước tích hợp. Không kết nối Google/Drive, Supabase hoặc Netlify.

## Tái tạo và kiểm tra

`npm run catalog:generate` đọc Excel, kiểm cột/giá trị/công thức/mã trùng và tạo `apps/web/src/athlete-catalog.generated.ts`. `npm run catalog:check` so sánh toàn bộ kết quả generated và SHA với Excel, không ghi tệp; lệnh này đã có trong `npm run check`. Khi sửa danh mục, cập nhật Excel rồi generate và review thay đổi, không sửa tay file generated.

JSON portable mới có mã danh mục dùng phiên bản 4; các phiếu v1/v2/v3 vẫn đọc được. Lựa chọn v3 cũ chỉ được đối chiếu nếu tìm được duy nhất một mã phù hợp; phần chưa đối chiếu được giữ nguyên và cần người dùng chọn lại/xóa rõ ràng trước lưu. Không tự bỏ nội dung cũ hoặc đoán mã. Ảnh và cơ chế Web Locks/CAS/quota của bản nháp vẫn giữ.
