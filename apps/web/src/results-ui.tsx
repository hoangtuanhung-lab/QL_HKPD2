import { useState } from "react";
import { FormField } from "@hkpd/ui";
import {
  ResultError,
  ensure,
  submitPreview,
  confirmPreview,
  participantKey,
  exportResultCsv,
  type ResultMatch,
  type Value,
  type Payload,
} from "@hkpd/results";
export function ResultsWorkspace() {
  const [trialRefId] = useState(() => crypto.randomUUID());
  const [trialLeaderId] = useState(() => crypto.randomUUID());
  const [roster, setRoster] = useState(""),
    [kind, setKind] = useState<Value["kind"]>("score"),
    [precision, setPrecision] = useState("0");
  const [match, setMatch] = useState<ResultMatch | null>(null),
    [labels, setLabels] = useState<Record<string, string>>({}),
    [values, setValues] = useState<Record<string, string>>({});
  const [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [correctionNotes, setCorrectionNotes] = useState<Record<number, string>>(
      {},
    );
  const [pendingReasons, setPendingReasons] = useState<Record<string, string>>(
    {},
  );
  function action(run: () => void) {
    setError("");
    setNotice("");
    try {
      run();
    } catch (e) {
      setError(
        e instanceof ResultError
          ? e.message
          : "Dữ liệu biểu mẫu thử chưa hợp lệ.",
      );
    }
  }
  function newMatch() {
    action(() => {
      const rows = roster
        .split("\n")
        .filter((r) => r.trim())
        .map((r) => r.split(";").map((v) => v.trim()));
      ensure(
        rows.length >= 2 &&
          rows.every((r) => r.length === 3 && r.every(Boolean)) &&
          new Set(rows.map((r) => r[0])).size === rows.length,
        "ROSTER_INPUT",
        "Nhập ít nhất hai đối tượng, mỗi dòng Mã;Tên;Mã trường, mã không trùng.",
      );
      ensure(
        !["score", "sets"].includes(kind) || rows.length === 2,
        "ROSTER_INPUT",
        "Tỷ số/hiệp cần đúng hai phía.",
      );
      ensure(
        /^\d+$/.test(precision) && Number(precision) <= 6,
        "PRECISION",
        "Độ chính xác phải từ 0 đến 6 chữ số thập phân.",
      );
      const entries = rows.map((r) => ({
        id: crypto.randomUUID(),
        name: `${r[0]} · ${r[1]}`,
        schoolId: r[2]!,
      }));
      const next: ResultMatch = {
        id: crypto.randomUUID(),
        editionId: crypto.randomUUID(),
        eventId: crypto.randomUUID(),
        sportId: crypto.randomUUID(),
        version: 1,
        locked: false,
        participantSchoolIds: [...new Set(entries.map((e) => e.schoolId))],
        participantKeys: entries.map((e) => `athlete:${e.id}`),
        prerequisiteOfficialVersions: {},
        rule: {
          snapshotId: crypto.randomUUID(),
          kind,
          precision: Number(precision),
          ...(kind === "sets" ? { maxSets: 5 } : {}),
        },
        lease: null,
        submissions: [],
        official: null,
        officialHistory: [],
      };
      setMatch(next);
      setLabels(
        Object.fromEntries(entries.map((e) => [`athlete:${e.id}`, e.name])),
      );
      setValues({});
      setCorrectionNotes({});
      setPendingReasons({});
      setReason("");
      setNotice(
        "Đã tạo lượt thử rỗng. Mọi bản thử trước đã được thay; chưa gửi server.",
      );
    });
  }
  function payload(): Payload {
    ensure(match, "NO_MATCH", "Tạo lượt thử trước.");
    const keys = match.participantKeys;
    return {
      rule_snapshot_id: match.rule.snapshotId,
      file_ids: [],
      entries: keys.map((key, index) => {
        const text = values[key]?.trim() ?? "";
        ensure(
          text,
          "VALUE_REQUIRED",
          "Nhập thành tích cho mọi đối tượng; số 0 phải nhập rõ.",
        );
        let value: Value;
        switch (match.rule.kind) {
          case "score": {
            const other = values[keys[index === 0 ? 1 : 0]!]?.trim();
            ensure(
              /^\d+$/.test(text) && other && /^\d+$/.test(other),
              "SCORE_INPUT",
              "Tỷ số phải là số nguyên không âm.",
            );
            value = {
              kind: "score",
              scored: Number(text),
              conceded: Number(other),
            };
            break;
          }
          case "time":
            value = { kind: "time", seconds: text };
            break;
          case "distance":
            value = { kind: "distance", metres: text };
            break;
          case "points":
            value = { kind: "points", points: text };
            break;
          case "external_rank":
            ensure(
              /^\d+$/.test(text),
              "RANK_INPUT",
              "Nhập vị thứ bên ngoài từ 1.",
            );
            value = { kind: "external_rank", rank: Number(text) };
            break;
          case "sets":
            value = { kind: "sets", sets: JSON.parse(text) };
            break;
          case "cards":
            value = { kind: "cards", ...JSON.parse(text) };
            break;
        }
        return {
          participant: {
            kind: "athlete",
            athlete_id: key.slice("athlete:".length),
          },
          value,
        };
      }),
    };
  }
  function confirm(id: string) {
    action(() => {
      ensure(match, "NO_MATCH", "Chưa tạo lượt.");
      const s = match.submissions.find((s) => s.id === id);
      ensure(s, "NO_SUBMISSION", "Không tìm thấy bản nhập.");
      const next = confirmPreview(
        match,
        {
          submission_id: s.id,
          submission_version: s.version,
          base_official_version: s.base_official_version,
        },
        trialLeaderId,
        new Date(),
        crypto.randomUUID(),
      );
      setMatch(next);
      if (pendingReasons[id])
        setCorrectionNotes({
          ...correctionNotes,
          [next.official!.version]: pendingReasons[id]!,
        });
      setNotice("Đã xác nhận bản thử. Chưa phải kết quả chính thức của giải.");
    });
  }
  const format = (value: Value) => {
    switch (value.kind) {
      case "score":
        return `${value.scored}–${value.conceded}`;
      case "time":
        return `${value.seconds} s`;
      case "distance":
        return `${value.metres} m`;
      case "points":
        return `${value.points} điểm`;
      case "external_rank":
        return `Vị thứ ngoài: ${value.rank}`;
      case "sets":
        return value.sets.map((s) => `${s.scored}–${s.conceded}`).join(", ");
      case "cards":
        return `Vàng ${value.yellow}, đỏ ${value.red}`;
    }
  };
  return (
    <section className="card result-workspace">
      <h2>Nhập và xác nhận kết quả — bản thử</h2>
      <p className="notice">
        Chỉ thử quy trình với dữ liệu tổng hợp. Chưa đăng nhập, chưa kiểm quyền
        tại API và chưa ghi kết quả của giải. Đổi tab hoặc tải lại sẽ mất bản
        thử. Công khai của giải vẫn chờ tích hợp.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className="result-inputs">
        <label className="block">
          Danh sách kết quả thử (Mã;Tên;Mã trường)
          <textarea
            rows={4}
            value={roster}
            onChange={(e) => setRoster(e.target.value)}
          />
        </label>
        <label className="block">
          Biểu mẫu thử
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Value["kind"])}
          >
            {[
              ["score", "Tỷ số"],
              ["time", "Thời gian (giây)"],
              ["distance", "Thành tích tốt nhất (mét)"],
              ["points", "Tổng điểm"],
              ["sets", "Hiệp (JSON)"],
              ["cards", "Thẻ (JSON)"],
              ["external_rank", "Cờ vua: vị thứ phần mềm ngoài"],
            ].map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <FormField
          label="Độ chính xác thử (chữ số thập phân)"
          value={precision}
          onChange={(e) => setPrecision(e.target.value)}
        />
        <button type="button" onClick={newMatch}>
          Tạo lượt thử mới
        </button>
        {match && (
          <>
            <p>
              Biểu mẫu đang dùng: {match.rule.kind}; thay cấu hình phía trên chỉ
              áp dụng sau khi tạo lượt mới. Với hiệp nhập mảng scored/conceded;
              thẻ nhập yellow/red. Giới hạn 5 hiệp ở bản thử, chưa phải cấu hình
              môn chính thức.
            </p>
            {match.participantKeys.map((key) => (
              <FormField
                key={key}
                label={`Thành tích thử ${labels[key]}`}
                value={values[key] ?? ""}
                onChange={(e) =>
                  setValues({ ...values, [key]: e.target.value })
                }
              />
            ))}
            <FormField
              label="Lý do sửa bản thử"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button
              type="button"
              onClick={() =>
                action(() => {
                  const id = crypto.randomUUID(),
                    next = submitPreview(
                      match,
                      payload(),
                      trialRefId,
                      new Date(),
                      id,
                      reason,
                    );
                  setMatch(next);
                  setPendingReasons({ ...pendingReasons, [id]: reason.trim() });
                  setNotice(
                    "Đã lưu bản nhập thử chờ xác nhận. Bản đã xác nhận trước vẫn được giữ.",
                  );
                })
              }
            >
              Lưu bản nhập thử
            </button>
            <h3>Bản nhập chờ — nội bộ thử</h3>
            {match.submissions
              .filter((s) => s.status === "pending_confirmation")
              .map((s, i) => (
                <div className="card" key={s.id}>
                  <p>
                    Bản chờ {i + 1} · dựa trên phiên bản đã xác nhận{" "}
                    {s.base_official_version}
                  </p>
                  <ul>
                    {s.payload.entries.map((entry) => (
                      <li key={participantKey(entry.participant)}>
                        {labels[participantKey(entry.participant)]}:{" "}
                        {format(entry.value)}
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => confirm(s.id)}>
                    Xác nhận bản thử {i + 1}
                  </button>
                </div>
              ))}
          </>
        )}
      </div>
      <section className="result-print" aria-label="Kết quả đã xác nhận thử">
        <h3>Kết quả đã xác nhận thử</h3>
        {match?.official ? (
          <>
            <p>
              Phiên bản {match.official.version} · {match.official.confirmed_at}
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Đối tượng thử</th>
                    <th>Thành tích đã xác nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {match.official.payload.entries.map((entry) => (
                    <tr
                      key={participantKey(entry.participant)}
                      className={
                        match.officialHistory.length > 1
                          ? "result-corrected"
                          : ""
                      }
                    >
                      <td>{labels[participantKey(entry.participant)]}</td>
                      <td>{format(entry.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!!correctionNotes[match.official.version] && (
              <p>Ghi chú sửa: {correctionNotes[match.official.version]}</p>
            )}
            <div className="result-actions form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => window.print()}
              >
                In bản thử
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  const official = match.official!;
                  const csv = exportResultCsv(
                    official.payload.entries.map((entry) => ({
                      name: labels[participantKey(entry.participant)] ?? "",
                      value: format(entry.value),
                      correctedAt:
                        official.version > 1 ? official.confirmed_at : null,
                      reason: correctionNotes[official.version] ?? null,
                    })),
                  );
                  const url = URL.createObjectURL(
                    new Blob([csv], { type: "text/csv;charset=utf-8" }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "ket-qua-thu.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Xuất CSV thử
              </button>
            </div>
            <p className="print-signatures">
              Người lập / Tổ trưởng — BẢN THỬ, chưa ký nghiệm thu
            </p>
          </>
        ) : (
          <p>Chưa có bản nào được xác nhận thử.</p>
        )}
      </section>
      {!!match?.officialHistory.length && (
        <details className="result-inputs">
          <summary>Lịch sử bản đã xác nhận thử</summary>
          {match.officialHistory.map((o) => (
            <p key={o.id}>
              v{o.version} · {o.confirmed_at} ·{" "}
              {o.payload.entries
                .map(
                  (e) =>
                    `${labels[participantKey(e.participant)]}: ${format(e.value)}`,
                )
                .join("; ")}
            </p>
          ))}
        </details>
      )}
    </section>
  );
}
