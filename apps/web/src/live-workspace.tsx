import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LiveRepositoryContext,
  type LiveState,
  type LiveSchool,
  type LiveOperation,
  type LiveRepository,
} from "./live-repository.js";
import {
  RoleLayout,
  CatalogWorkspace,
  type WorkspacePage,
  type WorkspaceRole,
} from "./role-workspaces.js";
import {
  sessionRoles,
  assignedSportCodes,
  type WorkspaceSession,
} from "./staff-scope.js";
import { AdminRepositoryContext, useAdminSettings } from "./admin-settings.js";
import { AdminWorkspace } from "./admin-workspace.js";
import { AccountWorkspace } from "./account-workspace.js";
import { AthleteRegistrationPage } from "./athlete-registration-page.js";
import type { AthleteDraft, SchoolDraft } from "./registration-draft.js";
import { athleteCatalog } from "./athlete-catalog.generated.js";
const statuses = {
  draft: "Đang soạn",
  submitted: "Chờ duyệt",
  approved: "Đã duyệt",
  returned: "Trả lại",
};
const asDraft = (school: LiveSchool): SchoolDraft => ({
  draftId: `managed-school:${school.id}`,
  editionName: "2026",
  schoolName: school.name,
  athletes: school.athletes,
});
export function LiveWorkspace({ session }: { session: WorkspaceSession }) {
  const repository = useContext(LiveRepositoryContext);
  const adminRepository = useContext(AdminRepositoryContext);
  const available = sessionRoles(session);
  const [requestedRole, setRole] = useState<WorkspaceRole>(
    available[0] ?? "school",
  );
  const role = available.includes(requestedRole) ? requestedRole : available[0];
  const admin = useAdminSettings(role === "admin" ? adminRepository : null);
  const [page, setPage] = useState<WorkspacePage>("Tổng quan");
  const [data, setData] = useState<LiveState | null>(null);
  const [working, setWorking] = useState<Record<string, AthleteDraft[]>>({});
  const [innerDirty, setInnerDirty] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const alive = useRef(true),
    writing = useRef(false),
    generation = useRef(0);
  const dirty = Object.keys(working).length > 0 || innerDirty;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const onDirty = useCallback((value: boolean) => setInnerDirty(value), []);
  const refresh = useCallback(async () => {
    if (!repository || writing.current || dirtyRef.current) return;
    const version = ++generation.current;
    setBusy(true);
    try {
      const next = await repository.load();
      if (alive.current && version === generation.current) {
        setData(next);
        setError("");
      }
    } catch {
      if (alive.current && version === generation.current) {
        setData(null);
        setError(
          "Không tải được dữ liệu trực tuyến. Kiểm tra mạng, quyền và migration 005; bấm Tải lại dữ liệu.",
        );
      }
    } finally {
      if (alive.current && version === generation.current) setBusy(false);
    }
  }, [repository]);
  useEffect(() => {
    alive.current = true;
    void refresh();
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    const timer = window.setInterval(focus, 60000);
    return () => {
      alive.current = false;
      generation.current++;
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);
  async function run(action: () => Promise<LiveState>, clearSchool?: string) {
    if (writing.current) return;
    writing.current = true;
    generation.current++;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const next = await action();
      if (!alive.current) return;
      setData(next);
      setInnerDirty(false);
      if (clearSchool)
        setWorking((w) => {
          const copy = { ...w };
          delete copy[clearSchool];
          return copy;
        });
      setMessage(
        "Đã lưu lên hệ thống. Các tài khoản được phép có thể Tải lại để thấy dữ liệu mới.",
      );
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error
            ? e.message
            : "Không lưu được. Dữ liệu đang nhập vẫn được giữ.",
        );
    } finally {
      writing.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function change(next: WorkspacePage) {
    if (busy) return;
    if (
      dirty &&
      !window.confirm(
        "Có dữ liệu chưa lưu lên hệ thống. Bỏ thay đổi và chuyển màn hình?",
      )
    )
      return;
    setWorking({});
    setInnerDirty(false);
    setPage(next);
    setMessage("");
  }
  if (!repository || !role || session.editionId !== "edition-2026")
    return (
      <p role="alert">
        Chưa sẵn sàng dữ liệu trực tuyến. Không mở dữ liệu thử thay thế.
      </p>
    );
  const sports = assignedSportCodes(session, role);
  const catalogCodes = data?.catalogCodes ?? [];
  const isStaff = role === "chief" || role === "referee";
  const schools = data?.schools ?? [];
  const school = schools.find((s) => s.id === session.school?.id);
  const drafts = schools.map((s) => ({
    ...asDraft(s),
    athletes: working[s.id] ?? s.athletes,
  }));
  return (
    <RoleLayout
      role={role}
      page={page}
      onRole={(r) => {
        if (available.includes(r) && !busy && !dirty) {
          setRole(r);
          setPage("Tổng quan");
        }
      }}
      onPage={change}
      availableRoles={available}
      online
    >
      <div className="card">
        <button
          disabled={busy}
          onClick={() => {
            if (dirty) {
              setError(
                "Lưu hoặc bỏ thay đổi trước khi tải lại; bản đang nhập vẫn được giữ.",
              );
              return;
            }
            void refresh();
          }}
        >
          Tải lại dữ liệu
        </button>{" "}
        {busy
          ? "Đang kết nối…"
          : dirty
            ? "Có dữ liệu chưa lưu lên hệ thống"
            : "Dữ liệu dùng chung · Giải 2026"}
      </div>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {page === "Quản lý tài khoản" ||
      (page === "Phân công" && role === "admin") ? (
        <AccountWorkspace
          currentUserId={session.actor.id}
          schools={admin.snapshot?.schools ?? []}
          online
          onDirty={onDirty}
        />
      ) : page === "Quản lý trường" ||
        (page === "Danh mục môn thi" && role === "admin") ? (
        <AdminWorkspace
          page={page as "Quản lý trường" | "Danh mục môn thi"}
          model={admin}
          online
          drafts={drafts}
          onDirty={onDirty}
        />
      ) : !data ? (
        <p>
          Chờ tải dữ liệu Supabase. Không lấy dữ liệu trình duyệt làm dữ liệu
          chính thức.
        </p>
      ) : page === "Tổng quan" ? (
        <section className="card">
          <h1>Tổng quan giải 2026</h1>
          {role === "admin" && <IntegrationCheck repository={repository} />}
          <p>
            {schools.length} trường ·{" "}
            {schools.reduce((sum, s) => sum + s.athletes.length, 0)} VĐV trong
            phạm vi tài khoản ·{" "}
            {schools.filter((s) => s.status === "submitted").length} phiếu chờ
            duyệt.
          </p>
          <p>
            Đăng ký, lịch và kết quả đọc từ Supabase. Tệp hồ sơ đi qua máy chủ
            kiểm quyền tới Drive.
          </p>
        </section>
      ) : page === "Danh mục môn thi" ? (
        <CatalogWorkspace
          catalogCodes={catalogCodes}
          sportCodes={isStaff ? sports : undefined}
        />
      ) : page === "Quản lý giải" ? (
        <section className="card">
          <h1>Giải hiện tại: 2026</h1>
          <p>
            Dữ liệu trực tuyến đang giới hạn ở giải 2026. Chức năng tạo giải
            mới/kết chuyển chưa mở; không trộn dữ liệu giải cũ.
          </p>
        </section>
      ) : page === "Đăng ký VĐV" && role === "school" && school ? (
        <>
          <section className="card">
            <h1>Đăng ký trực tuyến — {school.name}</h1>
            <p>
              {statuses[school.status]} · {school.note}
            </p>
            <p>
              Lưu từng hàng để cập nhật bảng, sau đó bấm Lưu lên hệ thống. Gửi
              duyệt sẽ khóa phiếu đến khi ban tổ chức trả lại.
            </p>
          </section>
          {school.status === "draft" || school.status === "returned" ? (
            <>
              <fieldset disabled={busy}>
                <AthleteRegistrationPage
                  key={`${school.id}:${school.revision}`}
                  schools={drafts}
                  activeId={`managed-school:${school.id}`}
                  onSelect={() => {}}
                  onSave={(s) => {
                    setWorking((w) => ({ ...w, [school.id]: s.athletes }));
                  }}
                  onDirty={onDirty}
                  catalogCodes={catalogCodes}
                  onlineFiles
                  storageStatus={
                    error ? "error" : working[school.id] ? "saving" : "saved"
                  }
                />
              </fieldset>
              <button
                disabled={busy || innerDirty}
                onClick={() =>
                  void run(
                    () =>
                      repository.roster(
                        school,
                        working[school.id] ?? school.athletes,
                        "save",
                      ),
                    school.id,
                  )
                }
              >
                Lưu lên hệ thống
              </button>
              <button
                disabled={busy || innerDirty}
                onClick={() =>
                  void run(
                    () =>
                      repository.roster(
                        school,
                        working[school.id] ?? school.athletes,
                        "submit",
                      ),
                    school.id,
                  )
                }
              >
                Gửi duyệt đăng ký
              </button>
            </>
          ) : (
            <p>Phiếu đã khóa. Liên hệ ban tổ chức nếu cần sửa.</p>
          )}
          <AthleteFiles
            key={school.revision}
            schools={[school]}
            repository={repository}
          />
        </>
      ) : page === "Kiểm tra đăng ký" ? (
        <section className="card">
          <h1>Danh sách đăng ký</h1>
          {schools.map((s) => (
            <section key={s.id}>
              <h2>
                {s.code} — {s.name}
              </h2>
              <p>
                {statuses[s.status]} · {s.athletes.length} VĐV · {s.note}
              </p>
              {role === "admin" && (
                <>
                  <button
                    disabled={busy || s.status !== "submitted"}
                    onClick={() =>
                      void run(() => repository.roster(s, [], "approve"))
                    }
                  >
                    Duyệt {s.code}
                  </button>
                  <button
                    disabled={
                      busy || !["submitted", "approved"].includes(s.status)
                    }
                    onClick={() => {
                      const note = window.prompt("Lý do trả lại đăng ký");
                      if (note?.trim())
                        void run(() =>
                          repository.roster(s, [], "return", note),
                        );
                    }}
                  >
                    Trả lại {s.code}
                  </button>
                </>
              )}
              <RosterTable schools={[s]} />
            </section>
          ))}
          <AthleteFiles schools={schools} repository={repository} />
        </section>
      ) : [
          "Lịch thi đấu",
          "Xác nhận kết quả",
          "Công khai",
          "Loại trực tiếp",
          "Vòng tròn",
        ].includes(page) ? (
        <EventOperations
          key={`${role}:${page}`}
          page={page}
          role={role}
          data={data}
          sports={sports}
          dirty={dirty}
          busy={busy}
          onDirty={onDirty}
          save={(...args) => run(() => repository.operation(...args))}
        />
      ) : (
        <p className="notice">
          Chưa mở chức năng này trực tuyến. Không sử dụng dữ liệu thử cho giải
          chính thức.
        </p>
      )}
    </RoleLayout>
  );
}
function RosterTable({
  schools,
  code,
}: {
  schools: LiveSchool[];
  code?: string;
}) {
  const rows = schools.flatMap((s) =>
    s.athletes
      .filter((a) => !code || a.catalogSelections?.includes(code))
      .map((a) => ({ s, a })),
  );
  return (
    <div className="table-scroll">
      <table>
        <caption>Danh sách VĐV theo nội dung đăng ký</caption>
        <thead>
          <tr>
            {["STT", "Mã VĐV", "Tên VĐV", "Mã trường", "Tên trường"].map(
              (s) => (
                <th key={s}>{s}</th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ a, s }, i) => (
            <tr key={a.draftId}>
              <td>{i + 1}</td>
              <td>{a.athleteCode}</td>
              <td>{a.fullName}</td>
              <td>{s.code}</td>
              <td>{s.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function EventOperations({
  page,
  role,
  data,
  sports,
  busy,
  dirty,
  onDirty,
  save,
}: {
  page: WorkspacePage;
  role: WorkspaceRole;
  data: LiveState;
  sports: string[];
  busy: boolean;
  dirty: boolean;
  onDirty: (v: boolean) => void;
  save: (
    code: string,
    kind: LiveOperation["kind"],
    revision: number,
    payload: unknown,
    action?: "save" | "confirm",
  ) => Promise<void>;
}) {
  const events = athleteCatalog.filter(
    (e) =>
      data.catalogCodes.includes(e.code) &&
      (!(role === "chief" || role === "referee") ||
        sports.includes(e.sportCode)),
  );
  const [code, setCode] = useState("");
  const event = events.find((e) => e.code === code);
  const operations = data.operations.filter((o) => o.code === code);
  const schools = data.schools.filter((s) => s.status === "approved");
  return (
    <section className="card">
      <h1>{page}</h1>
      {page === "Công khai" && (
        <p>
          Chỉ hiển thị kết quả đã xác nhận cho tài khoản có quyền. Chưa công bố
          ra trang ẩn danh.
        </p>
      )}
      <label>
        Nội dung đăng ký
        <select
          value={code}
          disabled={busy}
          onChange={(e) => {
            if (
              dirty &&
              !window.confirm(
                "Nội dung đang có thay đổi chưa lưu. Bỏ thay đổi và chọn nội dung khác?",
              )
            )
              return;
            setCode(e.target.value);
            onDirty(false);
          }}
        >
          <option value="">-- Chọn nội dung --</option>
          {events.map((e) => (
            <option key={e.code} value={e.code}>
              {e.code} — {e.sportName} — {e.name}
            </option>
          ))}
        </select>
      </label>
      {event && (
        <>
          <RosterTable schools={schools} code={code} />
          <EventEditor
            key={`${code}:${JSON.stringify(operations)}`}
            code={code}
            page={page}
            role={role}
            event={event}
            schools={schools}
            operations={operations}
            busy={busy}
            onDirty={onDirty}
            save={save}
          />
        </>
      )}
    </section>
  );
}
type EventInfo = (typeof athleteCatalog)[number];
function EventEditor({
  code,
  page,
  role,
  event,
  schools,
  operations,
  busy,
  onDirty,
  save,
}: {
  code: string;
  page: WorkspacePage;
  role: WorkspaceRole;
  event: EventInfo;
  schools: LiveSchool[];
  operations: LiveOperation[];
  busy: boolean;
  onDirty: (v: boolean) => void;
  save: (
    code: string,
    kind: LiveOperation["kind"],
    revision: number,
    payload: unknown,
    action?: "save" | "confirm",
  ) => Promise<void>;
}) {
  const schedule = operations.find((o) => o.kind === "schedule");
  const lanes = operations.find((o) => o.kind === "lanes");
  const result = operations.find((o) => o.kind === "result");
  const existing = (schedule?.payload ?? {}) as {
    venue?: string;
    start?: string;
    end?: string;
  };
  const localTime = (s?: string) =>
    s ? new Date(Date.parse(s) + 7 * 3600000).toISOString().slice(0, 16) : "";
  const [venue, setVenue] = useState(existing.venue ?? ""),
    [start, setStart] = useState(localTime(existing.start)),
    [end, setEnd] = useState(localTime(existing.end));
  const entrants = schools.flatMap((s) =>
    s.athletes.filter((a) => a.catalogSelections?.includes(code)),
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      ((result?.payload ?? []) as { athleteId: string; value: string }[]).map(
        (r) => [r.athleteId, r.value],
      ),
    ),
  );
  const [laneValues, setLaneValues] = useState<
    Record<string, { heat: number; lane: number }>
  >(() =>
    Object.fromEntries(
      (
        (lanes?.payload ?? []) as {
          athleteId: string;
          heat: number;
          lane: number;
        }[]
      ).map((r) => [r.athleteId, { heat: r.heat, lane: r.lane }]),
    ),
  );
  const staff = role === "chief" || role === "referee";
  const isLane =
    event.form === "CA_NHAN" &&
    (event.sportCode === "BOI" ||
      (event.sportCode === "DK" && event.name.startsWith("Chạy")));
  return (
    <>
      {schedule && (
        <p>
          Lịch: {existing.venue} ·{" "}
          {new Date(existing.start!).toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
          })}{" "}
          –{" "}
          {new Date(existing.end!).toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
          })}
        </p>
      )}
      {page === "Lịch thi đấu" && role === "admin" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save(code, "schedule", schedule?.revision ?? 0, {
              venue,
              start: new Date(`${start}:00+07:00`).toISOString(),
              end: new Date(`${end}:00+07:00`).toISOString(),
            });
          }}
        >
          <label>
            Địa điểm
            <input
              required
              value={venue}
              onChange={(e) => {
                setVenue(e.target.value);
                onDirty(true);
              }}
            />
          </label>
          <label>
            Bắt đầu (giờ Việt Nam)
            <input
              required
              type="datetime-local"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                onDirty(true);
              }}
            />
          </label>
          <label>
            Kết thúc (giờ Việt Nam)
            <input
              required
              type="datetime-local"
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                onDirty(true);
              }}
            />
          </label>
          <button disabled={busy}>Lưu lịch thi đấu</button>
        </form>
      )}
      {page === "Lịch thi đấu" && staff && isLane && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save(
              code,
              "lanes",
              lanes?.revision ?? 0,
              entrants.map((a) => ({
                athleteId: a.draftId,
                ...laneValues[a.draftId],
              })),
            );
          }}
        >
          <h2>Phân làn chạy/bơi — môn được phân công</h2>
          {entrants.map((a) => (
            <div key={a.draftId}>
              {a.athleteCode} — {a.fullName}
              <label>
                Lượt của {a.athleteCode}
                <input
                  required
                  type="number"
                  min="1"
                  max="1000"
                  value={laneValues[a.draftId]?.heat ?? ""}
                  onChange={(e) => {
                    setLaneValues((v) => ({
                      ...v,
                      [a.draftId]: {
                        ...v[a.draftId]!,
                        heat: Number(e.target.value),
                      },
                    }));
                    onDirty(true);
                  }}
                />
              </label>
              <label>
                Làn của {a.athleteCode}
                <input
                  required
                  type="number"
                  min="1"
                  max="16"
                  value={laneValues[a.draftId]?.lane ?? ""}
                  onChange={(e) => {
                    setLaneValues((v) => ({
                      ...v,
                      [a.draftId]: {
                        ...v[a.draftId]!,
                        lane: Number(e.target.value),
                      },
                    }));
                    onDirty(true);
                  }}
                />
              </label>
            </div>
          ))}
          <button disabled={busy || !entrants.length}>Lưu phân làn</button>
        </form>
      )}
      {page === "Xác nhận kết quả" &&
        event.form === "CA_NHAN" &&
        staff &&
        result?.status !== "confirmed" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save(
                code,
                "result",
                result?.revision ?? 0,
                entrants.map((a) => ({
                  athleteId: a.draftId,
                  value: values[a.draftId] ?? "",
                })),
              );
            }}
          >
            <h2>Gửi thành tích theo biên bản</h2>
            <p>
              Nhập thành tích/tỷ số kèm đơn vị theo biên bản của nội dung. Ban
              tổ chức kiểm tra trước khi xác nhận; hệ thống chưa tự xếp hạng
              hoặc trao huy chương.
            </p>
            {entrants.map((a) => (
              <label key={a.draftId}>
                Thành tích của {a.athleteCode} — {a.fullName}
                <input
                  required
                  maxLength={100}
                  value={values[a.draftId] ?? ""}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [a.draftId]: e.target.value }));
                    onDirty(true);
                  }}
                />
              </label>
            ))}
            <button disabled={busy || !entrants.length}>
              Gửi kết quả chờ xác nhận
            </button>
          </form>
        )}
      {result && (page !== "Công khai" || result.status === "confirmed") && (
        <section>
          <h2>
            {result.status === "confirmed"
              ? "Kết quả đã xác nhận"
              : "Kết quả chờ xác nhận"}
          </h2>
          <ul>
            {(result.payload as { athleteId: string; value: string }[]).map(
              (r) => (
                <li key={r.athleteId}>
                  {entrants.find((a) => a.draftId === r.athleteId)?.fullName ??
                    r.athleteId}
                  : {r.value}
                </li>
              ),
            )}
          </ul>
          {role === "admin" &&
            page === "Xác nhận kết quả" &&
            result.status === "submitted" && (
              <button
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Đã đối chiếu biên bản và xác nhận thành tích? Kết quả được khóa sau khi xác nhận.",
                    )
                  )
                    void save(code, "result", result.revision, null, "confirm");
                }}
              >
                Xác nhận kết quả
              </button>
            )}
        </section>
      )}
      {event.form !== "CA_NHAN" &&
        ["Lịch thi đấu", "Xác nhận kết quả"].includes(page) && (
          <p>
            Nội dung đội/đôi/tiếp sức/đối kháng cần danh sách đội hoặc trận đã
            xác nhận. Chưa mở nhập kết quả hoặc ghép đội tự động tại đây.
          </p>
        )}
      {["Loại trực tiếp", "Vòng tròn"].includes(page) && (
        <p>
          Danh sách được lọc từ đăng ký đã duyệt. Chưa nối việc lưu và chốt sơ
          đồ thi đấu trực tuyến.
        </p>
      )}
    </>
  );
}
function AthleteFiles({
  schools,
  repository,
}: {
  schools: LiveSchool[];
  repository: LiveRepository;
}) {
  const athletes = useMemo(() => schools.flatMap((s) => s.athletes), [schools]);
  const [selected, setSelected] = useState(""),
    [files, setFiles] = useState<{ id: string; name: string }[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const epoch = useRef(0);
  const current = useRef(selected);
  current.current = selected;
  useEffect(
    () => () => {
      epoch.current++;
    },
    [],
  );
  async function load(id: string) {
    const request = ++epoch.current;
    setFiles([]);
    setError("");
    setBusy(true);
    try {
      const next = await repository.files(id);
      if (epoch.current === request) setFiles(next);
    } catch (e) {
      if (epoch.current === request) setError((e as Error).message);
    } finally {
      if (epoch.current === request) setBusy(false);
    }
  }
  return (
    <section className="card">
      <h2>Hồ sơ và biên bản VĐV — Google Drive</h2>
      <p>
        Chọn VĐV đã lưu lên hệ thống. JPG, PNG hoặc PDF, tối đa 4 MB. Mỗi VĐV có
        thư mục riêng, không công khai liên kết.
      </p>
      <label>
        VĐV lưu hồ sơ
        <select
          value={selected}
          disabled={busy}
          onChange={(e) => {
            setSelected(e.target.value);
            setFiles([]);
            if (e.target.value) void load(e.target.value);
          }}
        >
          <option value="">-- Chọn VĐV --</option>
          {athletes.map((a) => (
            <option key={a.draftId} value={a.draftId}>
              {a.athleteCode} — {a.fullName}
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <>
          <button disabled={busy} onClick={() => void load(selected)}>
            Tải lại tệp
          </button>
          <input
            type="file"
            aria-label="Tải hồ sơ lên Drive"
            accept="image/jpeg,image/png,application/pdf"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setBusy(true);
              setError("");
              try {
                if (file.size > 4 * 1024 * 1024)
                  throw Error("Tệp tối đa 4 MB.");
                await repository.upload(selected, file);
                await load(selected);
              } catch (failure) {
                setError((failure as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <ul>
        {files.map((f) => (
          <li key={f.id}>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const blob = await repository.download(current.current, f.id);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = f.name;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch {
                  setError("Không tải được tệp.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {f.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function IntegrationCheck({ repository }: { repository: LiveRepository }) {
  const [status, setStatus] = useState<Awaited<
      ReturnType<LiveRepository["status"]>
    > | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setStatus(null);
          setError("");
          try {
            setStatus(await repository.status());
          } catch {
            setError(
              "Chưa kiểm tra được kết nối. Kiểm tra cấu hình Netlify Functions và quyền quản trị.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Đang kiểm tra kết nối…" : "Kiểm tra kết nối hệ thống"}
      </button>
      {error && <p role="alert">{error}</p>}
      {status && (
        <p role="status">
          Supabase nghiệp vụ: {status.database ? "Đạt" : "Chưa sẵn sàng"} ·
          Drive: {status.drive ? "Đạt" : "Chưa sẵn sàng"}
          {status.missing.length
            ? ` · Thiếu cấu hình máy chủ: ${status.missing.join(", ")}`
            : ""}
          .{" "}
          {status.ready
            ? "Đã kiểm tra kết nối đọc; tiếp tục thử đăng ký và tải tệp."
            : "Chưa đủ điều kiện kết nối."}
        </p>
      )}
    </div>
  );
}
