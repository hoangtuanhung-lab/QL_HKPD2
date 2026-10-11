import { writeFileSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
const pages = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const ws = new WebSocket(
  pages.find((x) => x.type === "page").webSocketDebuggerUrl,
);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let next = 0,
  exceptions = 0,
  businessRequests = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const v = JSON.parse(e.data);
  if (v.method === "Runtime.exceptionThrown") exceptions++;
  if (
    v.method === "Network.requestWillBeSent" &&
    new URL(v.params.request.url).pathname.startsWith("/v1/")
  )
    businessRequests++;
  if (v.id) {
    const p = pending.get(v.id);
    pending.delete(v.id);
    if (v.error) p.reject(new Error(v.error.message));
    else p.resolve(v.result);
  }
});
const call = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++next;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await call("Runtime.evaluate", { expression, returnByValue: true });
  if (r.exceptionDetails) throw new Error("DOM evaluation failed");
  return r.result.value;
};
const wait = async (expression) => {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("DOM condition timed out");
};
const click = async (text) => {
  await evaluate(
    `(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(text)});if(!b)throw new Error('button missing');b.click();})()`,
  );
  await new Promise((r) => setTimeout(r, 100));
};
const fill = async (label, value) => {
  await evaluate(
    `(()=>{const label=[...document.querySelectorAll('label')].find(x=>x.textContent.trim().startsWith(${JSON.stringify(label)}));const el=label?.control ?? label?.querySelector('input,textarea,select');if(!el)throw new Error('field missing');const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`,
  );
  await new Promise((r) => setTimeout(r, 100));
};

await call("Page.enable");
await call("Runtime.enable");
await call("Network.enable");
await call("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1100,
  deviceScaleFactor: 1,
  mobile: false,
});
await call("Network.emulateNetworkConditions", {
  offline: false,
  latency: 0,
  downloadThroughput: -1,
  uploadThroughput: -1,
});
exceptions = 0;
businessRequests = 0;
await call("Page.navigate", { url: "http://127.0.0.1:5180/" });
await wait('document.body?.innerText.includes("Ngoại tuyến")');
await click("Ngoại tuyến");
await wait('document.body.innerText.includes("Giữ bản nhập khi mất mạng")');
await wait(
  `!document.querySelector('[aria-label="Bản nhập ngoại tuyến thử"] button').disabled`,
);
const list = `document.querySelector('[aria-label="Các bản ngoại tuyến đã lưu"]')`;
const before = await evaluate(`${list}.children.length`);
await call("Network.emulateNetworkConditions", {
  offline: true,
  latency: 0,
  downloadThroughput: 0,
  uploadThroughput: 0,
});
await fill("Tỷ số thử A", "2");
await fill("Tỷ số thử B", "1");
await click("Lưu bản ngoại tuyến thử");
await wait(`${list}.children.length===${before + 1}`);
await fill("Tỷ số thử A", "1");
await fill("Tỷ số thử B", "3");
await click("Lưu bản ngoại tuyến thử");
await wait(`${list}.children.length===${before + 2}`);
const offline = await evaluate(`${list}.innerText`);
if (!offline.includes("2–1") || !offline.includes("1–3"))
  throw Error("Earlier revision overwritten");
const savedIds = await evaluate(
  `[...${list}.querySelectorAll('small')].map(x=>x.textContent).sort()`,
);
await click("Xác nhận kết quả");
await click("Ngoại tuyến");
await wait(`${list}.children.length===${before + 2}`);
await call("Network.emulateNetworkConditions", {
  offline: false,
  latency: 0,
  downloadThroughput: -1,
  uploadThroughput: -1,
});
await call("Page.reload", { ignoreCache: true });
await wait('document.body?.innerText.includes("Ngoại tuyến")');
await click("Ngoại tuyến");
await wait(`${list}.children.length===${before + 2}`);
const restoredIds = await evaluate(
  `[...${list}.querySelectorAll('small')].map(x=>x.textContent).sort()`,
);
if (JSON.stringify(savedIds) !== JSON.stringify(restoredIds))
  throw Error("Operation IDs lost on reload");
if (exceptions || businessRequests)
  throw Error("Unexpected browser error or business request");
mkdirSync("docs/group-i/screenshots", { recursive: true });
const height = await evaluate("document.documentElement.scrollHeight");
const { data } = await call("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: true,
  clip: { x: 0, y: 0, width: 1440, height, scale: 1 },
});
const bytes = Buffer.from(data, "base64");
writeFileSync("docs/group-i/screenshots/offline-retained.png", bytes);
const assets = readdirSync("apps/web/dist/assets").map((file) => ({
  file,
  sha256: createHash("sha256")
    .update(readFileSync("apps/web/dist/assets/" + file))
    .digest("hex"),
}));
writeFileSync(
  "docs/group-i/screenshots/manifest.json",
  JSON.stringify(
    {
      purpose:
        "development-preview-only; synthetic data; real Chromium IndexedDB; not real-backend UAT",
      baselineCommit: "7f57850a70fc8de0a9acefa880d3a807b8797292",
      branch: "feat/group-i-offline",
      workingTreeChanges: true,
      viewport: { width: 1440, height: 1100 },
      verified: [
        "loaded page saves two distinct revisions with browser network offline",
        "first revision retained after second save",
        "switch tabs retains data",
        "online reload restores same operation IDs",
        "zero business API requests and uncaught exceptions",
      ],
      assets,
      images: [
        {
          file: "offline-retained.png",
          sha256: createHash("sha256").update(bytes).digest("hex"),
        },
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Chromium: two revisions saved with network offline; switch tabs and online reload retain exact operation IDs; no business API requests.",
);
ws.close();
