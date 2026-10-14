import { HkpdLogo } from "./role-workspaces.js";
import { useEffect, useRef, useState } from "react";
import {
  blankCatalogRow,
  catalogContents,
  catalogGroups,
  catalogSports,
  educationLevel,
  eligibleCatalog,
  eventByCode,
  hasCatalogGroups,
  migrateLegacyPreferences,
  rowFromCode,
  scopeIssue,
  selectCatalogSport,
  validateCatalogRow,
  validateCatalogRows,
  type CatalogRow,
  type StudentScope,
} from "./athlete-catalog.js";
import type { AthleteDraft, SchoolDraft } from "./registration-draft.js";
import { resizePhoto } from "./photo-resize.js";
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
  const inferredLevel = educationLevel(athlete);
  const [level, setLevel] = useState<StudentScope["level"]>(inferredLevel);
  const birthYear = athlete.birthDate
    ? Number(athlete.birthDate.slice(0, 4))
    : null;
  const scope: StudentScope = {
    level,
    gender: athlete.gender ?? "",
    birthYear,
    year: 2026,
  };
  const available = eligibleCatalog(scope);
  const sports = catalogSports(available);
  const [initial] = useState(() =>
    athlete.catalogSelections !== undefined
      ? { codes: athlete.catalogSelections, unresolved: [] }
      : migrateLegacyPreferences(athlete.eventSelections ?? [], available),
  );
  const [legacy, setLegacy] = useState(initial.unresolved);
  const [rows, setRows] = useState<CatalogRow[]>(() =>
    initial.codes.length ? initial.codes.map(rowFromCode) : [blankCatalogRow()],
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
        file.size > 10 * 1024 * 1024
      )
        throw Error("Chọn ảnh JPG, PNG hoặc WebP không quá 10 MB.");
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
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () =>
          img.naturalWidth > 8000 || img.naturalHeight > 8000
            ? reject(Error("Ảnh tối đa 8.000 × 8.000 pixel."))
            : resolve(img);
        img.onerror = () => reject(Error("Tệp không phải ảnh hợp lệ."));
        img.src = url;
      });
      const resized = resizePhoto(image);
      if (alive.current) {
        setPhoto(resized);
        setDirty(true);
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  function updateRows(next: CatalogRow[]) {
    setRows(next);
    setDirty(true);
    setError("");
  }
  function addSport() {
    if (
      new Set(rows.filter((r) => r.sportCode).map((r) => r.sportCode)).size >= 2
    ) {
      setError(
        "Mỗi VĐV chỉ được đăng ký tối đa 2 môn. Dùng Thêm nội dung để thêm nội dung của môn đã chọn.",
      );
      return;
    }
    updateRows([...rows, blankCatalogRow()]);
  }
  function addContent() {
    const last = rows.at(-1);
    if (!last?.sportCode) {
      setError("Chọn môn ở dòng cuối trước khi thêm nội dung.");
      return;
    }
    updateRows([...rows, blankCatalogRow(last.sportCode, last.group)]);
  }
  function saveRow(id: string) {
    try {
      const row = rows.find((r) => r.id === id)!;
      validateCatalogRow(row, available);
      if (rows.some((r) => r.id !== id && r.eventCode === row.eventCode))
        throw Error("Nội dung đã được đăng ký, không chọn trùng.");
      if (
        new Set(rows.filter((r) => r.sportCode).map((r) => r.sportCode)).size >
        2
      )
        throw Error("Mỗi VĐV tối đa 2 môn thi đấu.");
      updateRows(
        rows.map((r) => (r.id === id ? { ...r, isEditing: false } : r)),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function changeLevel(next: StudentScope["level"]) {
    if (
      rows.some((r) => r.sportCode) &&
      !window.confirm(
        "Đổi cấp học sẽ xóa lựa chọn trong bảng để lọc lại theo cấp học. Bạn muốn tiếp tục?",
      )
    )
      return;
    setLevel(next);
    updateRows([blankCatalogRow()]);
  }
  function save() {
    try {
      if (base.current !== JSON.stringify(school.athletes))
        throw Error(
          "Phiếu đã thay đổi trong lúc đăng ký môn. Bản đang nhập vẫn giữ trong cửa sổ này; hãy đối chiếu trước khi lưu.",
        );
      if (legacy.length)
        throw Error(
          "Có lựa chọn cũ chưa đối chiếu được với danh mục. Chọn lại hoặc xóa từng lựa chọn cũ trước khi lưu.",
        );
      const codes = validateCatalogRows(rows, available);
      onApply({
        photoDataUrl: photo,
        catalogSelections: codes,
        eventSelections: [],
        ...(level ? { educationLevel: level } : {}),
        requestedEvent: codes
          .map((code) => {
            const e = eventByCode(code)!;
            return `${e.sportName} – ${e.name} (${e.code})`;
          })
          .join("; "),
      });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="athlete-event-dialog catalog-athlete-dialog"
      aria-labelledby="athlete-event-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header className="event-dialog-header">
        <HkpdLogo className="workspace-heading-logo" />
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
            disabled={busy || Boolean(inferredLevel)}
            onChange={(e) => changeLevel(e.target.value as "TH" | "THCS")}
          >
            <option value="" disabled>
              -- Chọn cấp học --
            </option>
            <option value="TH">Tiểu học</option>
            <option value="THCS">Trung học cơ sở</option>
          </select>
        </section>
        <h3 className="catalog-info-heading">Thông tin chung</h3>
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
              JPG, PNG, WebP · tối đa 10 MB, tự thu nhỏ
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
                <dt>Năm sinh</dt>
                <dd>{birthYear ?? "Chưa nhập"}</dd>
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
            <h3>Danh sách đăng ký</h3>
            <span>{rows.filter((r) => r.eventCode).length} nội dung</span>
          </div>
          {scopeIssue(scope) && (
            <p className="notice error">{scopeIssue(scope)}</p>
          )}
          {legacy.length > 0 && (
            <div className="notice error">
              <p>
                Lựa chọn cũ chưa đối chiếu được với danh mục mới. Dữ liệu vẫn
                được giữ; chọn lại nội dung hoặc xóa lựa chọn cũ để tiếp tục.
              </p>
              <ul>
                {legacy.map((p, i) => (
                  <li key={`${p.sportId}-${p.level}-${p.eventLabel}`}>
                    <span>
                      {p.eventLabel} ({p.level})
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setLegacy((current) =>
                          current.filter((_, n) => n !== i),
                        );
                        setDirty(true);
                      }}
                    >
                      Xóa lựa chọn cũ {i + 1}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="event-registration-scroll">
            <table className="event-registration-table catalog-registration-table">
              <colgroup>
                <col style={{ width: 44 }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "16%" }} />
                <col />
                <col style={{ width: 90 }} />
              </colgroup>
              <thead>
                <tr>
                  {[
                    "STT",
                    "Mã môn",
                    "Môn",
                    "Phân nhóm",
                    "Tên nội dung",
                    "Trạng thái",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const selected = eventByCode(row.eventCode),
                    groups = catalogGroups(available, row.sportCode),
                    contents = catalogContents(
                      available,
                      row.sportCode,
                      row.group,
                    ),
                    editable = row.isEditing;
                  return (
                    <tr
                      key={row.id}
                      className={editable ? "catalog-edit-row" : ""}
                    >
                      <td>{index + 1}</td>
                      <td>
                        <span className="catalog-event-code">
                          {row.eventCode || "—"}
                        </span>
                        {row.eventCode &&
                          !available.some((e) => e.code === row.eventCode) && (
                            <small className="catalog-invalid-choice">
                              Cần chọn lại theo hồ sơ hiện tại
                            </small>
                          )}
                      </td>
                      <td>
                        {editable ? (
                          <select
                            aria-label={`Môn dòng ${index + 1}`}
                            value={row.sportCode}
                            disabled={busy || Boolean(scopeIssue(scope))}
                            onChange={(e) =>
                              updateRows(
                                rows.map((r) =>
                                  r.id === row.id
                                    ? selectCatalogSport(
                                        r,
                                        e.target.value,
                                        available,
                                      )
                                    : r,
                                ),
                              )
                            }
                          >
                            <option value="">-- Chọn môn --</option>
                            {sports.map((s) => (
                              <option key={s.code} value={s.code}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          (selected?.sportName ?? row.sportCode)
                        )}
                      </td>
                      <td>
                        {editable ? (
                          <select
                            aria-label={`Phân nhóm dòng ${index + 1}`}
                            value={row.group}
                            disabled={
                              busy ||
                              !row.sportCode ||
                              !hasCatalogGroups(row.sportCode)
                            }
                            onChange={(e) =>
                              updateRows(
                                rows.map((r) =>
                                  r.id === row.id
                                    ? {
                                        ...r,
                                        group: e.target.value,
                                        eventCode: "",
                                      }
                                    : r,
                                ),
                              )
                            }
                          >
                            <option value="">
                              {row.sportCode && !hasCatalogGroups(row.sportCode)
                                ? "Không phân nhóm"
                                : "-- Chọn nhóm --"}
                            </option>
                            {groups.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        ) : (
                          row.group || "—"
                        )}
                      </td>
                      <td>
                        {editable ? (
                          <select
                            aria-label={`Tên nội dung dòng ${index + 1}`}
                            value={row.eventCode}
                            disabled={
                              busy ||
                              !row.sportCode ||
                              (hasCatalogGroups(row.sportCode) && !row.group) ||
                              row.sportCode === "BD"
                            }
                            onChange={(e) =>
                              updateRows(
                                rows.map((r) =>
                                  r.id === row.id
                                    ? { ...r, eventCode: e.target.value }
                                    : r,
                                ),
                              )
                            }
                          >
                            <option value="">-- Chọn nội dung --</option>
                            {contents.map((e) => (
                              <option key={e.code} value={e.code}>
                                {e.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          (selected?.name ?? "Mã không còn trong danh mục")
                        )}
                      </td>
                      <td className="catalog-row-actions">
                        <div>
                          <button
                            type="button"
                            disabled={busy}
                            className={
                              editable ? "catalog-save" : "catalog-edit"
                            }
                            aria-label={`${editable ? "Lưu" : "Sửa"} đăng ký dòng ${index + 1}`}
                            title={editable ? "Lưu dòng" : "Sửa dòng"}
                            onClick={() =>
                              editable
                                ? saveRow(row.id)
                                : setRows((current) =>
                                    current.map((r) =>
                                      r.id === row.id
                                        ? { ...r, isEditing: true }
                                        : r,
                                    ),
                                  )
                            }
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              width="17"
                              height="17"
                              fill="currentColor"
                            >
                              <path
                                d={
                                  editable
                                    ? "M3 2h15l4 4v16H2V2h1zm3 1v7h11V3H6zm0 11v7h12v-7H6z"
                                    : "M3 17v4h4L20 8l-4-4L3 17zm14-14 2-2 4 4-2 2-4-4z"
                                }
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className="catalog-delete"
                            aria-label={`Xóa đăng ký dòng ${index + 1}`}
                            title="Xóa dòng"
                            onClick={() => {
                              const next = rows.filter((r) => r.id !== row.id);
                              updateRows(
                                next.length ? next : [blankCatalogRow()],
                              );
                            }}
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              width="17"
                              height="17"
                              fill="currentColor"
                            >
                              <path d="M4 6h16v2H4V6zm3 3h10l-1 13H8L7 9zm2-7h6l1 3H8l1-3z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="event-table-add">
            <button type="button" disabled={busy} onClick={addSport}>
              ＋ Thêm môn thi
            </button>
            <button type="button" disabled={busy} onClick={addContent}>
              ＋ Thêm nội dung
            </button>
          </div>
          <p className="event-reference-note">
            Danh mục: 133 nội dung từ tệp Excel đã cung cấp. Tuổi = 2026 − năm
            sinh. Thêm nội dung kế thừa môn và phân nhóm của dòng cuối; lưu toàn
            bộ bằng nút Lưu đăng ký môn.
          </p>
          <p className="event-reference-note">
            Đăng ký đang lưu nháp; quota trường, đội/đôi và duyệt chính thức sẽ
            được kiểm tra ở bước tích hợp.
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
