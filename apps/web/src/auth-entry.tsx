import { useEffect, useState, useSyncExternalStore } from "react";
import { App } from "./App.js";
import { HkpdLogo } from "./role-workspaces.js";
import type { AuthConfig } from "./auth-config.js";
import type { GoogleAuthController } from "./google-auth.js";
import type { WorkspaceSession } from "./staff-scope.js";
export type AccessLoader = (userId: string) => Promise<WorkspaceSession | null>;
function AccountWorkspace({
  userId,
  email,
  loadAccess,
  controller,
}: {
  userId: string;
  email?: string;
  loadAccess: AccessLoader;
  controller: GoogleAuthController;
}) {
  const [access, setAccess] = useState<WorkspaceSession | null>(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [checking, setChecking] = useState(true);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    let active = true;
    let sequence = 0;
    let inFlight = false;
    let deadline: number | undefined;
    async function check() {
      if (inFlight) return;
      inFlight = true;
      const request = ++sequence;
      let timedOut = false;
      setChecking(true);
      setFeedback("Đang kiểm tra quyền vào giải…");
      try {
        const timeout = new Promise<never>((_resolve, reject) => {
          deadline = window.setTimeout(() => {
            timedOut = true;
            reject(new Error("timeout"));
          }, 20000);
        });
        const next = await Promise.race([loadAccess(userId), timeout]);
        if (!active || request !== sequence) return;
        setAccess((previous) =>
          JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
        );
        setError("");
        setFeedback(
          next
            ? "Đã kiểm tra: tài khoản có quyền quản trị giải 2026."
            : "Đã kiểm tra: tài khoản đang đăng nhập chưa có quyền quản trị giải 2026. Nếu bạn đã chạy SQL cấp quyền, hãy kiểm tra đúng tài khoản Google và đúng project Supabase.",
        );
      } catch {
        if (!active || request !== sequence) return;
        setAccess(null);
        setError(
          timedOut
            ? "Kiểm tra quyền quá 20 giây chưa có kết quả. Kiểm tra kết nối mạng rồi bấm Kiểm tra quyền để thử lại."
            : "Không đọc được quyền từ Supabase. Kiểm tra cấu hình cấp quyền hoặc thử lại.",
        );
        setFeedback("");
      } finally {
        window.clearTimeout(deadline);
        inFlight = false;
        if (active && request === sequence) {
          setChecked(true);
          setChecking(false);
        }
      }
    }
    const refresh = () => {
      void check();
    };
    refresh();
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      active = false;
      window.clearTimeout(deadline);
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [userId, loadAccess, retry]);
  return (
    <>
      <div className="notice">
        <button
          type="button"
          className="secondary"
          onClick={() => void controller.signOut()}
        >
          Đăng xuất
        </button>
        <button
          type="button"
          className="secondary"
          disabled={checking}
          aria-busy={checking}
          onClick={() => setRetry((n) => n + 1)}
        >
          {checking ? "Đang kiểm tra…" : "Kiểm tra quyền"}
        </button>
      </div>
      <p className="auth-email">Tài khoản: {email ?? userId}</p>
      {feedback && (
        <p role="status" aria-live="polite">
          {feedback}
        </p>
      )}
      {!checked ? null : error ? (
        <p role="alert">{error}</p>
      ) : access ? (
        <>
          <p className="notice">
            Đã xác minh quyền quản trị. Dữ liệu nghiệp vụ hiện là bản nháp trên
            trình duyệt này; chưa đồng bộ đăng ký, kết quả hoặc Drive.
          </p>
          <App key={JSON.stringify(access)} session={access} />
        </>
      ) : (
        <div className="auth-page">
          <section className="auth-card">
            <HkpdLogo />
            <h1>Chưa được cấp quyền vào giải</h1>
            <p>
              Tài khoản Google đã được xác thực. Ban tổ chức cần cấp vai trò và
              phân công trước khi bạn truy cập dữ liệu của giải.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
export function AuthGate({
  controller,
  loadAccess,
}: {
  controller: GoogleAuthController;
  loadAccess?: AccessLoader;
}) {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  // Controller belongs to the page bootstrap. StrictMode must not dispose its singleton subscription.
  useEffect(() => {
    void controller.start();
  }, [controller]);
  if (state.phase === "authenticated" && state.user && loadAccess) {
    return (
      <AccountWorkspace
        key={state.user.id}
        userId={state.user.id}
        email={state.user.email}
        loadAccess={loadAccess}
        controller={controller}
      />
    );
  }
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
  loadAccess,
}: {
  config: AuthConfig;
  controller?: GoogleAuthController;
  loadAccess?: AccessLoader;
}) {
  if (config.mode === "preview") return <App />;
  if (config.mode === "configured" && controller)
    return <AuthGate controller={controller} loadAccess={loadAccess} />;
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
