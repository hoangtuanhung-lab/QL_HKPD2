# Bàn giao A02 / A03 / B01 / B07

Ngày 11/10/2026 (Asia/Saigon). Repository: [hoangtuanhung-lab/QL_HKPD2](https://github.com/hoangtuanhung-lab/QL_HKPD2). Người thực hiện: Codex theo phân công người dùng. Nguồn: plan nhóm 28 người v1.4 và CR-001–007.

Người dùng đã duyệt nền tảng ở repository ban đầu, hợp nhất A03 và mock qua PR #1/#2 ở QL_HKPD2, giao Codex làm đầu mối kiểm tra/chỉnh sửa/đẩy mã các thành viên, và yêu cầu hoàn thành phần việc được giao. Không tạo sự kiện GitHub approval giả hoặc ghi đã có review chuyên môn độc lập khi chưa có.

## Trạng thái bàn giao

| Phần                | Sản phẩm                                                                                       | Trạng thái                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| A02                 | ADR stack, identity/thư mục VĐV, triển khai; monorepo React/Fastify/worker, Node 24/TypeScript | Đã bàn giao nền tảng; SQL/auth/Drive/worker nghiệp vụ là thiết kế chờ triển khai cuối         |
| A03                 | OpenAPI 3.1, 52 schema, 24 operation, DTO sinh từ cùng nguồn, 19 ví dụ giả, contract checks    | Đã merge PR #1; là hợp đồng lõi, chưa là API nghiệp vụ thật                                   |
| A03 hỗ trợ frontend | 13 GET mock theo OpenAPI, fixtures giả, phân trang/scope và folder logic                       | Đã merge PR #2; HTTP/CLI được kiểm; không auth, lệnh ghi hay lưu tệp                          |
| B01 CI              | Lint/format/typecheck/test/build/secret scan, quality/secrets, CODEOWNERS, PR template         | Đã triển khai và CI GitHub đạt; CODEOWNERS không có lỗi theo API                              |
| B01 workflow        | Codex tiếp nhận/chỉnh sửa/đẩy PR; config một đầu mối và audit GitHub chỉ đọc                   | Bàn giao qua PR #3; không bắt buộc reviewer GitHub thứ hai theo CR-007                        |
| B01 enforcement     | Ruleset main/release và nghiệm thu PR lỗi không merge được                                     | **Chưa áp dụng**: POST ruleset bị GitHub integration từ chối 403; chưa nghiệm thu enforcement |
| B07 nền tảng        | Dev/staging tách scope/cổng, env init/check, doctor, runners và smoke                          | Đã triển khai, kiểm startup/shutdown và khôi phục sau Publish                                 |
| B07 tích hợp cuối   | SQL/auth/Google/Netlify/worker nghiệp vụ và staging tích hợp                                   | **Hoãn theo người dùng**, không yêu cầu credential hoặc triển khai sớm                        |

A02/A03 là đầu vào để chủ module phát triển song song. A01/baseline chi tiết và các U nghiệp vụ chưa đầy đủ vẫn cần L02/chủ module chốt trước ổn định điều lệ/hợp đồng chuyên môn. Không tự đặt luật môn, điểm/huy chương hoặc giới hạn đăng ký.

## Kiểm chứng

- Node 24.19.0/npm 11.9.0; `npm ci` tái lập từ lockfile; env init giữ tệp đã có, env check từ chối scope/cổng không hợp lệ.
- `npm run check`: hợp đồng/DTO đồng bộ, lint/format, typecheck, **49 tests passed**, build API/web/worker đạt trên bản đã khôi phục. CI GitHub tiếp tục chạy toàn bộ checks cho mỗi PR.
- Tests gồm readiness, môi trường, lifecycle tiến trình, scanner từ chối token giả, schema âm, mock HTTP/CLI, cursor/scope/whitelist và lệnh ghi không tác động fixtures.
- `npm run secret:scan` đạt trên checkout hiện tại, bao gồm dotfiles được Git theo dõi; không dùng kết quả này để khẳng định đã quét toàn lịch sử Git.
- Smoke dev/staging kiểm HTTP API, Vite module/built assets, worker idle; SIGTERM dừng process con và trả cổng. Mock CLI có kiểm startup, HTTP, shutdown và cổng bị chiếm không dừng listener khác.
- `npm run github:audit` chạy trực tiếp trên GitHub: repository public, CODEOWNERS không có lỗi, quality/secrets main success, rulesets rỗng. Audit exit 1 vì thiếu ruleset là kết quả kiểm tra đúng, không phải unit test thất bại. Classic protection đọc trả 403 nên trạng thái chưa rõ.

Merge/CI bằng chứng:

- Nền tảng đã duyệt: commit `b76c7e04bf9df3f196ba11b438bbea39c5a7a634` được khôi phục vào main QL_HKPD2.
- [PR #1 A03](https://github.com/hoangtuanhung-lab/QL_HKPD2/pull/1): merge `bab894237aa2d9c3c3af2d732b048f8f77d58aab`, main CI run 38103141458 success.
- [PR #2 mock](https://github.com/hoangtuanhung-lab/QL_HKPD2/pull/2): merge `0901aff55c863fff58ae09a5ffe704cea55df450`, CI main success; môi trường Published được khôi phục và kiểm lại 49 tests đạt.
- [PR #3 workflow B01](https://github.com/hoangtuanhung-lab/QL_HKPD2/pull/3): quality/secrets ở push run 38105460463 và PR run 38105473831 success trước cập nhật bàn giao cuối; checks của commit mới phải đạt trước merge.

## Các lệnh bàn giao

```sh
npm ci
npm run env:init
npm run check
npm run secret:scan
npm run doctor
node scripts/smoke.mjs
```

Chạy dev bằng `npm run dev`, staging bằng `npm run staging` sau build. Mock riêng: `npm run dev:mock`; audit chỉ đọc: `npm run github:audit`. Không chạy smoke trên cổng đang được dev/staging dùng; chỉ dừng runner do chính task tạo hoặc chọn cấu hình cổng riêng, không kill process không liên quan. Trong cloud, ngắt shell ngoài có thể không dừng Node runner; gửi SIGTERM tới đúng runner và xác minh cổng được trả lại.

## Bảo vệ nhánh và workflow hiện tại

Theo CR-007, GitHub không bắt buộc approval tài khoản thứ hai. Cấu hình đề xuất vẫn yêu cầu PR, quality/secrets, xử lý threads, cập nhật nhánh, chống xóa/force-push và không bypass. Codex kiểm mã theo [quy trình tiếp nhận](code-intake.md); kiểm CI trước hợp nhất theo chỉ dẫn người dùng.

Đã thử tạo ruleset qua API bằng cấu hình này: HTTP 403 `Resource not accessible by integration`, không tạo được ID. Đây là quyền integration, không phải bằng chứng cần mua Team. Chưa có GitHub enforcement được nghiệm thu; quy trình PR/CI do Codex quản lý tiếp tục dùng được. Owner có thể áp dụng tệp đề xuất qua UI khi phù hợp; xem [runbook B01](branch-protection.md). Không lặp lại POST khi quyền chưa thay đổi, không đổi visibility/mua dịch vụ/thêm bypass.

## Người nhận và phần cuối dự án

- G1/P01/P02/P03/S01/F01/Q02/Q03/O02 nhận nền tảng/ADR và lệnh tái lập.
- R/C/K/F nhận hợp đồng và fixtures A03; chủ module review biểu mẫu/luật và triển khai API thật trước tích hợp. Không gọi mock là nghiệm thu nghiệp vụ/policy/transaction.
- S03 phối hợp R02/K01/P01/O02 triển khai thư mục VĐV theo khóa `(edition_id, athlete_id)` duy nhất. Hiện có thiết kế và DTO trạng thái deferred, chưa tạo thư mục vật lý/Drive hoặc tệp thật.
- SQL/migration, Google login/Drive, Netlify, nghiệp vụ worker, backup/restore dữ liệu thật và staging tích hợp thực hiện cuối theo người dùng; các module owners cung cấp đầu vào trước nghiệm thu.

Bộ mẫu Flask/SQLite trước khi nhận plan được giữ ngoài checkout, không dùng làm chứng cứ stack chính. Không đưa dữ liệu học sinh thật vào fixtures, log hoặc public projection.
