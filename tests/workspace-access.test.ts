// @vitest-environment jsdom
import { createElement } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  loadWorkspaceAccess,
  accountStorage,
} from "../apps/web/src/workspace-access.js";
import { App } from "../apps/web/src/App.js";
import {
  initialTournaments,
  carryTournament,
} from "../apps/web/src/tournament-state.js";
import {
  saveDrafts,
  readDraftSnapshot,
} from "../apps/web/src/registration-draft.js";
import { AuthGate } from "../apps/web/src/auth-entry.js";
import type {
  GoogleAuthController,
  AuthSnapshot,
} from "../apps/web/src/google-auth.js";
const grant = {
  userId: "user-A",
  editionId: "edition-2026",
  approved: true,
  role: "admin",
};
const rpc = (data: unknown, error: unknown = null) => ({
  rpc: vi.fn(async () => ({ data, error })),
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
it("accepts only an approved, matching server grant and never cached metadata", async () => {
  expect(
    (await loadWorkspaceAccess(rpc(grant), "user-A"))?.actor.assignments[0]
      ?.role,
  ).toBe("admin");
  expect(await loadWorkspaceAccess(rpc(null), "user-A")).toBeNull();
  for (const bad of [
    [],
    "admin",
    {},
    { ...grant, userId: "user-B" },
    { ...grant, approved: false },
    { ...grant, editionId: "old" },
    { ...grant, role: "school" },
  ]) {
    await expect(loadWorkspaceAccess(rpc(bad), "user-A")).rejects.toThrow();
  }
  await expect(
    loadWorkspaceAccess(rpc(grant, new Error("missing RPC")), "user-A"),
  ).rejects.toThrow();
});
it("isolates local drafts between accounts and preserves legacy preview data", () => {
  const preview = accountStorage(localStorage);
  const a = accountStorage(localStorage, "A");
  const b = accountStorage(localStorage, "B");
  preview.setItem("draft", "legacy");
  expect(a.getItem("draft")).toBeNull();
  a.setItem("draft", "private");
  expect(a.getItem("draft")).toBe("private");
  expect(b.getItem("draft")).toBeNull();
  expect(preview.getItem("draft")).toBe("legacy");
});
function controller() {
  let state: AuthSnapshot = {
    phase: "authenticated",
    user: { id: "user-A" },
    message: "",
  };
  const listeners = new Set<() => void>();
  const instance = {
    start: vi.fn(async () => {}),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    signOut: vi.fn(async () => {
      state = { phase: "anonymous", user: null, message: "" };
      listeners.forEach((fn) => fn());
    }),
  };
  return instance as unknown as GoogleAuthController;
}
it("unlocks admin only after server lookup, retries, and removes access on revocation", async () => {
  let approved = false;
  const loadAccess = vi.fn(() =>
    loadWorkspaceAccess(rpc(approved ? grant : null), "user-A"),
  );
  render(createElement(AuthGate, { controller: controller(), loadAccess }));
  await screen.findByText("Chưa được cấp quyền vào giải");
  expect(screen.queryByText(/Đã xác minh quyền quản trị/)).toBeNull();
  approved = true;
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra quyền" }));
  await screen.findByText(/Đã xác minh quyền quản trị/);
  approved = false;
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra quyền" }));
  await screen.findByText("Chưa được cấp quyền vào giải");
  expect(screen.queryByText(/Đã xác minh quyền quản trị/)).toBeNull();
});
it("fails closed on server errors and ignores late grants after logout", async () => {
  const auth = controller();
  let resolve!: (
    value: Awaited<ReturnType<typeof loadWorkspaceAccess>>,
  ) => void;
  const loadAccess = vi.fn(
    () =>
      new Promise<Awaited<ReturnType<typeof loadWorkspaceAccess>>>((done) => {
        resolve = done;
      }),
  );
  render(createElement(AuthGate, { controller: auth, loadAccess }));
  await waitFor(() => expect(loadAccess).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
  await screen.findByRole("button", { name: /Đăng nhập bằng Google/ });
  await act(async () =>
    resolve(await loadWorkspaceAccess(rpc(grant), "user-A")),
  );
  expect(screen.queryByText(/Đã xác minh quyền quản trị/)).toBeNull();
});
it("shows a recoverable error instead of treating a broken schema as no grant", async () => {
  render(
    createElement(AuthGate, {
      controller: controller(),
      loadAccess: () => loadWorkspaceAccess(rpc(null, true), "user-A"),
    }),
  );
  await screen.findByRole("alert");
  expect(screen.queryByText("Chưa được cấp quyền vào giải")).toBeNull();
  expect(screen.queryByText(/Đã xác minh quyền quản trị/)).toBeNull();
});

it("pins the live edition despite a locally selected tournament and blocks local live rollover", async () => {
  const storage = accountStorage(localStorage, "user-A");
  const old = initialTournaments([]);
  const next = carryTournament(old, [], old.currentId, "2027", 2027, {
    catalog: true,
    staff: false,
    registrations: false,
  });
  next.state.currentId = next.target.id;
  await saveDrafts(
    storage,
    [],
    readDraftSnapshot(storage),
    { request: async (_name, action) => action() },
    next.state,
  );
  const session = await loadWorkspaceAccess(rpc(grant), "user-A");
  render(createElement(App, { session: session! }));
  fireEvent.click(
    within(screen.getByRole("navigation")).getByRole("button", {
      name: "Quản lý giải",
    }),
  );
  expect(screen.getByText(/Giải hiện tại: 2026/)).toBeTruthy();
  expect(screen.queryByLabelText("Tên giải mới")).toBeNull();
  expect(readDraftSnapshot(storage).tournaments?.currentId).toBe(
    next.target.id,
  );
});

it("acknowledges repeated checks, disables duplicate requests and reports an unchanged denial", async () => {
  let finish!: (value: null) => void;
  const loadAccess = vi
    .fn<() => Promise<null>>()
    .mockResolvedValueOnce(null)
    .mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
  render(createElement(AuthGate, { controller: controller(), loadAccess }));
  await screen.findByText(
    /Đã kiểm tra: tài khoản đang đăng nhập chưa có quyền/,
  );
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra quyền" }));
  expect(
    (
      screen.getByRole("button", {
        name: "Đang kiểm tra…",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(screen.getByRole("status").textContent).toBe(
    "Đang kiểm tra quyền vào giải…",
  );
  fireEvent.focus(window);
  expect(loadAccess).toHaveBeenCalledTimes(2);
  await act(async () => finish(null));
  expect(screen.getByRole("status").textContent).toContain("Đã kiểm tra:");
  expect(
    (
      screen.getByRole("button", {
        name: "Kiểm tra quyền",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
});

it("times out a hanging check, ignores its late grant, and allows retry", async () => {
  vi.useFakeTimers();
  try {
    let finish!: (
      value: Awaited<ReturnType<typeof loadWorkspaceAccess>>,
    ) => void;
    const loadAccess = vi
      .fn<() => Promise<Awaited<ReturnType<typeof loadWorkspaceAccess>>>>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue(null);
    render(createElement(AuthGate, { controller: controller(), loadAccess }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });
    expect(screen.getByRole("alert").textContent).toContain("quá 20 giây");
    await act(async () =>
      finish(await loadWorkspaceAccess(rpc(grant), "user-A")),
    );
    expect(screen.queryByText(/Đã xác minh quyền quản trị/)).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Kiểm tra quyền" }));
    });
    expect(screen.getByRole("status").textContent).toContain(
      "chưa có quyền quản trị",
    );
    expect(screen.queryByRole("alert")).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});
