// @vitest-environment jsdom
import { createElement, StrictMode } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readAuthConfig } from "../apps/web/src/auth-config.js";
import { AuthGate, SiteEntry } from "../apps/web/src/auth-entry.js";
import {
  GoogleAuthController,
  type AuthPort,
} from "../apps/web/src/google-auth.js";
const origin = "https://example.supabase.co";
const controllers: GoogleAuthController[] = [];
function setup(href = "https://hkpd.netlify.app/") {
  let callback: (event: string) => void = () => {};
  const auth: AuthPort = {
    getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    getUser: vi.fn(async () => ({
      data: {
        user: {
          id: "user-A",
          email: "teacher@example.invalid",
          user_metadata: { role: "admin" },
        },
      },
      error: null,
    })),
    exchangeCodeForSession: vi.fn(async () => ({ error: null })),
    signInWithOAuth: vi.fn(async () => ({
      data: { url: `${origin}/auth/v1/authorize?provider=google` },
      error: null,
    })),
    signOut: vi.fn(async () => ({ error: null })),
    onAuthStateChange: vi.fn((fn) => {
      callback = fn;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
  };
  const browser = { href: () => href, replace: vi.fn(), go: vi.fn() };
  const controller = new GoogleAuthController(auth, browser, origin);
  controllers.push(controller);
  return {
    auth,
    browser,
    controller,
    emit: (event: string) => callback(event),
  };
}
afterEach(() => {
  cleanup();
  controllers.splice(0).forEach((c) => c.dispose());
  vi.restoreAllMocks();
});
describe("Supabase Google identity without automatic privileges", () => {
  it("uses PKCE callback once under StrictMode, removes code before exchange and verifies identity remotely", async () => {
    const { auth, browser, controller } = setup(
      "https://hkpd.netlify.app/?code=synthetic-code&keep=value",
    );
    vi.mocked(auth.getSession).mockResolvedValue({
      data: { session: {} },
      error: null,
    });
    vi.mocked(auth.exchangeCodeForSession).mockImplementation(async () => {
      expect(browser.replace).toHaveBeenCalledWith(
        "https://hkpd.netlify.app/?keep=value",
      );
      return { error: null };
    });
    render(
      createElement(StrictMode, null, createElement(AuthGate, { controller })),
    );
    await screen.findByText("Đăng nhập thành công");
    expect(auth.exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith(
      "synthetic-code",
    );
    expect(auth.getUser).toHaveBeenCalledOnce();
    expect(screen.getByText("Chưa được cấp quyền vào giải")).toBeTruthy();
    expect(screen.queryByLabelText("Xem giao diện vai trò")).toBeNull();
    expect(screen.queryByRole("button", { name: "Quản lý giải" })).toBeNull();
    expect(controller.getSnapshot().user).toEqual({
      id: "user-A",
      email: "teacher@example.invalid",
    });
  });
  it("starts only Google OAuth with the fixed same-origin root callback and trusted Supabase origin", async () => {
    const { auth, browser, controller } = setup(
      "https://hkpd.netlify.app/?returnTo=https://evil.invalid",
    );
    await controller.start();
    await controller.signIn();
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://hkpd.netlify.app/",
        skipBrowserRedirect: true,
      },
    });
    expect(browser.go).toHaveBeenCalledWith(
      `${origin}/auth/v1/authorize?provider=google`,
    );
    vi.mocked(auth.signInWithOAuth).mockResolvedValue({
      data: { url: "https://evil.invalid/" },
      error: null,
    });
    browser.go.mockClear();
    await controller.signIn();
    expect(browser.go).not.toHaveBeenCalled();
    expect(controller.getSnapshot().phase).toBe("error");
  });
  it("does not trust cached sessions if remote verification fails", async () => {
    const { auth, controller } = setup();
    vi.mocked(auth.getSession).mockResolvedValue({
      data: { session: { user: { id: "spoofed", role: "admin" } } },
      error: null,
    });
    vi.mocked(auth.getUser).mockResolvedValue({
      data: { user: null },
      error: Error("synthetic confidential response"),
    });
    await controller.start();
    expect(controller.getSnapshot().phase).toBe("error");
    expect(controller.getSnapshot().user).toBeNull();
    expect(JSON.stringify(controller.getSnapshot())).not.toContain(
      "confidential",
    );
  });
  it("sanitizes denied/implicit callbacks without echoing tokens or descriptions", async () => {
    for (const href of [
      "https://hkpd.netlify.app/?error=access_denied&error_description=private-details",
      "https://hkpd.netlify.app/#access_token=private-token&refresh_token=private-refresh",
      "https://hkpd.netlify.app/?code=",
    ]) {
      const { auth, browser, controller } = setup(href);
      await controller.start();
      expect(browser.replace).toHaveBeenCalledWith("https://hkpd.netlify.app/");
      expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
      expect(controller.getSnapshot().phase).toBe("error");
      expect(JSON.stringify(controller.getSnapshot())).not.toContain("private");
    }
  });
  it("rejects failed or thrown code exchanges and clears their URL", async () => {
    const { auth, browser, controller } = setup(
      "https://hkpd.netlify.app/?code=expired-code",
    );
    vi.mocked(auth.exchangeCodeForSession).mockRejectedValue(
      Error("private-code-response"),
    );
    await controller.start();
    expect(auth.getUser).not.toHaveBeenCalled();
    expect(browser.replace).toHaveBeenCalledWith("https://hkpd.netlify.app/");
    expect(controller.getSnapshot().phase).toBe("error");
  });
  it("does not restore an old identity after concurrent sign out", async () => {
    const { auth, controller, emit } = setup();
    await controller.start();
    vi.mocked(auth.getSession).mockResolvedValue({
      data: { session: {} },
      error: null,
    });
    let finish!: (value: Awaited<ReturnType<AuthPort["getUser"]>>) => void;
    vi.mocked(auth.getUser).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending = controller.refresh();
    await waitFor(() => expect(auth.getUser).toHaveBeenCalled());
    emit("SIGNED_OUT");
    finish({ data: { user: { id: "old-user" } }, error: null });
    await pending;
    expect(controller.getSnapshot().phase).toBe("anonymous");
    expect(controller.getSnapshot().user).toBeNull();
  });
  it("handles cross-tab sign in and sign out without awaiting inside the auth callback", async () => {
    const { auth, controller, emit } = setup();
    await controller.start();
    vi.mocked(auth.getSession).mockResolvedValue({
      data: { session: {} },
      error: null,
    });
    emit("SIGNED_IN");
    await waitFor(() =>
      expect(controller.getSnapshot().phase).toBe("authenticated"),
    );
    emit("SIGNED_OUT");
    expect(controller.getSnapshot().phase).toBe("anonymous");
    await controller.signOut();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    let finish!: (value: { error: unknown }) => void;
    vi.mocked(auth.signOut).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const previousLogout = controller.signOut();
    emit("SIGNED_IN");
    await waitFor(() =>
      expect(controller.getSnapshot().phase).toBe("authenticated"),
    );
    finish({ error: null });
    await previousLogout;
    expect(controller.getSnapshot().phase).toBe("authenticated");
  });
  it("offers retry after network/sign-out failure and never claims sign-out success", async () => {
    const { auth, controller } = setup();
    await controller.start();
    vi.mocked(auth.signOut).mockResolvedValue({
      error: Error("private failure"),
    });
    render(createElement(AuthGate, { controller }));
    await controller.signOut();
    await screen.findByText("Chưa đăng xuất được. Vui lòng thử đăng xuất lại.");
    fireEvent.click(
      screen.getByRole("button", { name: "Đăng xuất trên trình duyệt này" }),
    );
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(2));
  });
  it("never mounts the unrestricted preview on production configuration failure", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    render(createElement(SiteEntry, { config: { mode: "blocked" } }));
    expect(
      screen.getByRole("heading", { name: "Website chưa sẵn sàng đăng nhập" }),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Xem giao diện vai trò")).toBeNull();
    expect(getItem).not.toHaveBeenCalled();
  });
});
describe("Public build configuration", () => {
  it("allows a local dev preview only without any auth config and blocks partial or production config", () => {
    expect(readAuthConfig({ DEV: true })).toEqual({ mode: "preview" });
    expect(readAuthConfig({})).toEqual({ mode: "blocked" });
    expect(readAuthConfig({ DEV: true, VITE_SUPABASE_URL: origin })).toEqual({
      mode: "blocked",
    });
  });
  it("accepts public keys but rejects private keys, credentials and non-HTTPS or path-bearing URLs", () => {
    expect(
      readAuthConfig({
        VITE_SUPABASE_URL: origin,
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic",
      }).mode,
    ).toBe("configured");
    for (const key of [
      "sb_secret_synthetic",
      "not-a-key",
      `x.${btoa(JSON.stringify({ role: "service_role" }))}.x`,
    ])
      expect(
        readAuthConfig({
          VITE_SUPABASE_URL: origin,
          VITE_SUPABASE_PUBLISHABLE_KEY: key,
        }).mode,
      ).toBe("blocked");
    const credentialUrl = new URL(origin);
    credentialUrl.username = "synthetic-user";
    credentialUrl.password = "synthetic-password";
    for (const url of [
      "http://example.supabase.co",
      `${origin}/extra`,
      credentialUrl.toString(),
      `${origin}/?key=value`,
    ])
      expect(
        readAuthConfig({
          VITE_SUPABASE_URL: url,
          VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic",
        }).mode,
      ).toBe("blocked");
    expect(
      readAuthConfig({
        VITE_SUPABASE_URL: origin,
        VITE_SUPABASE_PUBLISHABLE_KEY: `x.${btoa(JSON.stringify({ role: "anon" }))}.x`,
      }).mode,
    ).toBe("configured");
  });
});
