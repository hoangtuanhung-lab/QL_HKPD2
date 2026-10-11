# B01: Quy trình một đầu mối và bảo vệ nhánh

Repository hiện tại: `hoangtuanhung-lab/QL_HKPD2`. Ngày 11/10/2026, người dùng giao Codex làm đầu mối kiểm tra/chỉnh sửa/đẩy mã của các lập trình viên, không yêu cầu tài khoản reviewer GitHub thứ hai hoặc mua gói Team. Đây là thay đổi quy trình theo CR-007.

## Cấu hình phù hợp quy trình đã chọn

Tệp đề xuất: `infra/github/main-release.ruleset.json`.

- Main/release cần PR và hai check `quality`/`secrets` đạt, từ GitHub Actions app ID 15368.
- Chặn xóa và force-push main/release; không có bypass actor; nhánh phải cập nhật theo nhánh đích và xử lý hết review threads.
- Số approval GitHub bắt buộc là **0**; không bắt buộc CODEOWNER approval hoặc approval của người khác với người push cuối. CODEOWNERS vẫn đánh dấu phạm vi sở hữu; không giả lập tự approve bằng cùng tài khoản.
- Codex kiểm tra mã và báo kết quả qua PR/hội thoại. Yêu cầu đẩy mã không tự đồng nghĩa yêu cầu merge PR; chỉ merge khi có chỉ dẫn phù hợp của người dùng.

Cấu hình này có bảo vệ CI nhưng không cung cấp kiểm tra bắt buộc bởi người thứ hai. Đó là lựa chọn quy trình của người dùng, không được ghi thành review độc lập đã hoàn tất. Có thể nâng yêu cầu approval khi nhóm bổ sung reviewer sau này.

Repository hiện public. Bằng chứng giới hạn gói private của repo cũ không phải lý do yêu cầu mua gói ở đây. Quyền integration quản lý rules/protection vẫn phải kiểm bằng thao tác thực tế, không suy ra từ metadata admin.

## Audit chỉ đọc

```sh
npm run github:audit
npm run github:audit -- --repo hoangtuanhung-lab/QL_HKPD2
```

Nếu sau này chỉ định reviewer riêng, có thể thêm `--reviewer TEN_TAI_KHOAN` để kiểm quyền Write. Tùy chọn này không cấp quyền, thêm CODEOWNER hoặc gửi yêu cầu review.

Audit đọc metadata, lỗi CODEOWNERS, CI main, ruleset và classic protection; không thay cấu hình/merge. Không in credential hoặc raw CLI error. Exit 1 nếu thiếu ruleset phù hợp/bằng chứng bắt buộc hoặc cấu hình sai; exit 0 chỉ có nghĩa audit cấu hình đạt, không thay thử nghiệm enforcement. Không đưa audit vào Actions contents:read vì job CI không có quyền quản trị.

Kiểm tra ban đầu trên QL_HKPD2: CODEOWNERS không có lỗi, quality/secrets main success; rulesets rỗng; đọc classic protection trả 403 nên trạng thái chưa biết. Sau khi áp dụng, phải đọc lại GitHub và lưu ID. Không coi file JSON trong Git hoặc CI xanh là bằng chứng ruleset đã có hiệu lực.

## Áp dụng

Từ gốc repository, nếu có quyền API và chưa có ruleset tương đương:

```sh
gh api --method POST repos/hoangtuanhung-lab/QL_HKPD2/rulesets \
  --input infra/github/main-release.ruleset.json
```

Nếu integration từ chối quyền, owner có thể dùng [Settings → Rules → Rulesets](https://github.com/hoangtuanhung-lab/QL_HKPD2/settings/rules) trên chính repository QL_HKPD2. Chọn rule cho main/release, require PR với **0 approval**, require quality/secrets, block deletion/force push và không bypass theo tệp cấu hình. Không cần thêm reviewer thứ hai cho workflow hiện tại. Nếu UI vẫn yêu cầu gói nâng cấp, giữ quy trình PR/CI do Codex quản lý; không mua dịch vụ hoặc đổi visibility ngoài yêu cầu.

Ngày 11/10/2026 đã thử tạo ruleset từ cấu hình workflow mới: GitHub trả HTTP 403 `Resource not accessible by integration`; thao tác không được chấp nhận. Không có ruleset ID mới và chưa chạy PR lỗi nghiệm thu. Đây là lỗi quyền GitHub integration, không phải yêu cầu mua Team hay kết quả của approval review môi trường.

Đọc danh sách trước để không tạo trùng; cập nhật đúng ID nếu đã có và giữ mọi chính sách ngoài B01. Công cụ audit không tự áp dụng lệnh ghi.

## Nghiệm thu enforcement

1. Đọc lại cấu hình active: đúng main/release, checks/app, review count 0, không yêu cầu code-owner/latest-push approval và không bypass.
2. Dùng nhánh thử riêng có lỗi lint: CI fail và GitHub chặn merge; không đưa mã lỗi vào main.
3. Sửa lỗi, cập nhật nhánh và xác minh checks pass thì PR đủ điều kiện theo workflow một đầu mối; không tạo approval giả.
4. Lưu PR/check/ruleset ID và cleanup nhánh thử.

Chưa coi nghiệm thu hoàn tất nếu chưa thực hiện các bước này. Mock GET và audit không thay bằng chứng quyền/giao dịch hay bảo vệ nhánh thật. Merge queue chưa bật; Codex điều phối thứ tự PR để tránh ghi đè hợp đồng/schema.
