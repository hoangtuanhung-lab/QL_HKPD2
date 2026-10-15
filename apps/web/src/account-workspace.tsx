import { useContext, useEffect, useState, type FormEvent } from "react";
import {
  AccountRepositoryContext,
  type AccountRole,
  type ManagedAccount,
} from "./account-management.js";
import type { ManagedSchool } from "./admin-settings.js";
import { athleteCatalog } from "./athlete-catalog.generated.js";
const labels: Record<AccountRole, string> = {
  "": "Chưa cấp vai trò",
  admin: "Quản trị",
  school: "Nhà trường",
  leader: "Tổ trưởng trọng tài",
  referee: "Trọng tài",
};
const sports = [
  ...new Map(athleteCatalog.map((e) => [e.sportCode, e.sportName])).entries(),
];
export function AccountWorkspace({
  currentUserId,
  schools,
  online,
  onDirty,
}: {
  currentUserId: string;
  schools: readonly ManagedSchool[];
  online: boolean;
  onDirty: (dirty: boolean) => void;
}) {
  const repository = useContext(AccountRepositoryContext);
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [editing, setEditing] = useState<ManagedAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setAccounts([]);
    setError("");
    setNotice("");
    setEditing(null);
    if (!repository) return;
    setBusy(true);
    void repository
      .load()
      .then((rows) => {
        if (active) setAccounts(rows);
      })
      .catch((e: unknown) => {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Không tải được danh sách tài khoản.",
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [repository, reload]);
  useEffect(() => {
    onDirty(Boolean(editing));
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    if (editing) window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      onDirty(false);
    };
  }, [editing, onDirty]);
  const canDiscard = () =>
    !editing || window.confirm("Bỏ phần phân quyền chưa lưu để tiếp tục?");
  async function save(account: ManagedAccount) {
    if (!repository || busy || account.userId === currentUserId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await repository.save(account);
      setAccounts(next);
      setEditing(null);
      setNotice(
        "Đã lưu quyền tài khoản. Người dùng bấm Kiểm tra quyền hoặc đăng nhập lại để cập nhật.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không lưu được quyền tài khoản.",
      );
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    if (
      editing.role === "admin" &&
      editing.approved &&
      !window.confirm(`Cấp quyền quản trị toàn giải cho ${editing.email}?`)
    )
      return;
    void save(editing);
  }
  const visible = accounts.filter(
    (a) =>
      a.email.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")) &&
      (!filter || (filter === "approved" ? a.approved : !a.approved)),
  );
  return (
    <section className="role-panel account-workspace">
      <h1>Quản lý tài khoản</h1>
      <p>
        Tài khoản xuất hiện sau khi đăng nhập Google lần đầu. Cấp một vai trò
        trong giải 2026; nhà trường gắn với một trường, trọng tài gắn với môn
        được phân công.
      </p>
      {!repository && (
        <p className="notice">
          {online
            ? "Chưa kết nối dịch vụ quản lý tài khoản Supabase."
            : "Bản preview không cấp quyền tài khoản thật. Đăng nhập quản trị qua Supabase để quản lý tài khoản Google."}
        </p>
      )}
      <button
        type="button"
        className="secondary"
        disabled={!repository || busy}
        onClick={() => {
          if (canDiscard()) setReload((n) => n + 1);
        }}
      >
        Tải lại tài khoản
      </button>
      {busy && <p role="status">Đang tải hoặc lưu tài khoản…</p>}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <div className="role-catalog-filters">
        <label>
          Tìm email tài khoản
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>
          Trạng thái tài khoản
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="approved">Đã cấp quyền</option>
            <option value="pending">Chưa cấp quyền / đã thu hồi</option>
          </select>
        </label>
      </div>
      <p>{visible.length} tài khoản</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {[
                "STT",
                "Email Google",
                "Vai trò",
                "Trường / Môn phân công",
                "Trạng thái",
                "Thao tác",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((a, i) => (
              <tr key={a.userId}>
                <td>{i + 1}</td>
                <td>
                  {a.email}
                  {a.userId === currentUserId && (
                    <small> · Tài khoản đang dùng</small>
                  )}
                </td>
                <td>{labels[a.role]}</td>
                <td>
                  {a.schoolId
                    ? (schools.find((s) => s.id === a.schoolId)?.name ??
                      "Trường cần đối chiếu")
                    : a.sportCodes
                        .map(
                          (code) =>
                            sports.find(([s]) => s === code)?.[1] ?? code,
                        )
                        .join(", ") || "—"}
                </td>
                <td>
                  {a.approved ? "Đã cấp quyền" : "Chưa cấp quyền / đã thu hồi"}
                </td>
                <td>
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy || a.userId === currentUserId}
                    aria-label={`Phân quyền ${a.email}`}
                    onClick={() => {
                      if (canDiscard()) {
                        setEditing({ ...a, sportCodes: [...a.sportCodes] });
                        setNotice("");
                        setError("");
                      }
                    }}
                  >
                    Phân quyền
                  </button>
                  {a.approved && (
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy || a.userId === currentUserId}
                      aria-label={`Thu hồi quyền ${a.email}`}
                      onClick={() => {
                        if (
                          canDiscard() &&
                          window.confirm(
                            `Thu hồi quyền truy cập giải của ${a.email}?`,
                          )
                        )
                          void save({ ...a, approved: false });
                      }}
                    >
                      Thu hồi quyền
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && !busy && (
        <p>
          Chưa có tài khoản phù hợp. Người dùng cần đăng nhập Google ít nhất một
          lần.
        </p>
      )}
      {editing && (
        <form className="account-edit-form" onSubmit={submit}>
          <h2>Phân quyền: {editing.email}</h2>
          <fieldset disabled={busy}>
            <label>
              Vai trò tài khoản
              <select
                value={editing.role}
                onChange={(e) => {
                  const role = e.target.value as AccountRole;
                  setEditing({
                    ...editing,
                    role,
                    schoolId: null,
                    sportCodes: [],
                    approved: role ? editing.approved : false,
                  });
                }}
              >
                {Object.entries(labels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {editing.role === "school" && (
              <label>
                Trường được quản lý
                <select
                  required
                  value={editing.schoolId ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, schoolId: e.target.value || null })
                  }
                >
                  <option value="">-- Chọn trường --</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {["leader", "referee"].includes(editing.role) && (
              <fieldset>
                <legend>Môn được phân công</legend>
                {sports.map(([code, name]) => (
                  <label className="checkbox" key={code}>
                    <input
                      type="checkbox"
                      aria-label={`Phân công môn ${name}`}
                      checked={editing.sportCodes.includes(code)}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          sportCodes: e.target.checked
                            ? [...editing.sportCodes, code]
                            : editing.sportCodes.filter((c) => c !== code),
                        })
                      }
                    />
                    {name}
                  </label>
                ))}
              </fieldset>
            )}
            <label className="checkbox">
              <input
                type="checkbox"
                disabled={!editing.role}
                checked={editing.approved}
                onChange={(e) =>
                  setEditing({ ...editing, approved: e.target.checked })
                }
              />
              Cho phép truy cập giải 2026
            </label>
            <button
              type="submit"
              disabled={
                (editing.role === "school" && !editing.schoolId) ||
                (["leader", "referee"].includes(editing.role) &&
                  !editing.sportCodes.length)
              }
            >
              Lưu quyền tài khoản
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setEditing(null)}
            >
              Hủy phân quyền
            </button>
          </fieldset>
        </form>
      )}
      <p className="footer-note">
        Không thay đổi quyền tài khoản đang dùng. Mật khẩu và đăng nhập do
        Google quản lý; không nhập mật khẩu hoặc khóa bí mật tại đây.
      </p>
    </section>
  );
}
