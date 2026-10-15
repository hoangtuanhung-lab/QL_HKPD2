// @vitest-environment jsdom
import { createElement } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../apps/web/src/App.js";
import {
  carryTournament,
  initialTournaments,
  validateTournamentState,
} from "../apps/web/src/tournament-state.js";
import {
  saveDrafts,
  readDraftSnapshot,
  storageKey,
  type SchoolDraft,
} from "../apps/web/src/registration-draft.js";
const locks = {
  request: async <T>(_name: string, action: () => T | Promise<T>) => action(),
};
const draft: SchoolDraft = {
  draftId: "school-source",
  editionName: "2026",
  schoolName: "Trường nguồn",
  athletes: [
    {
      draftId: "athlete-source",
      fullName: "VĐV nguồn",
      className: "4A",
      birthDate: "2016-05-15",
      gender: "male",
      requestedEvent: "Bóng đá",
      catalogSelections: ["BD_TH"],
    },
  ],
};
const sourceState = () => {
  const state = initialTournaments([draft]);
  state.editions[0]!.staff = [
    {
      id: "person",
      name: "Trọng tài nguồn",
      role: "referee",
      sportCodes: ["BD"],
      needsReview: false,
    },
  ];
  return state;
};
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("Tournament carry-forward and current edition", () => {
  it("supports each independent selection combination, preserves sources and creates distinct draft/athlete IDs", () => {
    for (const catalog of [false, true])
      for (const staff of [false, true])
        for (const registrations of [false, true]) {
          const state = sourceState(),
            before = JSON.stringify({ state, draft });
          const next = carryTournament(
            state,
            [draft],
            state.currentId,
            "2027",
            2027,
            { catalog, staff, registrations },
          );
          expect(JSON.stringify({ state, draft })).toBe(before);
          expect(next.state.currentId).toBe(state.currentId);
          expect(next.target.catalogCodes).toHaveLength(catalog ? 133 : 0);
          expect(next.target.staff).toHaveLength(staff ? 1 : 0);
          if (staff) {
            expect(next.target.staff[0]!.needsReview).toBe(true);
            expect(next.target.staff[0]!.sportCodes).toEqual(
              catalog ? ["BD"] : [],
            );
          }
          expect(next.drafts).toHaveLength(registrations ? 2 : 1);
          if (registrations) {
            const copied = next.drafts[1]!;
            expect(copied.draftId).not.toBe(draft.draftId);
            expect(copied.athletes[0]!.draftId).not.toBe(
              draft.athletes[0]!.draftId,
            );
            expect(copied.editionName).toBe("2027");
            expect(copied.athletes[0]!.catalogSelections).toEqual(
              catalog ? ["BD_TH"] : [],
            );
            expect(copied.athletes[0]!.note).toContain("cần rà soát");
          }
        }
  });
  it("rejects repeated targets, invalid years and missing source before mutating state", () => {
    const state = sourceState(),
      options = { catalog: true, staff: true, registrations: true };
    for (const [id, name, year] of [
      [state.currentId, "2026", 2027],
      [state.currentId, "2027", 2026],
      ["missing", "2027", 2027],
    ] as const)
      expect(() =>
        carryTournament(state, [draft], id, name, year, options),
      ).toThrow();
    const next = carryTournament(
      state,
      [draft],
      state.currentId,
      "2027",
      2027,
      options,
    );
    expect(() =>
      carryTournament(
        next.state,
        next.drafts,
        state.currentId,
        " 2027 ",
        2028,
        options,
      ),
    ).toThrow();
  });
  it("saves drafts, copied rosters/catalog and active edition atomically with CAS; rejects stale and quota-failed writes", async () => {
    const next = carryTournament(
      sourceState(),
      [draft],
      "edition-2026",
      "2027",
      2027,
      { catalog: true, staff: true, registrations: true },
    );
    next.state.currentId = next.target.id;
    const old = readDraftSnapshot(localStorage);
    await saveDrafts(localStorage, next.drafts, old, locks, next.state);
    const saved = readDraftSnapshot(localStorage);
    expect(saved.tournaments).toEqual(next.state);
    expect(saved.drafts).toEqual(next.drafts);
    await expect(
      saveDrafts(localStorage, [draft], old, locks, sourceState()),
    ).rejects.toThrow();
    const bytes = localStorage.getItem(storageKey);
    const failing = {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: () => {
        throw Error("quota");
      },
    };
    await expect(
      saveDrafts(failing, [draft], saved, locks, sourceState()),
    ).rejects.toThrow("quota");
    expect(localStorage.getItem(storageKey)).toBe(bytes);
    expect(() =>
      validateTournamentState(
        { ...next.state, currentId: "missing" },
        next.drafts,
      ),
    ).toThrow();
  });
  it("school and staff can see only the active edition, while an admin can inspect previous drafts", async () => {
    const next = carryTournament(
      sourceState(),
      [draft],
      "edition-2026",
      "2027",
      2027,
      { catalog: true, staff: true, registrations: true },
    );
    next.state.currentId = next.target.id;
    await saveDrafts(
      localStorage,
      next.drafts,
      readDraftSnapshot(localStorage),
      locks,
      next.state,
    );
    render(createElement(App));
    expect(screen.getByLabelText("Trường đăng ký:").textContent).toContain(
      "2027",
    );
    expect(screen.getByLabelText("Trường đăng ký:").textContent).not.toContain(
      "2026",
    );
    expect(
      (screen.getByLabelText("Tên kỳ giải") as HTMLInputElement).readOnly,
    ).toBe(true);
    fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
      target: { value: "admin" },
    });
    expect(
      within(screen.getByRole("navigation")).queryByRole("button", {
        name: "Đăng ký VĐV",
      }),
    ).toBeNull();
    expect(screen.getByRole("table").textContent).toContain("2026");
    expect(screen.getByRole("table").textContent).toContain("2027");
    cleanup();
    render(
      createElement(App, {
        session: {
          editionId: "edition-2026",
          actor: {
            id: "staff",
            approved: true,
            assignments: [
              { editionId: "edition-2026", role: "referee", sportId: "BD" },
            ],
          },
        },
      }),
    );
    fireEvent.click(
      within(screen.getByRole("navigation")).getByRole("button", {
        name: "Danh mục môn thi",
      }),
    );
    expect(screen.getByRole("status").textContent).toBe("0 nội dung phù hợp");
  });
  it("requires preview/confirmation before creating a tournament and persists reload", async () => {
    vi.stubGlobal("navigator", { ...navigator, locks });
    await saveDrafts(
      localStorage,
      [draft],
      readDraftSnapshot(localStorage),
      locks,
      sourceState(),
    );
    const view = render(createElement(App));
    fireEvent.change(screen.getByLabelText("Xem giao diện vai trò"), {
      target: { value: "admin" },
    });
    fireEvent.click(
      within(screen.getByRole("navigation")).getByRole("button", {
        name: "Quản lý giải",
      }),
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Xem trước kết chuyển",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    fireEvent.change(screen.getByLabelText("Tên giải mới"), {
      target: { value: "2027" },
    });
    fireEvent.click(screen.getByLabelText("Danh mục thi đấu"));
    fireEvent.click(screen.getByLabelText("Trọng tài và môn được giao"));
    fireEvent.click(screen.getByLabelText("Dữ liệu đăng ký của nhà trường"));
    fireEvent.click(
      screen.getByRole("button", { name: "Xem trước kết chuyển" }),
    );
    expect(readDraftSnapshot(localStorage).tournaments!.editions).toHaveLength(
      1,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Xác nhận tạo giải mới" }),
    );
    await waitFor(() =>
      expect(
        readDraftSnapshot(localStorage).tournaments!.editions,
      ).toHaveLength(2),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Đặt 2027 làm giải hiện tại" }),
    );
    await waitFor(() =>
      expect(readDraftSnapshot(localStorage).tournaments!.currentId).not.toBe(
        "edition-2026",
      ),
    );
    view.unmount();
    render(createElement(App));
    expect(screen.getByLabelText("Trường đăng ký:").textContent).toContain(
      "2027",
    );
    expect(
      screen.getByRole("heading", {
        name: "HỘI KHỎE PHÙ ĐỔNG XÃ QUẢNG PHÚ NĂM 2027",
      }),
    ).toBeTruthy();
  });
});
