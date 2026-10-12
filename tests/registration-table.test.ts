// @vitest-environment jsdom
import { createElement, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AthleteRegistrationPage } from "../apps/web/src/athlete-registration-page.js";
import {
  fromSheet,
  toSheet,
  saveDrafts,
  readDraftSnapshot,
  athleteDetails,
  type SchoolDraft,
} from "../apps/web/src/registration-draft.js";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
const schools: SchoolDraft[] = [
  {
    draftId: "school-a",
    schoolName: "Trường A",
    editionName: "2026",
    athletes: [],
  },
  {
    draftId: "school-b",
    schoolName: "Trường B",
    editionName: "2026",
    athletes: [],
  },
];
function Page() {
  const [data, setData] = useState(structuredClone(schools));
  const [id, setId] = useState("school-a");
  const [dirty, setDirty] = useState(false);
  return createElement(
    "div",
    null,
    createElement(AthleteRegistrationPage, {
      schools: data,
      activeId: id,
      onSelect: setId,
      onSave: (s) =>
        setData((current) =>
          current.map((a) => (a.draftId === s.draftId ? s : a)),
        ),
      onDirty: setDirty,
    }),
    createElement("output", null, JSON.stringify({ data, dirty })),
  );
}
function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
describe("Registration table", () => {
  it("edits profile cells, saves, and retains entered rows across school selection", () => {
    render(createElement(Page));
    fill("Họ tên dòng 1", "VĐV minh họa");
    fill("Mã định danh dòng 1", "040205001234");
    fill("Ngày sinh dòng 1", "2012-05-15");
    fill("Giới tính dòng 1", "female");
    fill("Ghi chú dòng 1", "Đăng ký mới");
    fill("Lớp / nhóm dòng 1", " 6A ");
    fill("Nội dung thi đấu dòng 1", " Chạy 60 m ");
    fill("Trường đăng ký:", "school-b");
    fill("Họ tên dòng 1", "VĐV trường B");
    fill("Trường đăng ký:", "school-a");
    expect(
      (screen.getByLabelText("Họ tên dòng 1") as HTMLInputElement).value,
    ).toBe("VĐV minh họa");
    fireEvent.click(screen.getByText("Lưu danh sách"));
    const output = JSON.parse(document.querySelector("output")!.textContent!);
    expect(output.data[0].athletes[0]).toMatchObject({
      identityNumber: "040205001234",
      birthDate: "2012-05-15",
      gender: "female",
      note: "Đăng ký mới",
      className: "6A",
      requestedEvent: "Chạy 60 m",
    });
    expect(output.dirty).toBe(true);
    fill("Trường đăng ký:", "school-b");
    expect(
      (screen.getByLabelText("Họ tên dòng 1") as HTMLInputElement).value,
    ).toBe("VĐV trường B");
  });
  it("adds/removes rows, keeps same-name athletes, rejects invalid and duplicate identity numbers", () => {
    render(createElement(Page));
    fill("Họ tên dòng 1", "Trùng tên");
    fill("Mã định danh dòng 1", "123");
    fireEvent.click(screen.getByText("Lưu danh sách"));
    expect(screen.getByRole("alert").textContent).toMatch(/12 chữ số/);
    fill("Mã định danh dòng 1", "040205001234");
    fireEvent.click(screen.getByText("Thêm 1 hàng"));
    fill("Họ tên dòng 2", "Trùng tên");
    fill("Mã định danh dòng 2", "040205001234");
    fireEvent.click(screen.getByText("Lưu danh sách"));
    expect(screen.getByRole("alert").textContent).toMatch(/trùng mã/);
    fill("Mã định danh dòng 2", "040205001235");
    fireEvent.click(screen.getByText("Lưu danh sách"));
    expect(
      JSON.parse(document.querySelector("output")!.textContent!).data[0]
        .athletes,
    ).toHaveLength(2);
    fireEvent.click(screen.getByLabelText("Xóa dòng 1"));
    fireEvent.click(screen.getByText("Lưu danh sách"));
    expect(
      JSON.parse(document.querySelector("output")!.textContent!).data[0]
        .athletes,
    ).toHaveLength(1);
  });
  it("warns on leaving with unsaved edits and blocks overwriting edits made by another tool", () => {
    const save = vi.fn(),
      dirty = vi.fn();
    const view = render(
      createElement(AthleteRegistrationPage, {
        schools,
        activeId: "school-a",
        onSelect: vi.fn(),
        onSave: save,
        onDirty: dirty,
      }),
    );
    fill("Họ tên dòng 1", "Chưa lưu");
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    const changed = structuredClone(schools);
    changed[0]!.athletes.push({
      draftId: "other",
      fullName: "Dữ liệu công cụ khác",
      className: "6A",
      requestedEvent: "Chạy",
    });
    view.rerender(
      createElement(AthleteRegistrationPage, {
        schools: changed,
        activeId: "school-a",
        onSelect: vi.fn(),
        onSave: save,
        onDirty: dirty,
      }),
    );
    fireEvent.click(screen.getByText("Lưu danh sách"));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/công cụ khác/);
    expect(
      (screen.getByLabelText("Họ tên dòng 1") as HTMLInputElement).value,
    ).toBe("Chưa lưu");
  });
  it("round trips new fields through storage/export without changing legacy sheets", async () => {
    const legacy = {
      format: "hkpd-school-registration-draft",
      formatVersion: 1,
      schoolName: "Trường",
      editionName: "2026",
      athletes: [{ fullName: "Cũ", className: "6A", requestedEvent: "Chạy" }],
    };
    expect(toSheet(fromSheet(legacy))).toEqual(legacy);
    const next = fromSheet({
      ...legacy,
      formatVersion: 2,
      athletes: [
        {
          fullName: "Mới",
          className: "",
          requestedEvent: "",
          identityNumber: "040205001234",
          birthDate: "2012-05-15",
          gender: "female",
          note: "Mới",
        },
      ],
    });
    await saveDrafts(localStorage, [next], readDraftSnapshot(localStorage), {
      request: async (_n, f) => f(),
    });
    expect(readDraftSnapshot(localStorage).drafts[0]).toEqual(next);
    expect(fromSheet(toSheet(next)).athletes[0]).toMatchObject({
      ...next.athletes[0],
      draftId: expect.any(String),
    });
    expect(() => athleteDetails({ birthDate: "2012-02-30" })).toThrow();
    expect(() => athleteDetails({ birthDate: "2999-01-01" })).toThrow();
    expect(() => fromSheet({ ...legacy, formatVersion: "2" })).toThrow();
  });
});
