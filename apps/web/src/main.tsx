import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
function App() {
  return (
    <main>
      <p>HỘI KHỎE PHÙ ĐỔNG · QUẢNG PHÚ</p>
      <h1>Hệ thống đang được xây dựng</h1>
      <p>
        Các chức năng đăng ký, thi đấu và kết quả sẽ được bổ sung theo kế hoạch
        phát triển.
      </p>
      <section>
        <h2>Nền tảng khởi đầu</h2>
        <p>Giao diện này chưa tiếp nhận hồ sơ hay dữ liệu vận động viên.</p>
      </section>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
