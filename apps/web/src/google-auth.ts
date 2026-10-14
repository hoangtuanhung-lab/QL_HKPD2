export interface AuthPort {
  getSession(): Promise<{ data: { session: unknown | null }; error: unknown }>;
  getUser(): Promise<{
    data: { user: { id: string; email?: string } | null };
    error: unknown;
  }>;
  exchangeCodeForSession(code: string): Promise<{ error: unknown }>;
  signInWithOAuth(input: {
    provider: "google";
    options: { redirectTo: string; skipBrowserRedirect: true };
  }): Promise<{ data: { url: string | null }; error: unknown }>;
  signOut(input: { scope: "local" }): Promise<{ error: unknown }>;
  onAuthStateChange(callback: (event: string) => void): {
    data: { subscription: { unsubscribe(): void } };
  };
}
export interface AuthBrowser {
  href(): string;
  replace(url: string): void;
  go(url: string): void;
}
export interface AuthSnapshot {
  phase: "loading" | "anonymous" | "authenticated" | "error";
  user: { id: string; email?: string } | null;
  message: string;
}
export class GoogleAuthController {
  private snapshot: AuthSnapshot = {
    phase: "loading",
    user: null,
    message: "",
  };
  private listeners = new Set<() => void>();
  private epoch = 0;
  private initialized?: Promise<void>;
  private ready = false;
  private subscription?: { unsubscribe(): void };
  private timer?: ReturnType<typeof setTimeout>;
  constructor(
    private auth: AuthPort,
    private browser: AuthBrowser,
    private supabaseOrigin: string,
  ) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private set(snapshot: AuthSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
  private error(message: string) {
    this.set({ phase: "error", user: null, message });
  }
  start(): Promise<void> {
    this.initialized ??= this.initialize();
    return this.initialized;
  }
  private async initialize() {
    const initialEpoch = this.epoch;
    this.subscription = this.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        ++this.epoch;
        this.set({ phase: "anonymous", user: null, message: "" });
        return;
      }
      if (
        !this.ready ||
        !["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)
      )
        return;
      // Never await Supabase methods inside its auth lock callback.
      ++this.epoch;
      this.set({ phase: "loading", user: null, message: "" });
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        void this.refresh();
      }, 0);
    }).data.subscription;
    try {
      const url = new URL(this.browser.href());
      const code = url.searchParams.get("code");
      const fragment = new URLSearchParams(url.hash.slice(1));
      const denied =
        url.searchParams.has("error") ||
        url.searchParams.has("error_description") ||
        (url.searchParams.has("code") && !code) ||
        fragment.has("error") ||
        fragment.has("error_description") ||
        fragment.has("access_token") ||
        fragment.has("refresh_token");
      for (const key of ["code", "error", "error_code", "error_description"])
        url.searchParams.delete(key);
      if (denied || fragment.has("error_description")) url.hash = "";
      this.browser.replace(url.toString());
      if (denied) throw Error("OAuth callback rejected");
      if (code) {
        const result = await this.auth.exchangeCodeForSession(code);
        if (result.error) throw Error("OAuth exchange rejected");
      }
      if (initialEpoch === this.epoch) await this.refresh();
    } catch {
      if (initialEpoch === this.epoch)
        this.error("Không hoàn tất được đăng nhập Google. Vui lòng thử lại.");
    } finally {
      this.ready = true;
    }
  }
  async refresh() {
    const epoch = ++this.epoch;
    this.set({ phase: "loading", user: null, message: "" });
    try {
      const stored = await this.auth.getSession();
      if (epoch !== this.epoch) return;
      if (stored.error) throw Error("Session unavailable");
      if (!stored.data.session) {
        this.set({ phase: "anonymous", user: null, message: "" });
        return;
      }
      const verified = await this.auth.getUser();
      if (epoch !== this.epoch) return;
      if (verified.error || !verified.data.user?.id)
        throw Error("Identity not verified");
      const { id, email } = verified.data.user;
      this.set({ phase: "authenticated", user: { id, email }, message: "" });
    } catch {
      if (epoch === this.epoch)
        this.error(
          "Không xác minh được phiên đăng nhập. Vui lòng đăng nhập lại.",
        );
    }
  }
  async signIn() {
    const epoch = ++this.epoch;
    clearTimeout(this.timer);
    this.set({ phase: "loading", user: null, message: "" });
    try {
      const redirectTo = new URL("/", this.browser.href()).toString();
      const result = await this.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (epoch !== this.epoch) return;
      if (result.error || !result.data.url) throw Error("OAuth start rejected");
      const destination = new URL(result.data.url);
      if (
        destination.origin !== this.supabaseOrigin ||
        destination.pathname !== "/auth/v1/authorize"
      )
        throw Error("Unexpected authorization origin");
      this.browser.go(destination.toString());
    } catch {
      if (epoch === this.epoch)
        this.error("Không mở được đăng nhập Google. Vui lòng thử lại.");
    }
  }
  async signOut() {
    const epoch = ++this.epoch;
    clearTimeout(this.timer);
    this.set({ phase: "loading", user: null, message: "" });
    try {
      const result = await this.auth.signOut({ scope: "local" });
      if (result.error) throw Error("Sign out failed");
      if (epoch === this.epoch)
        this.set({ phase: "anonymous", user: null, message: "" });
    } catch {
      if (epoch === this.epoch)
        this.error("Chưa đăng xuất được. Vui lòng thử đăng xuất lại.");
    }
  }
  dispose() {
    ++this.epoch;
    clearTimeout(this.timer);
    this.subscription?.unsubscribe();
    this.listeners.clear();
  }
}
