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
import { ResultsWorkspace } from "../apps/web/src/results-ui.js";
import { App } from "../apps/web/src/App.js";
afterEach(cleanup);
function setup() {
  render(createElement(ResultsWorkspace));
  fireEvent.change(
    screen.getByLabelText("Danh sách kết quả thử (Mã;Tên;Mã trường)"),
    {
      target: {
        value: "001;VĐV tổng hợp A;school-a\n002;VĐV tổng hợp B;school-b",
      },
    },
  );
  fireEvent.click(screen.getByText("Tạo lượt thử mới"));
}
function scores(a: string, b: string) {
  fireEvent.change(
    screen.getByLabelText("Thành tích thử 001 · VĐV tổng hợp A"),
    { target: { value: a } },
  );
  fireEvent.change(
    screen.getByLabelText("Thành tích thử 002 · VĐV tổng hợp B"),
    { target: { value: b } },
  );
}
it("K08 opens an empty trial instead of static confirmation outline", () => {
  render(createElement(App));
  fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
    target: { value: "admin" },
  });
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: "Các luồng chức năng" }),
    ).getByRole("button", { name: "Kết quả" }),
  );
  expect(screen.getByText("Nhập và xác nhận kết quả — bản thử")).toBeTruthy();
  expect(screen.getByText("Chưa có bản nào được xác nhận thử.")).toBeTruthy();
});
it("K08 pending score never changes confirmed table, correction switches only after approval and preserves history", () => {
  setup();
  scores("2", "1");
  fireEvent.click(screen.getByText("Lưu bản nhập thử"));
  const official = screen.getByRole("region", {
    name: "Kết quả đã xác nhận thử",
  });
  expect(
    within(official).getByText("Chưa có bản nào được xác nhận thử."),
  ).toBeTruthy();
  fireEvent.click(screen.getByText("Xác nhận bản thử 1"));
  expect(within(official).getByText("2–1")).toBeTruthy();
  scores("1", "3");
  fireEvent.change(screen.getByLabelText("Lý do sửa bản thử"), {
    target: { value: "Biên bản tổng hợp" },
  });
  fireEvent.click(screen.getByText("Lưu bản nhập thử"));
  expect(within(official).getByText("2–1")).toBeTruthy();
  expect(within(official).queryByText("1–3")).toBe(null);
  fireEvent.click(screen.getByText("Xác nhận bản thử 1"));
  expect(within(official).getByText("1–3")).toBeTruthy();
  expect(official.querySelector(".result-corrected")).toBeTruthy();
  expect(
    within(official).getByText("Ghi chú sửa: Biên bản tổng hợp"),
  ).toBeTruthy();
  expect(screen.getByText("Lịch sử bản đã xác nhận thử")).toBeTruthy();
});
it("K08 preserves zero explicitly, blocks blank results and correction without reason", () => {
  setup();
  scores("", "0");
  fireEvent.click(screen.getByText("Lưu bản nhập thử"));
  expect(screen.getByRole("alert").textContent).toContain("Nhập thành tích");
  scores("0", "1");
  fireEvent.click(screen.getByText("Lưu bản nhập thử"));
  fireEvent.click(screen.getByText("Xác nhận bản thử 1"));
  scores("2", "1");
  fireEvent.click(screen.getByText("Lưu bản nhập thử"));
  expect(screen.getByRole("alert").textContent).toContain("thiếu lý do");
});
it("K08 two pending submissions cannot both confirm against official version zero", () => {
  setup();
  scores("2", "1");
  fireEvent.click(screen.getByText("Lưu bản nhập thử"));
  scores("3", "1");
  fireEvent.click(screen.getByText("Lưu bản nhập thử"));
  fireEvent.click(screen.getByText("Xác nhận bản thử 1"));
  fireEvent.click(screen.getByText("Xác nhận bản thử 1"));
  expect(screen.getByRole("alert").textContent).toContain("đã thay đổi");
});
