import {
  addContentRow,
  addSportRow,
  changeRowSport,
  initialEventRows,
  isAdditionalEvent,
  removeEventRow,
  rowPreferences,
  splitEventLabel,
  type EventRow,
} from "./athlete-event-rows.js";
import { useEffect, useRef, useState } from "react";
import {
  eventOptions,
  sportNames,
  type SportId,
} from "./athlete-event-options.js";
import type { AthleteDraft, SchoolDraft } from "./registration-draft.js";
export function AthleteEventDialog({
  athlete,
  school,
  onApply,
  onClose,
}: {
  athlete: AthleteDraft;
  school: SchoolDraft;
  onApply: (patch: Partial<AthleteDraft>) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const photoFile = useRef<HTMLInputElement>(null);
  const base = useRef(JSON.stringify(school.athletes));
  const [photo, setPhoto] = useState(athlete.photoDataUrl ?? "");
  const [rows, setRows] = useState(() =>
    initialEventRows(athlete.eventSelections ?? []),
  );
  const [activeGroup, setActiveGroup] = useState("");
  const grade = Number(athlete.className.match(/^\s*(\d+)/)?.[1]);
  const [level, setLevel] = useState<"TH" | "THCS" | "">(
    athlete.eventSelections?.[0]?.level ??
      (grade >= 1 && grade <= 5
        ? "TH"
        : grade >= 6 && grade <= 9
          ? "THCS"
          : ""),
  );
  const [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    dialog.current?.showModal();
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function close() {
    if (busy) return;
    if (
      dirty &&
      !window.confirm("Ảnh hoặc môn đã chọn chưa lưu. Bạn muốn bỏ thay đổi?")
    )
      return;
    onClose();
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 500 * 1024
      )
        throw Error("Chọn ảnh JPG, PNG hoặc WebP không quá 500 KB.");
      const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      const signature =
        file.type === "image/png"
          ? [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)
          : file.type === "image/jpeg"
            ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
              String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
      if (!signature)
        throw Error("Nội dung tệp không đúng định dạng ảnh đã chọn.");
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(Error("Không đọc được ảnh."));
        reader.readAsDataURL(file);
      });
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () =>
          img.naturalWidth > 4000 || img.naturalHeight > 4000
            ? reject(Error("Ảnh tối đa 4.000 × 4.000 pixel."))
            : resolve();
        img.onerror = () => reject(Error("Tệp không phải ảnh hợp lệ."));
        img.src = url;
      });
      if (alive.current) {
        setPhoto(url);
        setDirty(true);
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const currentGroup =
    rows.find((r) => r.groupId === activeGroup)?.groupId ??
    rows.at(-1)!.groupId;
  function updateRows(next: EventRow[]) {
    setRows(next);
    setDirty(true);
    setError("");
  }
  function addSport() {
    try {
      const next = addSportRow(rows);
      updateRows(next);
      setActiveGroup(next.at(-1)!.groupId);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function addContent() {
    try {
      updateRows(addContentRow(rows, currentGroup));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function changeLevel(next: "TH" | "THCS") {
    if (next === level) return;
    if (
      rows.some((r) => r.eventLabel || r.extraEventLabels.length) &&
      !window.confirm(
        "Đổi cấp học sẽ xóa nội dung đã chọn để chọn lại cho phù hợp. Bạn muốn tiếp tục?",
      )
    )
      return;
    setLevel(next);
    updateRows(
      rows.map((r) => ({
        ...r,
        sportId:
          r.sportId && eventOptions(r.sportId, next, athlete.gender).length
            ? r.sportId
            : "",
        content: "",
        eventLabel: "",
        extraEventLabels: [],
      })),
    );
  }
  function save() {
    try {
      if (base.current !== JSON.stringify(school.athletes))
        throw Error(
          "Phiếu đã thay đổi trong lúc đăng ký môn. Bản đang nhập vẫn giữ trong cửa sổ này; hãy đối chiếu trước khi lưu.",
        );
      const selections = rowPreferences(rows, level, athlete.gender);
      onApply({
        photoDataUrl: photo,
        eventSelections: selections,
        requestedEvent: selections.length
          ? selections
              .map(
                (s) =>
                  `${sportNames[s.sportId]} – ${s.eventLabel} (${s.level})`,
              )
              .join("; ")
          : athlete.eventSelections?.length
            ? ""
            : athlete.requestedEvent,
      });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="athlete-event-dialog"
      aria-labelledby="athlete-event-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header className="event-dialog-header">
        <div>
          <p>HỘI KHỎE PHÙ ĐỔNG · QUẢNG PHÚ 2026</p>
          <h2 id="athlete-event-title">Đăng ký môn thi đấu</h2>
          <span>Hồ sơ vận động viên · {athlete.fullName}</span>
        </div>
        <button
          type="button"
          aria-label="Đóng đăng ký môn"
          disabled={busy}
          onClick={close}
        >
          ×
        </button>
      </header>
      <div className="event-dialog-content">
        <section
          className="event-level-banner"
          aria-label="Cấp học của học sinh"
        >
          <label htmlFor="athlete-school-level">Cấp học</label>
          <select
            id="athlete-school-level"
            value={level}
            disabled={busy}
            onChange={(e) => changeLevel(e.target.value as "TH" | "THCS")}
          >
            <option value="" disabled>
              -- Chọn cấp học --
            </option>
            <option value="TH">Tiểu học</option>
            <option value="THCS">Trung học cơ sở</option>
          </select>
        </section>
        <div className="event-profile">
          <section className="event-photo-card">
            {photo ? (
              <img src={photo} alt={`Ảnh hồ sơ ${athlete.fullName}`} />
            ) : (
              <div className="event-photo-placeholder">
                <svg aria-hidden="true" viewBox="0 0 64 64">
                  <circle cx="32" cy="22" r="12" />
                  <path d="M9 59c0-16 10-24 23-24s23 8 23 24" />
                </svg>
                <span>Chưa có ảnh VĐV</span>
              </div>
            )}
            <button
              type="button"
              className="event-upload-button"
              disabled={busy}
              onClick={() => photoFile.current?.click()}
            >
              {busy ? "Đang đọc ảnh…" : "↑ Tải ảnh VĐV"}
            </button>
            <input
              ref={photoFile}
              hidden
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Ảnh hồ sơ VĐV"
              disabled={busy}
              onChange={(e) => {
                const selected = e.target.files?.[0];
                e.target.value = "";
                void upload(selected);
              }}
            />
            {photo && (
              <button
                type="button"
                className="event-photo-remove"
                disabled={busy}
                onClick={() => {
                  setPhoto("");
                  setDirty(true);
                }}
              >
                Xóa ảnh
              </button>
            )}
            <small>
              JPG, PNG, WebP · tối đa 500 KB
              <br />
              Ảnh lưu cùng bản nháp trên trình duyệt.
            </small>
          </section>
          <section className="event-identity">
            <span className="event-draft-badge">Hồ sơ nháp</span>
            <h3>{athlete.fullName}</h3>
            <dl>
              <div>
                <dt>Trường đăng ký</dt>
                <dd>{school.schoolName}</dd>
              </div>
              <div>
                <dt>Lớp / nhóm</dt>
                <dd>{athlete.className || "Chưa nhập"}</dd>
              </div>
              <div>
                <dt>Ngày sinh</dt>
                <dd>
                  {athlete.birthDate
                    ? athlete.birthDate.split("-").reverse().join("/")
                    : "Chưa nhập"}
                </dd>
              </div>
              <div>
                <dt>Giới tính</dt>
                <dd>
                  {athlete.gender === "male"
                    ? "Nam"
                    : athlete.gender === "female"
                      ? "Nữ"
                      : "Chưa nhập"}
                </dd>
              </div>
              <div>
                <dt>CCCD / Mã định danh</dt>
                <dd>{athlete.identityNumber || "Chưa nhập"}</dd>
              </div>
            </dl>
          </section>
        </div>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <section className="event-choice-panel">
          <div className="event-panel-title">
            <h3>Đăng ký môn và nội dung thi đấu</h3>
            <span>
              {rows.filter((r) => r.eventLabel).length +
                rows.reduce((n, r) => n + r.extraEventLabels.length, 0)}{" "}
              nội dung đã chọn
            </span>
          </div>
          <div className="event-registration-scroll">
            <table className="event-registration-table">
              <colgroup>
                <col style={{ width: "40px" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col />
              </colgroup>
              <thead>
                <tr>
                  {["STT", "Môn thi", "Nội dung", "Chi tiết", "Ghi chú"].map(
                    (h) => (
                      <th key={h}>{h}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const head =
                    rows.find((r) => r.groupId === row.groupId)?.id === row.id;
                  const options =
                    row.sportId && level
                      ? eventOptions(row.sportId, level, athlete.gender)
                      : [];
                  const individual = options.filter(
                    (label) => !isAdditionalEvent(label),
                  );
                  const contents = [
                    ...new Set(
                      individual.map(
                        (label) =>
                          splitEventLabel(row.sportId as SportId, label)
                            .content,
                      ),
                    ),
                  ];
                  const details = individual.filter(
                    (label) =>
                      splitEventLabel(row.sportId as SportId, label).content ===
                      row.content,
                  );
                  const hasDetails = details.some(
                    (label) =>
                      splitEventLabel(row.sportId as SportId, label).detail,
                  );
                  return (
                    <tr
                      key={row.id}
                      onFocus={() => setActiveGroup(row.groupId)}
                      className={
                        row.groupId === currentGroup ? "event-active-group" : ""
                      }
                    >
                      <td>{index + 1}</td>
                      <td>
                        <select
                          aria-label={`Môn thi dòng ${index + 1}`}
                          value={row.sportId}
                          disabled={busy || !head || !level}
                          onChange={(e) => {
                            try {
                              updateRows(
                                changeRowSport(
                                  rows,
                                  row.groupId,
                                  e.target.value as SportId | "",
                                ),
                              );
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          <option value="">-- Chọn môn --</option>
                          {Object.entries(sportNames).map(([id, name]) => (
                            <option
                              key={id}
                              value={id}
                              disabled={
                                !level ||
                                !eventOptions(
                                  id as SportId,
                                  level,
                                  athlete.gender,
                                ).length
                              }
                            >
                              {name}
                            </option>
                          ))}
                        </select>
                        {!head && <small>Kế thừa môn ở hàng đầu</small>}
                      </td>
                      <td>
                        <select
                          aria-label={`Nội dung dòng ${index + 1}`}
                          disabled={busy || !row.sportId || !contents.length}
                          value={row.content}
                          onChange={(e) => {
                            const content = e.target.value;
                            const matches = individual.filter(
                              (label) =>
                                splitEventLabel(row.sportId as SportId, label)
                                  .content === content,
                            );
                            updateRows(
                              rows.map((r) =>
                                r.id === row.id
                                  ? {
                                      ...r,
                                      content,
                                      eventLabel:
                                        matches.length === 1 ? matches[0]! : "",
                                    }
                                  : r,
                              ),
                            );
                          }}
                        >
                          <option value="">-- Chọn nội dung --</option>
                          {contents.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          aria-label={`Chi tiết dòng ${index + 1}`}
                          value={hasDetails ? row.eventLabel : ""}
                          disabled={busy || !row.content || !hasDetails}
                          onChange={(e) =>
                            updateRows(
                              rows.map((r) =>
                                r.id === row.id
                                  ? { ...r, eventLabel: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        >
                          <option value="">
                            {row.content && !hasDetails
                              ? "—"
                              : "-- Chọn chi tiết --"}
                          </option>
                          {hasDetails &&
                            details.map((label) => (
                              <option key={label} value={label}>
                                {
                                  splitEventLabel(row.sportId as SportId, label)
                                    .detail
                                }
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="event-row-notes">
                        {head &&
                          options.filter(isAdditionalEvent).map((label) => (
                            <label key={label}>
                              <input
                                type="checkbox"
                                aria-label={`${label} môn ${sportNames[row.sportId as SportId]}`}
                                checked={row.extraEventLabels.includes(label)}
                                disabled={busy}
                                onChange={() =>
                                  updateRows(
                                    rows.map((r) =>
                                      r.id === row.id
                                        ? {
                                            ...r,
                                            extraEventLabels:
                                              r.extraEventLabels.includes(label)
                                                ? r.extraEventLabels.filter(
                                                    (v) => v !== label,
                                                  )
                                                : [
                                                    ...r.extraEventLabels,
                                                    label,
                                                  ],
                                          }
                                        : r,
                                    ),
                                  )
                                }
                              />
                              {label}
                            </label>
                          ))}
                        <button
                          type="button"
                          aria-label={`Xóa dòng đăng ký ${index + 1}`}
                          disabled={busy}
                          onClick={() =>
                            updateRows(removeEventRow(rows, row.id))
                          }
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="event-table-add">
            <button type="button" disabled={busy} onClick={addSport}>
              ＋ Thêm môn
            </button>
            <button type="button" disabled={busy} onClick={addContent}>
              ＋ Thêm nội dung
            </button>
          </div>
          <p className="event-reference-note">
            Thêm môn tạo hàng cho môn thứ hai. Thêm nội dung kế thừa môn của
            nhóm hàng đang chọn. Mỗi VĐV tối đa 2 môn; ô đôi/tiếp sức chỉ hiện ở
            hàng đầu của môn.
          </p>
          <p className="event-reference-note">
            Danh mục tham khảo theo điều lệ 2026. Nhóm tuổi, hạng cân, hạn mức
            và đội/đôi cần được kiểm tra khi gửi duyệt; lựa chọn này chưa cấp mã
            đăng ký chính thức.
          </p>
        </section>
      </div>
      <footer className="event-dialog-footer">
        <span>Lưu bản nháp · chưa gửi Ban tổ chức</span>
        <div>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={close}
          >
            Quay lại
          </button>
          <button type="button" disabled={busy} onClick={save}>
            ▣ Lưu đăng ký môn
          </button>
        </div>
      </footer>
    </dialog>
  );
}
