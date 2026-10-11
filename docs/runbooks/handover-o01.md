# Hồ sơ bàn giao A02 / B01 / B07

Nguồn: plan nhóm 28 người v1.4 và CR-001–004. Người thực hiện: Codex, O01; phụ trách bổ sung A02 theo yêu cầu người dùng. Reviewer A02/B01/B07: `@hoangtuanhung-lab`, do người dùng chỉ định. Xác nhận nhận sản phẩm: đang chờ review. Không tự nghiệm thu.

| Bước  | Đầu vào / người cung cấp                               | Đầu ra                                       | Trạng thái                       |
| ----- | ------------------------------------------------------ | -------------------------------------------- | -------------------------------- |
| A02.1 | Plan v1.4, phân công A02, CR-004 / người dùng          | ADR stack, identity/tệp, triển khai          | Chờ review G1                    |
| B01.1 | ADR và CR-004 / A02                                    | Monorepo và lệnh cài/check/build             | Đã kiểm chứng cục bộ; chờ review |
| B01.2 | Lệnh check/build / O01                                 | CI quality/secrets, PR template              | CI nền tảng đạt trên GitHub      |
| B01.3 | Handle reviewer và quyền admin / L02, repository owner | CODEOWNERS, ruleset, thử PR lỗi              | Reviewer đã có; ruleset bị chặn  |
| B07.1 | Kiến trúc đã chọn, CR-004 / A02, người dùng            | Cấu hình dev/staging riêng, startup và smoke | Đã kiểm chứng cục bộ; chờ review |
| B07.2 | SQL/auth/Drive/worker contract / P01/S01/S03/P03       | Staging tích hợp và bảo mật có dữ liệu giả   | Hoãn tới cuối dự án theo CR-004  |

## Kiểm chứng

Kiểm chứng ngày 11/10/2026 trong môi trường cloud hiện tại:

- Node v24.19.0, npm v11.9.0; cài lại từ lockfile bằng `npm ci` thành công.
- `env:init` giữ nguyên tệp đã có; tests từ chối trùng cổng và sai phạm vi.
- Lint/Prettier, type-check và build API/web/worker đạt.
- Vitest: **20 passed, 0 failed**, gồm readiness, cấu hình, vòng đời tiến trình và kiểm chứng scanner từ chối token giả sinh riêng cho test, không in giá trị.
- Secretlint trên checkout hiện tại đạt, bao gồm dotfiles được Git theo dõi; không quét toàn bộ lịch sử Git.
- Smoke HTTP với dev và staging đồng thời đạt: API đúng phạm vi, web dev phục vụ module Vite và web staging phục vụ JavaScript đã build, worker heartbeat idle. Smoke kiểm tra SIGTERM được chuyển xuống, process con được dừng và cổng được trả lại sau kiểm tra.

GitHub API đã truy cập được. CI của commit `fbed6dfed8dfb2260a909ed554c1970dc79c8358` đạt trên GitHub: [run 38092266665](https://github.com/hoangtuanhung-lab/QL_HKPD/actions/runs/38092266665). Push đã được xác minh bằng remote SHA.

Ngày 11/10/2026, GitHub trả HTTP 403 khi đọc rulesets: yêu cầu nâng cấp GitHub Pro hoặc chuyển repository public. Đọc branch protection trả `Resource not accessible by integration`. Không thay đổi visibility, không mua gói và không coi quyền admin ở metadata là bằng chứng integration có thể quản lý protection. Cần repository owner dùng gói/quyền hỗ trợ để cấu hình và kiểm chứng PR lỗi bị chặn.

PR từ môi trường này được tạo qua tài khoản `hoangtuanhung-lab`, cùng tài khoản CODEOWNER được người dùng chỉ định. GitHub không cho tài khoản đó tự approve PR của mình. PR hiện tại cần review độc lập từ tài khoản khác được nhóm giao quyền, hoặc người dùng xem xét qua quy trình phù hợp; không tự merge hoặc tự ghi đã được duyệt. CODEOWNER này vẫn áp dụng cho PR do thành viên khác tạo.

Không dùng tests Flask/SQLite trước đó làm bằng chứng của stack mới. CI local pass không thay GitHub checks/ruleset; worker heartbeat không thay nghiệm thu xử lý tác vụ.

## Bổ sung B07: startup và shutdown

- `npm run dev` / `npm run staging` khởi động API/web/worker bằng một lệnh; `npm run doctor` chẩn đoán nền tảng cục bộ.
- Cổng bị chiếm được từ chối, không dừng process không thuộc bộ đang chạy. Một service lỗi sẽ dừng các service còn lại do runner tạo.
- Sửa runner riêng từ spawnSync sang giám sát bất đồng bộ để chuyển SIGINT/SIGTERM xuống process con. Kiểm thử gồm executable thiếu, sibling lỗi, shutdown lặp và giữ process không liên quan.
- Công cụ cloud có thể ngắt lớp shell ngoài mà không gửi tín hiệu xuống Node runner; khi đó phải gửi SIGTERM tới runner chính xác. Smoke đã xác minh shutdown qua tín hiệu thực và cổng được giải phóng, không dùng việc đóng tool session làm chứng cứ dừng service.

## Điều kiện còn thiếu

Đã chuẩn bị `infra/github/main-release.ruleset.json` và runbook áp dụng/kiểm chứng PR lỗi. JSON chưa được server GitHub xác nhận hoặc áp dụng. App ID 15368 và tên checks đã đối chiếu với các check-runs thực tế; không dùng bypass hoặc đổi visibility để né giới hạn gói/quyền.

- Xác nhận review/nhận sản phẩm; reviewer độc lập cho PR do cùng tài khoản CODEOWNER tạo.
- Ruleset main/release có hiệu lực và kiểm thử PR lỗi không merge được; CI nền tảng đã đạt trên GitHub.
- A03 và đầu vào các module để test contract/nghiệp vụ.
- Netlify/SQL/Google, cấu hình môi trường ngoài và tích hợp được hoãn theo người dùng; chưa có credential, chưa triển khai và chưa yêu cầu cung cấp ở bước này.

O01 bàn giao ADR và nền tảng cho G1/P01/P02/P03/S01/F01/Q02/Q03/O02. Thư mục VĐV là yêu cầu của S03 phối hợp các chủ module, đã ghi ADR-002, chưa tạo thư mục/tệp thật.

## Cập nhật sau khôi phục và A03

Ngày 11/10/2026: nền tảng được khôi phục sang `hoangtuanhung-lab/QL_HKPD2`; PR #1 A03 đã merge vào main, commit `bab894237aa2d9c3c3af2d732b048f8f77d58aab`. CI main run 38103141458 success. Môi trường Published được khôi phục đúng commit, và kiểm lại 29 test/lint/typecheck/build/secret scan/smoke dev–staging đều đạt. Những mục “chờ review” phía trên là trạng thái lịch sử của bản bàn giao đầu, không phủ nhận merge sau đó. A01/các U và review chuyên môn của chủ module vẫn cần trước ổn định nghiệp vụ.

A03 bổ sung mock GET đọc fixtures để frontend làm song song, chạy `npm run dev:mock`; hướng dẫn `docs/api/mock-api.md`. Mock tách khỏi backend và không là bằng chứng triển khai auth/policy/giao dịch. API nghiệp vụ và tệp/SQL/Google/Netlify chưa được nghiệm thu; lịch cuối dự án giữ nguyên.

Kiểm chứng nhánh bổ sung mock: 49 tests passed; contracts/lint/typecheck/build/secret scan đều đạt. Test CLI kiểm HTTP thật và shutdown; không thay test quyền/giao dịch server. Phần bổ sung này chờ review qua PR riêng, không tự merge.
