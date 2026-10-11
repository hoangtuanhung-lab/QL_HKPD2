# Nhóm D — chuẩn bị nghiệm thu và bàn giao

D01–D05 đã có bộ bàn giao để nhóm tiếp tục; **chưa nghiệm thu, chưa phát hành**. Nền tảng hiện có đăng ký nháp cục bộ và công cụ thử nhóm C. Backend nghiệp vụ R/K, tài khoản thật và các diễn tập I chưa hoàn tất. SQL, Google và Netlify thực hiện ở bước cuối theo CR-004; thư mục kết quả mỗi VĐV vẫn là yêu cầu `(edition_id, athlete_id)` cần kiểm chứng khi tích hợp.

| Công việc | Người nhận theo plan | Hồ sơ/công cụ                                                 | Điều kiện còn thiếu                               |
| --------- | -------------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| D01       | L02/Q03              | [UAT](uat.md), [20 kịch bản nguồn](uat-cases.json)            | G5, backend thật, người dùng thực hiện và rà soát |
| D02       | R02/S01/L02          | [Đối chiếu dữ liệu](data-review.md), `npm run data:reconcile` | Tệp gốc, tài khoản và rule snapshot thật          |
| D03       | O01/O02              | [Release/rollback](release.md), `npm run release:audit`       | D01, I07, backup/restore thật, tag RC sau duyệt   |
| D04       | F02/L02/các nhóm     | [Tập huấn](training.md)                                       | Ảnh và tập huấn đúng RC cuối cùng                 |
| D05       | L01/O01/Q03          | [Vận hành](operations.md)                                     | D02–D04, người nhận trực, diễn tập G6             |

Các mã vị trí chưa gắn tên người thật. Kiểm thử công cụ chỉ xác nhận hành vi chương trình; không thay thế người dùng ký nhận QT39/QT40. Manifest mặc định để chờ, lệnh audit trả mã 2 là kết quả đúng ở giai đoạn này; không đưa lệnh này vào `npm run check` để tránh chặn phát triển trước khi tích hợp.
