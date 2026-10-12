// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/react";
import { App } from "../apps/web/src/App.js";
import {
  DraftWriter,
  fromSheet,
  legacyStorageKey,
  loadDrafts,
  readDraftSnapshot,
  saveDrafts,
  storageKey,
  toSheet,
  upsertAthlete,
  type DraftLocks,
} from "../apps/web/src/registration-draft.js";
function locks(): DraftLocks {
  let tail = Promise.resolve();
  return {
    request: <T>(_name: string, run: () => T | Promise<T>) => {
      const result = tail.then(run);
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
}
const sheet = {
  format: "hkpd-school-registration-draft",
  formatVersion: 1,
  editionName: "Synthetic",
  schoolName: "School",
  athletes: [],
};
const add = (name: string) => ({
  draftId: `local-${name}`,
  fullName: name,
  className: "6",
  requestedEvent: "Synthetic",
});
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: locks(),
  });
});
afterEach(cleanup);
describe("LOG-01 independent tabs cannot overwrite another committed draft", () => {
  it("shows the stale-write error in the actual UI and retains the second session for export", async () => {
    const a = render(createElement(App)),
      b = render(createElement(App));
    const first = within(a.container),
      second = within(b.container);
    for (const [view, name] of [
      [first, "School A"],
      [second, "School B"],
    ] as const) {
      fireEvent.change(view.getByLabelText("Tên kỳ giải"), {
        target: { value: "Synthetic" },
      });
      fireEvent.change(view.getByLabelText("Tên trường"), {
        target: { value: name },
      });
      fireEvent.click(view.getByText("Tạo / mở phiếu nháp"));
    }
    fireEvent.change(second.getByLabelText("Họ và tên VĐV"), {
      target: { value: "Unsaved B" },
    });
    fireEvent.change(second.getByLabelText("Lớp / nhóm học"), {
      target: { value: "6" },
    });
    fireEvent.change(second.getByLabelText("Nội dung muốn tham gia"), {
      target: { value: "Synthetic" },
    });
    fireEvent.click(second.getByText("Thêm VĐV"));
    await waitFor(() => expect(second.getByText(/tab khác/)).toBeTruthy());
    expect(loadDrafts(localStorage).map((s) => s.schoolName)).toEqual([
      "School A",
    ]);
    expect(second.getByText("Unsaved B")).toBeTruthy();
    expect(second.getByText("Xuất phiếu đăng ký")).toBeTruthy();
    const close = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(close);
    expect(close.defaultPrevented).toBe(true);
  });
  it("serializes concurrent writers and rejects the stale tab while keeping its exportable input", async () => {
    const shared = locks(),
      initial = readDraftSnapshot(localStorage);
    const a = [fromSheet(sheet)],
      b = [fromSheet(sheet)];
    a[0] = upsertAthlete(a[0]!, add("A"));
    b[0] = upsertAthlete(b[0]!, add("B"));
    const tabA = new DraftWriter(localStorage, initial, shared),
      tabB = new DraftWriter(localStorage, initial, shared);
    const results = await Promise.allSettled([tabA.save(a), tabB.save(b)]);
    expect(results[0]!.status).toBe("fulfilled");
    expect(results[1]!.status).toBe("rejected");
    expect(loadDrafts(localStorage)[0]!.athletes[0]!.fullName).toBe("A");
    expect(toSheet(b[0]!).athletes[0]!.fullName).toBe("B");
    await expect(tabB.save(b)).rejects.toThrow("tab khác");
  });
  it("preserves queued writes from the same tab and captures payload before await", async () => {
    const writer = new DraftWriter(
      localStorage,
      readDraftSnapshot(localStorage),
      locks(),
    );
    const first = [fromSheet(sheet)];
    const second = [upsertAthlete(first[0]!, add("A"))];
    const saveA = writer.save(first),
      saveB = writer.save(second);
    second[0]!.athletes[0]!.fullName = "Mutated";
    await Promise.all([saveA, saveB]);
    expect(readDraftSnapshot(localStorage).revision).toBe(2);
    expect(loadDrafts(localStorage)[0]!.athletes[0]!.fullName).toBe("A");
    expect(loadDrafts(localStorage)[0]!.draftId).toBe(first[0]!.draftId);
  });
  it("migrates portable v1 data only after success, retains old bytes and stable new local IDs", async () => {
    const legacy = JSON.stringify([sheet]);
    localStorage.setItem(legacyStorageKey, legacy);
    const initial = readDraftSnapshot(localStorage);
    await saveDrafts(localStorage, initial.drafts, initial, locks());
    expect(localStorage.getItem(legacyStorageKey)).toBe(legacy);
    expect(loadDrafts(localStorage)[0]!.draftId).toBe(
      initial.drafts[0]!.draftId,
    );
    localStorage.setItem(
      legacyStorageKey,
      JSON.stringify([{ ...sheet, schoolName: "Old-tab edit" }]),
    );
    expect(loadDrafts(localStorage)[0]!.schoolName).toBe("School");
    expect(JSON.stringify(toSheet(loadDrafts(localStorage)[0]!))).not.toContain(
      "draftId",
    );
  });
  it("detects changed legacy bytes even though both snapshots have revision zero", async () => {
    localStorage.setItem(legacyStorageKey, JSON.stringify([sheet]));
    const initial = readDraftSnapshot(localStorage);
    localStorage.setItem(
      legacyStorageKey,
      JSON.stringify([{ ...sheet, schoolName: "Changed" }]),
    );
    await expect(
      saveDrafts(localStorage, initial.drafts, initial, locks()),
    ).rejects.toThrow("tab khác");
    expect(localStorage.getItem(storageKey)).toBeNull();
  });
  it("does not overwrite corrupt bytes or use unsafe fallback without a lock manager", async () => {
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: undefined,
    });
    await expect(
      saveDrafts(
        localStorage,
        [fromSheet(sheet)],
        readDraftSnapshot(localStorage),
      ),
    ).rejects.toThrow("hỗ trợ lưu an toàn");
    expect(localStorage.getItem(storageKey)).toBeNull();
    localStorage.setItem(storageKey, "corrupt");
    await expect(
      saveDrafts(
        localStorage,
        [fromSheet(sheet)],
        { revision: 0, token: null },
        locks(),
      ),
    ).rejects.toThrow();
    expect(localStorage.getItem(storageKey)).toBe("corrupt");
  });
  it("stops after quota failure without attempting subsequent stale writes", async () => {
    let writes = 0;
    const storage = {
      getItem: () => null,
      setItem: () => {
        writes++;
        throw new Error("quota");
      },
    };
    const writer = new DraftWriter(
      storage,
      { revision: 0, token: null },
      locks(),
    );
    const input = [fromSheet(sheet)];
    await expect(writer.save(input)).rejects.toThrow("quota");
    await expect(writer.save(input)).rejects.toThrow("quota");
    expect(writes).toBe(1);
  });
});
