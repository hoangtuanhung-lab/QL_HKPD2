import { expect, it, vi } from "vitest";
import { handleAthleteFiles } from "../netlify/lib/drive-files.mjs";
import {
  authorizationUrl,
  exchangeDriveCode,
  redirectUri,
} from "../scripts/connect-drive.mjs";
const athleteId = "draft_20000000-0000-4000-8000-000000000001";
const root = "root_folder_synthetic",
  folder = "folder_synthetic_001",
  file = "file_synthetic_001";
const config = {
  SUPABASE_URL: "https://project.example.invalid",
  SUPABASE_PUBLISHABLE_KEY: "synthetic-public",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-server",
  GOOGLE_DRIVE_CLIENT_ID: "synthetic-client",
  GOOGLE_DRIVE_CLIENT_SECRET: "synthetic-client-secret",
  GOOGLE_DRIVE_REFRESH_TOKEN: "synthetic-refresh",
  GOOGLE_DRIVE_ROOT_FOLDER_ID: root,
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const request = (body, fileId) =>
  new Request(
    `https://hkpd.example.invalid/.netlify/functions/athlete-files?athleteId=${athleteId}${fileId ? `&fileId=${fileId}` : ""}`,
    {
      method: body ? "POST" : "GET",
      headers: { Authorization: "Bearer synthetic-user" },
      body,
    },
  );
function backend({ deny = false, wrongParent = false } = {}) {
  let mapping,
    exists = false,
    created = 0;
  const calls = [];
  const fetcher = vi.fn(async (input, init = {}) => {
    const url = new URL(input);
    calls.push({ url: url.toString(), init });
    if (url.pathname.endsWith("hkpd_authorize_athlete_file"))
      return deny
        ? json({}, 403)
        : json({
            athleteId,
            athleteCode: "VDV000001",
            editionId: "edition-2026",
          });
    if (url.pathname === "/token")
      return json({ access_token: "synthetic-google-access" });
    if (url.pathname === `/drive/v3/files/${root}`)
      return json({
        id: root,
        mimeType: "application/vnd.google-apps.folder",
        permissions: [{ type: "user" }],
      });
    if (url.pathname.endsWith("hkpd_drive_folders")) {
      if (init.method === "POST") {
        mapping ??= JSON.parse(init.body);
        return new Response(null, { status: 201 });
      }
      return json(mapping ? [mapping] : []);
    }
    if (url.pathname.endsWith("generateIds")) return json({ ids: [folder] });
    if (url.pathname === `/drive/v3/files/${folder}`) {
      return exists
        ? json({
            id: folder,
            parents: [wrongParent ? "wrong_root" : root],
            mimeType: "application/vnd.google-apps.folder",
            appProperties: { hkpdAthlete: athleteId },
            permissions: [{ type: "user" }],
          })
        : json({}, 404);
    }
    if (url.pathname === "/drive/v3/files" && init.method === "POST") {
      const data = JSON.parse(init.body);
      expect(data.parents).toEqual([root]);
      expect(data.id).toBe(folder);
      created++;
      exists = true;
      return json({ id: folder });
    }
    if (url.pathname === "/drive/v3/files")
      return json({ files: [{ id: file, name: "ho-so.pdf" }] });
    if (url.pathname === `/drive/v3/files/${file}`) {
      if (url.searchParams.get("alt") === "media")
        return new Response("%PDF-1.7", {
          headers: { "Content-Type": "application/pdf" },
        });
      return json({
        parents: [folder],
        mimeType: "application/pdf",
        size: "100",
        appProperties: { hkpdAthlete: athleteId },
      });
    }
    if (url.pathname === "/upload/drive/v3/files") {
      expect(init.body).toBeInstanceOf(Blob);
      expect(await init.body.text()).toContain(folder);
      return json({ id: file });
    }
    throw Error(`Unexpected mock path: ${url.pathname}`);
  });
  return { fetcher, calls, created: () => created };
}
it("denies unconfigured and unauthorized requests before touching Google or service mappings", async () => {
  const fetcher = vi.fn();
  expect((await handleAthleteFiles(request(), {}, fetcher)).status).toBe(503);
  expect(fetcher).not.toHaveBeenCalled();
  const mock = backend({ deny: true });
  expect(
    (await handleAthleteFiles(request(), config, mock.fetcher)).status,
  ).toBe(403);
  expect(mock.calls).toHaveLength(1);
  expect(mock.calls[0].init.headers.Authorization).toBe(
    "Bearer synthetic-user",
  );
});
it("creates one stable private folder and reuses it across list/upload/download without leaking provider secrets", async () => {
  const mock = backend();
  let response = await handleAthleteFiles(request(), config, mock.fetcher);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([{ id: file, name: "ho-so.pdf" }]);
  const form = new FormData();
  form.set(
    "file",
    new Blob(["%PDF-1.7"], { type: "application/pdf" }),
    "result.pdf",
  );
  response = await handleAthleteFiles(request(form), config, mock.fetcher);
  expect(response.status).toBe(201);
  expect(await response.text()).toBe('{"saved":true}');
  response = await handleAthleteFiles(
    request(undefined, file),
    config,
    mock.fetcher,
  );
  expect(await response.text()).toBe("%PDF-1.7");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-disposition")).toContain("attachment");
  expect(mock.created()).toBe(1);
  expect(
    mock.calls.some((c) => new URL(c.url).pathname.includes("/permissions")),
  ).toBe(false);
  for (const call of mock.calls.filter(
    (c) => new URL(c.url).hostname === "www.googleapis.com",
  ))
    expect(call.init.headers.Authorization).toBe(
      "Bearer synthetic-google-access",
    );
});
it("rejects arbitrary content disguised as an image before accessing Google", async () => {
  const mock = backend(),
    form = new FormData();
  form.set(
    "file",
    new Blob(["<svg onload=evil()>"], { type: "image/jpeg" }),
    "fake.jpg",
  );
  expect(
    (await handleAthleteFiles(request(form), config, mock.fetcher)).status,
  ).toBe(415);
  expect(mock.calls).toHaveLength(1);
});
it("fails closed when a Drive folder moved outside the configured root", async () => {
  const mock = backend({ wrongParent: true });
  const response = await handleAthleteFiles(request(), config, mock.fetcher);
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("synthetic");
  expect(mock.calls.some((c) => c.url.includes("upload"))).toBe(false);
});
it("does not download a file outside the athlete folder even when its opaque handle is known", async () => {
  const mock = backend();
  const fetcher = async (input, init) =>
    new URL(input).pathname === `/drive/v3/files/${file}`
      ? json({
          parents: ["other_folder"],
          mimeType: "application/pdf",
          size: "20",
          appProperties: { hkpdAthlete: athleteId },
        })
      : mock.fetcher(input, init);
  expect(
    (await handleAthleteFiles(request(undefined, file), config, fetcher))
      .status,
  ).toBe(403);
  expect(mock.calls.some((c) => c.url.includes("alt=media"))).toBe(false);
});
it("requests offline owner consent and exchanges only the fixed loopback callback without logging refresh credentials", async () => {
  const url = new URL(authorizationUrl("client", "nonce"));
  expect(url.searchParams.get("state")).toBe("nonce");
  expect(url.searchParams.get("redirect_uri")).toBe(redirectUri);
  expect(url.searchParams.get("access_type")).toBe("offline");
  const fetcher = vi.fn(async () =>
    json({ refresh_token: "synthetic-refresh" }),
  );
  expect(await exchangeDriveCode("code", config, fetcher)).toBe(
    "synthetic-refresh",
  );
  expect(fetcher.mock.calls[0][1].body.get("redirect_uri")).toBe(redirectUri);
  await expect(
    exchangeDriveCode("code", config, async () =>
      json({ error_description: "private upstream diagnostic" }, 400),
    ),
  ).rejects.not.toThrow("private upstream diagnostic");
});
it("requires admin before probing integrations and reports configuration names without secret values", async () => {
  const { integrationStatus } =
    await import("../netlify/functions/integration-status.mjs");
  const denied = vi.fn(async () => json({ role: "school" }));
  expect((await integrationStatus(request(), config, denied)).status).toBe(403);
  expect(denied).toHaveBeenCalledTimes(1);
  const missing = vi.fn(async (url) =>
    url.endsWith("hkpd_workspace_access")
      ? json({ role: "admin" })
      : json({ editionId: "edition-2026" }),
  );
  const response = await integrationStatus(
    request(),
    {
      SUPABASE_URL: config.SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY: config.SUPABASE_PUBLISHABLE_KEY,
    },
    missing,
  );
  const data = await response.json();
  expect(data.database).toBe(true);
  expect(data.ready).toBe(false);
  expect(data.missing).toContain("GOOGLE_DRIVE_REFRESH_TOKEN");
  expect(JSON.stringify(data)).not.toContain("synthetic-");
});
it("refuses a publicly shared root and never creates or uploads into it", async () => {
  const mock = backend();
  const fetcher = async (input, init) =>
    new URL(input).pathname === `/drive/v3/files/${root}`
      ? json({
          mimeType: "application/vnd.google-apps.folder",
          permissions: [{ type: "anyone" }],
        })
      : mock.fetcher(input, init);
  expect((await handleAthleteFiles(request(), config, fetcher)).status).toBe(
    503,
  );
  expect(mock.created()).toBe(0);
});
it("reports ready only after checking the schema, server mapping key and a private accessible Drive root", async () => {
  const { integrationStatus } =
    await import("../netlify/functions/integration-status.mjs");
  const fetcher = vi.fn(async (input) => {
    const path = new URL(input).pathname;
    if (path.endsWith("hkpd_workspace_access")) return json({ role: "admin" });
    if (path.endsWith("hkpd_online_state"))
      return json({ editionId: "edition-2026" });
    if (path.endsWith("hkpd_drive_folders")) return json([]);
    if (path === "/token")
      return json({ access_token: "synthetic-google-access" });
    return json({
      mimeType: "application/vnd.google-apps.folder",
      permissions: [{ type: "user" }],
    });
  });
  const response = await integrationStatus(request(), config, fetcher);
  expect(await response.json()).toEqual({
    database: true,
    drive: true,
    missing: [],
    ready: true,
  });
  expect(fetcher).toHaveBeenCalledTimes(5);
});
