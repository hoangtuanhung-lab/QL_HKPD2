export type AuthConfig =
  | { mode: "preview" }
  | { mode: "blocked" }
  | { mode: "configured"; url: string; key: string };
export function readAuthConfig(env: {
  DEV?: boolean;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}): AuthConfig {
  const url = env.VITE_SUPABASE_URL?.trim(),
    key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url && !key) return { mode: env.DEV ? "preview" : "blocked" };
  if (!url || !key || key.length > 8192) return { mode: "blocked" };
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/"
    )
      return { mode: "blocked" };
    let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
    // Classify legacy public keys only; authentication is verified by Supabase, not this decoding.
    if (!publicKey && key.split(".").length === 3) {
      const payload = key.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/");
      publicKey = JSON.parse(atob(payload)).role === "anon";
    }
    return publicKey
      ? { mode: "configured", url: parsed.origin, key }
      : { mode: "blocked" };
  } catch {
    return { mode: "blocked" };
  }
}
