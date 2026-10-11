# A05 — Dữ liệu giả và kịch bản nghiệm thu

`dataset.mjs` tạo dữ liệu tái lập, không dùng thời gian ngẫu nhiên, hồ sơ học sinh thật hoặc dịch vụ bên ngoài. Mặc định 7 trường, 500 VĐV theo tiêu chí A05 của plan; hai trường liên cấp, mã tăng liên tục dùng chung hai cấp. Đây là kích thước bộ thử, không phải số đăng ký hoặc hạn mức sản phẩm. Ứng dụng không import bộ dữ liệu này.

Mỗi VĐV có đúng một `AthleteFolder` theo `edition_id/athlete_id`, trạng thái `deferred`. Chưa tạo thư mục đĩa hay Google Drive thật. Schools và profiles là metadata kiểm thử, chưa phải DTO backend; Athlete và AthleteFolder tuân thủ A03. Mã trường/số thứ tự dùng quy ước giả 2/3 chữ số; giới hạn tham số trong bộ tạo chỉ bảo vệ không gian mã thử, không chốt giới hạn sản phẩm.

Các nhóm đối kháng cá nhân 3/4/5/6/7/8/9 người cung cấp đầu vào và expected format/capacity từ Q076/Q190. Không áp dụng ngưỡng này cho bóng đá/kéo co; engine KO/vòng tròn chưa triển khai. Cohort có ít nhất hai trường, nhưng không tự chứng minh đủ điều kiện giới tính, tuổi, cân và rule snapshot thật.

```bash
npm run group-a:check
# Xuất JSON thuần để lập trình viên dùng trong test; không nạp vào ứng dụng.
node scripts/export-a05.mjs > /tmp/hkpd-a05-dataset.json
```

`scenarios.json` giữ 20 ca T01–T12/TG01–TG08 nguyên nguồn, thêm 10 ca tập trung theo quyết định PDF và yêu cầu thư mục. Mỗi ca ghi đầu mối, yêu cầu, nguồn, loại thực thi và trạng thái. Hai ca mã/thư mục được kiểm về dữ liệu fixture; các ca còn lại chờ engine/backend/UAT. Danh mục 133 nội dung, snapshot tuổi, thao tác bắt đầu và tham số biểu mẫu còn thiếu không được tự đặt expected result.

Q01 nhận đầu vào/đối chiếu tính điểm; Q02 nhận schema/scope/version; Q03 nhận ca UI/xuyên luồng. Khi có backend, thêm assertion gọi API thật và evidence vào từng ca trước nghiệm thu. Không chuyển ca thành “pass” chỉ vì file tồn tại hoặc schema hợp lệ.
