# B01: Nhánh, PR và kiểm tra bắt buộc

Nhánh đích phát triển là `main`. Nhánh công việc dạng `feat/B01-short-description` hoặc `fix/<ticket>-description`; nhánh phát hành `release/<version>` được tạo khi có release candidate. Không tạo nhánh phát hành giả khi chưa có build nghiệp vụ được nghiệm thu.

Trước PR: `npm ci`, `npm run env:init`, `npm run check`, `npm run secret:scan`, `node scripts/smoke.mjs`. Điền WBS, đầu vào/phiên bản, tests, người nhận, ảnh hưởng contract/migration và rollout. Người thực hiện không tự duyệt PR của mình. Migration/contracts cần chủ module và L01/P01 rà soát theo phạm vi.

CI chạy khi push, pull request và merge_group. Hai check names cần bắt buộc là `quality` và `secrets`. `quality` gồm lint, format, typecheck, tests, build API/worker/web và smoke dev/staging. `secrets` quét bí mật độc lập. Không dùng `continue-on-error` cho check bắt buộc, không chấp nhận zero-test run.

## Bảo vệ nhánh trên GitHub

O01 hoặc admin cần thiết lập ruleset cho `main` và `release/*`: yêu cầu PR, tối thiểu một approval không phải tác giả, dismiss stale approvals, resolve conversations, require `quality` và `secrets`, chặn force push/deletion và bỏ bypass không cần thiết. Sau khi có mapping CODEOWNERS, bật code-owner review. Có thể dùng merge queue nếu gói GitHub hỗ trợ; nếu không, O01 xếp thứ tự merge và yêu cầu branch cập nhật theo main trước merge.

Workflow trong repository không tự bật ruleset. Phải kiểm cấu hình trên GitHub và dùng PR lỗi thử để chứng minh merge bị chặn. Chưa làm được việc đó thì B01 chưa nghiệm thu hoàn toàn.

Tệp ruleset chuẩn bị sẵn và quy trình nghiệm thu nằm trong [runbook bảo vệ nhánh](branch-protection.md). Đây là cấu hình chờ áp dụng, không phải chính sách đang có hiệu lực trên GitHub.

Repository ban đầu không có commit/nhánh. Commit bootstrap đầu tiên có thể tạo `main` để nhóm bắt đầu review; việc đó không phải bằng chứng đã qua review hoặc đã bật bảo vệ nhánh. Các thay đổi tiếp theo đi qua PR. Không deploy hoặc đưa dữ liệu thật vào bootstrap.
