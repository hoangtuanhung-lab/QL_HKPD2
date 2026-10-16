// @vitest-environment jsdom
import { createElement as h } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";
import { MatchResultsWorkspace } from "../apps/web/src/match-results-workspace.js";
import {
  roundRobinProgress,
  type EventDraw,
  type ResultMatch,
} from "../apps/web/src/match-results.js";
import type {
  LiveState,
  LiveRepository,
} from "../apps/web/src/live-repository.js";
const code = "CL_THCS_NAM_1213_DONNAM";
const entrants = [
  { id: "a", label: "An", schoolId: "s1", members: ["a1"] },
  { id: "b", label: "Bình", schoolId: "s2", members: ["b1"] },
  { id: "c", label: "Cường", schoolId: "s1", members: ["c1"] },
];
const draw: EventDraw = {
  code,
  mode: "round_robin",
  revision: 1,
  entrants,
  win_points: 2,
  draw_points: 0.5,
  loss_points: 0,
  allow_draw: true,
};
const match = (values: Partial<ResultMatch> = {}): ResultMatch => ({
  id: "m1",
  code,
  round_no: 1,
  match_no: 1,
  side1: "a",
  side2: "b",
  source1: null,
  source2: null,
  score1: null,
  score2: null,
  status: "not_started",
  revision: 0,
  reopen_requested: false,
  winner: null,
  bye: false,
  log: [],
  ...values,
});
const data = (): LiveState => ({
  editionId: "edition-2026",
  catalogCodes: [code, "BOI_THCS_NAM_1213_TUDO50"],
  schools: [
    {
      id: "s1",
      code: "S1",
      name: "Trường A",
      level: "THCS",
      revision: 1,
      status: "approved",
      note: "",
      athletes: [],
    },
    {
      id: "s2",
      code: "S2",
      name: "Trường B",
      level: "THCS",
      revision: 1,
      status: "approved",
      note: "",
      athletes: [],
    },
  ],
  operations: [],
  draws: [draw],
  matches: [
    match(),
    match({ id: "m2", match_no: 2, round_no: 2, side1: "b", side2: "c" }),
  ],
});
function show(role: "admin" | "chief" | "referee", state = data()) {
  const command = vi.fn(async () => state),
    create = vi.fn(async () => state),
    repo = {
      matchCommand: command,
      createMatches: create,
    } as unknown as LiveRepository;
  const props = {
    role,
    sports: ["CL"],
    data: state,
    repository: repo,
    busy: false,
    onDirty: vi.fn(),
    save: async (action: () => Promise<LiveState>) => {
      await action();
      return true;
    },
  };
  const view = render(h(MatchResultsWorkspace, props));
  fireEvent.change(screen.getByLabelText("Nội dung thi đấu"), {
    target: { value: code },
  });
  return { command, create, props, view };
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("renders the requested thirteen columns, scoped content and referee-only request actions", async () => {
  const { command } = show("referee");
  expect(screen.queryByLabelText("Môn thi đấu")).toBeNull();
  expect(
    within(screen.getByLabelText("Nội dung thi đấu")).queryByRole("option", {
      name: /BOI/,
    }),
  ).toBeNull();
  expect(
    screen
      .getAllByRole("columnheader")
      .slice(0, 13)
      .map((x) => x.textContent),
  ).toEqual([
    "STT",
    "Môn",
    "Nội dung",
    "Vòng/trận",
    "Đội/Cặp/VĐV 1",
    "Trường 1",
    "Kết quả 1",
    "Đội/Cặp/VĐV 2",
    "Trường 2",
    "Kết quả 2",
    "Trạng thái",
    "Thao tác",
    "Log",
  ]);
  expect(screen.queryByRole("button", { name: "Xác nhận" })).toBeNull();
  fireEvent.change(screen.getByLabelText("Kết quả 1 trận 1"), {
    target: { value: "2" },
  });
  fireEvent.change(screen.getByLabelText("Kết quả 2 trận 1"), {
    target: { value: "1" },
  });
  fireEvent.click(screen.getAllByRole("button", { name: "Xin xác nhận" })[0]!);
  await waitFor(() =>
    expect(command).toHaveBeenCalledWith(
      expect.objectContaining({ id: "m1", revision: 0 }),
      { action: "submit", score1: 2, score2: 1, reason: "" },
    ),
  );
});
it("keeps pending/confirmed scores locked until the leader rejects, and supports request re-entry with a reason", async () => {
  const state = data();
  state.matches = [
    match({ status: "confirmed", score1: 2, score2: 1, revision: 2 }),
  ];
  const { command } = show("referee", state);
  expect(screen.queryByLabelText("Kết quả 1 trận 1")).toBeNull();
  vi.spyOn(window, "prompt").mockReturnValue("Đối chiếu lại");
  fireEvent.click(screen.getByRole("button", { name: "Xin nhập lại" }));
  await waitFor(() =>
    expect(command).toHaveBeenCalledWith(
      expect.objectContaining({ revision: 2 }),
      { action: "request_reentry", reason: "Đối chiếu lại" },
    ),
  );
});
it("lets the scoped chief confirm/reject without editing scores, exposes logs and round/match navigation", async () => {
  const state = data();
  state.draws = [{ ...draw, mode: "knockout", allow_draw: false }];
  state.matches = [
    match({
      status: "pending",
      score1: 2,
      score2: 1,
      revision: 1,
      log: [
        {
          action: "submit",
          actor_id: "referee",
          actor_email: "ref@example.invalid",
          reason: "",
          at: "2026-10-16T00:00:00Z",
        },
      ],
    }),
  ];
  const { command } = show("chief", state);
  expect(screen.queryByLabelText("Môn thi đấu")).toBeNull();
  expect(screen.getByLabelText("Vòng")).toBeTruthy();
  expect(screen.queryByLabelText("Kết quả 1 trận 1")).toBeNull();
  expect(screen.getByText(/ref@example.invalid/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
  await waitFor(() =>
    expect(command).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "m1" }),
      { action: "confirm", reason: "" },
    ),
  );
  vi.spyOn(window, "prompt").mockReturnValue("Sai tỷ số");
  fireEvent.click(screen.getByRole("button", { name: "Từ chối" }));
  await waitFor(() =>
    expect(command).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "m1" }),
      { action: "reject", reason: "Sai tỷ số" },
    ),
  );
});
it("requires the chief to configure points before creating fixtures, uses only approved registrations", async () => {
  const state = data();
  state.draws = [];
  state.matches = [];
  state.schools[0]!.athletes = [
    {
      draftId: "a1",
      athleteCode: "V1",
      fullName: "An",
      className: "7",
      requestedEvent: "",
      catalogSelections: [code],
    },
    {
      draftId: "a2",
      athleteCode: "V2",
      fullName: "Bình",
      className: "7",
      requestedEvent: "",
      catalogSelections: [code],
    },
  ];
  state.schools[1]!.athletes = [
    {
      draftId: "a3",
      athleteCode: "V3",
      fullName: "Cường",
      className: "7",
      requestedEvent: "",
      catalogSelections: [code],
    },
  ];
  const { create } = show("chief", state);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Tạo danh sách trận" }));
  expect(create).not.toHaveBeenCalled();
  for (const [label, value] of [
    ["Điểm thắng", "2"],
    ["Điểm hòa", "0.5"],
    ["Điểm thua", "0"],
  ])
    fireEvent.change(screen.getByLabelText(label!), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Tạo danh sách trận" }));
  await waitFor(() =>
    expect(create).toHaveBeenCalledWith(
      code,
      0,
      expect.objectContaining({
        winPoints: 2,
        drawPoints: 0.5,
        lossPoints: 0,
        entrants: expect.arrayContaining([
          expect.objectContaining({ members: ["a1"] }),
        ]),
      }),
    ),
  );
});
it("supports match selection/previous/next while preserving unsent edits on cancellation", () => {
  show("referee");
  fireEvent.change(screen.getByLabelText("Chọn trận"), {
    target: { value: "m1" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Trận tiếp →" }));
  expect((screen.getByLabelText("Chọn trận") as HTMLSelectElement).value).toBe(
    "m2",
  );
  fireEvent.change(screen.getByLabelText("Kết quả 1 trận 2"), {
    target: { value: "2" },
  });
  vi.spyOn(window, "confirm").mockReturnValue(false);
  fireEvent.click(screen.getByRole("button", { name: "← Trận trước" }));
  expect((screen.getByLabelText("Chọn trận") as HTMLSelectElement).value).toBe(
    "m2",
  );
});
it("counts wins/draws/losses and configured points after each confirmed match, rolls back rejected results exactly", () => {
  const matches = [
    match({ status: "confirmed", score1: 2, score2: 1 }),
    match({
      id: "m2",
      match_no: 2,
      side1: "b",
      side2: "c",
      status: "pending",
      score1: 2,
      score2: 0,
    }),
    match({
      id: "m3",
      match_no: 3,
      side1: "a",
      side2: "c",
      status: "confirmed",
      score1: 1,
      score2: 1,
    }),
  ];
  expect(roundRobinProgress(draw, matches, 1)[0]).toMatchObject({
    wins: 1,
    losses: 0,
    points: 2,
    played: 1,
  });
  expect(roundRobinProgress(draw, matches)[0]).toMatchObject({
    wins: 1,
    draws: 1,
    points: 2.5,
    played: 2,
  });
  matches[0]!.status = "reentry";
  expect(roundRobinProgress(draw, matches)[0]).toMatchObject({
    wins: 0,
    draws: 1,
    points: 0.5,
    played: 1,
  });
  expect(roundRobinProgress(draw, matches)[1]!.played).toBe(0);
});
it("does not expose editing or approval from the read-only results view", () => {
  const state = data();
  state.matches = [
    match({ status: "confirmed", score1: 2, score2: 1 }),
    match({ id: "m2", match_no: 2, status: "pending", score1: 1, score2: 0 }),
  ];
  render(
    h(MatchResultsWorkspace, {
      role: "admin",
      sports: [],
      readOnly: true,
      data: state,
      repository: {} as LiveRepository,
      busy: false,
      save: async () => true,
      onDirty: () => {},
    }),
  );
  fireEvent.change(screen.getByLabelText("Nội dung thi đấu"), {
    target: { value: code },
  });
  expect(screen.queryByRole("button", { name: "Xác nhận" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Xin xác nhận" })).toBeNull();
  expect(
    within(screen.getByLabelText("Chọn trận")).queryByRole("option", {
      name: /Trận 2/,
    }),
  ).toBeNull();
});
it("freezes downstream score inputs while an earlier confirmed result requests re-entry", () => {
  const state = data();
  state.draws = [{ ...draw, mode: "knockout" }];
  state.matches = [
    match({
      id: "source",
      status: "confirmed",
      reopen_requested: true,
      score1: 2,
      score2: 1,
    }),
    match({
      id: "final",
      round_no: 2,
      match_no: 2,
      source1: "source",
      source2: null,
    }),
  ];
  show("referee", state);
  expect(screen.queryByLabelText("Kết quả 1 trận 2")).toBeNull();
});
it("keeps one-sided running/swimming/performance results operational with an explicit unit", async () => {
  const state = data(),
    performance = "BOI_THCS_NAM_1213_TUDO50";
  state.draws = [
    { ...draw, code: performance, mode: "performance", score_unit: "giây" },
  ];
  state.matches = [match({ code: performance, side2: null })];
  const command = vi.fn(async () => state);
  render(
    h(MatchResultsWorkspace, {
      role: "referee",
      sports: ["BOI"],
      data: state,
      repository: { matchCommand: command } as unknown as LiveRepository,
      busy: false,
      save: async (f) => {
        await f();
        return true;
      },
      onDirty: () => {},
    }),
  );
  fireEvent.change(screen.getByLabelText("Nội dung thi đấu"), {
    target: { value: performance },
  });
  expect(screen.queryByLabelText("Kết quả 2 trận 1")).toBeNull();
  fireEvent.change(screen.getByLabelText("Kết quả 1 trận 1"), {
    target: { value: "12.5" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Xin xác nhận" }));
  await waitFor(() =>
    expect(command).toHaveBeenCalledWith(expect.anything(), {
      action: "submit",
      score1: 12.5,
      reason: "",
    }),
  );
});
it("warns before abandoning a mode-only or allow-draw-only configuration change", () => {
  const state = data();
  state.draws = [];
  state.matches = [];
  const { props } = show("chief", state);
  fireEvent.change(screen.getByLabelText("Thể thức"), {
    target: { value: "knockout" },
  });
  expect(props.onDirty).toHaveBeenLastCalledWith(true);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  fireEvent.change(screen.getByLabelText("Nội dung thi đấu"), {
    target: { value: "" },
  });
  expect(confirm).toHaveBeenCalled();
  expect(
    (screen.getByLabelText("Nội dung thi đấu") as HTMLSelectElement).value,
  ).toBe(code);
  fireEvent.change(screen.getByLabelText("Thể thức"), {
    target: { value: "round_robin" },
  });
  fireEvent.click(screen.getByLabelText("Cho phép hòa"));
  expect(props.onDirty).toHaveBeenLastCalledWith(true);
});
it("requires adding or clearing an unfinished team before creating otherwise valid fixtures", async () => {
  const state = data(),
    pairCode = "CL_THCS_NAM_1213_DOINAM";
  state.catalogCodes = [pairCode];
  state.draws = [];
  state.matches = [];
  state.schools.push({
    ...state.schools[0]!,
    id: "s3",
    code: "S3",
    name: "Trường C",
  });
  state.schools.forEach((school, index) => {
    school.athletes = [1, 2].map((member) => ({
      draftId: `p${index}${member}`,
      athleteCode: `V${index}${member}`,
      fullName: `VĐV ${index}${member}`,
      className: "7",
      requestedEvent: "",
      catalogSelections: [pairCode],
    }));
  });
  const { create } = show("chief", state);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.change(screen.getByLabelText("Nội dung thi đấu"), {
    target: { value: pairCode },
  });
  for (const index of [0, 1, 2]) {
    fireEvent.change(screen.getByLabelText("Tên đội/cặp"), {
      target: { value: `Cặp ${index}` },
    });
    for (const member of [1, 2])
      fireEvent.click(
        screen.getByRole("checkbox", {
          name: new RegExp(`V${index}${member} —`),
        }),
      );
    fireEvent.click(screen.getByRole("button", { name: "Thêm đội/cặp" }));
  }
  for (const [label, value] of [
    ["Điểm thắng", "2"],
    ["Điểm hòa", "1"],
    ["Điểm thua", "0"],
  ])
    fireEvent.change(screen.getByLabelText(label!), { target: { value } });
  fireEvent.change(screen.getByLabelText("Tên đội/cặp"), {
    target: { value: "Đội chưa thêm" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Tạo danh sách trận" }));
  expect((await screen.findByRole("alert")).textContent).toMatch(
    /Đội\/cặp đang soạn/,
  );
  expect(create).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Tên đội/cặp"), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Tạo danh sách trận" }));
  await waitFor(() =>
    expect(create).toHaveBeenCalledWith(
      pairCode,
      0,
      expect.objectContaining({
        entrants: expect.arrayContaining([
          expect.objectContaining({ label: "Cặp 2" }),
        ]),
      }),
    ),
  );
});
