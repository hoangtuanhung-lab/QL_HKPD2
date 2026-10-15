import { eligible as eligibleDraw } from "@hkpd/competition";
import { useEffect, useState } from "react";
import { athleteCatalog } from "./athlete-catalog.generated.js";
import type { LiveState, LiveRepository } from "./live-repository.js";
import type { WorkspaceRole } from "./role-workspaces.js";
import {
  roundRobinProgress,
  upstreamUnderReview,
  type MatchEntrant,
  type ResultMatch,
  type DrawSetup,
} from "./match-results.js";
const states = {
  not_started: "Chưa diễn ra",
  pending: "Chờ xác nhận",
  confirmed: "Xác nhận",
  reentry: "Nhập lại",
};
const actions: Record<string, string> = {
  created: "Tạo trận",
  submit: "Xin xác nhận",
  confirm: "Xác nhận",
  reject: "Từ chối / mở nhập lại",
  request_reentry: "Xin nhập lại",
  source_invalidated: "Vòng trước thay đổi — nhập lại",
};
export function MatchResultsWorkspace({
  role,
  readOnly = false,
  sports,
  data,
  repository,
  busy,
  save,
  onDirty,
}: {
  readOnly?: boolean;
  role: WorkspaceRole;
  sports: string[];
  data: LiveState;
  repository: LiveRepository;
  busy: boolean;
  save: (action: () => Promise<LiveState>) => Promise<boolean>;
  onDirty: (v: boolean) => void;
}) {
  const [sport, setSport] = useState(""),
    [code, setCode] = useState(""),
    [round, setRound] = useState(""),
    [selected, setSelected] = useState(""),
    [edited, setEdited] = useState<Record<string, { a: string; b: string }>>(
      {},
    ),
    [error, setError] = useState("");
  const [setupDirty, setSetupDirty] = useState(false);
  const dirty = Object.keys(edited).length > 0 || setupDirty;
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  const events = athleteCatalog.filter(
    (e) =>
      data.catalogCodes.includes(e.code) &&
      (role === "admin"
        ? !sport || e.sportCode === sport
        : role === "school"
          ? Boolean(data.draws?.some((d) => d.code === e.code))
          : sports.includes(e.sportCode)),
  );
  const event = events.find((e) => e.code === code),
    draw = data.draws?.find((d) => d.code === code);
  const all = (data.matches ?? [])
    .filter((m) => m.code === code && (!readOnly || m.status === "confirmed"))
    .sort((a, b) => a.match_no - b.match_no);
  const matches = all.filter(
    (m) =>
      (!round || String(m.round_no) === round) &&
      (!selected || m.id === selected),
  );
  const change = (fn: () => void) => {
    if (busy) return;
    if (
      dirty &&
      !window.confirm(
        "Điểm hoặc cấu hình đang nhập chưa gửi. Bỏ thay đổi để chuyển lựa chọn?",
      )
    )
      return;
    setEdited({});
    setSetupDirty(false);
    setError("");
    fn();
  };
  async function command(
    match: ResultMatch,
    action: "submit" | "confirm" | "reject" | "request_reentry",
  ) {
    setError("");
    try {
      if (
        ["submit", "confirm"].includes(action) &&
        upstreamUnderReview(match, all)
      )
        throw Error(
          "Kết quả vòng trước đang chờ xử lý; chưa thể nhập/xác nhận vòng sau.",
        );
      const v = edited[match.id];
      let reason = "";
      if (
        action === "submit" &&
        (!v?.a ||
          (draw?.mode !== "performance" && !v?.b) ||
          !Number.isFinite(Number(v.a)) ||
          (draw?.mode !== "performance" && !Number.isFinite(Number(v.b))))
      )
        throw Error(
          draw?.mode === "performance"
            ? "Nhập thành tích hợp lệ trước khi xin xác nhận."
            : "Nhập đủ hai kết quả hợp lệ trước khi xin xác nhận.",
        );
      if (action === "reject" || action === "request_reentry") {
        reason =
          window.prompt(
            action === "reject"
              ? "Lý do từ chối (các vòng sau phụ thuộc cũng phải nhập lại nếu kết quả vòng trước bị đổi)"
              : "Lý do xin nhập lại",
          ) ?? "";
        if (!reason.trim()) return;
      }
      if (
        await save(() =>
          repository.matchCommand(match, {
            action,
            ...(action === "submit"
              ? {
                  score1: Number(v!.a),
                  ...(draw?.mode !== "performance"
                    ? { score2: Number(v!.b) }
                    : {}),
                }
              : {}),
            reason,
          }),
        )
      ) {
        setEdited((prev) => {
          const n = { ...prev };
          delete n[match.id];
          return n;
        });
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const schoolName = (id?: string) =>
    data.schools.find((s) => s.id === id)?.name ?? id ?? "—";
  const navigation = all.filter((m) => !round || String(m.round_no) === round);
  const current = navigation.findIndex((m) => m.id === selected);
  const choose = (m: ResultMatch | undefined) => {
    if (m)
      change(() => {
        setSelected(m.id);
      });
  };
  return (
    <section className="card">
      <h1>{role === "referee" ? "Nhập kết quả" : "Kết quả"}</h1>
      {role === "admin" && (
        <label>
          Môn thi đấu
          <select
            value={sport}
            disabled={busy}
            onChange={(e) =>
              change(() => {
                setSport(e.target.value);
                setCode("");
                setRound("");
                setSelected("");
              })
            }
          >
            <option value="">-- Tất cả môn --</option>
            {[
              ...new Map(
                athleteCatalog.map((e) => [e.sportCode, e.sportName]),
              ).entries(),
            ].map(([c, n]) => (
              <option key={c} value={c}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Nội dung thi đấu
        <select
          value={code}
          disabled={busy}
          onChange={(e) =>
            change(() => {
              setCode(e.target.value);
              setRound("");
              setSelected("");
            })
          }
        >
          <option value="">-- Chọn nội dung --</option>
          {events.map((e) => (
            <option key={e.code} value={e.code}>
              {e.sportName} — {e.code} — {e.name}
            </option>
          ))}
        </select>
      </label>
      {event &&
        data.operations
          .filter(
            (o) =>
              o.code === code &&
              o.kind === "result" &&
              (!readOnly || o.status === "confirmed"),
          )
          .map((o) => (
            <section key={o.code}>
              <h2>Kết quả cũ trước khi chuyển sang vòng/trận — chỉ đọc</h2>
              <ul>
                {(o.payload as { athleteId: string; value: string }[]).map(
                  (r) => (
                    <li key={r.athleteId}>
                      {data.schools
                        .flatMap((s) => s.athletes)
                        .find((a) => a.draftId === r.athleteId)?.fullName ??
                        r.athleteId}
                      : {r.value}
                    </li>
                  ),
                )}
              </ul>
              <p>
                Giữ nguyên dữ liệu cũ. Tổ trưởng đối chiếu biên bản trước khi
                tạo danh sách mới; không tự chuyển chuỗi thành tích thành tỷ số
                trận.
              </p>
            </section>
          ))}
      {data.draws === undefined && (
        <p role="alert">
          {role === "admin"
            ? "Cần áp dụng SQL 008 để mở kết quả theo vòng/trận. Dữ liệu cũ được giữ nguyên."
            : "Chức năng kết quả chưa sẵn sàng. Liên hệ ban tổ chức."}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {event &&
        !draw &&
        role === "chief" &&
        !readOnly &&
        data.draws !== undefined && (
          <DrawBuilder
            key={code}
            code={code}
            data={data}
            onDirty={setSetupDirty}
            disabled={busy}
            create={async (d) => {
              const ok = await save(() => repository.createMatches(code, 0, d));
              if (ok) setSetupDirty(false);
              return ok;
            }}
          />
        )}
      {event && !draw && (role !== "chief" || readOnly) && (
        <p>
          Tổ trưởng thiết lập thể thức, danh sách Đội/Cặp/VĐV và điểm theo nội
          dung trước khi tạo trận.
        </p>
      )}
      {draw && event && (
        <>
          <p>
            {draw.mode === "knockout"
              ? "Loại trực tiếp"
              : draw.mode === "performance"
                ? `Thi thành tích (${draw.score_unit})`
                : "Đấu vòng tròn"}{" "}
            {draw.mode !== "performance" && (
              <>
                {" "}
                · Điểm thắng/hòa/thua: {draw.win_points}/{draw.draw_points}/
                {draw.loss_points}.
              </>
            )}{" "}
            Cấu hình được lưu cùng danh sách trận.
          </p>
          {draw.mode === "knockout" && (
            <label>
              Vòng
              <select
                value={round}
                disabled={busy}
                onChange={(e) =>
                  change(() => {
                    setRound(e.target.value);
                    setSelected("");
                  })
                }
              >
                <option value="">Tất cả vòng</option>
                {[...new Set(all.map((m) => m.round_no))].map((r) => (
                  <option key={r} value={r}>
                    Vòng {r}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Chọn trận
            <select
              value={selected}
              disabled={busy}
              onChange={(e) => change(() => setSelected(e.target.value))}
            >
              <option value="">Tất cả trận</option>
              {all
                .filter((m) => !round || String(m.round_no) === round)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    Trận {m.match_no} — Vòng {m.round_no}
                  </option>
                ))}
            </select>
          </label>
          <div>
            <button
              disabled={busy || current <= 0}
              onClick={() => choose(navigation[current - 1])}
            >
              ← Trận trước
            </button>
            <button
              disabled={
                busy || !navigation.length || current === navigation.length - 1
              }
              onClick={() => choose(navigation[current + 1])}
            >
              Trận tiếp →
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <caption>Kết quả các vòng/trận</caption>
              <thead>
                <tr>
                  {[
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
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matches.map((m, i) => {
                  const a = draw.entrants.find((e) => e.id === m.side1),
                    b = draw.entrants.find((e) => e.id === m.side2),
                    canEnter =
                      !readOnly &&
                      role === "referee" &&
                      ["not_started", "reentry"].includes(m.status) &&
                      a &&
                      (b || draw.mode === "performance") &&
                      !m.bye &&
                      !upstreamUnderReview(m, all);
                  return (
                    <tr key={m.id}>
                      <td>{i + 1}</td>
                      <td>{event.sportName}</td>
                      <td>{event.name}</td>
                      <td>
                        Vòng {m.round_no} / Trận {m.match_no}
                      </td>
                      <td>
                        {a?.label ??
                          (m.source1 ? "Chờ vòng trước" : "Miễn đấu")}
                      </td>
                      <td>{a?.schoolName ?? schoolName(a?.schoolId)}</td>
                      <td>
                        {canEnter ? (
                          <input
                            aria-label={`Kết quả 1 trận ${m.match_no}`}
                            type="number"
                            min="0"
                            max="1000000"
                            step="0.001"
                            disabled={busy}
                            value={edited[m.id]?.a ?? ""}
                            onChange={(e) =>
                              setEdited((v) => ({
                                ...v,
                                [m.id]: {
                                  a: e.target.value,
                                  b: v[m.id]?.b ?? "",
                                },
                              }))
                            }
                          />
                        ) : (
                          (m.score1 ?? "—")
                        )}
                      </td>
                      <td>
                        {b?.label ??
                          (draw.mode === "performance"
                            ? "—"
                            : m.source2
                              ? "Chờ vòng trước"
                              : "Miễn đấu")}
                      </td>
                      <td>{b?.schoolName ?? schoolName(b?.schoolId)}</td>
                      <td>
                        {canEnter && draw.mode !== "performance" ? (
                          <input
                            aria-label={`Kết quả 2 trận ${m.match_no}`}
                            type="number"
                            min="0"
                            max="1000000"
                            step="0.001"
                            disabled={busy}
                            value={edited[m.id]?.b ?? ""}
                            onChange={(e) =>
                              setEdited((v) => ({
                                ...v,
                                [m.id]: {
                                  a: v[m.id]?.a ?? "",
                                  b: e.target.value,
                                },
                              }))
                            }
                          />
                        ) : (
                          (m.score2 ?? "—")
                        )}
                      </td>
                      <td>
                        {states[m.status]}
                        {m.bye ? " · Miễn đấu" : ""}
                        {m.reopen_requested ? " · Đang xin nhập lại" : ""}
                      </td>
                      <td>
                        {!readOnly && role === "referee" && !m.bye && (
                          <>
                            <button
                              disabled={busy || !canEnter}
                              onClick={() => void command(m, "submit")}
                            >
                              Xin xác nhận
                            </button>
                            <button
                              disabled={
                                busy ||
                                !["pending", "confirmed"].includes(m.status) ||
                                m.reopen_requested ||
                                upstreamUnderReview(m, all)
                              }
                              onClick={() => void command(m, "request_reentry")}
                            >
                              Xin nhập lại
                            </button>
                          </>
                        )}
                        {!readOnly &&
                          (role === "chief" || role === "admin") &&
                          !m.bye && (
                            <>
                              <button
                                disabled={
                                  busy ||
                                  m.status !== "pending" ||
                                  m.reopen_requested ||
                                  upstreamUnderReview(m, all)
                                }
                                onClick={() => void command(m, "confirm")}
                              >
                                Xác nhận
                              </button>
                              <button
                                disabled={
                                  busy ||
                                  !(
                                    m.status === "pending" ||
                                    (m.status === "confirmed" &&
                                      m.reopen_requested)
                                  )
                                }
                                onClick={() => void command(m, "reject")}
                              >
                                Từ chối
                              </button>
                            </>
                          )}
                      </td>
                      <td>
                        <details>
                          <summary>{m.log.length} hoạt động</summary>
                          <ol>
                            {m.log.map((l, j) => (
                              <li key={j}>
                                {new Date(l.at).toLocaleString("vi-VN", {
                                  timeZone: "Asia/Ho_Chi_Minh",
                                })}{" "}
                                · {l.actor_email ?? l.actor_id} ·{" "}
                                {actions[l.action] ?? l.action}
                                {l.reason ? ` · ${l.reason}` : ""}
                                {l.before_state && l.after_state
                                  ? ` · ${l.before_state.score1 ?? "—"}:${l.before_state.score2 ?? "—"} → ${l.after_state.score1 ?? "—"}:${l.after_state.score2 ?? "—"}`
                                  : ""}
                              </li>
                            ))}
                          </ol>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {draw.mode === "round_robin" && (
            <section>
              <h2>
                Theo dõi vòng tròn{" "}
                {selected
                  ? `đến trận ${all[current]?.match_no ?? ""}`
                  : "— tất cả trận đã xác nhận"}
              </h2>
              <p>
                Chỉ cộng trận đã xác nhận. Thứ tự dưới đây theo danh sách tham
                gia, không tự quyết định xếp hạng khi bằng điểm.
              </p>
              <table>
                <thead>
                  <tr>
                    {[
                      "Đội/Cặp/VĐV",
                      "Trận đã đấu",
                      "Thắng",
                      "Hòa",
                      "Thua",
                      "Điểm",
                      "Điểm ghi",
                      "Điểm nhận",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roundRobinProgress(
                    draw,
                    all,
                    selected ? all[current]?.match_no : undefined,
                  ).map((r) => (
                    <tr key={r.id}>
                      <td>{r.label}</td>
                      <td>{r.played}</td>
                      <td>{r.wins}</td>
                      <td>{r.draws}</td>
                      <td>{r.losses}</td>
                      <td>{r.points}</td>
                      <td>{r.scored}</td>
                      <td>{r.conceded}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </section>
  );
}
function DrawBuilder({
  code,
  data,
  disabled,
  onDirty,
  create,
}: {
  code: string;
  data: LiveState;
  disabled: boolean;
  onDirty: (v: boolean) => void;
  create: (d: DrawSetup) => Promise<boolean>;
}) {
  const event = athleteCatalog.find((e) => e.code === code)!;
  const performance =
    ["DK", "BOI"].includes(event.sportCode) ||
    (event.sportCode === "VNM" && event.form !== "DOI_KHANG");
  const [unit, setUnit] = useState("");
  const [mode, setMode] = useState<DrawSetup["mode"]>(
      performance ? "performance" : "round_robin",
    ),
    [win, setWin] = useState(""),
    [tie, setTie] = useState(""),
    [loss, setLoss] = useState(""),
    [allowDraw, setAllowDraw] = useState(false),
    [entries, setEntries] = useState<MatchEntrant[]>([]),
    [label, setLabel] = useState(""),
    [members, setMembers] = useState<string[]>([]),
    [error, setError] = useState("");
  const schools = data.schools.filter((s) => s.status === "approved"),
    eligible = schools.flatMap((s) =>
      s.athletes
        .filter((a) => a.catalogSelections?.includes(code))
        .map((a) => ({ ...a, schoolId: s.id })),
    ),
    individual = ["CA_NHAN", "DOI_KHANG"].includes(event.form);
  const dirty = Boolean(
    unit || win || tie || loss || entries.length || members.length || label,
  );
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);

  const add = () => {
    if (
      !label.trim() ||
      members.length < 2 ||
      new Set(
        members.map((id) => eligible.find((a) => a.draftId === id)?.schoolId),
      ).size !== 1
    ) {
      setError("Đội/cặp cần tên và ít nhất hai thành viên hợp lệ cùng trường.");
      return;
    }
    setEntries((v) => [
      ...v,
      {
        id: crypto.randomUUID(),
        label: label.trim(),
        schoolId: eligible.find((a) => a.draftId === members[0])!.schoolId,
        members,
      },
    ]);
    setLabel("");
    setMembers([]);
  };
  return (
    <section>
      <h2>Tổ trưởng thiết lập trước khi tạo trận</h2>
      <p>
        Đối chiếu điều lệ và xác nhận danh sách tham gia. Điểm không được tự
        thay sau khi tạo trận.
      </p>
      {error && <p role="alert">{error}</p>}
      <label>
        Thể thức
        <select
          disabled={disabled || performance}
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as typeof mode);
            setAllowDraw(false);
          }}
        >
          {performance && <option value="performance">Thi thành tích</option>}
          <option value="round_robin">Đấu vòng tròn</option>
          <option value="knockout">Loại trực tiếp</option>
        </select>
      </label>
      {performance ? (
        <label>
          Đơn vị thành tích
          <input
            value={unit}
            maxLength={40}
            disabled={disabled}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="giây / m / điểm"
          />
        </label>
      ) : (
        (
          [
            ["Điểm thắng", win, setWin],
            ["Điểm hòa", tie, setTie],
            ["Điểm thua", loss, setLoss],
          ] as const
        ).map(([t, v, set]) => (
          <label key={t}>
            {t}
            <input
              type="number"
              min="0"
              max="100"
              step="0.001"
              value={v}
              disabled={disabled}
              onChange={(e) => set(e.target.value)}
            />
          </label>
        ))
      )}
      <label>
        <input
          type="checkbox"
          checked={allowDraw}
          disabled={disabled || mode === "knockout" || performance}
          onChange={(e) => setAllowDraw(e.target.checked)}
        />
        Cho phép hòa
      </label>
      {individual ? (
        <p>{eligible.length} VĐV đã duyệt được đưa vào danh sách trận.</p>
      ) : (
        <>
          <label>
            Tên đội/cặp
            <input
              value={label}
              disabled={disabled}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <fieldset disabled={disabled}>
            <legend>Thành viên đội/cặp</legend>
            {eligible
              .filter(
                (a) => !entries.some((e) => e.members.includes(a.draftId)),
              )
              .map((a) => (
                <label key={a.draftId}>
                  <input
                    type="checkbox"
                    checked={members.includes(a.draftId)}
                    onChange={(e) =>
                      setMembers((v) =>
                        e.target.checked
                          ? [...v, a.draftId]
                          : v.filter((x) => x !== a.draftId),
                      )
                    }
                  />
                  {a.athleteCode} — {a.fullName}
                </label>
              ))}
          </fieldset>
          <button disabled={disabled} onClick={add}>
            Thêm đội/cặp
          </button>
          <ul>
            {entries.map((e) => (
              <li key={e.id}>
                {e.label} — {e.members.length} thành viên{" "}
                <button
                  disabled={disabled}
                  onClick={() =>
                    setEntries((v) => v.filter((x) => x.id !== e.id))
                  }
                >
                  Bỏ {e.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <button
        disabled={disabled}
        onClick={async () => {
          setError("");
          const entrants = individual
            ? eligible.map((a) => ({
                id: a.draftId,
                label: a.fullName,
                schoolId: a.schoolId,
                members: [a.draftId],
              }))
            : entries;
          if (
            (performance
              ? !unit.trim()
              : [win, tie, loss].some(
                  (v) => v === "" || !Number.isFinite(Number(v)),
                )) ||
            entrants.length < (performance ? 1 : 2)
          ) {
            setError("Nhập đủ cấu hình và danh sách tham gia hợp lệ.");
            return;
          }
          if (
            !performance &&
            (!eligibleDraw(
              entrants.map((e) => ({ ...e, personIds: e.members })),
              individual ? "individual_combat" : "team",
            ) ||
              (individual &&
                ((mode === "round_robin" && entrants.length > 5) ||
                  (mode === "knockout" && entrants.length < 6))))
          ) {
            setError(
              "Cá nhân cần ít nhất 3 VĐV/2 trường (3–5 vòng tròn, từ 6 loại trực tiếp); đội/cặp cần ít nhất 3 đội/3 trường.",
            );
            return;
          }
          if (
            !window.confirm(
              "Đã đối chiếu điều lệ, danh sách tham gia và cấu hình điểm trước khi tạo trận?",
            )
          )
            return;
          await create({
            mode,
            entrants,
            winPoints: Number(win),
            drawPoints: Number(tie),
            lossPoints: Number(loss),
            allowDraw,
            unit,
          });
        }}
      >
        Tạo danh sách trận
      </button>
    </section>
  );
}
