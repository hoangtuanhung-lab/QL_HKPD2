# D02 — đối chiếu dữ liệu và tài khoản

R02/S01 chuẩn hóa hai bản xuất cùng kỳ giải và ruleVersion: bản nguồn đã được chủ dữ liệu rà soát và bản ứng viên xuất từ backend thật. L02 xác nhận phạm vi, tính đầy đủ và hạn mức theo điều lệ. Công cụ so sánh không tự suy ra hạn mức, không coi hai tệp rỗng hoặc cùng sai là dữ liệu đúng.

Định dạng trao đổi riêng phục vụ rà soát, **không thay DTO API A03**:

```json
{
  "format": "hkpd-reconciliation-v1",
  "editionId": "synthetic-edition",
  "ruleVersion": "test-only",
  "schools": [{ "id": "001", "code": "001", "name": "Trường thử" }],
  "catalog": [],
  "quotas": [],
  "accounts": [],
  "ruleSnapshots": []
}
```

Mỗi bảng là mảng bản ghi có `id` chuỗi duy nhất; mã giữ số 0. R02/S01 thống nhất trước các trường và thứ tự mảng lồng trong từng bản ghi. `catalog` cần mã môn/nội dung, cấp học, giới/nhóm tuổi; `quotas` gồm phạm vi và hạn mức; `accounts` gồm trạng thái duyệt, vai trò/phân công và phạm vi; `ruleSnapshots` chứa quy tắc và phiên bản đầy đủ. Giữ mọi trường nghiệp vụ cần so sánh; chỉ loại trường kỹ thuật biến động sau khi có quyết định được ghi lại. Công cụ kiểm bảng/ID, so sánh toàn bản ghi, phát hiện thiếu/thừa/thay đổi và lệch kỳ giải/ruleVersion; không kiểm đầy đủ ngữ nghĩa điều lệ.

```sh
npm run data:reconcile -- /tmp/source-private.json /tmp/candidate-private.json
```

Mã thoát 0: khớp; 2: lệch; 1: đầu vào không hợp lệ. Báo cáo chỉ chứa số lượng và SHA-256, không xuất tên, email hoặc ID bản ghi. Không commit bản xuất thật, ảnh tài khoản, CCCD hoặc log lỗi chứa dữ liệu nguồn. Lưu tệp thật ở kho riêng có quyền; reviewer tra tệp riêng để giải quyết từng chênh lệch rồi xuất lại. Không chỉnh báo cáo để biến lệch thành khớp. Ghi hash tệp nguồn gốc, cách chuẩn hóa, hash hai bản xuất và báo cáo trong hồ sơ riêng; ghi người rà soát, kỳ giải, ruleVersion và commit ứng viên vào manifest sau khi ký nhận.

Chưa có tệp thật nên D02 chưa được chạy trên dữ liệu thật. Số trường/VĐV do trường đăng ký, không đặt cứng quy mô fixture. Kiểm thư mục kết quả mỗi VĐV theo edition/athlete, quyền truy cập, liên kết tệp và chống tạo trùng ở bước tích hợp Google cuối dự án.
