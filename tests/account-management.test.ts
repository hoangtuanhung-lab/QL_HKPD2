// @vitest-environment jsdom
import { createElement } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  AccountRepositoryContext,
  supabaseAccountRepository,
  validateAccounts,
  type ManagedAccount,
} from "../apps/web/src/account-management.js";
import { AccountWorkspace } from "../apps/web/src/account-workspace.js";
import {
  loadWorkspaceAccess,
  accountStorage,
} from "../apps/web/src/workspace-access.js";
import {
  assignedSportCodes,
  sessionRoles,
} from "../apps/web/src/staff-scope.js";
import { App } from "../apps/web/src/App.js";
import {
  saveDrafts,
  readDraftSnapshot,
  toSheet,
} from "../apps/web/src/registration-draft.js";
const school = {
  id: "school-A",
  code: "TH_A",
  name: "Trường A",
  level: "TH" as const,
};
const owner: ManagedAccount = {
  userId: "owner",
  email: "owner@example.invalid",
  role: "admin",
  approved: true,
  schoolId: null,
  sportCodes: [],
  revision: 0,
  updatedAt: null,
};
const pending: ManagedAccount = {
  userId: "teacher",
  email: "teacher@example.invalid",
  role: "",
  approved: false,
  schoolId: null,
  sportCodes: [],
  revision: 0,
  updatedAt: null,
};
const grant = (data: unknown) => ({
  rpc: vi.fn(async () => ({ data, error: null })),
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
it("rejects malformed account scopes and duplicate records before displaying permissions", () => {
  expect(validateAccounts([owner, pending])).toHaveLength(2);
  for (const bad of [
    null,
    {},
    [owner, owner],
    [{ ...pending, role: "root" }],
    [{ ...pending, approved: true }],
    [{ ...pending, role: "school" }],
    [{ ...pending, role: "referee", sportCodes: ["UNKNOWN"] }],
    [{ ...owner, schoolId: "school-A" }],
  ])
    expect(() => validateAccounts(bad)).toThrow();
});
it("writes explicit user ID, revision and scope through authenticated RPC and sanitizes failures", async () => {
  const rpc = vi.fn(async () => ({
    data: [owner, pending] as unknown,
    error: null as unknown,
  }));
  const r = supabaseAccountRepository({ rpc });
  await r.save({
    ...pending,
    role: "school",
    schoolId: school.id,
    approved: true,
  });
  expect(rpc).toHaveBeenCalledWith("hkpd_update_account", {
    p_user_id: "teacher",
    p_revision: 0,
    p_role: "school",
    p_approved: true,
    p_school_id: "school-A",
    p_sport_codes: [],
  });
  rpc.mockResolvedValue({
    data: null,
    error: { code: "40001", message: "private diagnostic" },
  });
  await expect(r.load()).rejects.toThrow(/thay đổi/);
  rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
  await expect(r.load()).rejects.toThrow(/không còn quyền/);
});
it("times out an account request instead of leaving buttons pending indefinitely", async () => {
  vi.useFakeTimers();
  try {
    const request = supabaseAccountRepository({
      rpc: () => new Promise(() => {}),
    }).load();
    const assertion = expect(request).rejects.toThrow(
      /Không nhận được kết quả/,
    );
    await vi.advanceTimersByTimeAsync(20000);
    await assertion;
  } finally {
    vi.useRealTimers();
  }
});
it("binds approved school sessions to their server school and staff sessions to assigned sports", async () => {
  const common = {
    userId: "teacher",
    editionId: "edition-2026",
    approved: true,
    catalogCodes: ["BD_TH", "BOI_TH_NAM_0709_TUDO50"],
  };
  const s = await loadWorkspaceAccess(
    grant({ ...common, role: "school", school, sportCodes: [] }),
    "teacher",
  );
  expect(s?.actor.schoolId).toBe(school.id);
  expect(s?.actor.assignments[0]?.schoolId).toBe(school.id);
  expect(sessionRoles(s!)).toEqual(["school"]);
  const r = await loadWorkspaceAccess(
    grant({ ...common, role: "referee", school: null, sportCodes: ["BD"] }),
    "teacher",
  );
  expect(assignedSportCodes(r!, "referee")).toEqual(["BD"]);
  expect(sessionRoles(r!)).toEqual(["referee"]);
  const l = await loadWorkspaceAccess(
    grant({ ...common, role: "leader", school: null, sportCodes: ["BOI"] }),
    "teacher",
  );
  expect(assignedSportCodes(l!, "chief")).toEqual(["BOI"]);
  for (const bad of [
    { ...common, role: "school", school: null, sportCodes: [] },
    { ...common, role: "referee", school: null, sportCodes: [] },
    { ...common, role: "referee", school: null, sportCodes: ["ROOT"] },
    {
      ...common,
      role: "referee",
      school: null,
      sportCodes: ["BD"],
      userId: "other",
    },
    {
      ...common,
      role: "school",
      school,
      sportCodes: [],
      catalogCodes: ["UNKNOWN"],
    },
  ])
    await expect(loadWorkspaceAccess(grant(bad), "teacher")).rejects.toThrow();
});
it("exposes account management only in the admin menu", () => {
  render(createElement(App));
  fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
    target: { value: "admin" },
  });
  fireEvent.click(
    within(screen.getByRole("navigation")).getByRole("button", {
      name: "Quản lý tài khoản",
    }),
  );
  expect(
    screen.getByRole("heading", { name: "Quản lý tài khoản" }),
  ).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
    target: { value: "referee" },
  });
  expect(
    within(screen.getByRole("navigation")).queryByRole("button", {
      name: "Quản lý tài khoản",
    }),
  ).toBeNull();
});
function setup() {
  let rows = structuredClone([owner, pending]);
  const repository = {
    load: vi.fn(async () => rows),
    save: vi.fn(
      async (
        change: Parameters<
          ReturnType<typeof supabaseAccountRepository>["save"]
        >[0],
      ) => {
        rows = rows.map((a) =>
          a.userId === change.userId
            ? { ...a, ...change, revision: a.revision + 1 }
            : a,
        );
        return rows;
      },
    ),
  };
  render(
    createElement(
      AccountRepositoryContext.Provider,
      { value: repository },
      createElement(AccountWorkspace, {
        currentUserId: "owner",
        schools: [school],
        online: true,
        onDirty: vi.fn(),
      }),
    ),
  );
  return repository;
}
it("approves a school with a binding, filters email, and protects the active administrator", async () => {
  const repository = setup();
  await screen.findByText("teacher@example.invalid");
  expect(
    (
      screen.getByRole("button", {
        name: "Phân quyền owner@example.invalid",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText("Tìm email tài khoản"), {
    target: { value: "teacher@" },
  });
  expect(screen.queryByText("owner@example.invalid")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Phân quyền teacher@example.invalid" }),
  );
  fireEvent.change(screen.getByLabelText("Vai trò tài khoản"), {
    target: { value: "school" },
  });
  expect(
    (
      screen.getByRole("button", {
        name: "Lưu quyền tài khoản",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText("Trường được quản lý"), {
    target: { value: school.id },
  });
  fireEvent.click(screen.getByLabelText("Cho phép truy cập giải 2026"));
  fireEvent.click(screen.getByRole("button", { name: "Lưu quyền tài khoản" }));
  await screen.findByText(/Đã lưu quyền tài khoản/);
  expect(repository.save).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: "teacher",
      role: "school",
      schoolId: "school-A",
      approved: true,
    }),
  );
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(
    screen.getByRole("button", {
      name: "Thu hồi quyền teacher@example.invalid",
    }),
  );
  await waitFor(() =>
    expect(repository.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ userId: "teacher", approved: false }),
    ),
  );
});
it("requires sport assignment and preserves pending edits when a save conflicts", async () => {
  const repository = setup();
  await screen.findByText("teacher@example.invalid");
  fireEvent.click(
    screen.getByRole("button", { name: "Phân quyền teacher@example.invalid" }),
  );
  fireEvent.change(screen.getByLabelText("Vai trò tài khoản"), {
    target: { value: "leader" },
  });
  expect(
    (
      screen.getByRole("button", {
        name: "Lưu quyền tài khoản",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByLabelText("Phân công môn Bơi"));
  fireEvent.click(screen.getByLabelText("Cho phép truy cập giải 2026"));
  repository.save.mockRejectedValueOnce(
    Error(
      "Tài khoản đã được thay đổi ở nơi khác. Tải lại danh sách trước khi lưu.",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Lưu quyền tài khoản" }));
  await screen.findByRole("alert");
  expect(
    (screen.getByLabelText("Phân công môn Bơi") as HTMLInputElement).checked,
  ).toBe(true);
  expect(screen.queryByText(/Đã lưu quyền tài khoản/)).toBeNull();
});
it("limits a live school's local draft view and import to its assigned school", async () => {
  const storage = accountStorage(localStorage, "teacher");
  const snapshots = [
    {
      draftId: "managed-school:school-A",
      schoolName: "Trường A",
      editionName: "2026",
      athletes: [],
    },
    {
      draftId: "managed-school:school-B",
      schoolName: "Trường B",
      editionName: "2026",
      athletes: [],
    },
  ];
  await saveDrafts(storage, snapshots, readDraftSnapshot(storage), {
    request: async (_name, action) => action(),
  });
  const session = await loadWorkspaceAccess(
    grant({
      userId: "teacher",
      editionId: "edition-2026",
      approved: true,
      role: "school",
      school,
      sportCodes: [],
      catalogCodes: ["BD_TH"],
    }),
    "teacher",
  );
  render(createElement(App, { session: session! }));
  fireEvent.click(
    within(screen.getByRole("navigation")).getByRole("button", {
      name: "Đăng ký VĐV",
    }),
  );
  expect(screen.getByLabelText("Trường đăng ký:").textContent).toContain(
    "Trường A",
  );
  expect(screen.getByLabelText("Trường đăng ký:").textContent).not.toContain(
    "Trường B",
  );
  expect(
    (screen.getByLabelText("Tên trường") as HTMLInputElement).readOnly,
  ).toBe(true);
  fireEvent.change(
    document.querySelector('input[accept="application/json,.json"]')!,
    {
      target: {
        files: [
          {
            text: async () => JSON.stringify(toSheet(snapshots[1]!)),
          },
        ],
      },
    },
  );
  await screen.findByText("Chỉ nhập phiếu của trường được phân công.");
  expect(readDraftSnapshot(storage).drafts).toHaveLength(2);
});
