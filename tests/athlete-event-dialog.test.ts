// @vitest-environment jsdom
import { createElement, useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AthleteRegistrationPage } from "../apps/web/src/athlete-registration-page.js";
import { AthleteEventDialog } from "../apps/web/src/athlete-event-dialog.js";
import {
  athleteDetails,
  fromSheet,
  toSheet,
  saveDrafts,
  readDraftSnapshot,
  type SchoolDraft,
} from "../apps/web/src/registration-draft.js";
const initial: SchoolDraft = {
  draftId: "school",
  schoolName: "Trường minh họa",
  editionName: "2026",
  athletes: [
    {
      draftId: "a",
      fullName: "VĐV A",
      className: "6A",
      requestedEvent: "",
      gender: "male",
      birthDate: "2012-05-15",
    },
    {
      draftId: "b",
      fullName: "VĐV B",
      className: "6B",
      requestedEvent: "",
      gender: "female",
    },
  ],
};
const originalShowModal = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "showModal",
);
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  if (originalShowModal)
    Object.defineProperty(
      HTMLDialogElement.prototype,
      "showModal",
      originalShowModal,
    );
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
});
function Page() {
  const [school, setSchool] = useState(structuredClone(initial));
  const [dirty, setDirty] = useState(false);
  return createElement(
    "div",
    null,
    createElement(AthleteRegistrationPage, {
      schools: [school],
      activeId: school.draftId,
      onSave: setSchool,
      onSelect: vi.fn(),
      onDirty: setDirty,
    }),
    createElement("output", null, JSON.stringify({ school, dirty })),
  );
}
const output = () => JSON.parse(document.querySelector("output")!.textContent!);
function choose(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function chooseRun() {
  choose("Môn thi dòng 1", "athletics");
  choose("Nội dung dòng 1", "Chạy");
  choose("Chi tiết dòng 1", "Chạy 100 m");
}
describe("Athlete row actions and sport registration", () => {
  it("saves one edited row without saving or deleting another pending row and retains order", () => {
    render(createElement(Page));
    fireEvent.click(screen.getByLabelText("Sửa VĐV dòng 1"));
    fireEvent.change(screen.getByLabelText("Họ tên dòng 1"), {
      target: { value: "VĐV A mới" },
    });
    fireEvent.click(screen.getByLabelText("Sửa VĐV dòng 2"));
    fireEvent.change(screen.getByLabelText("Họ tên dòng 2"), {
      target: { value: "B chưa lưu" },
    });
    fireEvent.click(screen.getByLabelText("Lưu VĐV dòng 1"));
    expect(
      output().school.athletes.map((a: { fullName: string }) => a.fullName),
    ).toEqual(["VĐV A mới", "VĐV B"]);
    expect(
      (screen.getByLabelText("Họ tên dòng 2") as HTMLInputElement).value,
    ).toBe("B chưa lưu");
    expect(output().dirty).toBe(true);
    fireEvent.click(screen.getByLabelText("Xóa dòng 2"));
    fireEvent.click(screen.getByLabelText("Sửa VĐV dòng 1"));
    fireEvent.click(screen.getByLabelText("Lưu VĐV dòng 1"));
    expect(output().school.athletes).toHaveLength(2);
    fireEvent.click(screen.getByText("Lưu danh sách"));
    expect(output().school.athletes).toHaveLength(1);
  });
  it("opens the book for the correct athlete, selects events, saves and reopens without affecting another profile", () => {
    render(createElement(Page));
    fireEvent.click(screen.getByLabelText("Đăng ký môn cho VĐV A"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("VĐV A")).toBeTruthy();
    chooseRun();
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Thêm nội dung/ }),
    );
    choose("Nội dung dòng 2", "Nhảy xa");
    fireEvent.click(within(dialog).getByText(/Lưu đăng ký môn/));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(output().school.athletes[0].eventSelections).toHaveLength(2);
    expect(output().school.athletes[1].eventSelections).toBeUndefined();
    fireEvent.click(screen.getByLabelText("Đăng ký môn cho VĐV A"));
    expect(
      (screen.getByLabelText("Chi tiết dòng 1") as HTMLSelectElement).value,
    ).toBe("Chạy 100 m");
    fireEvent.click(screen.getByLabelText("Xóa dòng đăng ký 2"));
    fireEvent.click(screen.getByLabelText("Xóa dòng đăng ký 1"));
    fireEvent.click(screen.getByText(/Lưu đăng ký môn/));
    expect(output().school.athletes[0].eventSelections).toEqual([]);
    expect(output().school.athletes[0].requestedEvent).toBe("");
  });
  it("preserves unsaved event choices when cancel is rejected and blocks stale modal saves", () => {
    const apply = vi.fn(),
      close = vi.fn();
    const view = render(
      createElement(AthleteEventDialog, {
        school: initial,
        athlete: initial.athletes[0]!,
        onApply: apply,
        onClose: close,
      }),
    );
    chooseRun();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByText("Quay lại"));
    expect(close).not.toHaveBeenCalled();
    const changed = structuredClone(initial);
    changed.athletes[1]!.fullName = "Đã đổi";
    view.rerender(
      createElement(AthleteEventDialog, {
        school: changed,
        athlete: changed.athletes[0]!,
        onApply: apply,
        onClose: close,
      }),
    );
    fireEvent.click(screen.getByText(/Lưu đăng ký môn/));
    expect(apply).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/Phiếu đã thay đổi/);
    expect(
      (screen.getByLabelText("Chi tiết dòng 1") as HTMLSelectElement).value,
    ).toBe("Chạy 100 m");
  });
  it("starts with one empty row, adds a new sport and inherits that sport for an extra content row", () => {
    const apply = vi.fn();
    render(
      createElement(AthleteEventDialog, {
        school: initial,
        athlete: initial.athletes[0]!,
        onApply: apply,
        onClose: vi.fn(),
      }),
    );
    expect(
      screen.getAllByRole("columnheader").map((h) => h.textContent),
    ).toEqual(["STT", "Môn thi", "Nội dung", "Chi tiết", "Ghi chú"]);
    expect(
      (screen.getByLabelText("Môn thi dòng 1") as HTMLSelectElement).value,
    ).toBe("");
    expect(screen.queryByLabelText("Môn thi dòng 2")).toBeNull();
    const banner = document.querySelector(".event-level-banner")!,
      profile = document.querySelector(".event-profile")!;
    expect(
      banner.compareDocumentPosition(profile) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    chooseRun();
    fireEvent.click(screen.getByRole("button", { name: /Thêm môn/ }));
    choose("Môn thi dòng 2", "swimming");
    choose("Nội dung dòng 2", "Ếch");
    choose("Chi tiết dòng 2", "Ếch 50 m");
    fireEvent.click(screen.getByRole("button", { name: /Thêm nội dung/ }));
    expect(
      (screen.getByLabelText("Môn thi dòng 3") as HTMLSelectElement).value,
    ).toBe("swimming");
    expect(
      (screen.getByLabelText("Môn thi dòng 3") as HTMLSelectElement).disabled,
    ).toBe(true);
    choose("Nội dung dòng 3", "Ếch");
    choose("Chi tiết dòng 3", "Ếch 100 m");
    fireEvent.click(screen.getByRole("button", { name: /Thêm môn/ }));
    expect(screen.getByRole("alert").textContent).toMatch(/2 môn/);
    fireEvent.click(screen.getByText(/Lưu đăng ký môn/));
    expect(apply.mock.calls[0]![0].eventSelections).toEqual([
      { sportId: "athletics", level: "THCS", eventLabel: "Chạy 100 m" },
      { sportId: "swimming", level: "THCS", eventLabel: "Ếch 50 m" },
      { sportId: "swimming", level: "THCS", eventLabel: "Ếch 100 m" },
    ]);
  });
  it("rejects unsupported photo uploads without changing the athlete", async () => {
    render(
      createElement(AthleteEventDialog, {
        school: initial,
        athlete: initial.athletes[0]!,
        onApply: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    fireEvent.change(screen.getByLabelText("Ảnh hồ sơ VĐV"), {
      target: {
        files: [new File(["<svg/>"], "image.svg", { type: "image/svg+xml" })],
      },
    });
    expect((await screen.findByRole("alert")).textContent).toMatch(/JPG, PNG/);
    expect(screen.queryByRole("img")).toBeNull();
  });
  it("round trips preferences and photo through portable v3 and locked storage; blocks invalid payloads", async () => {
    const next = structuredClone(initial);
    next.athletes[0]!.photoDataUrl = "data:image/png;base64,iVBORw0KGgo=";
    next.athletes[0]!.eventSelections = [
      { sportId: "athletics", level: "THCS", eventLabel: "Chạy 100 m" },
    ];
    expect(toSheet(next).formatVersion).toBe(3);
    expect(fromSheet(toSheet(next)).athletes[0]).toMatchObject({
      ...next.athletes[0],
      draftId: expect.any(String),
    });
    await saveDrafts(localStorage, [next], readDraftSnapshot(localStorage), {
      request: async (_n, f) => f(),
    });
    expect(readDraftSnapshot(localStorage).drafts[0]).toEqual(next);
    for (const photo of [
      "javascript:alert(1)",
      "data:image/svg+xml;base64,AAAA",
      "data:image/png;base64," + "A".repeat(700001),
    ])
      expect(() => athleteDetails({ photoDataUrl: photo })).toThrow();
    expect(() =>
      athleteDetails({
        eventSelections: [
          ...next.athletes[0]!.eventSelections!,
          ...next.athletes[0]!.eventSelections!,
        ],
      }),
    ).toThrow(/trùng/);
    expect(() =>
      athleteDetails({
        eventSelections: [
          { sportId: "unknown", level: "TH", eventLabel: "Fake" },
        ],
      }),
    ).toThrow();
    expect(() =>
      athleteDetails({
        eventSelections: [
          { sportId: "athletics", level: "TH", eventLabel: "Chạy 100 m" },
        ],
      }),
    ).toThrow();
  });
});
