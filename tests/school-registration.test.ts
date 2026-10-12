// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { App } from "../apps/web/src/App.js";
import {
  fromSheet,
  loadDrafts,
  readDraftSnapshot,
  saveDrafts,
  storageKey,
  toSheet,
  upsertAthlete,
} from "../apps/web/src/registration-draft.js";

beforeEach(() => {
  localStorage.clear();
  let tail = Promise.resolve();
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: <T>(_name: string, run: () => T | Promise<T>) => {
        const result = tail.then(run);
        tail = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      },
    },
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function school(name = "Trường A", edition = "Kỳ giải 2026") {
  document
    .querySelector("details.registration-tools")
    ?.setAttribute("open", "");
  fireEvent.change(screen.getByLabelText("Tên kỳ giải"), {
    target: { value: edition },
  });
  fireEvent.change(screen.getByLabelText("Tên trường"), {
    target: { value: name },
  });
  fireEvent.click(screen.getByText("Tạo / mở phiếu nháp"));
}
function athlete(name = "Nguyễn An", className = "6A") {
  fireEvent.change(screen.getByLabelText("Họ và tên VĐV"), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText("Lớp / nhóm học"), {
    target: { value: className },
  });
  fireEvent.change(screen.getByLabelText("Nội dung muốn tham gia"), {
    target: { value: "Chạy" },
  });
  fireEvent.click(screen.getByText("Thêm VĐV"));
}
const emptySheet = {
  format: "hkpd-school-registration-draft",
  formatVersion: 1,
  schoolName: "Trường A",
  editionName: "2026",
  athletes: [],
};
describe("School registration drafts", () => {
  it("starts empty, keeps same-name students separate, edits/deletes and restores the correct school", async () => {
    const view = render(createElement(App));
    expect(screen.getByText("Bắt đầu bằng phiếu của trường")).toBeTruthy();
    school();
    athlete();
    athlete("Nguyễn An", "6B");
    expect(screen.getAllByText("Chờ cấp mã")).toHaveLength(2);
    expect(
      Array.from(
        document.querySelectorAll(".stats strong"),
        (el) => el.textContent,
      ),
    ).toEqual(["1", "2", "2"]);
    fireEvent.click(screen.getAllByText("Sửa")[0]!);
    fireEvent.change(screen.getByLabelText("Họ và tên VĐV"), {
      target: { value: "Nguyễn Bình" },
    });
    fireEvent.click(screen.getByText("Lưu thay đổi"));
    school("Trường B");
    athlete("Trần Lan");
    fireEvent.click(screen.getByRole("button", { name: /Trường A.*2 VĐV/ }));
    expect(screen.queryByText("Trần Lan")).toBeNull();
    expect(screen.getByText("Nguyễn Bình")).toBeTruthy();
    fireEvent.click(
      within(screen.getByText("Nguyễn Bình").closest("tr")!).getByText("Xóa"),
    );
    expect(screen.queryByText("Nguyễn Bình")).toBeNull();
    await waitFor(() =>
      expect(
        loadDrafts(localStorage)
          .find((s) => s.schoolName === "Trường A")
          ?.athletes.map((a) => a.fullName),
      ).toEqual(["Nguyễn An"]),
    );
    view.unmount();
    render(createElement(App));
    expect(screen.getByText("Nguyễn An")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Trường B.*1 VĐV/ }));
    expect(screen.getByText("Trần Lan")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Công khai" }));
    expect(screen.queryByText("Trần Lan")).toBeNull();
    expect(screen.getByText(/Chưa có kết quả được công bố/)).toBeTruthy();
  });
  it("opens an existing normalized profile, while a different edition remains separate", async () => {
    render(createElement(App));
    school();
    athlete();
    school("  TRƯỜNG A  ");
    await waitFor(() => expect(loadDrafts(localStorage)).toHaveLength(1));
    school("Trường A", "2027");
    await waitFor(() => expect(loadDrafts(localStorage)).toHaveLength(2));
    expect(screen.getByText("Chưa có VĐV trong phiếu")).toBeTruthy();
  });
  it("exports a portable sheet and accepts import without overwriting an existing school", async () => {
    const createUrl = vi.fn(() => "blob:sheet");
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL = createUrl;
        static revokeObjectURL = vi.fn();
      },
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    render(createElement(App));
    school();
    athlete();
    fireEvent.click(screen.getByText("Xuất phiếu đăng ký"));
    expect(createUrl).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    const input = document.querySelector(
      'input[accept="application/json,.json"]',
    )!;
    const file = {
      text: async () =>
        JSON.stringify({ ...emptySheet, schoolName: "Trường B" }),
    };
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(loadDrafts(localStorage)).toHaveLength(2));
    const saved = localStorage.getItem(storageKey);
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByText(/Phiếu nhập chưa được lưu để tránh ghi đè/);
    expect(localStorage.getItem(storageKey)).toBe(saved);
    fireEvent.change(input, {
      target: { files: [{ text: async () => "{bad" }] },
    });
    await screen.findByText("Tệp không phải JSON hợp lệ.");
    expect(localStorage.getItem(storageKey)).toBe(saved);
    vi.unstubAllGlobals();
  });
  it("keeps newly entered data when a file import finishes later", async () => {
    render(createElement(App));
    school();
    athlete();
    let finish!: (value: string) => void;
    const pending = new Promise<string>((resolve) => {
      finish = resolve;
    });
    fireEvent.change(
      document.querySelector('input[accept="application/json,.json"]')!,
      {
        target: { files: [{ text: () => pending }] },
      },
    );
    school("Trường B");
    athlete("Trần Lan");
    finish(JSON.stringify({ ...emptySheet, schoolName: "Trường C" }));
    await waitFor(() => expect(loadDrafts(localStorage)).toHaveLength(3));
    expect(
      loadDrafts(localStorage).find((item) => item.schoolName === "Trường B")
        ?.athletes[0]?.fullName,
    ).toBe("Trần Lan");
  });
  it("preserves corrupt saved bytes and allows new drafts in memory", () => {
    localStorage.setItem(storageKey, "corrupt");
    render(createElement(App));
    school();
    athlete();
    expect(screen.getByText("Nguyễn An")).toBeTruthy();
    expect(localStorage.getItem(storageKey)).toBe("corrupt");
    expect(screen.getByText(/Bản nháp đang giữ trong phiên này/)).toBeTruthy();
  });
  it("keeps entered data usable when browser storage is full", async () => {
    render(createElement(App));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    school();
    athlete();
    expect(screen.getByText("Nguyễn An")).toBeTruthy();
    expect(
      await screen.findByText(/Không lưu được trên trình duyệt/),
    ).toBeTruthy();
    expect(screen.getByText("Xuất phiếu đăng ký")).toBeTruthy();
  });
  it("does not impose the plan's fixture counts on registration", async () => {
    const schools = Array.from({ length: 8 }, (_, i) =>
      fromSheet({ ...emptySheet, schoolName: `Trường ${i}` }),
    );
    let first = schools[0]!;
    for (let i = 0; i < 501; i++)
      first = upsertAthlete(first, {
        draftId: `local_${i}`,
        fullName: `VĐV giả ${i}`,
        className: "6A",
        requestedEvent: "Chạy",
      });
    schools[0] = first;
    await saveDrafts(localStorage, schools, readDraftSnapshot(localStorage));
    const restored = loadDrafts(localStorage);
    expect(restored).toHaveLength(8);
    expect(restored[0]!.athletes).toHaveLength(501);
    const sheet = toSheet(restored[0]!);
    expect(JSON.stringify(sheet)).not.toMatch(
      /draftId|approved|folder|athleteCode/,
    );
    expect(fromSheet(sheet).athletes).toHaveLength(501);
  });
  it("rejects official metadata and incomplete athletes in draft imports", () => {
    expect(() => fromSheet({ ...emptySheet, approved: true })).toThrow();
    expect(() =>
      fromSheet({ ...emptySheet, athletes: [{ fullName: "An" }] }),
    ).toThrow();
    expect(() =>
      fromSheet({
        ...emptySheet,
        athletes: [
          {
            fullName: "An",
            className: "6A",
            requestedEvent: "Chạy",
            athleteCode: "0001",
          },
        ],
      }),
    ).toThrow();
  });
});
