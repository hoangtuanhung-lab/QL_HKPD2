// @vitest-environment jsdom
import { createElement as h } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  render,
  cleanup,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { mergeRegistrationRows } from "../apps/web/src/registration-import.js";
import { registrationWorkbook } from "../apps/web/src/registration-excel.js";
import { StudentImportWorkspace } from "../apps/web/src/student-import-workspace.js";
import { AthleteRegistrationPage } from "../apps/web/src/athlete-registration-page.js";
import type {
  LiveState,
  LiveRepository,
} from "../apps/web/src/live-repository.js";
import type { AthleteDraft } from "../apps/web/src/registration-draft.js";
const athlete: AthleteDraft = {
  draftId: "stable",
  athleteCode: "VDV000001",
  schoolName: "Trường A",
  fullName: "An",
  className: "7",
  requestedEvent: "",
  identityNumber: "000000000001",
  birthDate: "2014-05-15",
  gender: "male",
  catalogSelections: ["CL_THCS_NAM_1213_DONNAM"],
  note: "Ghi chú cũ",
};
const state = (): LiveState => ({
  editionId: "edition-2026",
  catalogCodes: ["CL_THCS_NAM_1213_DONNAM"],
  registryRevision: 1,
  studentCount: 2,
  schools: [
    {
      id: "s1",
      code: "S1",
      name: "Trường A",
      level: "THCS",
      revision: 4,
      status: "draft",
      note: "",
      athletes: [{ ...athlete, athleteCode: "VDV000001" }],
    },
  ],
  operations: [],
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("keeps stable IDs, course selections and legacy notes during identity-only imports and rejects a forged athlete code", () => {
  const imported = {
    ...athlete,
    draftId: "new",
    fullName: "An cập nhật",
    catalogSelections: [],
    note: undefined,
  };
  delete imported.note;
  expect(mergeRegistrationRows([athlete], [imported])[0]).toMatchObject({
    draftId: "stable",
    athleteCode: "VDV000001",
    fullName: "An cập nhật",
    catalogSelections: athlete.catalogSelections,
    note: "Ghi chú cũ",
  });
  expect(() =>
    mergeRegistrationRows([athlete], [{ ...imported, athleteCode: "VDV999" }]),
  ).toThrow(/không khớp/);
  expect(athlete.fullName).toBe("An");
});
it("previews Excel registration, compares baseline and sends the exact school revision on explicit confirmation", async () => {
  const data = state(),
    students = vi.fn(async () => []),
    imports = vi.fn(async () => data);
  const repo = {
    students,
    importRegistrations: imports,
  } as unknown as LiveRepository;
  render(
    h(StudentImportWorkspace, {
      base: false,
      data,
      repository: repo,
      onDirty: () => {},
      save: async (f) => {
        await f();
        return true;
      },
    }),
  );
  const raw = await registrationWorkbook([{ ...athlete, fullName: "An mới" }]);
  const f = new File([raw as BlobPart], "dangky.xlsx");
  Object.defineProperty(f, "arrayBuffer", {
    value: async () => raw.slice().buffer,
  });
  fireEvent.change(screen.getByLabelText("Excel danh sách đăng ký"), {
    target: { files: [f] },
  });
  await screen.findByText("An mới");
  expect(imports).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận nhập 1 dòng" }));
  await waitFor(() =>
    expect(imports).toHaveBeenCalledWith([
      {
        schoolId: "s1",
        revision: 4,
        athletes: [
          expect.objectContaining({
            draftId: "stable",
            fullName: "An mới",
            catalogSelections: athlete.catalogSelections,
          }),
        ],
      },
    ]),
  );
  expect(students).toHaveBeenCalledWith(["000000000001"]);
});
it("renders exactly eleven registration columns and fills baseline identity fields only after lookup, course/group cells remain derived", async () => {
  const found = {
    fullName: "Học sinh nền",
    className: "7",
    birthDate: "2014-05-15",
    gender: "male" as const,
  };
  const lookup = vi.fn(async () => found);
  const school = {
    draftId: "s",
    schoolName: "Trường A",
    editionName: "2026",
    athletes: [],
  };
  render(
    h(AthleteRegistrationPage, {
      schools: [school],
      activeId: "s",
      onSelect: () => {},
      onSave: () => {},
      onDirty: () => {},
      onLookup: lookup,
    }),
  );
  expect(screen.getAllByRole("columnheader").map((x) => x.textContent)).toEqual(
    [
      "STT",
      "Mã VĐV",
      "TRƯỜNG",
      "KHỐI",
      "HỌ VÀ TÊN",
      "CCCD",
      "NGÀY SINH",
      "GIỚI TÍNH",
      "Phân nhóm",
      "NỘI DUNG THI ĐẤU",
      "TRẠNG THÁI",
    ],
  );
  fireEvent.change(screen.getByLabelText("Mã định danh dòng 1"), {
    target: { value: "000000000001" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Tra cứu học sinh" }));
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Họ tên dòng 1") as HTMLInputElement).value,
    ).toBe("Học sinh nền"),
  );
  expect(lookup).toHaveBeenCalledWith("000000000001");
  expect(
    (screen.getByLabelText("Nội dung thi đấu dòng 1") as HTMLInputElement)
      .readOnly,
  ).toBe(true);
});
it("does not match legacy pupils by an empty identity and preserves hidden fields of known pupils", () => {
  const empty = {
    ...athlete,
    athleteCode: undefined,
    identityNumber: "",
    draftId: "old",
  };
  const next = {
    ...empty,
    draftId: "next",
    fullName: "Học sinh mới",
    note: "",
  };
  expect(mergeRegistrationRows([empty], [next])).toHaveLength(2);
  expect(
    mergeRegistrationRows(
      [athlete],
      [{ ...athlete, draftId: "new", note: "" }],
    )[0]?.note,
  ).toBe("Ghi chú cũ");
});
it("shows a school Excel code mismatch as an alert and keeps the original table usable", async () => {
  const saved = vi.fn();
  render(
    h(AthleteRegistrationPage, {
      schools: [
        {
          draftId: "s1",
          schoolName: "Trường A",
          editionName: "2026",
          athletes: [athlete],
        },
      ],
      activeId: "s1",
      onSelect: () => {},
      onSave: saved,
      onDirty: () => {},
    }),
  );
  const raw = await registrationWorkbook([
    { ...athlete, athleteCode: "VDV999999" },
  ]);
  const file = new File([raw as BlobPart], "sai-ma.xlsx");
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => raw.slice().buffer,
  });
  const input = document.querySelector('input[type="file"]')!;
  fireEvent.change(input, { target: { files: [file] } });
  await screen.findByRole("alert");
  expect(screen.getByRole("alert").textContent).toMatch(/Mã VĐV không khớp/);
  expect(screen.getByLabelText("Họ tên dòng 1")).toBeTruthy();
  expect(saved).not.toHaveBeenCalled();
});
