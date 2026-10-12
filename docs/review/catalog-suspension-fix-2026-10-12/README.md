# Sửa AUD-01 sau rà soát trước kết nối

Ngày 12/10/2026 (Asia/Saigon). Base main `8d7ec376611a2834348f7e173ecba56019319093`, đã merge PR #19. Rà soát trước sửa chạy lại 657 test/44 file, smoke dev/staging và secret scan: đạt, không thấy ca Q/N/M/P tái xuất hiện hoặc merge conflict. Probe bổ sung với ba đăng ký gửi/duyệt hợp lệ phát hiện AUD-01: tạo draft khi active, suspend nội dung (catalog cùng ID, sourceVersion1→2), tạo draft mới bị chặn nhưng confirm draft cũ vẫn draw_confirmed. File pipeline không thay đổi qua các PR sửa Q/N/M/P; không có bằng chứng đây là regression mới từ chúng.

## Thay đổi

- EventBundle lưu `catalogSourceVersion` lúc chuẩn bị draft, cùng `catalogSnapshotId`; prepare từ chối phiên bản danh mục không hợp lệ.
- assertRosterCurrent trước confirm kiểm edition, catalog ID và sourceVersion dương an toàn bằng snapshot đã lưu.
- Đọc lại cấu hình nội dung hiện tại: cả nội dung và môn/cấp cha phải active; sportId và participant kind phải khớp competition. Không dựa vào catalog ID hoặc roster không đổi để cho qua.
- Reject trả `ROSTER_STALE`, không tăng version/chốt draft hoặc sửa registry. Error mapping hiện có đưa lỗi này thành HTTP409 khi adapter dùng API error handler.

Không đổi điều lệ, registration approvals, topology engine, official results hay cách sinh ID. Kiểm danh mục là guard đồng bộ tại library; adapter thật vẫn phải load catalog/roster trong cùng transaction với CAS khi chốt. Chưa kết nối SQL/Supabase, Google/Drive hoặc Netlify.

## Tương thích và giới hạn

Snapshot EventBundle cũ thiếu catalogSourceVersion sẽ bị từ chối khi confirm. Cần tạo/kiểm lại draft từ danh mục authoritative; không backfill im lặng bằng phiên bản hiện tại vì không biết draft cũ dùng cấu hình nào. Chưa có integration durable/route nghiệp vụ đang được triển khai trong phạm vi này, nên không chạy migration hay cập nhật dữ liệu thật.

SourceVersion là version của toàn catalog: thay đổi danh mục sẽ yêu cầu kiểm lại draft dù roster chưa đổi. Đây là guard bảo thủ; không tự đổi metadata để giữ draft cũ chạy tiếp. Đổi luật vẫn cần workflow duyệt đăng ký theo nguồn, không suy ra rằng prepareEvent revalidates toàn bộ quota/age của approved revisions cũ.

Thay đổi áp dụng điểm chốt draft; không tuyên bố tự xử lý hủy kết quả đã thi đấu/công bố sau khi BTC ngừng nội dung. Luồng đó cần authoritative adapters/decision riêng ở bước tích hợp. Không coi test library như HTTP attack proof hoặc nghiệm thu toàn bộ.

## Kiểm tra

`tests/catalog-suspension-regression.test.ts` thêm **20 test**:

- Draft→suspend→confirm với RR3 và KO6: reject, giữ nguyên snapshots/version.
- Môn cha ngừng; ngay cả metadata version giả định khớp, active guard vẫn chặn.
- Catalog giữ ID nhưng version/rules đổi; fresh draft trên catalog hợp lệ mới chốt được.
- Sai sport/participant kind/event kind, version thiếu/0/âm/phân số/NaN/Infinity/unsafe bị chặn.
- Catalog unchanged chốt đúng RR/KO, và roster đội hợp lệ được gửi/duyệt thực bằng helpers rồi chốt bình thường; suspend đội vẫn bị chặn.

Cùng pipeline/consumer suites cũ, kiểm tập trung đạt 30 test/3 file. Không sửa oracle của test cũ. Xem [verification.json](verification.json) cho full check, smoke và secret scan sau khi hoàn tất. Full check có SQL static có sẵn, không chạy SQL thật; smoke là foundation startup/shutdown, không phải UAT phiên người dùng hoặc toàn bộ nghiệp vụ.
