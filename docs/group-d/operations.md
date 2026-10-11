# D05 — bàn giao vận hành

L01 nhận checklist và bổ nhiệm người thật; O01/O02 phụ trách vận hành, Q03 kiểm bằng chứng, L02 liên hệ nghiệp vụ. Chưa có tên/liên hệ/lịch trực được cấp nên chưa chốt người nhận.

| Checklist G6                                                  | Trạng thái hiện tại                       | Chủ quản    |
| ------------------------------------------------------------- | ----------------------------------------- | ----------- |
| UAT backend thật và người dùng ký nhận                        | Chờ D01/G5                                | L02/Q03     |
| Đối chiếu dữ liệu/tài khoản/rule thật                         | Chờ D02                                   | R02/S01     |
| RC/tag, migration, backup/restore, chuyển VPS                 | Chờ D03/I04/I07                           | O01/O02     |
| Hướng dẫn có ảnh đúng RC, tập huấn các vai trò                | Có hướng dẫn bản phát triển, chờ D04 cuối | F02/L02     |
| Lịch trực có người chính/dự phòng, thời gian và liên hệ riêng | Chờ chỉ định                              | L01         |
| Diễn tập sự cố/hotfix và người nhận bàn giao                  | Chờ tích hợp                              | L01/O01/Q03 |

Lịch trực cần ngày/giờ theo Asia/Saigon, người chính, dự phòng, phạm vi quyền và kênh liên hệ trong kho riêng; không đưa secret/số điện thoại lên repo. Chạy thử mất mạng, gửi lại, xung đột, sửa/hủy/xác nhận và phục hồi theo I06/G5 trước G6. Q03 ghi defect với mức độ và bằng chứng; không để lỗi nghiêm trọng chưa giải quyết rồi xác nhận sẵn sàng.

## Xử lý sự cố và hotfix

Ghi mã sự cố, thời điểm, SHA/ruleVersion, triệu chứng, phạm vi ảnh hưởng, trạng thái kết quả chính thức, người phụ trách và cập nhật tiếp theo. Thu log đã che PII; giữ bằng chứng riêng, không gửi thông tin tài khoản vào issue công khai. O01 đánh giá cần bảo trì hay rollback theo `release.md`, L02 thông báo người dùng bị ảnh hưởng. Không tự sửa điểm trực tiếp trong DB.

Tạo nhánh hotfix từ tag đang chạy, bổ sung test tái hiện có ý nghĩa, sửa hẹp, chạy kiểm chứng và UAT hồi quy các luồng liên quan. Người dùng review PR theo CR-007; tạo RC mới, kiểm lại các bằng chứng chịu ảnh hưởng với đúng commit, sao lưu trước phát hành. Không tái dùng manifest commit cũ hoặc bỏ kiểm quyền/version để hết lỗi. Kết thúc sự cố khi đã xác minh dữ liệu/kết quả, người dùng nhận xác nhận, tài liệu cập nhật và có biện pháp tránh lặp.

Biên bản bàn giao cuối cần commit/tag, manifest đã rà soát, vị trí backup và diễn tập restore, hướng dẫn, danh sách dữ liệu/tài khoản đã đối chiếu, lịch trực có người nhận, danh sách lỗi còn lại được chấp nhận và chữ ký/xác nhận L01/L02/Q03/người dùng. Không đưa mật khẩu vào biên bản. Hiện chưa có biên bản đã ký; checklist chuẩn bị không thay nghiệm thu.
