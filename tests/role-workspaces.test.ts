// @vitest-environment jsdom
import { createElement } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../apps/web/src/App.js";
import {
  CatalogWorkspace,
  RoleOverview,
  roles,
} from "../apps/web/src/role-workspaces.js";
import {
  saveDrafts,
  readDraftSnapshot,
  type SchoolDraft,
} from "../apps/web/src/registration-draft.js";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
const draft: SchoolDraft = {
  draftId: "school",
  schoolName: "Trường minh họa",
  editionName: "2026",
  athletes: [
    {
      draftId: "athlete",
      fullName: "VĐV minh họa",
      className: "4A",
      requestedEvent: "",
      birthDate: "2016-05-15",
      gender: "male",
    },
  ],
};
describe("Role workspaces and supplied logo", () => {
  it("opens the school registration by default and exposes distinct menus for four preview roles", () => {
    render(createElement(App));
    expect(
      screen.getByRole("heading", {
        name: "HỘI KHỎE PHÙ ĐỔNG XÃ QUẢNG PHÚ NĂM 2026",
      }),
    ).toBeTruthy();
    expect(
      screen
        .getAllByAltText("Logo Hội khỏe Phù Đổng xã Quảng Phú 2026")[0]!
        .getAttribute("src"),
    ).toBe("/branding/hkpd-quang-phu-2026.jpeg");
    for (const [role, label] of Object.entries(roles)) {
      fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
        target: { value: role },
      });
      const nav = within(
        screen.getByRole("navigation", { name: "Các luồng chức năng" }),
      );
      expect(
        nav.getByRole("button", { name: "Danh mục môn thi" }),
      ).toBeTruthy();
      if (role === "referee")
        expect(nav.queryByRole("button", { name: "Đăng ký VĐV" })).toBeNull();
      if (role === "chief")
        expect(nav.getByRole("button", { name: "Phân công" })).toBeTruthy();
      expect(
        screen.getByLabelText("Xem giao diện vai trò").textContent,
      ).toContain(label);
    }
  });
  it("uses actual local draft counts and never treats drafts as approved registration", () => {
    const onPage = vi.fn();
    render(
      createElement(RoleOverview, { role: "admin", drafts: [draft], onPage }),
    );
    const table = within(screen.getByRole("table"));
    expect(table.getByText("Trường minh họa")).toBeTruthy();
    expect(table.getByText("Bản nháp")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tìm phiếu trường"), {
      target: { value: "không tồn tại" },
    });
    expect(screen.getByText("Không tìm thấy phiếu phù hợp")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mở đăng ký VĐV" }));
    expect(onPage).toHaveBeenCalledWith("Đăng ký VĐV");
  });
  it("filters the real catalog and excludes THCS 1500 m from a primary lookup", () => {
    render(createElement(CatalogWorkspace));
    expect(screen.getByRole("status").textContent).toBe("133 nội dung phù hợp");
    fireEvent.change(screen.getByLabelText("Cấp học"), {
      target: { value: "TH" },
    });
    fireEvent.change(screen.getByLabelText("Tìm nội dung"), {
      target: { value: "DK_THCS_NAM_TC_1500M" },
    });
    expect(screen.getByRole("status").textContent).toBe("0 nội dung phù hợp");
    fireEvent.change(screen.getByLabelText("Cấp học"), {
      target: { value: "THCS" },
    });
    expect(screen.getByRole("status").textContent).toBe("1 nội dung phù hợp");
    fireEvent.change(screen.getByLabelText("Giới tính"), {
      target: { value: "Nữ" },
    });
    expect(screen.getByRole("status").textContent).toBe("0 nội dung phù hợp");
  });
  it("keeps unsaved registration when changing role or page is canceled, and preserves saved drafts on role changes", async () => {
    await saveDrafts(localStorage, [draft], readDraftSnapshot(localStorage), {
      request: async (_name, action) => action(),
    });
    const before = readDraftSnapshot(localStorage);
    render(createElement(App));
    fireEvent.click(screen.getByLabelText("Sửa VĐV dòng 1"));
    fireEvent.change(screen.getByLabelText("Họ tên dòng 1"), {
      target: { value: "Chưa lưu" },
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
      target: { value: "admin" },
    });
    expect(
      (screen.getByLabelText("Xem giao diện vai trò") as HTMLSelectElement)
        .value,
    ).toBe("school");
    expect(
      (screen.getByLabelText("Họ tên dòng 1") as HTMLInputElement).value,
    ).toBe("Chưa lưu");
    fireEvent.click(
      within(screen.getByRole("navigation")).getByRole("button", {
        name: "Danh mục môn thi",
      }),
    );
    expect(
      screen.queryByRole("heading", { name: "Danh mục môn thi" }),
    ).toBeNull();
    confirm.mockReturnValue(true);
    fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
      target: { value: "admin" },
    });
    expect(
      screen.getByRole("heading", { name: "Tổng quan quản trị" }),
    ).toBeTruthy();
    expect(readDraftSnapshot(localStorage)).toEqual(before);
    fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
      target: { value: "school" },
    });
    expect(screen.getByText("VĐV minh họa")).toBeTruthy();
  });
});
