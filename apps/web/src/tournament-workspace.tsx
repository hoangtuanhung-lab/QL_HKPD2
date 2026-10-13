import { useState, type FormEvent } from "react";
import { athleteCatalog } from "./athlete-catalog.generated.js";
import {
  carryTournament,
  type TournamentState,
  type CarryOptions,
} from "./tournament-state.js";
import { newDraftId, type SchoolDraft } from "./registration-draft.js";
export function TournamentWorkspace({
  state,
  drafts,
  busy,
  onSave,
}: {
  state: TournamentState;
  drafts: SchoolDraft[];
  busy: boolean;
  onSave: (state: TournamentState, drafts: SchoolDraft[]) => Promise<void>;
}) {
  const [sourceId, setSourceId] = useState(state.currentId),
    [name, setName] = useState(""),
    [year, setYear] = useState(
      state.editions.find((e) => e.id === state.currentId)!.year + 1,
    );
  const [options, setOptions] = useState<CarryOptions>({
    catalog: false,
    staff: false,
    registrations: false,
  });
  const [preview, setPreview] = useState<ReturnType<
      typeof carryTournament
    > | null>(null),
    [baseline, setBaseline] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [staffName, setStaffName] = useState(""),
    [staffRole, setStaffRole] = useState<"leader" | "referee">("referee"),
    [staffSports, setStaffSports] = useState<string[]>([]);
  const source =
    state.editions.find((e) => e.id === sourceId) ?? state.editions[0]!;
  const sports = [
    ...new Map(
      athleteCatalog
        .filter((e) => source.catalogCodes.includes(e.code))
        .map((e) => [e.sportCode, e.sportName]),
    ).entries(),
  ];
  async function save(next: TournamentState, nextDrafts = drafts) {
    setError("");
    try {
      await onSave(next, nextDrafts);
      return true;
    } catch (failure) {
      setError((failure as Error).message);
      return false;
    }
  }
  function review(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      setPreview(
        carryTournament(state, drafts, source.id, name, year, options),
      );
      setBaseline(JSON.stringify({ state, drafts }));
    } catch (failure) {
      setError((failure as Error).message);
    }
  }
  async function apply() {
    if (!preview) return;
    if (baseline !== JSON.stringify({ state, drafts })) {
      setError("Dữ liệu đã thay đổi. Hủy xem trước và rà soát lại.");
      return;
    }
    if (await save(preview.state, preview.drafts)) {
      setPreview(null);
      setName("");
      setMessage(
        "Đã tạo giải mới. Chọn Đặt làm giải hiện tại khi sẵn sàng mở đăng ký.",
      );
    }
  }
  async function addStaff(event: FormEvent) {
    event.preventDefault();
    const next = structuredClone(state),
      edition = next.editions.find((e) => e.id === source.id)!;
    edition.staff.push({
      id: newDraftId(),
      name: staffName.trim(),
      role: staffRole,
      sportCodes: staffSports.filter((code) =>
        sports.some(([s]) => s === code),
      ),
      needsReview: true,
    });
    if (await save(next)) {
      setStaffName("");
      setStaffSports([]);
    }
  }
  return (
    <section className="role-panel tournament-workspace">
      <h1>Quản lý giải và kết chuyển</h1>
      <p>
        Nhà trường và trọng tài chỉ quan sát giải hiện tại. Giải cũ được giữ
        riêng để quản trị đối chiếu.
      </p>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Giải đấu</th>
              <th>Năm</th>
              <th>Nội dung</th>
              <th>Trọng tài nháp</th>
              <th>Phiếu trường</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {state.editions.map((e) => (
              <tr key={e.id}>
                <td>{e.name}</td>
                <td>{e.year}</td>
                <td>{e.catalogCodes.length}</td>
                <td>{e.staff.length}</td>
                <td>
                  {
                    drafts.filter(
                      (d) => state.draftEditions[d.draftId] === e.id,
                    ).length
                  }
                </td>
                <td>
                  {e.id === state.currentId ? (
                    "Giải hiện tại"
                  ) : (
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy || Boolean(preview)}
                      aria-label={`Đặt ${e.name} làm giải hiện tại`}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Đặt ${e.name} làm giải hiện tại? Nhà trường và trọng tài sẽ chỉ thấy giải này.`,
                          )
                        )
                          void save({ ...state, currentId: e.id });
                      }}
                    >
                      Đặt làm giải hiện tại
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={review}>
        <h2>Tạo giải mới từ giải trước</h2>
        <div className="role-catalog-filters">
          <label>
            Giải nguồn
            <select
              value={sourceId}
              disabled={busy || Boolean(preview)}
              onChange={(e) => {
                setSourceId(e.target.value);
                setStaffSports([]);
              }}
            >
              {state.editions.map((e) => (
                <option value={e.id} key={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tên giải mới
            <input
              required
              value={name}
              disabled={busy || Boolean(preview)}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Hội khỏe Quảng Phú 2027"
            />
          </label>
          <label>
            Năm giải mới
            <input
              required
              type="number"
              min={source.year + 1}
              max="2100"
              value={year}
              disabled={busy || Boolean(preview)}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>
        </div>
        <fieldset disabled={busy || Boolean(preview)} className="carry-options">
          <legend>Chọn dữ liệu kết chuyển</legend>
          {(
            [
              ["catalog", "Danh mục thi đấu"],
              ["staff", "Trọng tài và môn được giao"],
              ["registrations", "Dữ liệu đăng ký của nhà trường"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={options[key]}
                onChange={(e) =>
                  setOptions({ ...options, [key]: e.target.checked })
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
        <p className="footer-note">
          Không kế thừa kết quả, trạng thái duyệt hoặc quyền đăng nhập. Nếu
          không chọn danh mục, giải mới chưa có nội dung; môn đăng ký/phân công
          kế thừa được để trống để chọn lại.
        </p>
        <button type="submit" disabled={busy || Boolean(preview)}>
          Xem trước kết chuyển
        </button>
      </form>
      {preview && (
        <section className="notice" aria-label="Xem trước kết chuyển">
          <h2>Xác nhận tạo {preview.target.name}</h2>
          <p>
            {preview.target.catalogCodes.length} nội dung ·{" "}
            {preview.target.staff.length} trọng tài cần rà soát ·{" "}
            {preview.drafts.length - drafts.length} phiếu trường mới ·{" "}
            {preview.drafts
              .slice(drafts.length)
              .reduce((n, d) => n + d.athletes.length, 0)}{" "}
            VĐV nháp
          </p>
          <p>Giải hiện tại chưa đổi. Dữ liệu giải nguồn được giữ nguyên.</p>
          <div className="row-actions">
            <button type="button" disabled={busy} onClick={() => void apply()}>
              Xác nhận tạo giải mới
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              Hủy xem trước
            </button>
          </div>
        </section>
      )}
      <form onSubmit={addStaff}>
        <h2>Danh sách trọng tài nháp — {source.name}</h2>
        <p>
          Danh sách dùng để chuẩn bị và kết chuyển; chưa cấp quyền truy cập.
        </p>
        <div className="role-catalog-filters">
          <label>
            Họ tên trọng tài
            <input
              required
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              disabled={busy || Boolean(preview)}
            />
          </label>
          <label>
            Vai trò trọng tài
            <select
              value={staffRole}
              onChange={(e) =>
                setStaffRole(e.target.value as "leader" | "referee")
              }
              disabled={busy || Boolean(preview)}
            >
              <option value="referee">Trọng tài</option>
              <option value="leader">Tổ trưởng trọng tài</option>
            </select>
          </label>
        </div>
        <fieldset className="carry-options" disabled={busy || Boolean(preview)}>
          <legend>Môn dự kiến phân công</legend>
          {sports.map(([code, label]) => (
            <label key={code}>
              <input
                type="checkbox"
                checked={staffSports.includes(code)}
                onChange={(e) =>
                  setStaffSports(
                    e.target.checked
                      ? [...staffSports, code]
                      : staffSports.filter((c) => c !== code),
                  )
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={busy || Boolean(preview)}>
          Thêm trọng tài nháp
        </button>
        <ul>
          {source.staff.map((person) => (
            <li key={person.id}>
              {person.name} ·{" "}
              {person.role === "leader" ? "Tổ trưởng" : "Trọng tài"} ·{" "}
              {person.sportCodes.join(", ") || "Chưa chọn môn"} · Cần rà soát
            </li>
          ))}
        </ul>
      </form>
    </section>
  );
}
