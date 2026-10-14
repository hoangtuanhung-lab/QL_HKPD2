// @vitest-environment jsdom
import { createElement } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../apps/web/src/App.js";
import {
  assignedSportCodes,
  type WorkspaceSession,
} from "../apps/web/src/staff-scope.js";
import { athleteCatalog } from "../apps/web/src/athlete-catalog.generated.js";
afterEach(() => {
  cleanup();
  localStorage.clear();
});
const session: WorkspaceSession = {
  editionId: "edition-2026",
  actor: {
    id: "staff-A",
    approved: true,
    assignments: [
      { editionId: "edition-2026", role: "leader", sportId: "BOI" },
      { editionId: "edition-2026", role: "referee", sportId: "BD" },
      { editionId: "other-edition", role: "leader", sportId: "DK" },
      { editionId: "edition-2026", role: "leader", sportId: "UNKNOWN" },
    ],
  },
};
const nav = (name: string) =>
  fireEvent.click(
    within(screen.getByRole("navigation")).getByRole("button", { name }),
  );
describe("Assigned sport visibility", () => {
  it("requires approval and matches current edition, person and role; never treats an admin grant as a staff sport grant", () => {
    expect(assignedSportCodes(session, "chief")).toEqual(["BOI"]);
    expect(assignedSportCodes(session, "referee")).toEqual(["BD"]);
    expect(
      assignedSportCodes(
        {
          ...session,
          actor: {
            ...session.actor,
            assignments: [
              {
                editionId: session.editionId,
                role: "leader",
                sportId: "8aa673bc-ef04-405a-9ddd-e2c05ae5e774",
              },
            ],
          },
          sportCodeById: { "8aa673bc-ef04-405a-9ddd-e2c05ae5e774": "BOI" },
        },
        "chief",
      ),
    ).toEqual(["BOI"]);
    expect(assignedSportCodes(undefined, "chief")).toEqual([]);
    expect(
      assignedSportCodes(
        { ...session, actor: { ...session.actor, approved: false } },
        "chief",
      ),
    ).toEqual([]);
    expect(
      assignedSportCodes(
        {
          ...session,
          actor: {
            ...session.actor,
            assignments: [
              { editionId: session.editionId, role: "admin", sportId: "DK" },
            ],
          },
        },
        "chief",
      ),
    ).toEqual([]);
    expect(
      assignedSportCodes(
        {
          ...session,
          actor: { ...session.actor, id: "staff-B", assignments: [] },
        },
        "chief",
      ),
    ).toEqual([]);
  });
  it("shows only swimming to the leader and only football to the referee across overview and catalog", () => {
    render(createElement(App, { session }));
    expect(screen.getByRole("button", { name: /^BOI/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^DK/ })).toBeNull();
    nav("Danh mục môn thi");
    expect(document.querySelectorAll("tbody tr")).toHaveLength(
      athleteCatalog.filter((e) => e.sportCode === "BOI").length,
    );
    expect(screen.queryByText("DK_THCS_NAM_TC_1500M")).toBeNull();
    fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
      target: { value: "referee" },
    });
    nav("Danh mục môn thi");
    expect(document.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(screen.getByText("BD_TH")).toBeTruthy();
    expect(screen.getByText("BD_THCS")).toBeTruthy();
    expect(screen.queryByText("BOI_THCS_NAM_1415_ECH50")).toBeNull();
    expect(
      within(screen.getByLabelText("Xem giao diện vai trò")).queryByRole(
        "option",
        { name: "Quản trị" },
      ),
    ).toBeNull();
  });
  it("does not open unscoped sample tools, personal queues or general drafts for staff", () => {
    render(createElement(App, { session }));
    for (const name of [
      "Phân công",
      "Kiểm tra đăng ký",
      "Sơ đồ thi đấu",
      "Vòng tròn",
      "Lịch và phân làn",
      "Xác nhận kết quả",
      "Ngoại tuyến",
    ]) {
      nav(name);
      expect(document.querySelector(".staff-observation")).toBeTruthy();
      expect(screen.getByText("Bơi")).toBeTruthy();
      expect(screen.queryByText("Bóng đá")).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Lưu bản nhập thử" }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Lưu bản ngoại tuyến thử" }),
      ).toBeNull();
    }
  });
  it("fails closed without assignment and immediately removes visible data on revocation or session replacement", () => {
    const view = render(createElement(App, { session }));
    nav("Danh mục môn thi");
    expect(document.querySelectorAll("tbody tr").length).toBeGreaterThan(0);
    view.rerender(
      createElement(App, {
        session: { ...session, actor: { ...session.actor, approved: false } },
      }),
    );
    expect(document.querySelectorAll("tbody tr")).toHaveLength(0);
    view.rerender(
      createElement(App, {
        session: {
          ...session,
          actor: {
            id: "staff-B",
            approved: true,
            assignments: [
              { editionId: session.editionId, role: "referee", sportId: "BD" },
            ],
          },
        },
      }),
    );
    expect(screen.getByText("BD_THCS")).toBeTruthy();
    expect(screen.queryByText("BOI_THCS_NAM_1415_ECH50")).toBeNull();
    view.rerender(createElement(App));
    expect(document.querySelectorAll("tbody tr")).toHaveLength(0);
    expect(
      within(screen.getByLabelText("Xem giao diện vai trò")).queryByRole(
        "option",
        { name: "Quản trị" },
      ),
    ).toBeNull();
    view.unmount();
    render(createElement(App));
    fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
      target: { value: "chief" },
    });
    nav("Danh mục môn thi");
    expect(screen.getByRole("status").textContent).toBe("0 nội dung phù hợp");
  });
});
