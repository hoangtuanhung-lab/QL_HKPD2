import { useEffect, useSyncExternalStore } from "react";
import { App } from "./App.js";
import { HkpdLogo } from "./role-workspaces.js";
import type { AuthConfig } from "./auth-config.js";
import type { GoogleAuthController } from "./google-auth.js";
export function AuthGate({ controller }: { controller: GoogleAuthController }) {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  // Controller belongs to the page bootstrap. StrictMode must not dispose its singleton subscription.
  useEffect(() => {
    void controller.start();
  }, [controller]);
  return (
    <main className="auth-page">
      <section className="auth-card">
        <HkpdLogo />
        <p className="eyebrow">HỘI KHỎE PHÙ ĐỔNG · XÃ QUẢNG PHÚ</p>
        <h1>
          {state.phase === "authenticated"
            ? "Đăng nhập thành công"
            : "Đăng nhập hệ thống"}
        </h1>
        {state.phase === "loading" ? (
          <p role="status">Đang kiểm tra phiên đăng nhập…</p>
        ) : state.phase === "authenticated" ? (
          <>
            <p className="auth-email">
              {state.user?.email ?? "Tài khoản Google đã xác thực"}
            </p>
            <div className="notice">
              <h2>Chưa được cấp quyền vào giải</h2>
              <p>
                Tài khoản Google đã được xác thực. Ban tổ chức cần cấp vai trò
                và phân công trước khi bạn truy cập dữ liệu của giải.
              </p>
            </div>
            <p className="footer-note">
              Không tự cấp quyền quản trị từ email hoặc thông tin tài khoản
              Google.
            </p>
          </>
        ) : (
          <>
            <p>Dùng tài khoản Google của nhà trường hoặc Ban tổ chức.</p>
            {state.message && (
              <p role="alert" className="notice error">
                {state.message}
              </p>
            )}
            <button
              className="auth-google-button"
              type="button"
              onClick={() => void controller.signIn()}
            >
              <span aria-hidden="true">G</span>Đăng nhập bằng Google
            </button>
          </>
        )}
        {state.phase !== "loading" && state.phase !== "anonymous" && (
          <button
            className="secondary"
            type="button"
            onClick={() => void controller.signOut()}
          >
            Đăng xuất trên trình duyệt này
          </button>
        )}
        <p className="auth-footer">
          Hội khỏe Phù Đổng Quảng Phú · Cổng đăng nhập
        </p>
      </section>
    </main>
  );
}
export function SiteEntry({
  config,
  controller,
}: {
  config: AuthConfig;
  controller?: GoogleAuthController;
}) {
  if (config.mode === "preview") return <App />;
  if (config.mode === "configured" && controller)
    return <AuthGate controller={controller} />;
  return (
    <main className="auth-page">
      <section className="auth-card">
        <HkpdLogo />
        <h1>Website chưa sẵn sàng đăng nhập</h1>
        <p role="alert">
          Vui lòng liên hệ Ban tổ chức để kiểm tra cấu hình đăng nhập.
        </p>
      </section>
    </main>
  );
}
