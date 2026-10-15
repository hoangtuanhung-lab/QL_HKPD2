// Run on the owner's computer. Writes the refresh token ONLY to an ignored, private local file.
import http from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { writeFile } from "node:fs/promises";
export const redirectUri = "http://127.0.0.1:43821/oauth/callback";
export function authorizationUrl(clientId, state) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return url.toString();
}
export async function exchangeDriveCode(code, env, request = fetch) {
  const response = await request("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_DRIVE_CLIENT_ID,
      client_secret: env.GOOGLE_DRIVE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw Error(
      "Google chưa cấp quyền Drive. Kiểm tra client và callback, không gửi code hoặc token vào chat.",
    );
  const data = await response.json();
  if (
    typeof data.refresh_token !== "string" ||
    !data.refresh_token ||
    /[^A-Za-z0-9_./~-]/.test(data.refresh_token)
  )
    throw Error("Chưa nhận được refresh token; thử lại với consent.");
  return data.refresh_token;
}
async function main() {
  const env = process.env;
  if (!env.GOOGLE_DRIVE_CLIENT_ID || !env.GOOGLE_DRIVE_CLIENT_SECRET)
    throw Error(
      "Đặt GOOGLE_DRIVE_CLIENT_ID và GOOGLE_DRIVE_CLIENT_SECRET trong .env.drive.local, rồi chạy node --env-file=.env.drive.local scripts/connect-drive.mjs",
    );
  const state = randomBytes(32).toString("hex");
  let claimed = false;
  const server = http.createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    const url = new URL(req.url ?? "/", "http://127.0.0.1:43821");
    const returned = url.searchParams.get("state") ?? "";
    if (
      url.pathname !== "/oauth/callback" ||
      !/^([a-f0-9]{64})$/.test(returned) ||
      !timingSafeEqual(Buffer.from(returned), Buffer.from(state)) ||
      claimed ||
      !url.searchParams.get("code")
    ) {
      res.writeHead(400);
      res.end("Callback không hợp lệ.");
      return;
    }
    claimed = true;
    try {
      const token = await exchangeDriveCode(url.searchParams.get("code"), env);
      await writeFile(
        ".env.drive.tokens",
        `GOOGLE_DRIVE_REFRESH_TOKEN=${token}\n`,
        { mode: 0o600, flag: "wx" },
      );
      res.end(
        "Đã lưu cấu hình trong .env.drive.tokens trên máy của bạn. Đóng cửa sổ này. Không gửi tệp hoặc token vào chat.",
      );
      console.log(
        "Đã ghi .env.drive.tokens (quyền 0600). Thêm giá trị này vào Netlify Environment variables / Functions, không commit.",
      );
    } catch {
      res.writeHead(400);
      res.end(
        "Chưa lưu được cấu hình. Kiểm tra callback/client, hoặc tệp .env.drive.tokens đã tồn tại. Không ghi đè tệp cũ.",
      );
    } finally {
      server.close();
    }
  });
  const timer = setTimeout(() => server.close(), 10 * 60 * 1000);
  timer.unref();
  server.on("close", () => clearTimeout(timer));
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(43821, "127.0.0.1", resolve);
  });
  console.log(
    "Mở liên kết dưới bằng tài khoản sở hữu thư mục HKPĐ. Chỉ cấp quyền khi đúng project Google của bạn:",
  );
  console.log(authorizationUrl(env.GOOGLE_DRIVE_CLIENT_ID, state));
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main().catch(() => {
    console.error(
      "Chưa thiết lập Drive. Kiểm tra biến client, cổng 43821 và hướng dẫn live-operations.md.",
    );
    process.exitCode = 1;
  });
