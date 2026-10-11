# Quyền sở hữu module

Theo plan v1.4; mã vị trí chưa phải GitHub handle. L02 bổ sung tên thật/handle, reviewer và reviewer dự phòng. Không tự điền account giả vào CODEOWNERS.

Người dùng đã chỉ định `@hoangtuanhung-lab` làm reviewer A02/B01/B07. CODEOWNERS áp dụng cho ADR của A02, công cụ/CI/cấu hình nền tảng và tài liệu vận hành; không tự gán quyền sở hữu các module nghiệp vụ khác. GitHub yêu cầu CODEOWNER có quyền write trên repository; tài khoản này đã được xác minh có quyền admin/write ở repository trước khi chuyển. Repository hiện tại được người dùng yêu cầu tạo lại tại `hoangtuanhung-lab/QL_HKPD2`; cần kiểm tra lại tính hợp lệ của CODEOWNER trên repository này, không coi bằng chứng quyền cũ là quyền hiện tại. Việc chỉ định không đồng nghĩa PR đã được review.

| Phạm vi                                           | Chủ module / reviewer cần có                       |
| ------------------------------------------------- | -------------------------------------------------- |
| Kiến trúc, hợp đồng chung                         | L01; A02/A03 do Codex được người dùng giao bổ sung |
| Dữ liệu, migration                                | P01, chủ nghiệp vụ                                 |
| API nền                                           | P02                                                |
| Audit/outbox/worker nghiệp vụ                     | P03                                                |
| Identity/policy/phân công/tệp                     | S01/S02/S03                                        |
| Danh mục/hồ sơ/đăng ký                            | R01/R02/R03                                        |
| Thi đấu/lịch                                      | C01/C02/C03                                        |
| Kết quả/trạng thái/xếp hạng                       | K01/K02/K03/K04                                    |
| UI chung/công khai/offline                        | F01/F02/F03, phối hợp R04/C04                      |
| Tests/fixtures                                    | Q01/Q02/Q03 và chủ module                          |
| `.github/`, `infra/`, script môi trường, runbooks | O01; O02 review phục hồi/môi trường                |

Các module chưa triển khai sẽ được tách thư mục bên trong `apps/api/src/modules` theo hợp đồng sau A03. Không ghi trực tiếp bảng hoặc gọi repository của module khác. Giao tiếp bằng service nội bộ hoặc sự kiện đã thống nhất. A03 đã bổ sung hợp đồng lõi tại `docs/api/core.openapi.json` và DTO sinh tự động trong packages/contracts, kèm fixtures giả. Hợp đồng đang chờ review L01/P01/chủ module, chưa có API nghiệp vụ thật; xem `docs/api/A03-contracts.md`. Packages rules/ui còn là vị trí bàn giao.
