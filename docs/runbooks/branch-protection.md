# B01: Áp dụng và nghiệm thu bảo vệ nhánh

Tệp cấu hình: `infra/github/main-release.ruleset.json`. Tệp đã kiểm cú pháp JSON và đối chiếu tên check/app với CI thực tế; **chưa được GitHub chấp nhận hoặc áp dụng** vì repository hiện bị giới hạn gói và quyền integration.

Ruleset yêu cầu PR, một approval độc lập từ CODEOWNER, xử lý hết review threads và review lại khi có push mới; chặn xóa/force push main và release. Các check `quality` và `secrets` được gắn với GitHub Actions app ID 15368, đã xác minh từ check-runs của repository. Không có bypass actor. Nhánh cần cập nhật theo nhánh đích trước merge.

## Điều kiện trước khi áp dụng

- Repository owner có gói hỗ trợ rulesets trên repository private và quyền quản lý rulesets qua API hoặc giao diện GitHub.
- Có ít nhất một reviewer phù hợp, khác tác giả PR và người push cuối; tài khoản `hoangtuanhung-lab` không thể approve PR #1 do chính tài khoản đó tạo.
- CODEOWNERS trên nhánh đích chứa mapping thực sự cho các tệp cần review. PR #1 hiện mới có mapping trong nhánh công việc; chưa merge hoặc được review.

Không tự đổi repository sang public hoặc mua gói dịch vụ. Không thêm bypass để né điều kiện nghiệm thu. Kiểm tra rulesets hiện có để tránh tạo trùng hoặc thay đổi chính sách không thuộc B01.

## Áp dụng khi đủ đầu vào

Sau khi đọc rulesets hiện có và rà soát nội dung tệp, owner có thể tạo ruleset bằng giao diện GitHub hoặc lệnh dưới đây từ gốc repository với quyền API phù hợp:

```bash
gh api --method POST repos/hoangtuanhung-lab/QL_HKPD/rulesets \
  --input infra/github/main-release.ruleset.json
```

Đây là lệnh thay đổi cấu hình GitHub, chưa được thực thi. Chạy một lần khi chưa có ruleset tương đương; nếu đã có, cần cập nhật đúng ID và giữ các thiết lập hiện hành ngoài phạm vi B01.

## Chứng cứ nghiệm thu

Đọc lại cấu hình trên GitHub: enforcement active, đúng nhánh, đúng checks/app, đúng review và không bypass. Dùng nhánh thử riêng với một lỗi lint có chủ đích, không đưa lên main: CI phải fail và GitHub phải chặn merge. Sửa lỗi, xác minh CI pass nhưng chưa có approval vẫn không merge được; sau review độc lập thì merge đủ điều kiện. Xóa nhánh thử sau kiểm chứng và lưu PR/check/ruleset ID trong hồ sơ bàn giao.

Không coi JSON trong Git hoặc CI pass là bằng chứng bảo vệ nhánh đang có hiệu lực. Merge queue chưa được bật; O01 điều phối thứ tự merge khi tính năng này không khả dụng.
