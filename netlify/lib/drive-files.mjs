const json = (status, value) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
const safeId = (id) =>
  typeof id === "string" && /^[A-Za-z0-9_-]{10,150}$/.test(id);
const maxBytes = 4 * 1024 * 1024;
function fileType(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return ["image/jpeg", "jpg"];
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v))
    return ["image/png", "png"];
  if (new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-")
    return ["application/pdf", "pdf"];
  return null;
}
export async function handleAthleteFiles(request, env, fetcher = fetch) {
  try {
    const required = [
      "SUPABASE_URL",
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "GOOGLE_DRIVE_CLIENT_ID",
      "GOOGLE_DRIVE_CLIENT_SECRET",
      "GOOGLE_DRIVE_REFRESH_TOKEN",
      "GOOGLE_DRIVE_ROOT_FOLDER_ID",
    ];
    if (required.some((k) => !env[k]))
      return json(503, { error: "storage_not_configured" });
    const url = new URL(request.url);
    if (!["GET", "POST"].includes(request.method))
      return json(405, { error: "method_not_allowed" });
    const token = request.headers.get("authorization");
    if (!token?.startsWith("Bearer ") || token.length > 9000)
      return json(401, { error: "sign_in_required" });
    const athleteId = url.searchParams.get("athleteId");
    if (!/^draft_[0-9a-fA-F-]{36}$/.test(athleteId ?? ""))
      return json(400, { error: "invalid_athlete" });
    const base = new URL(env.SUPABASE_URL);
    if (
      base.protocol !== "https:" ||
      base.username ||
      base.password ||
      base.pathname !== "/"
    )
      return json(503, { error: "invalid_configuration" });
    const deadline = AbortSignal.timeout(24000);
    const bounded = (input, init = {}) =>
      fetcher(input, {
        ...init,
        signal: AbortSignal.any([deadline, AbortSignal.timeout(8000)]),
      });
    const authorized = await bounded(
      `${base.origin}/rest/v1/rpc/hkpd_authorize_athlete_file`,
      {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_PUBLISHABLE_KEY,
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_athlete_id: athleteId,
          p_write: request.method === "POST",
        }),
      },
    );
    if (!authorized.ok) return json(403, { error: "not_authorized" });
    const scope = await authorized.json();
    if (scope.athleteId !== athleteId || scope.editionId !== "edition-2026")
      return json(403, { error: "not_authorized" });
    let bytes, type;
    if (request.method === "POST") {
      const size = Number(request.headers.get("content-length"));
      if (size > maxBytes + 10000)
        return json(413, { error: "file_too_large" });
      const form = await request.formData();
      const file = form.get("file");
      if (
        !file ||
        typeof file === "string" ||
        file.size === 0 ||
        file.size > maxBytes
      )
        return json(400, { error: "invalid_file_size" });
      bytes = new Uint8Array(await file.arrayBuffer());
      type = fileType(bytes);
      if (!type) return json(415, { error: "only_jpeg_png_pdf" });
    }
    const refreshed = await bounded("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: env.GOOGLE_DRIVE_CLIENT_ID,
        client_secret: env.GOOGLE_DRIVE_CLIENT_SECRET,
        refresh_token: env.GOOGLE_DRIVE_REFRESH_TOKEN,
      }),
    });
    if (!refreshed.ok)
      return json(503, { error: "drive_authorization_required" });
    const access = (await refreshed.json()).access_token;
    if (typeof access !== "string" || !access)
      return json(503, { error: "drive_authorization_required" });
    const google = async (path, init = {}) => {
      const result = await bounded(`https://www.googleapis.com${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${access}`, ...init.headers },
      });
      return result;
    };
    if (!safeId(env.GOOGLE_DRIVE_ROOT_FOLDER_ID)) throw Error("root");
    const rootResponse = await google(
      `/drive/v3/files/${env.GOOGLE_DRIVE_ROOT_FOLDER_ID}?fields=id,mimeType,trashed,permissions(type)`,
    );
    if (!rootResponse.ok) throw Error("root");
    const rootInfo = await rootResponse.json();
    if (
      rootInfo.trashed ||
      rootInfo.mimeType !== "application/vnd.google-apps.folder" ||
      !Array.isArray(rootInfo.permissions) ||
      rootInfo.permissions.some((p) => ["anyone", "domain"].includes(p.type))
    )
      throw Error("root_permissions");
    const serviceHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    };
    const mappingPath = `${base.origin}/rest/v1/hkpd_drive_folders?athlete_id=eq.${encodeURIComponent(athleteId)}&select=folder_id,root_id`;
    const readFolder = async () => {
      const r = await bounded(mappingPath, { headers: serviceHeaders });
      if (!r.ok) throw Error("mapping");
      return (await r.json())[0];
    };
    let mapping = await readFolder();
    if (!mapping) {
      const generated = await google(
        "/drive/v3/files/generateIds?count=1&space=drive&type=files",
      );
      if (!generated.ok) throw Error("generate");
      const folderId = (await generated.json()).ids?.[0];
      if (!safeId(folderId) || !safeId(env.GOOGLE_DRIVE_ROOT_FOLDER_ID))
        throw Error("ids");
      const reserved = await bounded(
        `${base.origin}/rest/v1/hkpd_drive_folders?on_conflict=athlete_id`,
        {
          method: "POST",
          headers: {
            ...serviceHeaders,
            Prefer: "resolution=ignore-duplicates",
          },
          body: JSON.stringify({
            athlete_id: athleteId,
            folder_id: folderId,
            root_id: env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
          }),
        },
      );
      if (!reserved.ok) throw Error("reserve");
      mapping = await readFolder();
    }
    if (
      !mapping ||
      !safeId(mapping.folder_id) ||
      mapping.root_id !== env.GOOGLE_DRIVE_ROOT_FOLDER_ID
    )
      throw Error("mapping");
    const folderPath = `/drive/v3/files/${mapping.folder_id}?fields=id,parents,mimeType,appProperties,trashed,permissions(type)`;
    let folder = await google(folderPath);
    if (folder.status === 404) {
      const created = await google("/drive/v3/files?fields=id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: mapping.folder_id,
          name: `${scope.editionId}_${scope.athleteCode}`,
          mimeType: "application/vnd.google-apps.folder",
          parents: [mapping.root_id],
          appProperties: { hkpdAthlete: athleteId },
        }),
      });
      if (!created.ok && created.status !== 409) throw Error("create");
      folder = await google(folderPath);
    }
    if (!folder.ok) throw Error("folder");
    const metadata = await folder.json();
    if (
      metadata.trashed ||
      !Array.isArray(metadata.permissions) ||
      metadata.permissions.some((p) => ["anyone", "domain"].includes(p.type)) ||
      metadata.mimeType !== "application/vnd.google-apps.folder" ||
      !metadata.parents?.includes(mapping.root_id) ||
      metadata.appProperties?.hkpdAthlete !== athleteId
    )
      throw Error("folder_scope");
    const fileId = url.searchParams.get("fileId");
    if (request.method === "GET" && fileId) {
      if (!safeId(fileId)) return json(400, { error: "invalid_file" });
      const info = await google(
        `/drive/v3/files/${fileId}?fields=parents,mimeType,size,trashed,appProperties`,
      );
      if (!info.ok) return json(404, { error: "file_not_found" });
      const file = await info.json();
      if (
        file.trashed ||
        !file.parents?.includes(mapping.folder_id) ||
        file.appProperties?.hkpdAthlete !== athleteId ||
        !["image/jpeg", "image/png", "application/pdf"].includes(
          file.mimeType,
        ) ||
        Number(file.size) > maxBytes
      )
        return json(403, { error: "not_authorized" });
      const content = await google(`/drive/v3/files/${fileId}?alt=media`);
      if (!content.ok) throw Error("download");
      return new Response(content.body, {
        headers: {
          "Content-Type": file.mimeType,
          "Content-Disposition": 'attachment; filename="ho-so"',
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (request.method === "GET") {
      const q = `'${mapping.folder_id}' in parents and trashed = false and appProperties has { key='hkpdAthlete' and value='${athleteId}' }`;
      let next = "";
      const files = [];
      do {
        const list = await google(
          `/drive/v3/files?${new URLSearchParams({ q, fields: "files(id,name),nextPageToken", pageSize: "100", ...(next ? { pageToken: next } : {}) })}`,
        );
        if (!list.ok) throw Error("list");
        const page = await list.json();
        files.push(...page.files);
        next = page.nextPageToken ?? "";
        if (files.length > 1000) throw Error("too_many_files");
      } while (next);
      return json(200, files);
    }
    const boundary = `hkpd_${crypto.randomUUID()}`;
    const meta = JSON.stringify({
      name: `ho-so_${crypto.randomUUID()}.${type[1]}`,
      parents: [mapping.folder_id],
      appProperties: { hkpdAthlete: athleteId },
    });
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${type[0]}\r\n\r\n`,
      bytes,
      `\r\n--${boundary}--`,
    ]);
    const upload = await google(
      "/upload/drive/v3/files?uploadType=multipart&fields=id",
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      },
    );
    if (!upload.ok) throw Error("upload");
    // Physical IDs remain server-side except an opaque file handle for protected downloads.
    return json(201, { saved: true });
  } catch {
    return json(503, { error: "storage_unavailable" });
  }
}
