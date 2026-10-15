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
import { readFileSync } from "node:fs";
import { readDraftSnapshot } from "../apps/web/src/registration-draft.js";
import { App } from "../apps/web/src/App.js";
import { athleteCatalog } from "../apps/web/src/athlete-catalog.generated.js";
import { eligibleCatalog } from "../apps/web/src/athlete-catalog.js";
import {
  AdminRepositoryContext,
  localAdminRepository,
  supabaseAdminRepository,
  validateAdminSettings,
} from "../apps/web/src/admin-settings.js";
import { AthleteRegistrationPage } from "../apps/web/src/athlete-registration-page.js";
const codes = athleteCatalog.map((e) => e.code);
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const repo = () => localAdminRepository(localStorage, "edition-2026", codes);
const school = { code: "th_a", name: "Trường A", level: "TH" };
const nav = (name: string) =>
  fireEvent.click(
    within(screen.getByRole("navigation")).getByRole("button", { name }),
  );
it("creates, edits and deletes stable school IDs and persists catalog selection without changing the source", async () => {
  const r = repo();
  let s = await r.update(0, "school.save", school);
  const id = s.schools[0]!.id;
  expect(s.schools[0]!.code).toBe("TH_A");
  s = await r.update(1, "school.save", {
    ...school,
    id,
    name: "Trường mới",
    level: "TH_THCS",
  });
  expect(s.schools).toHaveLength(1);
  expect(s.schools[0]!.name).toBe("Trường mới");
  await r.update(2, "catalog", { codes: ["BD_TH"] });
  expect((await repo().load()).catalogCodes).toEqual(["BD_TH"]);
  expect(athleteCatalog).toHaveLength(133);
  expect(
    eligibleCatalog({
      level: "TH",
      gender: "male",
      birthYear: 2017,
      year: 2026,
    }).some((e) => e.code === "DK_THCS_NAM_TC_1500M"),
  ).toBe(false);
  s = await r.update(3, "school.delete", { id });
  expect(s.schools).toEqual([]);
});
it("rejects duplicate schools, malformed configuration, stale revisions and unknown catalog codes without overwriting data", async () => {
  const r = repo();
  await r.update(0, "school.save", school);
  const before = JSON.stringify(await r.load());
  await expect(r.update(0, "catalog", { codes: [] })).rejects.toThrow(
    /thay đổi/,
  );
  await expect(r.update(1, "school.save", school)).rejects.toThrow();
  await expect(r.update(1, "catalog", { codes: ["FAKE"] })).rejects.toThrow();
  await expect(
    r.update(1, "school.save", { ...school, code: "OTHER", level: "BAD" }),
  ).rejects.toThrow();
  expect(JSON.stringify(await r.load())).toBe(before);
  expect(() =>
    validateAdminSettings({ revision: -1, schools: [], catalogCodes: [] }),
  ).toThrow();
  localStorage.setItem("hkpd.admin-settings.edition-2026", "corrupt");
  await expect(r.load()).rejects.toThrow();
  expect(localStorage.getItem("hkpd.admin-settings.edition-2026")).toBe(
    "corrupt",
  );
});
it("uses the authenticated RPC and passes revision/payload without leaking raw server errors", async () => {
  const rpc = vi.fn(async () => ({
    data: { revision: 1, catalogCodes: [], schools: [] },
    error: null as unknown,
  }));
  const r = supabaseAdminRepository({ rpc });
  await r.update(0, "catalog", { codes: [] });
  expect(rpc).toHaveBeenCalledWith("hkpd_update_admin_settings", {
    p_revision: 0,
    p_action: "catalog",
    p_payload: { codes: [] },
  });
  rpc.mockResolvedValue({
    data: null as never,
    error: { code: "40001", message: "private backend diagnostic" },
  });
  await expect(r.load()).rejects.toThrow(/Tải lại/);
  rpc.mockResolvedValue({ data: null as never, error: { code: "42501" } });
  await expect(r.load()).rejects.toThrow(/không còn quyền/);
});
it("matches the SQL catalog seed with all official frontend codes", () => {
  const sql = readFileSync(
    "infra/supabase/003_admin_schools_catalog.sql",
    "utf8",
  );
  const seeded = [...sql.matchAll(/^\('([^']+)'\)/gm)].map((m) => m[1]);
  expect(seeded.sort()).toEqual([...codes].sort());
});
it("provides school management and removes registration links from admin navigation and empty overview", async () => {
  render(createElement(App));
  fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
    target: { value: "admin" },
  });
  expect(
    within(screen.getByRole("navigation")).queryByRole("button", {
      name: "Đăng ký VĐV",
    }),
  ).toBeNull();
  expect(screen.queryByRole("button", { name: "Mở đăng ký VĐV" })).toBeNull();
  nav("Quản lý trường");
  await screen.findByLabelText("Mã trường");
  fireEvent.change(screen.getByLabelText("Mã trường"), {
    target: { value: "TH_A" },
  });
  fireEvent.change(screen.getByLabelText("Tên trường"), {
    target: { value: "Trường A" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Thêm trường" }));
  await screen.findByRole("button", { name: "Sửa trường TH_A" });
  fireEvent.click(screen.getByRole("button", { name: "Sửa trường TH_A" }));
  fireEvent.change(screen.getByLabelText("Tên trường"), {
    target: { value: "Trường đổi tên" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu trường" }));
  await screen.findByText("Trường đổi tên");
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Xóa trường TH_A" }));
  await waitFor(() => expect(screen.queryByText("Trường đổi tên")).toBeNull());
});
it("saves whole-sport and individual-content selection and keeps it after reload", async () => {
  const view = render(createElement(App));
  fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
    target: { value: "admin" },
  });
  nav("Danh mục môn thi");
  await screen.findByLabelText("Môn thi đấu");
  fireEvent.change(screen.getByLabelText("Môn thi đấu"), {
    target: { value: "BD" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Bỏ môn khỏi giải" }));
  fireEvent.click(screen.getByRole("button", { name: "Lưu danh mục thi đấu" }));
  await screen.findByText(/Đã lưu danh mục preview/);
  expect(
    (screen.getByLabelText("Mở nội dung BD_TH") as HTMLInputElement).checked,
  ).toBe(false);
  fireEvent.click(screen.getByLabelText("Mở nội dung BD_TH"));
  fireEvent.click(screen.getByRole("button", { name: "Lưu danh mục thi đấu" }));
  await waitFor(async () =>
    expect((await repo().load()).catalogCodes).toContain("BD_TH"),
  );
  view.unmount();
  render(createElement(App));
  fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
    target: { value: "admin" },
  });
  nav("Danh mục môn thi");
  await screen.findByLabelText("Mở nội dung BD_THCS");
  expect(
    (screen.getByLabelText("Mở nội dung BD_THCS") as HTMLInputElement).checked,
  ).toBe(false);
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Mở nội dung BD_TH") as HTMLInputElement).checked,
    ).toBe(true),
  );
});
it("live admin failures do not fall back to local settings or overwrite local drafts", async () => {
  const r = {
    load: vi.fn(async () => {
      throw Error("No migration");
    }),
    update: vi.fn(),
  };
  render(
    createElement(
      AdminRepositoryContext.Provider,
      { value: r },
      createElement(App, {
        session: {
          source: "supabase",
          editionId: "edition-2026",
          actor: {
            id: "admin",
            approved: true,
            assignments: [{ role: "admin", editionId: "edition-2026" }],
          },
        },
      }),
    ),
  );
  nav("Quản lý trường");
  await screen.findByRole("alert");
  expect(screen.queryByLabelText("Mã trường")).toBeNull();
  expect(r.update).not.toHaveBeenCalled();
});
it("always renders an initial row before choosing a school and keeps a row after deleting the last entry", () => {
  const view = render(
    createElement(AthleteRegistrationPage, {
      schools: [],
      activeId: "",
      onSelect: vi.fn(),
      onSave: vi.fn(),
      onDirty: vi.fn(),
    }),
  );
  expect(
    (screen.getByLabelText("Họ tên dòng 1") as HTMLInputElement).disabled,
  ).toBe(true);
  expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
  expect(
    (screen.getByLabelText("Trường đăng ký:") as HTMLSelectElement).disabled,
  ).toBe(false);
  view.rerender(
    createElement(AthleteRegistrationPage, {
      schools: [
        {
          draftId: "school",
          schoolName: "Trường A",
          editionName: "2026",
          athletes: [],
        },
      ],
      activeId: "school",
      onSelect: vi.fn(),
      onSave: vi.fn(),
      onDirty: vi.fn(),
    }),
  );
  expect(
    (screen.getByLabelText("Họ tên dòng 1") as HTMLInputElement).disabled,
  ).toBe(false);
  fireEvent.click(screen.getByLabelText("Xóa dòng 1"));
  expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
  expect(
    (screen.getByLabelText("Họ tên dòng 1") as HTMLInputElement).value,
  ).toBe("");
});

it("connects managed schools to registration preview and gives consecutive saved athletes distinct rows", async () => {
  await repo().update(0, "school.save", school);
  render(createElement(App));
  await screen.findByRole("option", { name: /Trường A/ });
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Họ tên dòng 1") as HTMLInputElement).disabled,
    ).toBe(false),
  );
  fireEvent.change(screen.getByLabelText("Họ tên dòng 1"), {
    target: { value: "VĐV thứ nhất" },
  });
  fireEvent.click(screen.getByLabelText("Lưu VĐV dòng 1"));
  await screen.findByLabelText("Họ tên dòng 2");
  fireEvent.change(screen.getByLabelText("Họ tên dòng 2"), {
    target: { value: "VĐV thứ hai" },
  });
  fireEvent.click(screen.getByLabelText("Lưu VĐV dòng 2"));
  await screen.findByLabelText("Họ tên dòng 3");
  expect(
    (screen.getByLabelText("Họ tên dòng 1") as HTMLInputElement).value,
  ).toBe("VĐV thứ nhất");
  expect(
    (screen.getByLabelText("Họ tên dòng 2") as HTMLInputElement).value,
  ).toBe("VĐV thứ hai");
  expect(
    (screen.getByLabelText("Họ tên dòng 3") as HTMLInputElement).value,
  ).toBe("");
});

it("warns before discarding catalog edits and clears discarded selections after confirmed navigation", async () => {
  render(createElement(App));
  fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
    target: { value: "admin" },
  });
  nav("Danh mục môn thi");
  const checkbox = (await screen.findByLabelText(
    "Mở nội dung BD_TH",
  )) as HTMLInputElement;
  await waitFor(() => expect(checkbox.checked).toBe(true));
  fireEvent.click(checkbox);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  nav("Quản lý trường");
  expect(
    screen.getByRole("heading", { name: "Danh mục môn thi" }),
  ).toBeTruthy();
  const leaving = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(leaving);
  expect(leaving.defaultPrevented).toBe(true);
  confirm.mockReturnValue(true);
  nav("Quản lý trường");
  await screen.findByLabelText("Mã trường");
  const calls = confirm.mock.calls.length;
  nav("Danh mục môn thi");
  expect(confirm).toHaveBeenCalledTimes(calls);
  expect(
    (screen.getByLabelText("Mở nội dung BD_TH") as HTMLInputElement).checked,
  ).toBe(true);
  expect((await repo().load()).catalogCodes).toContain("BD_TH");
});

it("carries the configured catalog into a new preview tournament instead of restoring all source contents", async () => {
  vi.stubGlobal("navigator", {
    ...navigator,
    locks: {
      request: async <T>(_name: string, action: () => T | Promise<T>) =>
        action(),
    },
  });
  await repo().update(0, "catalog", { codes: ["BD_TH"] });
  render(createElement(App));
  fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
    target: { value: "admin" },
  });
  nav("Quản lý giải");
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "Xem trước kết chuyển",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
  fireEvent.change(screen.getByLabelText("Tên giải mới"), {
    target: { value: "2027" },
  });
  const catalog = screen.getByLabelText("Danh mục thi đấu") as HTMLInputElement;
  if (!catalog.checked) fireEvent.click(catalog);
  fireEvent.click(screen.getByRole("button", { name: "Xem trước kết chuyển" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Xác nhận tạo giải mới" }),
  );
  await waitFor(() =>
    expect(readDraftSnapshot(localStorage).tournaments?.editions).toHaveLength(
      2,
    ),
  );
  expect(
    readDraftSnapshot(localStorage).tournaments?.editions.find(
      (e) => e.year === 2027,
    )?.catalogCodes,
  ).toEqual(["BD_TH"]);
});
