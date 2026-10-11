# D01 — UAT theo vai trò

L02 và Q03 nhận 20 kịch bản T01–T12/TG01–TG08 trong `uat-cases.json`, giữ nguyên trích dẫn plan. Trạng thái kỳ vọng nguồn `needs_source_reconciliation` phải được chủ nghiệp vụ làm rõ trước khi chạy; không dùng mô tả rút gọn thay tiêu chí chính thức. Mọi lần chạy cần mã commit RC, môi trường staging backend thật, phiên bản điều lệ/rule snapshot, phiên bản dữ liệu đầu vào, thời điểm và người thực hiện/rà soát. Dùng dữ liệu tổng hợp cho diễn tập; dữ liệu thật chỉ trong kho riêng được kiểm soát.

| Vai trò            | Buổi thực hành và bằng chứng cần thu                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Nhà trường         | Đăng ký, mã giữ số 0, hạn mức/giới tính, gửi duyệt, sửa chờ duyệt không đổi bản chính thức; thử truy cập trường khác trực tiếp qua API |
| Trọng tài          | Phân công, chặn cùng trường, nhập/sửa điểm, mất mạng, gửi lại cùng lệnh, xung đột phiên bản                                            |
| Tổ trưởng          | Rà bản nhập, xác nhận/sửa/hủy theo quyền; kết quả cũ vẫn chính thức khi bản sửa chưa được duyệt                                        |
| Quản trị/điều phối | Duyệt danh sách, sơ đồ cố định, hạt giống, chuyển cân, lịch xung đột, phân làn; không nhập điểm thay trọng tài                         |
| Người theo dõi     | Chỉ dữ liệu đã công bố; không thấy CCCD/tài khoản/danh sách nháp hoặc tệp ngoài phạm vi                                                |
| Vận hành           | Backup/restore, outbox, log đã che thông tin, chuyển VPS, rollback không mất kết quả                                                   |

Cho mỗi ca: ghi điều kiện trước, thao tác, kết quả mong đợi đã chốt, kết quả thực tế, passed/failed/blocked, người chạy và reviewer, đường dẫn bằng chứng riêng, mã lỗi và thay đổi cần làm. Chưa chạy giữ `pending`; không đổi thành passed theo kết quả unit test. Mở issue với bước tái hiện và dữ liệu tổng hợp khi lỗi; lỗi nghiêm trọng chặn G5/G6. Sau sửa chạy lại đúng ca và ca hồi quy liên quan trên commit mới, lưu lần chạy cũ.

Q03 lập danh sách thay đổi có mức độ, chủ quản, quyết định xử lý và commit sửa. L02 tổ chức demo/UAT, người dùng rà chuyên môn; người dùng duyệt PR theo CR-007. Không yêu cầu gói GitHub Team hoặc tự tạo reviewer giả. Sau chấp nhận, nối từng ca vào `release-manifest.json` bằng hash của bằng chứng và commit chính xác; file mẫu chưa phải hồ sơ nghiệm thu.
