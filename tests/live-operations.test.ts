// @vitest-environment jsdom
import { createElement as h } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import {
  LiveRepositoryContext,
  supabaseLiveRepository,
  type LiveRepository,
  type LiveState,
} from "../apps/web/src/live-repository.js";
import { LiveWorkspace } from "../apps/web/src/live-workspace.js";
import type { WorkspaceSession } from "../apps/web/src/staff-scope.js";
const code = "DK_TH_NAM_TC_60M",
  swim = "BOI_TH_NAM_1011_TUDO50";
const fixture = (): LiveState => ({
  editionId: "edition-2026",
  catalogCodes: [code, swim],
  schools: [
    {
      id: "s1",
      code: "TH_A",
      name: "Trường A",
      level: "TH",
      revision: 3,
      status: "approved",
      note: "",
      athletes: [
        {
          draftId: "draft_20000000-0000-4000-8000-000000000001",
          athleteCode: "VDV000001",
          fullName: "Học sinh A",
          className: "5A",
          gender: "male",
          birthDate: "2016-05-15",
          requestedEvent: "",
          catalogSelections: [code],
        },
      ],
    },
  ],
  operations: [],
});
const session = (role: "admin" | "referee" | "school"): WorkspaceSession => ({
  source: "supabase",
  editionId: "edition-2026",
  school:
    role === "school"
      ? { id: "s1", code: "TH_A", name: "Trường A", level: "TH" }
      : undefined,
  actor: {
    id: "user-A",
    approved: true,
    assignments: [
      {
        editionId: "edition-2026",
        role,
        sportId: role === "referee" ? "DK" : undefined,
      },
    ],
  },
});
const repository = (data: LiveState): LiveRepository => ({
  load: vi.fn(async () => structuredClone(data)),
  students: vi.fn(async () => []),
  importStudents: vi.fn(async () => structuredClone(data)),
  importRegistrations: vi.fn(async () => structuredClone(data)),
  createMatches: vi.fn(async () => structuredClone(data)),
  matchCommand: vi.fn(async () => structuredClone(data)),
  status: vi.fn(async () => ({
    database: true,
    drive: false,
    missing: [],
    ready: false,
  })),
  roster: vi.fn(async () => structuredClone(data)),
  operation: vi.fn(async () => structuredClone(data)),
  files: vi.fn(async () => []),
  upload: vi.fn(async () => {}),
  download: vi.fn(async () => new Blob()),
});
const nav = (name: string) =>
  fireEvent.click(
    within(screen.getByRole("navigation")).getByRole("button", { name }),
  );
const show = (role: "admin" | "referee" | "school", repo: LiveRepository) =>
  render(
    h(
      LiveRepositoryContext.Provider,
      { value: repo },
      h(LiveWorkspace, { session: session(role) }),
    ),
  );
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});
it("schedules from live content as admin without any lane controls and submits Vietnam timestamps", async () => {
  const data = fixture(),
    repo = repository(data);
  show("admin", repo);
  await screen.findByText(/1 trường/);
  nav("Lịch thi đấu");
  fireEvent.change(screen.getByLabelText("Nội dung đăng ký"), {
    target: { value: code },
  });
  expect(screen.queryByText(/Phân làn chạy\/bơi —/)).toBeNull();
  expect(screen.getByText("VDV000001")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Địa điểm"), {
    target: { value: "Sân A" },
  });
  fireEvent.change(screen.getByLabelText("Bắt đầu (giờ Việt Nam)"), {
    target: { value: "2026-10-24T08:00" },
  });
  fireEvent.change(screen.getByLabelText("Kết thúc (giờ Việt Nam)"), {
    target: { value: "2026-10-24T09:00" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu lịch thi đấu" }));
  await waitFor(() =>
    expect(repo.operation).toHaveBeenCalledWith(code, "schedule", 0, {
      venue: "Sân A",
      start: "2026-10-24T01:00:00.000Z",
      end: "2026-10-24T02:00:00.000Z",
    }),
  );
});
it("only offers assigned content to referees and saves real entrant IDs for lanes", async () => {
  const repo = repository(fixture());
  show("referee", repo);
  await screen.findByText(/1 trường/);
  nav("Lịch thi đấu");
  expect(
    within(screen.getByLabelText("Nội dung đăng ký")).queryByRole("option", {
      name: new RegExp(swim),
    }),
  ).toBeNull();
  fireEvent.change(screen.getByLabelText("Nội dung đăng ký"), {
    target: { value: code },
  });
  expect(screen.queryByRole("button", { name: "Lưu lịch thi đấu" })).toBeNull();
  fireEvent.change(screen.getByLabelText("Lượt của VDV000001"), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText("Làn của VDV000001"), {
    target: { value: "2" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu phân làn" }));
  await waitFor(() =>
    expect(repo.operation).toHaveBeenCalledWith(code, "lanes", 0, [
      {
        athleteId: fixture().schools[0]!.athletes[0]!.draftId,
        heat: 1,
        lane: 2,
      },
    ]),
  );
});
it("keeps unsent school edits in memory after a failed save, never saves them to localStorage, and retains a blank row", async () => {
  const data = fixture();
  data.schools[0]!.status = "draft";
  const repo = repository(data);
  vi.mocked(repo.roster).mockRejectedValue(Error("Mất kết nối"));
  const store = vi.spyOn(Storage.prototype, "setItem");
  show("school", repo);
  await screen.findByText(/1 trường/);
  nav("Đăng ký VĐV");
  expect(screen.getByLabelText("Họ tên dòng 2")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Sửa VĐV dòng 1" }));
  fireEvent.change(screen.getByLabelText("Họ tên dòng 1"), {
    target: { value: "Tên đã sửa" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu VĐV dòng 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Lưu lên hệ thống" }));
  await screen.findByText("Mất kết nối");
  expect(
    (screen.getByLabelText("Họ tên dòng 1") as HTMLInputElement).value,
  ).toBe("Tên đã sửa");
  expect(store).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Tải lại dữ liệu" }));
  await screen.findByText(/Lưu hoặc bỏ thay đổi/);
});
it("does not fall back to local drafts when the online backend or provider is missing", async () => {
  const repo = repository(fixture());
  vi.mocked(repo.load).mockRejectedValue(Error("no migration"));
  show("school", repo);
  await screen.findByRole("alert");
  expect(screen.queryByLabelText("Họ tên dòng 1")).toBeNull();
  cleanup();
  render(h(LiveWorkspace, { session: session("admin") }));
  expect(screen.getByRole("alert").textContent).toContain(
    "Không mở dữ liệu thử",
  );
});
it("sends only the school revision and explicit RPC action; strips inline photos and handles revision errors safely", async () => {
  const state = fixture();
  const rpc = vi.fn(async () => ({ data: state, error: null as unknown }));
  const port = {
    rpc,
    auth: { getSession: async () => ({ data: { session: null } }) },
  };
  const repo = supabaseLiveRepository(port);
  await repo.roster(
    state.schools[0]!,
    [{ ...state.schools[0]!.athletes[0]!, photoDataUrl: "do-not-send" }],
    "submit",
  );
  const args = rpc.mock.calls[0] as unknown as [
    string,
    Record<string, unknown>,
  ];
  expect(args[0]).toBe("hkpd_save_roster");
  expect(args[1].p_revision).toBe(3);
  expect(JSON.stringify(args)).not.toContain("do-not-send");
  rpc.mockResolvedValue({
    data: null as unknown as LiveState,
    error: { code: "40001", message: "private SQL" },
  });
  await expect(repo.load()).rejects.toThrow("Tải lại");
  await expect(repo.load()).rejects.not.toThrow("private SQL");
});
it("does not silently discard a schedule form when switching content", async () => {
  show("admin", repository(fixture()));
  await screen.findByText(/1 trường/);
  nav("Lịch thi đấu");
  fireEvent.change(screen.getByLabelText("Nội dung đăng ký"), {
    target: { value: code },
  });
  fireEvent.change(screen.getByLabelText("Địa điểm"), {
    target: { value: "Đang nhập" },
  });
  vi.spyOn(window, "confirm").mockReturnValue(false);
  fireEvent.change(screen.getByLabelText("Nội dung đăng ký"), {
    target: { value: swim },
  });
  expect(
    (screen.getByLabelText("Nội dung đăng ký") as HTMLSelectElement).value,
  ).toBe(code);
  expect((screen.getByLabelText("Địa điểm") as HTMLInputElement).value).toBe(
    "Đang nhập",
  );
});
