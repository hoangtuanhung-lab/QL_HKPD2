// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { createElement } from "react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
import { OfflineWorkspace } from "../apps/web/src/offline-ui.js";
import { App } from "../apps/web/src/App.js";
import { IndexedDbQueue } from "../packages/offline/src/browser.js";
beforeEach(() => vi.stubGlobal("indexedDB", new IDBFactory()));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const ready = async () =>
  waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "Lưu bản ngoại tuyến thử",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
const scores = (a: string, b: string) => {
  fireEvent.change(screen.getByLabelText("Tỷ số thử A"), {
    target: { value: a },
  });
  fireEvent.change(screen.getByLabelText("Tỷ số thử B"), {
    target: { value: b },
  });
};
it("I-REG-10 opens the offline tab with valid accessible input elements", async () => {
  render(createElement(OfflineWorkspace));
  await ready();
  expect(screen.getByLabelText("Tỷ số thử A").tagName).toBe("INPUT");
  expect(screen.getByLabelText("Tỷ số thử B").tagName).toBe("INPUT");
});
it("two saved revisions remain after unmount/reopen with identical operation IDs", async () => {
  const view = render(createElement(OfflineWorkspace));
  await ready();
  scores("2", "1");
  fireEvent.click(
    screen.getByRole("button", { name: "Lưu bản ngoại tuyến thử" }),
  );
  await waitFor(() => expect(screen.getByText("Bản đã lưu: 1")).toBeTruthy());
  await ready();
  scores("1", "3");
  fireEvent.click(
    screen.getByRole("button", { name: "Lưu bản ngoại tuyến thử" }),
  );
  await waitFor(() => expect(screen.getByText("Bản đã lưu: 2")).toBeTruthy());
  const text = screen.getByLabelText("Các bản ngoại tuyến đã lưu").textContent;
  view.unmount();
  render(createElement(OfflineWorkspace));
  await ready();
  expect(screen.getByLabelText("Các bản ngoại tuyến đã lưu").textContent).toBe(
    text,
  );
  expect(
    within(screen.getByLabelText("Các bản ngoại tuyến đã lưu")).getAllByRole(
      "listitem",
    ),
  ).toHaveLength(2);
});
it("opens via App navigation and preserves local queue across tabs", async () => {
  render(createElement(App));
  fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
    target: { value: "admin" },
  });
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: "Các luồng chức năng" }),
    ).getByRole("button", { name: "Ngoại tuyến" }),
  );
  await ready();
  scores("0", "1");
  fireEvent.click(
    screen.getByRole("button", { name: "Lưu bản ngoại tuyến thử" }),
  );
  await waitFor(() => expect(screen.getByText("Bản đã lưu: 1")).toBeTruthy());
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: "Các luồng chức năng" }),
    ).getByRole("button", { name: "Kết quả" }),
  );
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: "Các luồng chức năng" }),
    ).getByRole("button", { name: "Ngoại tuyến" }),
  );
  await ready();
  expect(screen.getByText("Bản đã lưu: 1")).toBeTruthy();
  expect(screen.getByText("0–1")).toBeTruthy();
});
it("blocked storage disables saving and presents a safe message", async () => {
  // Component imports the compiled browser export; use a storage factory failure instead of source-class spy.
  vi.stubGlobal("indexedDB", {
    open: () => {
      throw Error("synthetic private storage details");
    },
  });
  render(createElement(OfflineWorkspace));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain("Không mở được"),
  );
  expect(screen.getByRole("alert").textContent).not.toContain(
    "synthetic private",
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Lưu bản ngoại tuyến thử",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
it("invalid input is retained without reporting it saved", async () => {
  render(createElement(OfflineWorkspace));
  await ready();
  scores("-1", "2");
  fireEvent.submit(
    screen
      .getByRole("button", { name: "Lưu bản ngoại tuyến thử" })
      .closest("form")!,
  );
  expect(screen.getByRole("alert").textContent).toContain("không âm");
  expect(screen.getByText("Bản đã lưu: 0")).toBeTruthy();
  expect((screen.getByLabelText("Tỷ số thử A") as HTMLInputElement).value).toBe(
    "-1",
  );
});
it("close/reopen of live queue cannot expose synthetic preview records", async () => {
  render(createElement(OfflineWorkspace));
  await ready();
  scores("1", "0");
  fireEvent.click(
    screen.getByRole("button", { name: "Lưu bản ngoại tuyến thử" }),
  );
  await waitFor(() => expect(screen.getByText("Bản đã lưu: 1")).toBeTruthy());
  const q = await IndexedDbQueue.open(indexedDB);
  expect(
    await q.list({
      editionId: "10000000-0000-4000-8000-000000000001",
      actorId: "10000000-0000-4000-8000-000000000002",
    }),
  ).toEqual([]);
  q.close();
});
