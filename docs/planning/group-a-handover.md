# Nhóm A — Trạng thái bàn giao

Ngày ghi 11/10/2026 (Asia/Saigon), đối chiếu A01-v0.2. Người dùng đã merge [PR #6](https://github.com/hoangtuanhung-lab/QL_HKPD2/pull/6) vào `main` tại commit `14b499a2880d544b328b2c86f05b650793f40050`. Các đầu ra nhóm A đã được tích hợp; nghiệm thu nghiệp vụ và phân công tên thật còn theo các giới hạn dưới đây.

| WBS | Đầu ra có thể dùng                                                                 | Giới hạn / phần tiếp theo                                                       |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| A01 | Sổ 93 yêu cầu, 293 câu PDF/22 nhóm, 58 WBS, source/hash/citation và bảng hiện hành | U01–U08 còn phần mở; thiếu catalog gốc 133 nội dung, không bịa dữ liệu          |
| A02 | ADR-001 stack/SQL/worker, ADR-002 auth/folder, ADR-003 dev/staging/deploy          | SQL/Google/Netlify thật bước cuối, provider/cost chờ chốt; không đổi luật giải  |
| A03 | OpenAPI/DTO sáu entity, version/revision/official, public whitelist, folder logic  | Contract có kiểm chứng schema; API nghiệp vụ/policy/transaction chưa triển khai |
| A04 | Nháp đăng ký cục bộ + wireframe sáu luồng trong `docs/design/A04-role-flows.md`    | Chưa có năm màn hình nghiệp vụ thực; cần API, UI và UAT theo module             |
| A05 | Bộ tạo 7 trường/500 VĐV, hai trường liên cấp, folders và cohorts; 30 đặc tả ca thử | Kiểm fixture/schema/scope, chưa chạy engine/backend/UAT cho ca nghiệp vụ        |
| A06 | Board 58 WBS, 28 vị trí, phụ thuộc/DoR/DoD và inventory dịch vụ                    | Tên thật/GitHub/reviewer dự phòng chưa nhận; chưa nghiệm thu giao đủ 28 người   |

## Đối chiếu A02/A03 với quyết định cuối A01

| Quyết định                                   | Kiến trúc / hợp đồng đáp ứng hiện tại                                                                              | Việc chủ module phải làm                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| RQ-USER-002, CR-004                          | ADR giữ SQL/OIDC/Drive/deploy bước cuối; không thêm tích hợp thật                                                  | P/S/O làm phần độc lập trước, kiểm lại readiness khi tích hợp                                                |
| RQ-USER-001                                  | ADR-002 và AthleteFolder khóa edition/athlete, deferred; A05 một logical folder/VĐV                                | S03 adapter idempotent, quyền và liên kết bytes/revision; O02 restore                                        |
| RQ-USER-003                                  | UI bắt đầu rỗng, không dùng fixture như số trường/VĐV thật                                                         | R01/R03 hạn mức theo nội dung, không theo số 7/500                                                           |
| RQ-PDF-RESULT, Q291                          | Submission/Confirmation exact ID/version/base official, payload riêng; không tự sửa official                       | K01/P03 transaction/policy/immutable revision, invalidation và test API                                      |
| RQ-PDF-PUBLIC, Q292                          | PublicResult whitelist và endpoint riêng; A04 hai khung chỉ official                                               | F02/K04/S03 publication lifecycle, responsive, kiểm không lộ PII/pending                                     |
| RQ-PDF-CHECKLIST, Q144–150                   | x-policy có phạm vi giải/môn/phân công; không có Cập nhật hộ                                                       | S02 row-level same-school lock và coverage; U08 checklist lifecycle còn mở                                   |
| RQ-PDF-KO/TRANSFER/MEDALS/TEAM/VOVINAM/CHESS | Event có rule_snapshot_id/started_at, Match tách ghost, Participant union, không hardcode thuật toán trong DTO lõi | R/C/K mở rộng contract từng môn/đội/cân/chuyển hạng và engine từ nguồn cuối; U01/U04/U05 chặn bước phụ thuộc |

Không có bằng chứng cần sửa phá vỡ sáu DTO lõi để làm các đầu ra nhóm A này. Những lệnh duyệt đăng ký, bắt đầu, đổi hạng, tính bảng và công bố vẫn là hợp đồng module tiếp theo; enum/fixture không chứng minh endpoint đã chạy. Mọi mở rộng phải có nguồn A01, CR khi cần, schema/DTO/fixture và danh sách người dùng bị ảnh hưởng.

Lệnh kiểm thống nhất: `npm run check`, `npm run secret:scan`; smoke nền tảng `node scripts/smoke.mjs`. CI kiểm cả baseline A01 và board/fixture nhóm A, rồi schema, lint/typecheck/tests/build. Không có test SQL/Google/Netlify thật trong giai đoạn này.
