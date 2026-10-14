import { useEffect, useState, type FormEvent } from "react";
import { athleteCatalog } from "./athlete-catalog.generated.js";
import type { ManagedSchool, useAdminSettings } from "./admin-settings.js";
import type { SchoolDraft } from "./registration-draft.js";
const sports = [
  ...new Map(athleteCatalog.map((e) => [e.sportCode, e.sportName])).entries(),
];
const emptySchool = {
  id: "",
  code: "",
  name: "",
  level: "TH" as ManagedSchool["level"],
};
export function AdminWorkspace({
  page,
  model,
  online,
  drafts,
  onDirty,
}: {
  page: "Quản lý trường" | "Danh mục môn thi";
  model: ReturnType<typeof useAdminSettings>;
  online: boolean;
  drafts: readonly SchoolDraft[];
  onDirty: (dirty: boolean) => void;
}) {
  const { snapshot, busy, error, save, refresh } = model;
  const [school, setSchool] = useState(emptySchool);
  const [selected, setSelected] = useState<string[]>([]);
  const [sport, setSport] = useState("");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [gender, setGender] = useState("");
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  useEffect(() => {
    if (snapshot) setSelected(snapshot.catalogCodes);
  }, [snapshot]);
  useEffect(() => {
    setQuery("");
    setSelected(snapshot?.catalogCodes ?? []);
    setSchool(emptySchool);
    setLocalError("");
    setMessage("");
  }, [page]);
  const catalogDirty =
    !!snapshot &&
    (selected.length !== snapshot.catalogCodes.length ||
      selected.some((c) => !snapshot.catalogCodes.includes(c)));
  const schoolDirty = !!(school.id || school.code || school.name);
  useEffect(() => {
    const dirty = catalogDirty || schoolDirty;
    onDirty(dirty);
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    if (dirty) window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      onDirty(false);
    };
  }, [catalogDirty, schoolDirty, onDirty]);
  async function apply(
    action: Parameters<typeof save>[0],
    payload: Record<string, unknown>,
  ) {
    setMessage("");
    setLocalError("");
    try {
      await save(action, payload);
      setSchool(emptySchool);
      setMessage(
        online
          ? "Đã lưu danh mục vào Supabase."
          : "Đã lưu danh mục preview trên trình duyệt.",
      );
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : "Không lưu được danh mục.",
      );
    }
  }
  function reload() {
    if (
      (catalogDirty || schoolDirty) &&
      !window.confirm("Tải lại sẽ bỏ phần chỉnh sửa chưa lưu. Tiếp tục?")
    )
      return;
    setSchool(emptySchool);
    setMessage("");
    setLocalError("");
    refresh();
  }
  function submitSchool(e: FormEvent) {
    e.preventDefault();
    void apply("school.save", { ...school, id: school.id || null });
  }
  const schoolRows =
    snapshot?.schools.filter((s) =>
      `${s.code} ${s.name}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi")),
    ) ?? [];
  const events = athleteCatalog.filter(
    (e) =>
      (!sport || e.sportCode === sport) &&
      (!level || e.level === level) &&
      (!gender || e.gender === gender || e.gender === "Nam - nữ") &&
      `${e.code} ${e.sportName} ${e.name} ${e.group ?? ""}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi")),
  );
  function toggleSport(add: boolean) {
    const codes: string[] = athleteCatalog
      .filter((e) => e.sportCode === sport)
      .map((e) => e.code);
    setSelected((current) =>
      add
        ? [...new Set([...current, ...codes])]
        : current.filter((c) => !codes.includes(c)),
    );
    setMessage("");
  }
  return (
    <section className="role-panel admin-workspace">
      <h1>{page}</h1>
      <p>
        {online
          ? "Danh mục dùng cho giải 2026, lưu tại Supabase."
          : "Danh mục preview chỉ lưu trên trình duyệt này."}
      </p>
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={reload}
      >
        Tải lại danh mục
      </button>
      {!snapshot && !busy && !error && (
        <p role="alert">
          Chưa kết nối kho danh mục quản trị. Kiểm tra cấu hình Supabase.
        </p>
      )}
      {busy && <p role="status">Đang tải hoặc lưu danh mục…</p>}
      {(error || localError) && (
        <p role="alert" className="notice error">
          {localError || error}
        </p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {snapshot &&
        (page === "Quản lý trường" ? (
          <>
            <form onSubmit={submitSchool} className="admin-school-form">
              <h2>{school.id ? "Sửa trường" : "Thêm trường"}</h2>
              <fieldset disabled={busy}>
                <label>
                  Mã trường
                  <input
                    required
                    pattern="[A-Za-z0-9_]{2,30}"
                    maxLength={30}
                    value={school.code}
                    onChange={(e) =>
                      setSchool({
                        ...school,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="TH_QUANG_PHU"
                  />
                </label>
                <label>
                  Tên trường
                  <input
                    required
                    minLength={2}
                    maxLength={200}
                    value={school.name}
                    onChange={(e) =>
                      setSchool({ ...school, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Cấp học của trường
                  <select
                    value={school.level}
                    onChange={(e) =>
                      setSchool({
                        ...school,
                        level: e.target.value as ManagedSchool["level"],
                      })
                    }
                  >
                    <option value="TH">Tiểu học</option>
                    <option value="THCS">Trung học cơ sở</option>
                    <option value="TH_THCS">Tiểu học và THCS</option>
                  </select>
                </label>
                <button type="submit">
                  {school.id ? "Lưu trường" : "Thêm trường"}
                </button>
                {schoolDirty && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setSchool(emptySchool)}
                  >
                    Hủy sửa trường
                  </button>
                )}
              </fieldset>
            </form>
            <label>
              Tìm trường
              <input value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {[
                      "STT",
                      "Mã trường",
                      "Tên trường",
                      "Cấp học",
                      "Thao tác",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schoolRows.map((s, i) => {
                    const hasDraft = drafts.some(
                      (d) =>
                        (d.draftId === `managed-school:${s.id}` ||
                          d.schoolName.trim().toLocaleLowerCase("vi") ===
                            s.name.trim().toLocaleLowerCase("vi")) &&
                        d.athletes.length,
                    );
                    return (
                      <tr key={s.id}>
                        <td>{i + 1}</td>
                        <td>{s.code}</td>
                        <td>{s.name}</td>
                        <td>
                          {
                            {
                              TH: "Tiểu học",
                              THCS: "THCS",
                              TH_THCS: "Tiểu học và THCS",
                            }[s.level]
                          }
                        </td>
                        <td>
                          <button
                            type="button"
                            className="secondary"
                            disabled={busy}
                            onClick={() => {
                              setSchool(s);
                              setMessage("");
                            }}
                            aria-label={`Sửa trường ${s.code}`}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            disabled={busy || hasDraft}
                            title={
                              hasDraft
                                ? "Trường có bản nháp VĐV trên trình duyệt, cần đối chiếu trước khi xóa."
                                : "Xóa trường khỏi danh mục"
                            }
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Xóa trường ${s.name} khỏi danh mục?`,
                                )
                              )
                                void apply("school.delete", { id: s.id });
                            }}
                            aria-label={`Xóa trường ${s.code}`}
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!schoolRows.length && (
              <p>
                Chưa có trường phù hợp. Thêm trường bằng biểu mẫu phía trên.
              </p>
            )}
            <p className="footer-note">
              Danh mục trường không tạo tài khoản hoặc tự cấp quyền cho nhà
              trường. Số VĐV sẽ do các trường đăng ký.
            </p>
          </>
        ) : (
          <>
            <p>
              Chọn môn và các nội dung chính thức được mở trong giải. Bỏ chọn sẽ
              ngừng mở đăng ký; không xóa hồ sơ VĐV hoặc danh mục nguồn.
            </p>
            <div className="role-catalog-filters">
              <label>
                Môn thi đấu
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                >
                  <option value="">Tất cả môn</option>
                  {sports.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cấp học
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  <option value="">Tất cả cấp học</option>
                  <option value="TH">Tiểu học</option>
                  <option value="THCS">THCS</option>
                </select>
              </label>
              <label>
                Giới tính
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Tất cả giới tính</option>
                  <option>Nam</option>
                  <option>Nữ</option>
                </select>
              </label>
              <label>
                Tìm nội dung
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <div className="admin-catalog-actions">
              <button
                type="button"
                disabled={!sport || busy}
                onClick={() => toggleSport(true)}
              >
                Thêm môn vào giải
              </button>
              <button
                type="button"
                className="secondary"
                disabled={!sport || busy}
                onClick={() => toggleSport(false)}
              >
                Bỏ môn khỏi giải
              </button>
              <button
                type="button"
                disabled={busy || !catalogDirty}
                onClick={() => void apply("catalog", { codes: selected })}
              >
                Lưu danh mục thi đấu
              </button>
            </div>
            <p>
              {
                new Set(
                  athleteCatalog
                    .filter((e) => selected.includes(e.code))
                    .map((e) => e.sportCode),
                ).size
              }{" "}
              môn · {selected.length} nội dung được chọn
              {catalogDirty ? " · Chưa lưu thay đổi" : ""}
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {[
                      "Mở đăng ký",
                      "Mã nội dung",
                      "Môn",
                      "Cấp học",
                      "Giới tính",
                      "Phân nhóm",
                      "Tên nội dung",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.code}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Mở nội dung ${e.code}`}
                          disabled={busy}
                          checked={selected.includes(e.code)}
                          onChange={(event) => {
                            setSelected((current) =>
                              event.target.checked
                                ? [...current, e.code]
                                : current.filter((c) => c !== e.code),
                            );
                            setMessage("");
                          }}
                        />
                      </td>
                      <td>{e.code}</td>
                      <td>{e.sportName}</td>
                      <td>{e.level}</td>
                      <td>{e.gender}</td>
                      <td>{e.group ?? "Không phân nhóm"}</td>
                      <td>{e.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!events.length && <p>Không có nội dung phù hợp bộ lọc.</p>}
          </>
        ))}
    </section>
  );
}
