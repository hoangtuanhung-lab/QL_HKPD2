import { athleteCatalog } from "./athlete-catalog.generated.js";
import {
  competitionRegistrationRows,
  type CompetitionRegistrationSource,
} from "./competition-registration.js";
import { useState, type FormEvent } from "react";
import { DataGrid, FormField } from "@hkpd/ui";
import {
  automaticKnockout,
  manualKnockout,
  roundRobin,
  bracketSize,
  confirmDraw,
  withdraw,
  eligible,
  type EventKind,
  type Draw,
  type Entrant,
  type CompetitionSnapshot,
} from "@hkpd/competition";
function parseRoster(text: string): Entrant[] {
  return text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [id, label, schoolId, people] = line
        .split(";")
        .map((s) => s.trim());
      if (!id || !label || !schoolId)
        throw new Error(
          "Mỗi dòng cần Mã;Tên;Mã trường;Mã người (nếu là đội). ",
        );
      return {
        id,
        label,
        schoolId,
        personIds: people ? people.split(",").map((s) => s.trim()) : [id],
      };
    });
}
function slotLabel(
  draw: Draw,
  round: number,
  matchIndex: number,
  side: number,
): string {
  const slot = draw.rounds[round]!.matches[matchIndex]!.slots[side]!;
  if (slot.kind === "ghost") return "Miễn vòng đầu";
  if (slot.kind === "participant")
    return draw.entrants.find((e) => e.id === slot.entrantId)!.label;
  const match = draw.rounds
    .flatMap((r) => r.matches)
    .find((m) => m.id === slot.matchId)!;
  return `Thắng trận ${match.number} · vòng ${match.round}`;
}
export function KnockoutView({
  draw,
  withdrawnIds = [],
}: {
  draw: Draw;
  withdrawnIds?: readonly string[];
}) {
  const height = Math.max(220, draw.rounds[0]!.matches.length * 90 + 60);
  const width = draw.rounds.length * 250 + 30;
  const centers = draw.rounds.map((round, index) =>
    round.matches.map(
      (_, matchIndex) => 60 + (matchIndex + 0.5) * 90 * 2 ** index,
    ),
  );
  return (
    <div
      className="bracket-scroll"
      tabIndex={0}
      role="region"
      aria-label="Sơ đồ đầy đủ các vòng"
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label="Sơ đồ loại trực tiếp, nhánh cố định"
      >
        {draw.rounds.map((round, column) => (
          <g key={round.number}>
            <text x={column * 250 + 20} y={25} className="bracket-heading">
              Vòng {round.number}
              {column === draw.rounds.length - 1 ? " · Chung kết" : ""}
            </text>
            {round.matches.map((match, index) => {
              const x = column * 250 + 20;
              const center = centers[column]![index]!;
              return (
                <g key={match.id}>
                  {column > 0 &&
                    [0, 1].map((side) => (
                      <path
                        key={side}
                        className="bracket-link"
                        d={`M ${x - 50} ${centers[column - 1]![index * 2 + side]} H ${x - 25} V ${center} H ${x}`}
                      />
                    ))}
                  <rect
                    x={x}
                    y={center - 31}
                    width={200}
                    height={62}
                    rx={7}
                    className="bracket-card"
                  />
                  <text
                    x={x + 8}
                    y={center - 39}
                    className="bracket-match-label"
                  >
                    Trận {match.number}
                  </text>
                  {match.slots.map((slot, side) => (
                    <g key={side}>
                      <text
                        x={x + 8}
                        y={center - 10 + side * 28}
                        className="bracket-name"
                      >
                        <title>{slotLabel(draw, column, index, side)}</title>
                        {slotLabel(draw, column, index, side).slice(0, 23)}
                        {slot.kind === "participant" &&
                        withdrawnIds.includes(slot.entrantId)
                          ? " (bỏ cuộc)"
                          : ""}
                      </text>
                      <rect
                        x={x + 172}
                        y={center - 25 + side * 28}
                        width={22}
                        height={22}
                        className="bracket-score"
                      />
                      <text
                        x={x + 183}
                        y={center - 10 + side * 28}
                        textAnchor="middle"
                        aria-label={`Điểm bên ${side + 1}, trận ${match.number}, vòng ${match.round}: chưa có kết quả`}
                      >
                        —
                      </text>
                    </g>
                  ))}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}
export interface Standing {
  entrantId: string;
  played: number;
  points: string;
  rank: number | null;
}
export function RoundRobinView({
  draw,
  standings = [],
}: {
  draw: Draw;
  standings?: readonly Standing[];
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const round = draw.rounds[roundIndex] ?? draw.rounds[0]!;
  return (
    <div className="round-robin-layout">
      <section className="card">
        <h3>Lịch vòng tròn một lượt</h3>
        <nav aria-label="Chọn vòng thi đấu" className="round-nav">
          {draw.rounds.map((item, index) => (
            <button
              key={item.number}
              type="button"
              aria-pressed={round.number === item.number}
              onClick={() => setRoundIndex(index)}
            >
              Vòng {item.number}
            </button>
          ))}
        </nav>
        <h4>
          Vòng {round.number} · {round.matches.length} trận
        </h4>
        {round.matches.map((match, index) => (
          <article className="round-match" key={match.id}>
            <strong>Trận {match.number}</strong>
            <span>
              {slotLabel(draw, round.number - 1, index, 0)} —{" "}
              {slotLabel(draw, round.number - 1, index, 1)}
            </span>
            <span>Chưa có kết quả chính thức</span>
          </article>
        ))}
        {round.restingIds.length > 0 && (
          <p>
            Nghỉ vòng:{" "}
            {round.restingIds
              .map((id) => draw.entrants.find((e) => e.id === id)!.label)
              .join(", ")}
            . Không tính điểm.
          </p>
        )}
      </section>
      <section className="card">
        <h3>Bảng xếp hạng</h3>
        <DataGrid
          caption="Xếp hạng theo kết quả chính thức"
          rows={draw.entrants}
          rowKey={(e) => e.id}
          columns={[
            {
              key: "rank",
              label: "Vị thứ",
              render: (e) =>
                standings.find((s) => s.entrantId === e.id)?.rank ?? "—",
            },
            { key: "name", label: "VĐV / Đội", render: (e) => e.label },
            { key: "school", label: "Trường", render: (e) => e.schoolId },
            {
              key: "played",
              label: "Đã đấu",
              render: (e) =>
                standings.find((s) => s.entrantId === e.id)?.played ?? "—",
            },
            {
              key: "points",
              label: "Điểm",
              render: (e) =>
                standings.find((s) => s.entrantId === e.id)?.points ?? "—",
            },
          ]}
        />
        {!standings.length && (
          <p>
            Chưa có kết quả chính thức để xếp hạng. Nghỉ vòng không tạo điểm.
          </p>
        )}
      </section>
    </div>
  );
}
export function CompetitionWorkspace({
  mode,
  source,
}: {
  mode: "knockout" | "round_robin";
  source?: CompetitionRegistrationSource;
}) {
  const [kind, setKind] = useState<EventKind>("individual_combat");
  const [roster, setRoster] = useState("");
  const [eventId, setEventId] = useState("");
  const [hasSeeds, setHasSeeds] = useState(false);
  const [seedCount, setSeedCount] = useState("2");
  const [seedText, setSeedText] = useState("");
  const [manual, setManual] = useState(false);
  const [manualPositions, setManualPositions] = useState("");
  const [avoidSameSchool, setAvoid] = useState(true);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [storedSnapshot, setSnapshot] = useState<CompetitionSnapshot | null>(
    null,
  );
  const [drawSource, setDrawSource] = useState("");
  const events = athleteCatalog.filter((e) =>
    source?.catalogCodes.includes(e.code),
  );
  const selectedEvent = events.find((e) => e.code === eventId);
  const registeredRows = source
    ? competitionRegistrationRows(source, eventId)
    : [];
  const sourceKey = source
    ? JSON.stringify({
        editionId: source.editionId,
        mode,
        year: source.year,
        eventId,
        registeredRows,
        active: Boolean(selectedEvent),
      })
    : "manual";
  const snapshot = source && drawSource !== sourceKey ? null : storedSnapshot;
  function chooseEvent(code: string) {
    setEventId(code);
    setSnapshot(null);
    setDrawSource("");
    setSeedText("");
    setHasSeeds(false);
    setManualPositions("");
    setError("");
    setStatus("");
  }
  function generate(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("");
    try {
      if (snapshot?.status === "draw_confirmed")
        throw new Error("Đã chốt bản thử; sơ đồ bị khóa.");
      if (source) {
        if (!selectedEvent)
          throw new Error("Chọn nội dung đăng ký trước khi xếp vòng đấu.");
        if (["DOI", "DONG_DOI", "TIEP_SUC"].includes(selectedEvent.form))
          throw new Error(
            "Nội dung theo đội cần danh sách đội và thành viên đã xác nhận; không xếp từng VĐV thành một đội.",
          );
        if (
          ["DK", "BOI"].includes(selectedEvent.sportCode) ||
          (selectedEvent.sportCode === "VNM" &&
            selectedEvent.form !== "DOI_KHANG")
        )
          throw new Error(
            "Nội dung thi thành tích hoặc biểu diễn dùng phân lượt/làn hoặc chấm điểm, không xếp nhánh đối kháng.",
          );
        if (registeredRows.some((row) => row.issue))
          throw new Error(
            "Danh sách có hồ sơ không phù hợp nội dung. Rà soát cấp học, giới tính và tuổi trước khi xếp vòng đấu.",
          );
        if (registeredRows.some((row) => !row.schoolCode))
          throw new Error(
            "Danh sách có trường chưa xác định mã. Bổ sung hoặc đối chiếu danh mục trong Quản lý trường trước khi xếp vòng đấu.",
          );
      }
      const entrants = source
        ? registeredRows.map((row) => ({
            id: row.athleteId,
            label: row.athleteName,
            schoolId: row.schoolId,
            personIds: [row.athleteId],
          }))
        : parseRoster(roster);
      if (!eligible(entrants, kind))
        throw new Error(
          "Chưa đủ VĐV/đội hoặc số trường: cá nhân cần 3 người/2 trường, đội cần 3 đội/3 trường.",
        );
      if (
        mode === "round_robin" &&
        kind === "individual_combat" &&
        entrants.length > 5
      )
        throw new Error(
          "Cá nhân đối kháng từ 6 người cần dùng sơ đồ loại trực tiếp.",
        );
      const options = {
        seedIds: hasSeeds
          ? seedText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        avoidSameSchool,
        exceptionReason: reason,
      };
      if (
        hasSeeds &&
        (!Number.isInteger(Number(seedCount)) ||
          Number(seedCount) < 1 ||
          Number(seedCount) > 4 ||
          options.seedIds.length !== Number(seedCount))
      )
        throw new Error(
          "Danh sách hạt giống phải khớp số lượng đã chọn (1–4).",
        );
      let draw: Draw;
      if (mode === "round_robin") draw = roundRobin(eventId.trim(), entrants);
      else if (manual) {
        const positions = manualPositions
          .split(",")
          .map((s) => s.trim() || null);
        draw = manualKnockout(eventId.trim(), entrants, positions, options);
      } else draw = automaticKnockout(eventId.trim(), entrants, options);
      setDrawSource(sourceKey);
      setSnapshot({
        eventId: eventId.trim(),
        editionId: source?.editionId ?? "local-preview",
        sportId: selectedEvent?.sportCode ?? "local-preview",
        kind,
        version: (snapshot?.version ?? 0) + 1,
        status: "draft",
        startedAt: null,
        entrants,
        draw,
        withdrawnIds: [],
      });
      setStatus(
        "Đã tạo bản thử vòng đấu; chưa lưu hoặc gửi duyệt trên hệ thống.",
      );
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Không tạo được vòng đấu.",
      );
    }
  }
  const locked = snapshot?.status === "draw_confirmed";
  return (
    <section className="competition-workspace">
      <h2>{mode === "knockout" ? "Loại trực tiếp" : "Vòng tròn một lượt"}</h2>
      <p className="notice">
        {source
          ? "Danh sách lấy từ các phiếu đăng ký đã lưu của giải hiện tại. Mã VĐV là mã bản nháp. Vòng đấu tạo tại đây vẫn là bản thử, chưa thay danh sách thi đấu chính thức."
          : "Bản thử trên trình duyệt. Nhập danh sách để xem bố trí; danh sách này chưa được kiểm duyệt và không thay danh sách thi đấu chính thức."}
      </p>
      {source && (
        <section className="card competition-registration-list">
          <label>
            Nội dung đăng ký
            <select
              value={selectedEvent ? eventId : ""}
              onChange={(e) => chooseEvent(e.target.value)}
            >
              <option value="">-- Chọn nội dung đăng ký --</option>
              {events.map((e) => (
                <option key={e.code} value={e.code}>
                  {e.code} · {e.sportName} · {e.level} · {e.gender} ·{" "}
                  {e.group ?? "Cả cấp"} · {e.name}
                </option>
              ))}
            </select>
          </label>
          <p role="status">
            {registeredRows.length} VĐV đăng ký
            {selectedEvent
              ? ` · ${selectedEvent.code}`
              : " · Chưa chọn nội dung"}
          </p>
          <div className="table-scroll">
            <table>
              <caption>Danh sách VĐV theo nội dung đăng ký</caption>
              <thead>
                <tr>
                  {["STT", "Mã VĐV", "Tên VĐV", "Mã trường", "Tên trường"].map(
                    (label) => (
                      <th key={label}>{label}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {registeredRows.map((row, index) => (
                  <tr key={row.athleteId}>
                    <td>{index + 1}</td>
                    <td>
                      <code>{row.athleteId}</code>
                    </td>
                    <td title={row.issue || undefined}>{row.athleteName}</td>
                    <td>{row.schoolCode ?? "Chưa có mã"}</td>
                    <td>{row.schoolName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!registeredRows.length && (
            <p>
              {selectedEvent
                ? "Chưa có VĐV đăng ký nội dung này trong các phiếu đã lưu."
                : "Chọn nội dung để xem danh sách VĐV."}
            </p>
          )}
          {registeredRows.some((row) => row.issue) && (
            <p className="notice error">
              Có hồ sơ cần rà soát cấp học, giới tính hoặc tuổi; chưa thể xếp
              vòng đấu.
            </p>
          )}
          {storedSnapshot && !snapshot && (
            <p className="notice">
              Nguồn đăng ký hoặc cấu hình nội dung đã thay đổi. Tạo lại vòng đấu
              trước khi chốt.
            </p>
          )}
        </section>
      )}
      <form className="card draw-form" onSubmit={generate}>
        <fieldset disabled={locked}>
          <legend>Danh sách và cách bốc thăm</legend>
          {!source && (
            <>
              <FormField
                label="Mã nội dung thử"
                required
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
              />
              <label>
                Danh sách thử (mỗi dòng: Mã;Tên;Mã trường;Mã người nếu là đội)
                <textarea
                  required
                  rows={6}
                  value={roster}
                  onChange={(e) => setRoster(e.target.value)}
                />
              </label>
            </>
          )}
          {mode === "round_robin" && (
            <label>
              Loại nội dung
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as EventKind)}
              >
                <option value="individual_combat">
                  Cá nhân đối kháng (3–5 người)
                </option>
                {!source && <option value="team">Đội (vòng tròn)</option>}
              </select>
            </label>
          )}
          {mode === "knockout" && (
            <>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={hasSeeds}
                  onChange={(e) => setHasSeeds(e.target.checked)}
                />
                Có hạt giống
              </label>
              {hasSeeds && (
                <>
                  <FormField
                    label="Số lượng hạt giống"
                    type="number"
                    required
                    min="1"
                    max="4"
                    value={seedCount}
                    onChange={(e) => setSeedCount(e.target.value)}
                  />
                  <FormField
                    label="Hạt giống theo thứ tự ưu tiên (mã cách nhau bằng dấu phẩy, tối đa 4)"
                    value={seedText}
                    onChange={(e) => setSeedText(e.target.value)}
                  />
                </>
              )}
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={manual}
                  onChange={(e) => setManual(e.target.checked)}
                />
                Bốc thăm thủ công
              </label>
              {manual && (
                <FormField
                  label="Các vị trí theo thứ tự (mã cách nhau bằng dấu phẩy, để trống vị trí ảo)"
                  value={manualPositions}
                  onChange={(e) => setManualPositions(e.target.value)}
                  hint="Hạt giống 1 ở đầu, 2 ở cuối, 3 cuối nửa trên, 4 đầu nửa dưới."
                />
              )}
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={avoidSameSchool}
                  onChange={(e) => setAvoid(e.target.checked)}
                />
                Tránh cùng trường ở vòng đầu
              </label>
              <FormField
                label="Lý do ngoại lệ cùng trường (bản thử)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </>
          )}
          <button
            type="submit"
            disabled={locked || Boolean(source && !selectedEvent)}
          >
            Tạo vòng đấu thử
          </button>
        </fieldset>
      </form>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {status && (
        <p role="status" className="notice">
          {status}
        </p>
      )}
      {snapshot?.draw && (
        <>
          <div className="draw-controls">
            <p>
              Phiên bản {snapshot.version} ·{" "}
              {locked ? "Đã chốt bản thử · Khóa cấu trúc" : "Nháp"} ·{" "}
              {snapshot.entrants.length} đối tượng ·{" "}
              {mode === "knockout"
                ? `${bracketSize(snapshot.entrants.length)} vị trí`
                : `${snapshot.draw.rounds.length} vòng`}
            </p>
            <button
              type="button"
              disabled={locked}
              onClick={() => {
                setSnapshot(confirmDraw(snapshot, snapshot.version));
                setStatus(
                  "Đã khóa bản thử trên trình duyệt; chưa phải quyết định của tổ trưởng trên hệ thống.",
                );
              }}
            >
              Chốt bản thử
            </button>
          </div>
          {snapshot.draw.schoolException && (
            <p className="notice">
              Ngoại lệ: {snapshot.draw.schoolException.reason};{" "}
              {snapshot.draw.schoolException.matchIds.length} cặp cùng trường.
            </p>
          )}
          {mode === "knockout" && (
            <DataGrid
              caption="Vị trí bốc thăm"
              rows={snapshot.draw.positions.map((id, index) => ({
                id,
                position: index + 1,
              }))}
              rowKey={(row) => String(row.position)}
              columns={[
                {
                  key: "position",
                  label: "Vị trí",
                  render: (row) => row.position,
                },
                {
                  key: "entrant",
                  label: "VĐV / Đội",
                  render: (row) =>
                    row.id
                      ? snapshot.entrants.find((e) => e.id === row.id)!.label
                      : "Vị trí ảo · Miễn vòng đầu",
                },
                {
                  key: "seed",
                  label: "Hạt giống",
                  render: (row) =>
                    row.id && snapshot.draw!.seedIds.includes(row.id)
                      ? snapshot.draw!.seedIds.indexOf(row.id) + 1
                      : "—",
                },
              ]}
            />
          )}
          {mode === "knockout" ? (
            <KnockoutView
              draw={snapshot.draw}
              withdrawnIds={snapshot.withdrawnIds}
            />
          ) : (
            <RoundRobinView draw={snapshot.draw} />
          )}
          {locked && (
            <label>
              Ghi bỏ cuộc trên bản thử (giữ nhánh)
              <select
                aria-label="VĐV bỏ cuộc trên bản thử"
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    setSnapshot(
                      withdraw(snapshot, snapshot.version, e.target.value),
                    );
                }}
              >
                <option value="">Chọn VĐV / đội</option>
                {snapshot.entrants
                  .filter((e) => !snapshot.withdrawnIds.includes(e.id))
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </>
      )}
    </section>
  );
}
