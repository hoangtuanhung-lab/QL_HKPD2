# A03 — Mock API chỉ đọc cho phát triển song song

Mock dùng dữ liệu giả và endpoint GET từ `core.openapi.json`, giúp R04/C04/F01/F02 xây màn hình danh sách/chi tiết trước khi backend nghiệp vụ hoàn thành. Mock không cung cấp auth, policy, CRUD, transaction, official confirmation hoặc lưu tệp; không dùng để nghiệm thu nghiệp vụ. Thông tin VĐV/trường đều là fixture giả.

## Chạy trong môi trường phát triển

Tại thư mục repository:

```sh
npm ci
npm run dev:mock
```

Mặc định bind loopback trên cổng 4010, riêng với API thật dev/staging. Có thể dùng `MOCK_PORT=4011 npm run dev:mock` để chọn cổng khác. Sai cổng hoặc cổng bị chiếm khiến mock thoát lỗi; không dừng tiến trình khác. Dừng bằng SIGTERM/SIGINT gửi tới Node runner `scripts/mock-api.mjs`; trong terminal thường có thể dùng Ctrl+C. Không giả định tiến trình tồn tại sau Publish/restore.

`GET /health/mock` trả `service=a03-mock`, `data=synthetic`, `mode=read_only`, `authentication=not_implemented`. Mọi response có `X-HKPD-Mock: synthetic-read-only` và `Cache-Control: no-store`. Health này không thay health/readiness của backend thật.

API chỉ đọc gồm 13 operation: danh sách giải; danh sách và chi tiết VĐV/nội dung/đăng ký/trận/submission; thư mục VĐV và public results. Lấy edition ID từ `/v1/editions`, rồi dùng ID đó trong path; resource ID lấy từ danh sách tương ứng. Với folder, resource ID là athlete ID, không phải folder ID.

Không có POST/PATCH/DELETE. Request tới thao tác ghi hoặc path không có trong mock trả 404 `NOT_FOUND` dưới dạng Problem, không thay fixtures. Không diễn giải response mock thành bản đã đăng ký/được duyệt/kết quả chính thức đã lưu.

## Dùng từ frontend

Frontend có thể cấu hình proxy Vite trong môi trường dev để gọi cùng origin, ví dụ:

```ts
server: {
  proxy: {
    "/mock-api": {
      target: "http://127.0.0.1:4010",
      rewrite: (path: string) => path.replace(/^\/mock-api/, ""),
    },
  },
}
```

Sau đó gọi `/mock-api/v1/editions`. Đây là ví dụ cấu hình cho chủ frontend, chưa thay cấu hình hoặc màn hình ứng dụng hiện tại. Không đưa mock vào production/public API và không tạo credential giả. Mock không bật CORS rộng; proxy chỉ dùng cục bộ. Công cụ HTTP/Node có thể gọi trực tiếp cổng mock.

## Hợp đồng và phân trang

Routes, response schema và binding path được lấy từ OpenAPI; không sao chép DTO thành bộ schema riêng. `x-mock-path-bindings` ghi quan hệ giữa path params và trường fixture (ví dụ folder resource_id → athlete_id); extension này chỉ phục vụ mock, không thay policy server. Mock từ chối khởi tạo khi fixture không đúng schema, thiếu response fixture hoặc binding sai.

Response được kiểm schema trước trả. GET detail/list lọc theo edition/resource của dữ liệu giả; đây là cách chọn fixture, **không phải kiểm quyền**. Không yêu cầu cookie/login. Frontend phải dùng backend thật và S01/S02 policy trước tích hợp/nghiệm thu.

List hỗ trợ limit 1–100 (mặc định 50), cursor opaque; unknown query/limit sai/cursor sai trả 400. Cursor ràng buộc operation và scope dữ liệu giả, chỉ có hiệu lực trong cùng tiến trình; khởi động lại cần tải trang đầu. Fixtures hiện có một mục mỗi danh sách nên thường `next_cursor=null`; test dùng nhiều mục giả để kiểm luồng phân trang và chặn reuse cursor khác scope. Đây không phải thiết kế cursor lưu trữ của P02.

Public endpoint chỉ trả PublicResult đã finalized từ fixture whitelist; không chuyển Athlete/Submission thành public hoặc công khai tệp. Folder vẫn có trạng thái deferred và khóa `edition_id/athlete_id`; không tạo thư mục vật lý hay Google Drive.

## Kiểm chứng và bàn giao

`npm run check` chạy kiểm đồng bộ DTO và toàn bộ test; test mock bao gồm mọi GET response khớp OpenAPI, scope dữ liệu giả, folder binding, cursor, input sai, public whitelist và không có tác động ghi. Test CLI khởi động HTTP thật trên cổng riêng, kiểm health/dữ liệu rồi SIGTERM và xác minh trả cổng; kiểm cổng bị chiếm giữ tiến trình không liên quan.

Các nhóm dùng mock để viết phần UI độc lập. P02/S01/S02/R/K vẫn chịu trách nhiệm API thật, quyền, transaction và luật. SQL/Google/Netlify giữ nguyên lịch triển khai cuối dự án. Thay fixture phải cập nhật examples OpenAPI và chạy `npm run contracts:generate`; CI kiểm cùng nguồn.
