# Fixtures A03

`core.json` chỉ có dữ liệu giả do A03 tạo để thiết kế/kiểm tra schema. Không dùng làm điều lệ, kết quả thật hay chứng cứ nghiệm thu backend. UUID ví dụ và tên GIẢ LẬP không đại diện người hoặc trường thật.

Mỗi mục có `name`, `schema`, `value`; schema trỏ tên component trong `docs/api/core.openapi.json`. CI kiểm mọi fixture, kể cả độ chính xác thành tích và bản sửa đăng ký vẫn giữ approved revision trước. Khi sửa fixture, sửa examples OpenAPI tương ứng và sinh lại DTO.
