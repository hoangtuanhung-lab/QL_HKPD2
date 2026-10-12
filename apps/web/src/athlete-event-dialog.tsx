import { useEffect, useRef, useState } from "react";
import {
  eventOptions,
  sportNames,
  type SportId,
  type EventPreference,
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
  const [selections, setSelections] = useState<EventPreference[]>(
    structuredClone(athlete.eventSelections ?? []),
  );
  const grade = Number(athlete.className.match(/^\s*(\d+)/)?.[1]);
  const [level, setLevel] = useState<"TH" | "THCS" | "">(
    athlete.eventSelections?.[0]?.level ??
      (grade >= 1 && grade <= 5
        ? "TH"
        : grade >= 6 && grade <= 9
          ? "THCS"
          : ""),
  );
  const [sport, setSport] = useState<SportId>(
    athlete.eventSelections?.[0]?.sportId ?? "athletics",
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
  function toggle(eventLabel: string) {
    if (!level) return;
    const same = (s: EventPreference) =>
      s.sportId === sport && s.level === level && s.eventLabel === eventLabel;
    setSelections((current) =>
      current.some(same)
        ? current.filter((s) => !same(s))
        : [...current, { sportId: sport, level, eventLabel }],
    );
    setDirty(true);
  }
  function save() {
    try {
      if (base.current !== JSON.stringify(school.athletes))
        throw Error(
          "Phiếu đã thay đổi trong lúc đăng ký môn. Bản đang nhập vẫn giữ trong cửa sổ này; hãy đối chiếu trước khi lưu.",
        );
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
  const options = level ? eventOptions(sport, level, athlete.gender) : [];
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
            <h3>Chọn môn và nội dung thi đấu</h3>
            <span>{selections.length} nội dung đã chọn</span>
          </div>
          <div className="event-selects">
            <label>
              Cấp học
              <select
                value={level}
                disabled={busy}
                onChange={(e) => setLevel(e.target.value as "TH" | "THCS")}
              >
                <option value="" disabled>
                  -- Chọn cấp học --
                </option>
                <option value="TH">Tiểu học</option>
                <option value="THCS">Trung học cơ sở</option>
              </select>
            </label>
            <label>
              Môn thi đấu
              <select
                value={sport}
                disabled={busy}
                onChange={(e) => setSport(e.target.value as SportId)}
              >
                {Object.entries(sportNames).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="event-options">
            {options.map((name) => (
              <label key={name} className="event-option">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={selections.some(
                    (s) =>
                      s.sportId === sport &&
                      s.level === level &&
                      s.eventLabel === name,
                  )}
                  onChange={() => toggle(name)}
                />
                <span>{name}</span>
              </label>
            ))}
            {!options.length && (
              <p>
                Chọn cấp học và bổ sung giới tính cho VĐV. Một số môn chỉ có ở
                cấp THCS hoặc dành cho nam theo điều lệ.
              </p>
            )}
          </div>
          <p className="event-reference-note">
            Danh mục tham khảo theo điều lệ 2026. Nhóm tuổi, hạng cân, hạn mức
            và đội/đôi cần được kiểm tra khi gửi duyệt; lựa chọn này chưa cấp mã
            đăng ký chính thức.
          </p>
        </section>
        <section className="event-selected">
          <h3>Nội dung đăng ký nháp</h3>
          {!selections.length ? (
            <p>Chưa chọn nội dung. Đánh dấu ô bên trên để bổ sung.</p>
          ) : (
            <ul>
              {selections.map((s, i) => (
                <li key={`${s.sportId}-${s.level}-${s.eventLabel}`}>
                  <span>
                    <strong>{sportNames[s.sportId]}</strong> · {s.eventLabel}{" "}
                    <small>{s.level}</small>
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Bỏ nội dung ${s.eventLabel}`}
                    onClick={() => {
                      setSelections((current) =>
                        current.filter((_, n) => n !== i),
                      );
                      setDirty(true);
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
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
