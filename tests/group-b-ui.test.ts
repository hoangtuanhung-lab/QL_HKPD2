// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FormField, DataGrid, Modal } from "../packages/ui/src/index.js";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("connects form label and Vietnamese error without duplicate IDs", () => {
  render(
    createElement(
      "div",
      null,
      createElement(FormField, {
        label: "Trường",
        error: "Vui lòng nhập trường.",
      }),
      createElement(FormField, { label: "Môn" }),
    ),
  );
  const school = screen.getByLabelText("Trường");
  expect(school.id).not.toBe(screen.getByLabelText("Môn").id);
  expect(school.getAttribute("aria-invalid")).toBe("true");
  expect(
    document.getElementById(school.getAttribute("aria-describedby")!)
      ?.textContent,
  ).toBe("Vui lòng nhập trường.");
});
it("renders grid headers, empty state and horizontal scroll region", () => {
  render(
    createElement(DataGrid<{ id: string }>, {
      caption: "Danh sách",
      rows: [],
      rowKey: (row) => row.id,
      columns: [{ key: "id", label: "Mã", render: (row) => row.id }],
    }),
  );
  expect(screen.getByRole("columnheader").textContent).toBe("Mã");
  expect(screen.getByText("Chưa có dữ liệu.")).toBeTruthy();
  expect(screen.getByRole("region").style.overflowX).toBe("auto");
});
it("renders rows without interpreting text as markup", () => {
  render(
    createElement(DataGrid<{ id: string }>, {
      caption: "Danh sách",
      rows: [{ id: "<script>fake</script>" }],
      rowKey: (row) => row.id,
      columns: [{ key: "id", label: "Mã", render: (row) => row.id }],
    }),
  );
  expect(screen.getByRole("cell").textContent).toBe("<script>fake</script>");
  expect(document.querySelector("script")).toBeNull();
});
it("opens native modal, requests close on Escape/button, restores opener focus", () => {
  // jsdom has no native dialog implementation; browser focus trapping needs a browser check.
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
  const opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  const onClose = vi.fn();
  const view = render(
    createElement(
      Modal,
      { open: true, title: "Xác nhận", onClose },
      "Nội dung",
    ),
  );
  const dialog = screen.getByRole("dialog");
  expect(dialog.getAttribute("aria-labelledby")).toBe(
    screen.getByText("Xác nhận").id,
  );
  fireEvent(dialog, new Event("cancel", { cancelable: true }));
  fireEvent.click(screen.getByRole("button", { name: "Đóng hộp thoại" }));
  expect(onClose).toHaveBeenCalledTimes(2);
  view.rerender(
    createElement(Modal, { open: false, title: "Xác nhận", onClose }),
  );
  expect(document.activeElement).toBe(opener);
  opener.remove();
});
