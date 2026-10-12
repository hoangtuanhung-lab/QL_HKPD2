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
  choose("Môn dòng 1", "DK");
  choose("Tên nội dung dòng 1", "DK_THCS_NAM_TC_100M");
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
    choose("Tên nội dung dòng 2", "DK_THCS_NAM_TC_NHAYXA");
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Lưu đăng ký môn/ }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(output().school.athletes[0].catalogSelections).toHaveLength(2);
    expect(output().school.athletes[1].eventSelections).toBeUndefined();
    fireEvent.click(screen.getByLabelText("Đăng ký môn cho VĐV A"));
    expect(screen.getByText("DK_THCS_NAM_TC_100M")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Xóa đăng ký dòng 2"));
    fireEvent.click(screen.getByLabelText("Xóa đăng ký dòng 1"));
    fireEvent.click(screen.getByRole("button", { name: /Lưu đăng ký môn/ }));
    expect(output().school.athletes[0].catalogSelections).toEqual([]);
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
    fireEvent.click(screen.getByRole("button", { name: /Lưu đăng ký môn/ }));
    expect(apply).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/Phiếu đã thay đổi/);
    expect(
      (screen.getByLabelText("Tên nội dung dòng 1") as HTMLSelectElement).value,
    ).toBe("DK_THCS_NAM_TC_100M");
  });
  it("uses the six catalog columns, locks football groups and preserves inherited sport/group on a new content row", () => {
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
    ).toEqual([
      "STT",
      "Mã môn",
      "Môn",
      "Phân nhóm",
      "Tên nội dung",
      "Trạng thái",
    ]);
    expect(
      (screen.getByLabelText("Môn dòng 1") as HTMLSelectElement).value,
    ).toBe("");
    expect(screen.queryByLabelText("Môn dòng 2")).toBeNull();
    expect(screen.getByText("2012")).toBeTruthy();
    choose("Môn dòng 1", "BD");
    expect(
      (screen.getByLabelText("Phân nhóm dòng 1") as HTMLSelectElement).disabled,
    ).toBe(true);
    expect(screen.getByText("BD_THCS")).toBeTruthy();
    expect(
      (screen.getByLabelText("Tên nội dung dòng 1") as HTMLSelectElement).value,
    ).toBe("BD_THCS");
    fireEvent.click(screen.getByLabelText("Lưu đăng ký dòng 1"));
    expect(screen.getByLabelText("Sửa đăng ký dòng 1")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Sửa đăng ký dòng 1"));
    choose("Môn dòng 1", "BOI");
    expect(
      (screen.getByLabelText("Tên nội dung dòng 1") as HTMLSelectElement).value,
    ).toBe("");
    expect(
      (screen.getByLabelText("Tên nội dung dòng 1") as HTMLSelectElement)
        .disabled,
    ).toBe(true);
    choose("Phân nhóm dòng 1", "13 - 14 tuổi");
    choose("Tên nội dung dòng 1", "BOI_THCS_NAM_1415_ECH50");
    fireEvent.click(screen.getByRole("button", { name: /Thêm nội dung/ }));
    expect(
      (screen.getByLabelText("Môn dòng 2") as HTMLSelectElement).value,
    ).toBe("BOI");
    expect(
      (screen.getByLabelText("Phân nhóm dòng 2") as HTMLSelectElement).value,
    ).toBe("13 - 14 tuổi");
    choose("Tên nội dung dòng 2", "BOI_THCS_NAM_1415_ECH100");
    fireEvent.click(screen.getByRole("button", { name: /Lưu đăng ký môn/ }));
    expect(apply.mock.calls[0]![0].catalogSelections).toEqual([
      "BOI_THCS_NAM_1415_ECH50",
      "BOI_THCS_NAM_1415_ECH100",
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
  it("does not offer football to girls or THCS content to a primary pupil", () => {
    const female = { ...initial.athletes[0]!, gender: "female" as const };
    const view = render(
      createElement(AthleteEventDialog, {
        school: initial,
        athlete: female,
        onApply: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    expect(
      within(screen.getByLabelText("Môn dòng 1")).queryByRole("option", {
        name: "Bóng đá",
      }),
    ).toBeNull();
    view.unmount();
    const primary = {
      ...initial.athletes[0]!,
      className: "4A",
      birthDate: "2016-05-15",
    };
    render(
      createElement(AthleteEventDialog, {
        school: initial,
        athlete: primary,
        onApply: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    choose("Môn dòng 1", "BD");
    expect(screen.getByText("BD_TH")).toBeTruthy();
    expect(screen.queryByText("BD_THCS")).toBeNull();
    expect((screen.getByLabelText("Cấp học") as HTMLSelectElement).value).toBe(
      "TH",
    );
  });
  it("retains an unresolved old preference until explicitly replaced rather than dropping it on save", () => {
    const apply = vi.fn();
    const athlete = {
      ...initial.athletes[0]!,
      eventSelections: [
        {
          sportId: "chess" as const,
          level: "THCS" as const,
          eventLabel: "Cá nhân nam",
        },
      ],
    };
    render(
      createElement(AthleteEventDialog, {
        school: initial,
        athlete,
        onApply: apply,
        onClose: vi.fn(),
      }),
    );
    expect(screen.getByText("Cá nhân nam (THCS)")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Lưu đăng ký môn/ }));
    expect(apply).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/chưa đối chiếu/);
    fireEvent.click(screen.getByRole("button", { name: "Xóa lựa chọn cũ 1" }));
    choose("Môn dòng 1", "CV");
    choose("Phân nhóm dòng 1", "13 - 14 tuổi");
    choose("Tên nội dung dòng 1", "CV_THCS_NAM_1415_CANHAN");
    fireEvent.click(screen.getByRole("button", { name: /Lưu đăng ký môn/ }));
    expect(apply.mock.calls[0]![0].catalogSelections).toEqual([
      "CV_THCS_NAM_1415_CANHAN",
    ]);
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
