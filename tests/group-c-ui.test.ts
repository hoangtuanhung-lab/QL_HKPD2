// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  CompetitionWorkspace,
  RoundRobinView,
} from "../apps/web/src/competition-ui.js";
import { ScheduleWorkspace } from "../apps/web/src/schedule-ui.js";
import { App } from "../apps/web/src/App.js";
import { roundRobin } from "../packages/competition/src/index.js";
import { roster } from "./group-c-fixtures.js";
afterEach(cleanup);
function setup(count: number, mode: "knockout" | "round_robin" = "knockout") {
  render(createElement(CompetitionWorkspace, { mode }));
  fireEvent.change(screen.getByLabelText("Mã nội dung thử"), {
    target: { value: "event-a" },
  });
  fireEvent.change(screen.getByLabelText(/Danh sách thử/), {
    target: {
      value: roster(count)
        .map((e) => `${e.id};${e.label};${e.schoolId}`)
        .join("\n"),
    },
  });
}
it("C06 draws all rounds, pending winners and score placeholders; locks before any match starts", () => {
  setup(6);
  fireEvent.click(screen.getByText("Tạo vòng đấu thử"));
  const region = screen.getByRole("region", { name: "Sơ đồ đầy đủ các vòng" });
  expect(within(region).getByText("Vòng 3 · Chung kết")).toBeTruthy();
  expect(
    within(region).getAllByText("Thắng trận 1 · vòng 1").length,
  ).toBeGreaterThan(0);
  expect(region.querySelectorAll("path")).toHaveLength(6);
  expect(region.querySelectorAll(".bracket-score")).toHaveLength(14);
  fireEvent.click(screen.getByText("Chốt bản thử"));
  expect(
    (
      screen.getByRole("button", {
        name: "Tạo vòng đấu thử",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  const before = region.querySelectorAll("path").length;
  fireEvent.change(screen.getByLabelText("VĐV bỏ cuộc trên bản thử"), {
    target: { value: "e1" },
  });
  expect(region.querySelectorAll("path")).toHaveLength(before);
  expect(within(region).getAllByText(/bỏ cuộc/).length).toBeGreaterThan(0);
});
it("C02 validates selected seed count and manual positions", () => {
  setup(6);
  fireEvent.click(screen.getByLabelText("Có hạt giống"));
  fireEvent.change(screen.getByLabelText(/Hạt giống theo thứ tự/), {
    target: { value: "e1" },
  });
  fireEvent.click(screen.getByText("Tạo vòng đấu thử"));
  expect(screen.getByRole("alert").textContent).toContain("khớp số lượng");
  fireEvent.change(screen.getByLabelText(/Hạt giống theo thứ tự/), {
    target: { value: "e1,e2" },
  });
  fireEvent.click(screen.getByLabelText("Bốc thăm thủ công"));
  fireEvent.change(screen.getByLabelText(/Các vị trí theo thứ tự/), {
    target: { value: "e1,,e3,e4,e5,e6,,e2" },
  });
  fireEvent.click(screen.getByText("Tạo vòng đấu thử"));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("region", { name: "Vị trí bốc thăm" })).toBeTruthy();
});
it("C07 shows five rounds, two matches per round and a separate standings panel without invented points", () => {
  setup(5, "round_robin");
  fireEvent.click(screen.getByText("Tạo vòng đấu thử"));
  const navigation = screen.getByRole("navigation", {
    name: "Chọn vòng thi đấu",
  });
  expect(within(navigation).getAllByRole("button")).toHaveLength(5);
  expect(screen.getByText("Vòng 1 · 2 trận")).toBeTruthy();
  fireEvent.click(within(navigation).getByText("Vòng 3"));
  expect(screen.getByText("Vòng 3 · 2 trận")).toBeTruthy();
  expect(screen.getByText(/Nghỉ vòng:/)).toBeTruthy();
  expect(
    screen.getByText(
      "Chưa có kết quả chính thức để xếp hạng. Nghỉ vòng không tạo điểm.",
    ),
  ).toBeTruthy();
});
it("C07 consumes supplied official standings without calculating unapproved tie-break rules", () => {
  render(
    createElement(RoundRobinView, {
      draw: roundRobin("e", roster(3)),
      standings: [{ entrantId: "e1", rank: 1, played: 2, points: "4" }],
    }),
  );
  const grid = screen.getByRole("region", {
    name: "Xếp hạng theo kết quả chính thức",
  });
  expect(within(grid).getByText("4")).toBeTruthy();
});
it("keeps six-person individual combat out of the round-robin preview", () => {
  setup(6, "round_robin");
  fireEvent.click(screen.getByText("Tạo vòng đấu thử"));
  expect(screen.getByRole("alert").textContent).toContain("loại trực tiếp");
});
it("C08 warns across sports, blocks confirmation and proposes a conflict-free replacement", () => {
  render(createElement(ScheduleWorkspace));
  const fill = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fill("Mã trận / lượt", "m1");
  fill("Mã nội dung", "event-a");
  fill("Mã môn", "sport-a");
  fill("Sân / địa điểm", "venue-a");
  fill("Bắt đầu (giờ Việt Nam, UTC+7)", "2026-10-23T08:00");
  fill("Thời lượng (phút)", "20");
  fill("Nghỉ tối thiểu (phút, theo cấu hình)", "10");
  fill("Mã người thi đấu (cách nhau bằng dấu phẩy)", "p1,p2");
  fill("Mã người làm trọng tài (cách nhau bằng dấu phẩy)", "r1");
  fireEvent.click(screen.getByText("Thêm / sửa lịch thử"));
  fill("Mã trận / lượt", "m2");
  fill("Mã nội dung", "event-b");
  fill("Mã môn", "sport-b");
  fireEvent.click(screen.getByText("Thêm / sửa lịch thử"));
  expect(screen.getByRole("alert").textContent).toContain("Trùng sân");
  expect(
    (screen.getByRole("button", { name: "Chốt lịch thử" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fill("Bắt đầu khoảng lịch (giờ Việt Nam, UTC+7)", "2026-10-23T08:00");
  fill("Kết thúc khoảng lịch (giờ Việt Nam, UTC+7)", "2026-10-23T12:00");
  fireEvent.click(screen.getByText("Đề xuất lịch thử"));
  expect(screen.queryByRole("alert")).toBeNull();
  fireEvent.click(screen.getByText("Chốt lịch thử"));
  expect(screen.getByRole("status").textContent).toContain("schedule.changed");
});
it("C08 distributes entrants into lanes and rejects a duplicate lane edit", () => {
  render(createElement(ScheduleWorkspace));
  fireEvent.change(screen.getByLabelText(/Mã VĐV phân làn/), {
    target: { value: "a,b,c" },
  });
  fireEvent.change(screen.getByLabelText("Số làn khả dụng"), {
    target: { value: "2" },
  });
  fireEvent.click(screen.getByText("Đề xuất lượt / làn thử"));
  expect((screen.getByLabelText("Lượt của c") as HTMLInputElement).value).toBe(
    "2",
  );
  fireEvent.change(screen.getByLabelText("Làn của b"), {
    target: { value: "1" },
  });
  expect(screen.getByRole("alert").textContent).toContain("Trùng làn");
  expect((screen.getByLabelText("Làn của b") as HTMLInputElement).value).toBe(
    "2",
  );
});
it("keeps competition draw pages out of admin navigation while retaining scheduling", () => {
  localStorage.clear();
  render(createElement(App));
  fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
    target: { value: "admin" },
  });
  const navigation = within(
    screen.getByRole("navigation", { name: "Các luồng chức năng" }),
  );
  for (const name of ["Sơ đồ thi đấu", "Loại trực tiếp", "Vòng tròn"]) {
    expect(navigation.queryByRole("button", { name })).toBeNull();
  }
  fireEvent.click(navigation.getByRole("button", { name: "Lịch và phân làn" }));
  expect(screen.getByText("Lịch và phân lượt/làn")).toBeTruthy();
});
