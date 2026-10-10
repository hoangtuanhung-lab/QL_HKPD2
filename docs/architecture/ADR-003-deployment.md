# ADR-003: Môi trường và triển khai theo giai đoạn

- WBS: A02/B07; ngày 11/10/2026; chờ review.

Hiện thực hiện dev và staging **cục bộ**, dùng hai bộ cấu hình và cổng độc lập, chỉ bind loopback. Không có database, dữ liệu học sinh thật hoặc dịch vụ Google. Web staging phục vụ output đã build; API và worker chạy process riêng. Cấu hình không được ghi vào artifact hoặc log.

Ở bước cuối: frontend triển khai Netlify theo yêu cầu trong plan; API và worker đóng gói container để chạy trên VPS hoặc nhà cung cấp được lựa chọn qua U06. Chưa chọn dịch vụ trả phí, chưa mua tài nguyên, chưa cấu hình Netlify, SQL hoặc Google trong nhánh này. Không coi Netlify là nơi chạy worker dài hạn.

Dev/staging/production thật phải tách database, OAuth và Drive root. Bí mật inject lúc chạy, không ở repository/frontend build. CI dùng quyền đọc tối thiểu, không nhận bí mật triển khai ở pull request. Pipeline hiện chỉ build/test và lưu artifact, không deploy.

Sau khi có môi trường thật: bổ sung smoke với API/database/OAuth/Drive, worker retry, logs có redaction, backup/restore và rollback có dữ liệu ghi mới. O02 thực hiện phục hồi; O01 điều phối release/merge. Không dùng kết quả smoke cục bộ để tuyên bố staging ngoài đã sẵn sàng.
