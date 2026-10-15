// @vitest-environment jsdom
import { createElement } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { App } from "../apps/web/src/App.js";
import { CompetitionWorkspace } from "../apps/web/src/competition-ui.js";
import {
  competitionRegistrationRows,
  type CompetitionRegistrationSource,
} from "../apps/web/src/competition-registration.js";
const content = "CL_THCS_NAM_1213_DONNAM";
const otherContent = "CL_THCS_NAM_1415_DONNAM";
function source(): CompetitionRegistrationSource {
  return {
    editionId: "edition-2026",
    year: 2026,
    catalogCodes: [content, otherContent, "BD_TH"],
    directory: [
      { id: "school-a", code: "THCS_A", name: "Trường A", level: "THCS" },
      { id: "school-b", code: "THCS_B", name: "Trường B", level: "THCS" },
    ],
    schools: [
      {
        draftId: "managed-school:school-a",
        schoolName: "Trường A",
        editionName: "2026",
        athletes: [
          {
            draftId: "VDV_A1",
            fullName: "Nguyễn An",
            className: "7A",
            birthDate: "2014-05-15",
            gender: "male",
            requestedEvent: "",
            catalogSelections: [content],
            identityNumber: "040205001234",
          },
          {
            draftId: "VDV_A2",
            fullName: "Nguyễn Bình",
            className: "7A",
            birthDate: "2014-05-15",
            gender: "male",
            requestedEvent: "",
            catalogSelections: [content],
          },
          {
            draftId: "VDV_KHAC",
            fullName: "Nội dung khác",
            className: "9A",
            birthDate: "2012-05-15",
            gender: "male",
            requestedEvent: "",
            catalogSelections: [otherContent],
          },
          {
            draftId: "VDV_CHUA_CHON",
            fullName: "Chỉ nhập nguyện vọng",
            className: "7A",
            birthDate: "2014-05-15",
            gender: "male",
            requestedEvent: content,
            catalogSelections: [],
          },
        ],
      },
      {
        draftId: "school-b-draft",
        schoolName: "Trường B",
        editionName: "2026",
        athletes: [
          {
            draftId: "VDV_B1",
            fullName: "Trần Cường",
            className: "7A",
            birthDate: "2014-05-15",
            gender: "male",
            requestedEvent: "",
            catalogSelections: [content],
          },
        ],
      },
    ],
  };
}
afterEach(() => {
  cleanup();
  localStorage.clear();
});
const pick = (code = content) =>
  fireEvent.change(screen.getByLabelText("Nội dung đăng ký"), {
    target: { value: code },
  });
it("filters exact saved content codes, preserves stable athlete/school identifiers and does not treat free text as registration", () => {
  const data = source();
  data.schools[0]!.athletes[0]!.catalogSelections = [content, content];
  const rows = competitionRegistrationRows(data, content);
  expect(rows.map((r) => r.athleteId)).toEqual(["VDV_A1", "VDV_A2", "VDV_B1"]);
  expect(rows[0]).toMatchObject({
    athleteName: "Nguyễn An",
    schoolCode: "THCS_A",
    schoolId: "school-a",
    schoolName: "Trường A",
    issue: "",
  });
  expect(
    competitionRegistrationRows(data, otherContent).map((r) => r.athleteId),
  ).toEqual(["VDV_KHAC"]);
  expect(
    competitionRegistrationRows({ ...data, catalogCodes: [] }, content),
  ).toEqual([]);
  expect(competitionRegistrationRows(data, "UNKNOWN")).toEqual([]);
  expect(competitionRegistrationRows(data, "")).toEqual([]);
});
it("keeps invalid registrations visible for review, matches renamed schools by stable ID and never invents a school code from an ambiguous name", () => {
  const data = source();
  data.directory[0]!.name = "Trường A đổi tên";
  data.schools[0]!.athletes[0]!.className = "4A";
  data.schools[0]!.athletes[0]!.birthDate = "2017-05-15";
  let rows = competitionRegistrationRows(data, content);
  expect(rows[0]!.schoolName).toBe("Trường A đổi tên");
  expect(rows[0]!.issue).not.toBe("");
  data.directory = [
    ...data.directory,
    {
      id: "duplicate-name",
      code: "THCS_B2",
      name: "Trường B",
      level: "THCS",
    },
  ];
  rows = competitionRegistrationRows(data, content);
  expect(rows[2]!.schoolCode).toBeNull();
});
it.each(["knockout", "round_robin"] as const)(
  "renders the five requested columns and filters the actual draw roster for %s",
  (mode) => {
    const data = source();
    if (mode === "knockout") {
      data.schools[0]!.athletes.push({
        ...data.schools[0]!.athletes[0]!,
        draftId: "VDV_A3",
        fullName: "VĐV A3",
      });
      data.schools[1]!.athletes.push(
        {
          ...data.schools[1]!.athletes[0]!,
          draftId: "VDV_B2",
          fullName: "VĐV B2",
        },
        {
          ...data.schools[1]!.athletes[0]!,
          draftId: "VDV_B3",
          fullName: "VĐV B3",
        },
      );
    }
    render(createElement(CompetitionWorkspace, { mode, source: data }));
    const table = screen.getByRole("table", {
      name: "Danh sách VĐV theo nội dung đăng ký",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["STT", "Mã VĐV", "Tên VĐV", "Mã trường", "Tên trường"]);
    expect(within(table).queryAllByRole("row")).toHaveLength(1);
    expect(screen.queryByLabelText(/Danh sách thử/)).toBeNull();
    pick();
    expect(within(table).getAllByRole("row")).toHaveLength(
      mode === "knockout" ? 7 : 4,
    );
    expect(within(table).getByText("VDV_A1")).toBeTruthy();
    expect(within(table).getAllByText("THCS_A")).toHaveLength(
      mode === "knockout" ? 3 : 2,
    );
    expect(within(table).queryByText("VDV_KHAC")).toBeNull();
    expect(document.body.textContent).not.toContain("040205001234");
    fireEvent.click(screen.getByRole("button", { name: "Tạo vòng đấu thử" }));
    expect(screen.queryByRole("alert")).toBeNull();
    if (mode === "knockout")
      expect(
        screen.getByRole("region", { name: "Sơ đồ đầy đủ các vòng" }),
      ).toBeTruthy();
    else
      expect(
        screen.getByRole("navigation", { name: "Chọn vòng thi đấu" }),
      ).toBeTruthy();
    pick(otherContent);
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(within(table).getByText("VDV_KHAC")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Chốt bản thử" })).toBeNull();
  },
);
it("invalidates a drawn roster immediately when saved registrations or school metadata change", () => {
  const data = source();
  const view = render(
    createElement(CompetitionWorkspace, { mode: "round_robin", source: data }),
  );
  pick();
  fireEvent.click(screen.getByRole("button", { name: "Tạo vòng đấu thử" }));
  expect(screen.getByRole("button", { name: "Chốt bản thử" })).toBeTruthy();
  const next = structuredClone(data);
  next.schools[1]!.athletes[0]!.catalogSelections = [];
  view.rerender(
    createElement(CompetitionWorkspace, { mode: "round_robin", source: next }),
  );
  expect(screen.queryByRole("button", { name: "Chốt bản thử" })).toBeNull();
  expect(
    screen.getByText(/Nguồn đăng ký hoặc cấu hình nội dung đã thay đổi/),
  ).toBeTruthy();
});
it("blocks drawing invalid student scopes and unresolved school codes instead of constructing incorrect participants", () => {
  const data = source();
  data.schools[0]!.athletes[0]!.gender = "female";
  const view = render(
    createElement(CompetitionWorkspace, { mode: "knockout", source: data }),
  );
  pick();
  fireEvent.click(screen.getByRole("button", { name: "Tạo vòng đấu thử" }));
  expect(screen.getByRole("alert").textContent).toContain(
    "hồ sơ không phù hợp",
  );
  const valid = source();
  valid.directory = [];
  view.rerender(
    createElement(CompetitionWorkspace, { mode: "knockout", source: valid }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Tạo vòng đấu thử" }));
  expect(screen.getByRole("alert").textContent).toContain(
    "trường chưa xác định mã",
  );
  expect(screen.queryByRole("button", { name: "Chốt bản thử" })).toBeNull();
});
it("shows each registered football athlete without fabricating teams for the draw", () => {
  const data = source();
  data.schools[0]!.athletes[0] = {
    ...data.schools[0]!.athletes[0]!,
    className: "4A",
    birthDate: "2017-05-15",
    catalogSelections: ["BD_TH"],
  };
  render(
    createElement(CompetitionWorkspace, { mode: "round_robin", source: data }),
  );
  pick("BD_TH");
  expect(screen.getByText("VDV_A1")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Tạo vòng đấu thử" }));
  expect(screen.getByRole("alert").textContent).toContain(
    "danh sách đội và thành viên",
  );
  expect(screen.queryByRole("button", { name: "Chốt bản thử" })).toBeNull();
});

it("preserves unambiguous legacy selections but never restores an explicitly removed selection", () => {
  const data = source();
  const athlete = data.schools[0]!.athletes[0]!;
  delete athlete.catalogSelections;
  athlete.eventSelections = [
    { sportId: "badminton", level: "THCS", eventLabel: "Đơn nam" },
  ];
  expect(
    competitionRegistrationRows(data, content).map((r) => r.athleteId),
  ).toContain("VDV_A1");
  athlete.catalogSelections = [];
  expect(
    competitionRegistrationRows(data, content).map((r) => r.athleteId),
  ).not.toContain("VDV_A1");
});
it("keeps renamed competition pages read-only for chief and removes them from admin", () => {
  render(createElement(App));
  fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
    target: { value: "admin" },
  });
  for (const name of ["Sơ đồ thi đấu", "Loại trực tiếp", "Vòng tròn"]) {
    expect(screen.queryByRole("button", { name })).toBeNull();
  }
  fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
    target: { value: "chief" },
  });
  expect(screen.queryByRole("button", { name: "Sơ đồ thi đấu" })).toBeNull();
  for (const name of ["Loại trực tiếp", "Vòng tròn"]) {
    fireEvent.click(
      within(screen.getByRole("navigation")).getByRole("button", { name }),
    );
    expect(document.querySelector(".staff-observation")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Tạo vòng đấu thử" }),
    ).toBeNull();
  }
});
it("splits a multi-sport athlete into each selected content without mixing rosters or merging names", () => {
  const data = source();
  const running = "DK_THCS_NAM_TC_100M";
  const swimming = "BOI_THCS_NAM_1213_TUDO50";
  const otherSwimming = "BOI_THCS_NAM_1213_TUDO100";
  data.catalogCodes = [...data.catalogCodes, running, swimming, otherSwimming];
  const athlete = data.schools[0]!.athletes[0]!;
  athlete.catalogSelections = [content, running, swimming, otherSwimming];
  data.schools[0]!.athletes[1]!.fullName = athlete.fullName;
  const before = JSON.stringify(data);
  for (const code of [running, swimming, otherSwimming]) {
    const rows = competitionRegistrationRows(data, code);
    expect(rows.map((row) => row.athleteId)).toEqual([athlete.draftId]);
    expect(rows[0]!.issue).toBe("");
  }
  expect(
    competitionRegistrationRows(data, content).map((row) => row.athleteId),
  ).toEqual(["VDV_A1", "VDV_A2", "VDV_B1"]);
  expect(competitionRegistrationRows(data, "BD_TH")).toEqual([]);
  expect(JSON.stringify(data)).toBe(before);
  athlete.catalogSelections = [content, running];
  expect(competitionRegistrationRows(data, swimming)).toEqual([]);
  expect(competitionRegistrationRows(data, otherSwimming)).toEqual([]);
  expect(competitionRegistrationRows(data, running)).toHaveLength(1);
});
