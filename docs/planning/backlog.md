# A06 — Backlog và vị trí

Sinh từ `backlog.json`; chạy `npm run group-a:generate`. Nguồn A01-v0.2, ghi ngày 11/10/2026 (Asia/Saigon). `handover_prepared` chỉ có đầu ra bàn giao, chưa nghiệm thu WBS. Các bước tích hợp SQL/Google/Netlify giữ tới cuối theo CR-004.

## 28 vị trí

Chưa nhận tên thật của nhóm. Codex là đầu mối tích hợp theo CR-007 và thực hiện nhóm A theo yêu cầu người dùng; không thay danh sách 28 con người.

| Nhóm | Vị trí | Người thật    | GitHub        | Reviewer dự phòng |
| ---- | ------ | ------------- | ------------- | ----------------- |
| G1   | L01    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G1   | L02    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G2   | P01    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G2   | P02    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G2   | P03    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G2   | S01    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G2   | S02    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G2   | S03    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G3   | R01    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G3   | R02    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G3   | R03    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G3   | R04    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G4   | C01    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G4   | C02    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G4   | C03    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G4   | C04    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G5   | K01    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G5   | K02    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G5   | K03    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G5   | K04    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G6   | F01    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G6   | F02    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G6   | F03    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G7   | Q01    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G7   | Q02    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G7   | Q03    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G7   | O01    | Chờ phân công | Chờ phân công | Chờ phân công     |
| G7   | O02    | Chờ phân công | Chờ phân công | Chờ phân công     |

## 58 đầu việc

Phụ thuộc là sản phẩm cần nhận, không có nghĩa toàn WBS cung cấp đã hoàn thành. `G5` trong cột phụ thuộc là cổng nghiệm thu vận hành theo mục 6/QT40, khác nhóm tổ chức G5. Đọc tiêu chí đầy đủ trong JSON hoặc nguồn plan.

| WBS | Chủ trì | Phối hợp      | Phụ thuộc                                   | Trạng thái đầu ra | Yêu cầu hiện hành                                                                                                     |
| --- | ------- | ------------- | ------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| A01 | L02     | —             | Không                                       | handover_prepared | QT01, QT02, QT03, RQ-PDF-G22                                                                                          |
| A02 | L01     | —             | A01                                         | handover_prepared | QT03, QT06, RQ-USER-002, RQ-PLAN-SCALE, RQ-PDF-G01                                                                    |
| A03 | L01     | P01           | A01                                         | handover_prepared | QT07, QT13                                                                                                            |
| A04 | F01     | C04, R04      | A01                                         | handover_prepared | QT28, RQ-USER-003                                                                                                     |
| A05 | Q01     | Q02, Q03      | A01                                         | handover_prepared | RQ-PLAN-A05                                                                                                           |
| A06 | L02     | O01           | A02                                         | handover_prepared | QT04, QT05, RQ-USER-004                                                                                               |
| B01 | O01     | —             | A02                                         | handover_prepared | QT05, QT38, RQ-USER-004, QT37-R1                                                                                      |
| B02 | P01     | —             | A03                                         | handover_prepared | QT08, QT09, QT36, RQ-TG01, RQ-TG02, RQ-TG03, RQ-TG04, RQ-TG05, RQ-TG06, RQ-TG07, RQ-TG08, RQ-USER-002, RQ-PDF-G02     |
| B03 | S01     | —             | A03, B02                                    | handover_prepared | QT15, QT17, QT18, RQ-TG01, RQ-TG02, RQ-TG03, RQ-TG04, RQ-TG05, RQ-TG06, RQ-TG07, RQ-TG08, RQ-USER-002, RQ-PDF-G03     |
| B04 | P02     | —             | A03, B02                                    | handover_prepared | QT06, QT20, QT31                                                                                                      |
| B05 | P03     | —             | B02, B04                                    | handover_prepared | RQ-PDF-G20                                                                                                            |
| B06 | F01     | —             | A03, A04                                    | handover_prepared | QT28, QT30, RQ-PDF-G19                                                                                                |
| B07 | O01     | O02           | B01                                         | handover_prepared | QT35, RQ-USER-002, RQ-PDF-G01                                                                                         |
| B08 | Q02     | —             | B03, B04                                    | handover_prepared | QT07, QT13, QT14                                                                                                      |
| R01 | R01     | —             | B02, B04                                    | not_implemented   | QT12, RQ-TG01, RQ-TG02, RQ-TG03, RQ-TG04, RQ-TG05, RQ-TG06, RQ-TG07, RQ-TG08, RQ-PLAN-START, RQ-PDF-G02, RQ-PDF-CHESS |
| R02 | R02     | —             | B02, B04                                    | not_implemented   | QT08, RQ-PDF-G05                                                                                                      |
| R03 | R02     | S03           | R02, B03                                    | not_implemented   | QT34, RQ-PDF-G05                                                                                                      |
| R04 | R03     | —             | R01, R02                                    | not_implemented   | RQ-USER-003, RQ-PDF-G06                                                                                               |
| R05 | R03     | —             | R04                                         | not_implemented   | QT09, RQ-PDF-G07, RQ-PDF-TEAM                                                                                         |
| R06 | R03     | —             | R03, R04                                    | not_implemented   | RQ-PLAN-REG, RQ-PDF-G06                                                                                               |
| R07 | R04     | —             | B06, R01, R02, R03, R04, R05, R06           | not_implemented   | RQ-TG01, RQ-TG02, RQ-TG03, RQ-TG04, RQ-TG05, RQ-TG06, RQ-TG07, RQ-TG08, RQ-USER-003, RQ-PDF-G06                       |
| R08 | S02     | —             | B03, R01                                    | not_implemented   | QT15, QT16, RQ-PDF-G04, RQ-PDF-CHECKLIST                                                                              |
| R09 | S03     | —             | B03, B05                                    | not_implemented   | QT33, QT34, RQ-USER-001, RQ-PDF-G21                                                                                   |
| R10 | Q01     | Q02           | R02, R04, R06, R08                          | not_implemented   | QT08                                                                                                                  |
| C01 | C01     | —             | A03, B04, R06                               | not_implemented   | QT09, QT23, QT24, RQ-PDF-G08, RQ-PDF-G10, RQ-PDF-KO                                                                   |
| C02 | C01     | —             | C01                                         | not_implemented   | QT24, RQ-PDF-G11                                                                                                      |
| C03 | C02     | —             | A03, B04, R06                               | not_implemented   | QT23, QT24, RQ-PDF-G08, RQ-PDF-G12                                                                                    |
| C04 | C03     | —             | R08, C01, C03                               | not_implemented   | RQ-PDF-G13                                                                                                            |
| C05 | C03     | —             | R04, C01, C03                               | not_implemented   | QT25, RQ-PLAN-START, RQ-PDF-G09, RQ-PDF-TRANSFER                                                                      |
| C06 | C04     | —             | B06, C01, C02                               | not_implemented   | RQ-PDF-G10, RQ-PDF-KO                                                                                                 |
| C07 | C04     | —             | B06, C03                                    | not_implemented   | QT29                                                                                                                  |
| C08 | C04     | C03           | C04                                         | not_implemented   | RQ-PDF-G13                                                                                                            |
| C09 | Q01     | —             | C01, C02, C03                               | not_implemented   | QT24                                                                                                                  |
| C10 | Q02     | Q03           | R07, R08, C05, C06, C07, C08                | not_implemented   | —                                                                                                                     |
| K01 | K01     | —             | B04, B05, R08, C01                          | not_implemented   | QT14, QT16, QT17, QT19, QT20, QT21, QT31, RQ-PDF-G07, RQ-PDF-G14, RQ-PDF-RESULT                                       |
| K02 | K02     | —             | K01, C01, C03                               | not_implemented   | QT27, RQ-PDF-G15                                                                                                      |
| K03 | K01     | —             | K01, R03                                    | not_implemented   | QT11, QT27, RQ-PDF-G14, RQ-PDF-VOVINAM, RQ-PDF-CHESS                                                                  |
| K04 | K03     | —             | C03, K01, K02, K03                          | not_implemented   | QT11, QT26, RQ-PDF-G12, RQ-PDF-VOVINAM                                                                                |
| K05 | K03     | —             | K02, K03                                    | not_implemented   | QT10, QT26, RQ-PDF-G08, RQ-PDF-G16, RQ-PDF-MEDALS                                                                     |
| K06 | K04     | —             | K04, K05                                    | not_implemented   | QT26, RQ-PDF-G17, RQ-PDF-G18                                                                                          |
| K07 | K04     | P03           | K06, B05                                    | not_implemented   | QT22, RQ-PDF-G17                                                                                                      |
| K08 | K01     | C04           | K01, K02, K03                               | not_implemented   | QT21, QT30, RQ-PDF-G14, RQ-PDF-RESULT                                                                                 |
| K09 | F02     | —             | K07, B06                                    | not_implemented   | QT18, QT21, QT22, QT29, RQ-PDF-G19, RQ-PDF-G22, RQ-PDF-PUBLIC                                                         |
| K10 | P03     | F01           | B05, R06, K01, C04                          | not_implemented   | RQ-PDF-G20                                                                                                            |
| K11 | Q01     | Q02, Q03      | K02, K03, K04, K05, K06, K07, K08, K09, K10 | not_implemented   | —                                                                                                                     |
| I01 | F03     | —             | B04, K01, R08                               | not_implemented   | QT32, RQ-PDF-G21                                                                                                      |
| I02 | F03     | S02, K01      | I01, K01                                    | not_implemented   | QT33, RQ-PDF-G21                                                                                                      |
| I03 | S03     | O02           | R09, B05                                    | not_implemented   | RQ-USER-001, RQ-USER-002                                                                                              |
| I04 | O02     | —             | B07, I03                                    | not_implemented   | QT36, RQ-USER-001, RQ-PDF-G22                                                                                         |
| I05 | Q02     | O01           | K11, I02, I03                               | not_implemented   | QT18, QT34, QT35                                                                                                      |
| I06 | Q03     | L02           | K11, I02, I04                               | not_implemented   | —                                                                                                                     |
| I07 | O01     | O02           | B07, I04                                    | not_implemented   | RQ-USER-002                                                                                                           |
| I08 | L01     | các nhóm      | I05, I06                                    | not_implemented   | —                                                                                                                     |
| D01 | L02     | Q03           | G5                                          | not_implemented   | QT39, QT40                                                                                                            |
| D02 | R02     | S01, L02      | D01                                         | not_implemented   | —                                                                                                                     |
| D03 | O01     | O02           | D01, I07                                    | not_implemented   | —                                                                                                                     |
| D04 | F02     | L02, các nhóm | D01                                         | not_implemented   | —                                                                                                                     |
| D05 | L01     | O01, Q03      | D02, D03, D04                               | not_implemented   | QT39, QT40                                                                                                            |
