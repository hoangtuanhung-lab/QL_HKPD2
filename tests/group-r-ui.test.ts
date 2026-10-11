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
import { RegistrationWorkspace } from "../apps/web/src/registration-ui.js";
import { App } from "../apps/web/src/App.js";
afterEach(cleanup);
function setup(
  csv = "student_code,name,sex,birth_year,grade\n001,VĐV tổng hợp A,male,2014,6\n002,VĐV tổng hợp B,male,2014,6",
) {
  render(createElement(RegistrationWorkspace));
  fireEvent.change(screen.getByLabelText("Tên trường thử"), {
    target: { value: "Trường tổng hợp" },
  });
  fireEvent.change(screen.getByLabelText("Năm giải thử"), {
    target: { value: String(new Date().getFullYear()) },
  });
  fireEvent.click(screen.getByText("Điền cấu hình mẫu để thử"));
  fireEvent.click(screen.getByText("Nạp danh mục thử"));
  fireEvent.change(screen.getByLabelText("CSV hồ sơ thử"), {
    target: { value: csv },
  });
  fireEvent.click(screen.getByText("Xem trước CSV thử"));
  return csv;
}
function selectPerson(index: number) {
  const select = screen.getByLabelText("VĐV thử") as HTMLSelectElement;
  fireEvent.change(select, {
    target: { value: select.options[index + 1]!.value },
  });
}
function selectEvent() {
  fireEvent.change(screen.getByLabelText("Nội dung cá nhân thử"), {
    target: { value: "event-sample" },
  });
}
it("R07 navigates to an empty workspace without synthetic participant seed", () => {
  render(createElement(App));
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra đăng ký" }));
  expect(screen.getByText("Kiểm tra danh mục và đăng ký")).toBeTruthy();
  expect(screen.queryByLabelText("VĐV thử")).toBe(null);
});
it("R07 previews, submits and approves; old approved name stays while a replacement is pending", () => {
  setup();
  fireEvent.click(screen.getByText("Thêm danh sách vào bản thử"));
  selectEvent();
  selectPerson(0);
  fireEvent.click(screen.getByText("Thêm đăng ký thử"));
  fireEvent.click(screen.getByText("Gửi bản thử"));
  fireEvent.click(screen.getByText("Duyệt bản thử"));
  selectPerson(1);
  fireEvent.click(screen.getByText("Sửa bản thử"));
  fireEvent.click(screen.getByText("Gửi bản thử"));
  const row = screen
    .getByText("Đã gửi bản thử", { exact: false })
    .closest("tr")!;
  expect(within(row).getByText("VĐV tổng hợp A")).toBeTruthy();
  expect(within(row).getByText(/VĐV tổng hợp B · Đã gửi bản thử/)).toBeTruthy();
  fireEvent.click(screen.getByText("Duyệt bản thử"));
  expect(within(row).getByText("VĐV tổng hợp B")).toBeTruthy();
});
it("R07 displays gender failure and blocks all-row import when any CSV row is invalid", () => {
  setup("student_code,name,sex,birth_year,grade\n001,Test,female,2014,6");
  fireEvent.click(screen.getByText("Thêm danh sách vào bản thử"));
  selectEvent();
  selectPerson(0);
  fireEvent.click(screen.getByText("Thêm đăng ký thử"));
  expect(screen.getByRole("alert").textContent).toContain("Giới tính");
  cleanup();
  setup("student_code,name,sex,birth_year,grade\n001,Test,unknown,2014,6");
  fireEvent.click(screen.getByText("Thêm danh sách vào bản thử"));
  expect(screen.getByRole("alert").textContent).toContain("Sửa mọi lỗi");
  expect(
    (screen.getByLabelText("VĐV thử") as HTMLSelectElement).options,
  ).toHaveLength(1);
});
it("R07 keeps original imported profiles and invalidates preview when CSV is edited", () => {
  const csv = setup();
  fireEvent.click(screen.getByText("Thêm danh sách vào bản thử"));
  fireEvent.click(screen.getByText("Xem trước CSV thử"));
  fireEvent.click(screen.getByText("Thêm danh sách vào bản thử"));
  expect(screen.getByRole("alert").textContent).toContain("không ghi đè");
  fireEvent.change(screen.getByLabelText("CSV hồ sơ thử"), {
    target: { value: csv + "\n003,Other,male,2014,6" },
  });
  expect(screen.queryByText("Thêm danh sách vào bản thử")).toBe(null);
});
