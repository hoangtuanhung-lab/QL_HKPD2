export default async function handler(request, context) {
  return integrationStatus(request, process.env, fetch, context);
}
export async function integrationStatus(request, env, fetcher = fetch) {
  const reply = (status, body) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  try {
    if (request.method !== "GET")
      return reply(405, { error: "method_not_allowed" });
    if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY)
      return reply(503, { error: "backend_not_configured" });
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer "))
      return reply(401, { error: "sign_in_required" });
    const deadline = AbortSignal.timeout(24000);
    const get = (url, init = {}) =>
      fetcher(url, {
        ...init,
        signal: AbortSignal.any([deadline, AbortSignal.timeout(8000)]),
      });
    const base = new URL(env.SUPABASE_URL);
    if (
      base.protocol !== "https:" ||
      base.username ||
      base.password ||
      base.pathname !== "/"
    )
      return reply(503, { error: "backend_not_configured" });
    const headers = {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: authorization,
      "Content-Type": "application/json",
    };
    const access = await get(
      `${base.origin}/rest/v1/rpc/hkpd_workspace_access`,
      { method: "POST", headers, body: "{}" },
    );
    if (!access.ok || (await access.json())?.role !== "admin")
      return reply(403, { error: "admin_required" });
    const database = await get(`${base.origin}/rest/v1/rpc/hkpd_online_state`, {
      method: "POST",
      headers,
      body: "{}",
    });
    const schemaReady =
      database.ok && (await database.json())?.editionId === "edition-2026";
    const missing = [
      "SUPABASE_SERVICE_ROLE_KEY",
      "GOOGLE_DRIVE_CLIENT_ID",
      "GOOGLE_DRIVE_CLIENT_SECRET",
      "GOOGLE_DRIVE_REFRESH_TOKEN",
      "GOOGLE_DRIVE_ROOT_FOLDER_ID",
    ].filter((k) => !env[k]);
    let driveReady = false;
    if (missing.length === 0) {
      const mapping = await get(
        `${base.origin}/rest/v1/hkpd_drive_folders?select=athlete_id&limit=0`,
        {
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        },
      );
      if (mapping.ok) {
        const token = await get("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: env.GOOGLE_DRIVE_CLIENT_ID,
            client_secret: env.GOOGLE_DRIVE_CLIENT_SECRET,
            refresh_token: env.GOOGLE_DRIVE_REFRESH_TOKEN,
          }),
        });
        if (token.ok) {
          const value = (await token.json()).access_token;
          if (
            typeof value === "string" &&
            /^[A-Za-z0-9_-]{10,150}$/.test(env.GOOGLE_DRIVE_ROOT_FOLDER_ID)
          ) {
            const folder = await get(
              `https://www.googleapis.com/drive/v3/files/${env.GOOGLE_DRIVE_ROOT_FOLDER_ID}?fields=mimeType,trashed,permissions(type)`,
              { headers: { Authorization: `Bearer ${value}` } },
            );
            if (folder.ok) {
              const data = await folder.json();
              driveReady =
                !data.trashed &&
                data.mimeType === "application/vnd.google-apps.folder" &&
                Array.isArray(data.permissions) &&
                !data.permissions.some((p) =>
                  ["anyone", "domain"].includes(p.type),
                );
            }
          }
        }
      }
    }
    return reply(200, {
      database: schemaReady,
      drive: driveReady,
      missing,
      ready: schemaReady && driveReady,
    });
  } catch {
    return reply(503, { error: "integration_check_failed" });
  }
}
