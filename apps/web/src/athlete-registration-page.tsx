import {
  mergeRegistrationRows,
  normalizedSchool,
} from "./registration-import.js";
import { eventByCode } from "./athlete-catalog.js";
import { HkpdLogo } from "./role-workspaces.js";
import { AthleteEventDialog } from "./athlete-event-dialog.js";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  athleteDetails,
  clean,
  newDraftId,
  type AthleteDraft,
  type SchoolDraft,
} from "./registration-draft.js";
import {
  readRegistrationWorkbook,
  registrationWorkbook,
} from "./registration-excel.js";

const blank = (): AthleteDraft => ({
  draftId: newDraftId(),
  fullName: "",
  className: "",
  requestedEvent: "",
  identityNumber: "",
  birthDate: "",
  gender: "male",
  note: "",
});
function Icon({
  kind,
}: {
  kind: "school" | "upload" | "download" | "edit" | "save" | "trash" | "book";
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="currentColor"
    >
      <path
        d={
          {
            school:
              "M3 5h7V2h4v3h7v16h-7v-5h-4v5H3V5zm3 3v3h2V8H6zm0 6v3h2v-3H6zm10-6v3h2V8h-2zm0 6v3h2v-3h-2zm-5-7v4h2V7h-2z",
            upload:
              "M5 2h9l5 5v15H5V2zm9 1v5h5L14 3zm-3 14h2v-5l2 2 1-1-4-4-4 4 1 1 2-2v5z",
            download:
              "M5 2h9l5 5v15H5V2zm9 1v5h5L14 3zm-3 7v5l-2-2-1 1 4 4 4-4-1-1-2 2v-5h-2z",
            edit: "M3 17v4h4L20 8l-4-4L3 17zm14-14 2-2 4 4-2 2-4-4z",
            save: "M3 2h15l4 4v16H2V2h1zm3 1v7h11V3H6zm0 11v7h12v-7H6zm7-10h3v5h-3V4z",
            trash: "M4 6h16v2H4V6zm3 3h10l-1 13H8L7 9zm2-7h6l1 3H8l1-3z",
            book: "M4 2h16v20H4V2zm3 2v16h2V4H7zm4 3v2h6V7h-6zm0 5v2h6v-2h-6z",
          }[kind]
        }
      />
    </svg>
  );
}
export function AthleteRegistrationPage({
  schools,
  activeId,
  onSelect,
  onSave,
  onDirty,
  storageStatus = "saved",
  year = 2026,
  catalogCodes,
  onlineFiles = false,
  onLookup,
}: {
  onLookup?: (identity: string) => Promise<Partial<AthleteDraft> | null>;
  onlineFiles?: boolean;
  schools: SchoolDraft[];
  activeId: string;
  onSelect: (id: string) => void;
  onSave: (school: SchoolDraft) => void;
  onDirty: (dirty: boolean) => void;
  storageStatus?: "saving" | "error" | "saved" | "pending";
  year?: number;
  catalogCodes?: readonly string[];
}) {
  const active = schools.find((s) => s.draftId === activeId);
  const [edited, setEdited] = useState<Record<string, AthleteDraft[]>>({});
  const [error, setError] = useState("");
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());
  const [openedAthleteId, setOpenedAthleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const bases = useRef<Record<string, string>>({});
  function captureBase(school: SchoolDraft) {
    bases.current[school.draftId] ??= JSON.stringify(school.athletes);
  }
  const [placeholderRow] = useState(blank);
  const trailingRow = useMemo(blank, [active?.draftId, active?.athletes]);
  const editedRows = active ? edited[active.draftId] : undefined;
  const rows = editedRows?.length
    ? editedRows
    : active
      ? [...active.athletes, trailingRow]
      : [placeholderRow];
  const dirty = Object.keys(edited).length > 0;
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(id: string, patch: Partial<AthleteDraft>) {
    if (!active) return;
    captureBase(active);
    setEdited((current) => ({
      ...current,
      [active.draftId]: rows.map((a) =>
        a.draftId === id ? { ...a, ...patch } : a,
      ),
    }));
    setNotice("");
  }
  function save(rowId?: string, patch?: Partial<AthleteDraft>) {
    if (!active) return;
    try {
      if (
        bases.current[active.draftId] !== undefined &&
        bases.current[active.draftId] !== JSON.stringify(active.athletes)
      )
        throw Error(
          "Phiếu đã được sửa bằng công cụ khác. Bảng đang nhập vẫn được giữ; hãy đối chiếu trước khi lưu.",
        );
      const candidates = rowId
        ? [
            ...(active.athletes.some((a) => a.draftId === rowId)
              ? active.athletes.map((a) =>
                  a.draftId === rowId
                    ? { ...rows.find((r) => r.draftId === rowId)!, ...patch }
                    : a,
                )
              : [
                  ...active.athletes,
                  { ...rows.find((r) => r.draftId === rowId)!, ...patch },
                ]),
          ]
        : rows;
      const entered = candidates.filter(
        (a) =>
          a.fullName.trim() ||
          a.identityNumber ||
          a.birthDate ||
          a.note ||
          a.gender === "female" ||
          a.className ||
          a.requestedEvent ||
          active.athletes.some((old) => old.draftId === a.draftId),
      );
      const identities = new Set<string>();
      const athletes = entered.map((a, index) => {
        if (!clean(a.fullName))
          throw Error(`Dòng ${index + 1}: nhập họ và tên.`);
        if (a.identityNumber && identities.has(a.identityNumber))
          throw Error(`Dòng ${index + 1}: trùng mã định danh.`);
        if (a.identityNumber) identities.add(a.identityNumber);
        return {
          ...a,
          fullName: clean(a.fullName),
          className: clean(a.className),
          requestedEvent: clean(a.requestedEvent),
          ...athleteDetails({ ...a }),
        };
      });
      onSave({ ...active, athletes });
      const otherChanges =
        rowId &&
        JSON.stringify(
          rows.filter(
            (a) =>
              a.draftId !== rowId &&
              (a.fullName ||
                a.identityNumber ||
                a.birthDate ||
                a.note ||
                a.className ||
                a.requestedEvent ||
                active.athletes.some((old) => old.draftId === a.draftId)),
          ),
        ) !==
          JSON.stringify(active.athletes.filter((a) => a.draftId !== rowId));
      if (otherChanges)
        bases.current[active.draftId] = JSON.stringify(athletes);
      else delete bases.current[active.draftId];
      setEdited((current) => {
        const next = { ...current };
        if (otherChanges)
          next[active.draftId] = rows.map((a) =>
            a.draftId === rowId
              ? athletes.find((saved) => saved.draftId === rowId)!
              : a,
          );
        else delete next[active.draftId];
        return next;
      });
      setEditingIds((current) =>
        rowId ? new Set([...current].filter((id) => id !== rowId)) : new Set(),
      );
      setError("");
      setNotice("Đã cập nhật danh sách bản nháp; chưa gửi duyệt.");
    } catch (e) {
      setError((e as Error).message);
      if (patch) throw e;
    }
  }
  const locked = (a: AthleteDraft) =>
    Boolean(
      active?.athletes.some((saved) => saved.draftId === a.draftId) &&
      !editingIds.has(a.draftId),
    );
  async function download() {
    setBusy(true);
    setError("");
    try {
      const bytes = await registrationWorkbook([], active?.schoolName ?? "");
      const url = URL.createObjectURL(
        new Blob([bytes as BlobPart], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "bieu-mau-dang-ky-vdv.xlsx";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Không tạo được biểu mẫu Excel. Hãy thử lại.");
    } finally {
      setBusy(false);
    }
  }
  async function upload(selected: File | undefined) {
    if (!selected || !active) return;
    const target = active.draftId;
    setBusy(true);
    setError("");
    try {
      if (!selected.name.toLowerCase().endsWith(".xlsx"))
        throw Error("Chọn tệp .xlsx theo biểu mẫu.");
      if (selected.size > 5 * 1024 * 1024) throw Error("Tệp Excel vượt 5 MB.");
      const imported = await readRegistrationWorkbook(
        await selected.arrayBuffer(),
      );
      if (
        imported.some(
          (a) =>
            a.schoolName &&
            normalizedSchool(a.schoolName) !==
              normalizedSchool(active.schoolName),
        )
      )
        throw Error(
          "Excel có học sinh thuộc trường khác. Chọn đúng phiếu trường.",
        );
      captureBase(active);
      setEdited((current) => ({
        ...current,
        [target]: [
          ...mergeRegistrationRows(
            (current[target] ?? active.athletes).filter(
              (a) =>
                a.fullName.trim() || a.identityNumber || a.birthDate || a.note,
            ),
            imported,
          ),
          blank(),
        ],
      }));
      setNotice(
        `Đã thêm ${imported.length} dòng từ Excel vào phiếu đang nhập. Bấm Lưu danh sách để kiểm tra và lưu.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }
  return (
    <section
      className="registration-page"
      aria-label="Đăng ký vận động viên theo bảng"
    >
      <header className="registration-title">
        <HkpdLogo className="workspace-heading-logo" />
        <h1>HỘI KHỎE PHÙ ĐỔNG XÃ QUẢNG PHÚ NĂM {year}</h1>
        <p>Danh sách đăng ký vận động viên tham gia thi đấu</p>
      </header>
      <div className="registration-school">
        <label htmlFor="registration-school">
          <Icon kind="school" /> Trường đăng ký:
        </label>
        <select
          id="registration-school"
          value={activeId}
          disabled={busy}
          onChange={(e) => {
            onSelect(e.target.value);
            setError("");
            setNotice("");
          }}
        >
          <option value="">-- Chọn trường --</option>
          {schools.map((s) => (
            <option key={s.draftId} value={s.draftId}>
              {s.schoolName} · {s.editionName}
            </option>
          ))}
        </select>
      </div>
      {!active && (
        <p className="notice">
          Chọn trường để nhập vào hàng trống bên dưới. Nếu chưa có phiếu trường,
          tạo phiếu tại phần Thiết lập phiếu trường.
        </p>
      )}
      <div className="registration-excel">
        <button
          type="button"
          className="excel-upload"
          disabled={!active || busy}
          onClick={() => file.current?.click()}
        >
          <Icon kind="upload" /> Cập nhật Excel
        </button>
        <button
          type="button"
          className="excel-download"
          disabled={busy}
          onClick={() => void download()}
        >
          <Icon kind="download" /> Tải biểu mẫu
        </button>
        <input
          ref={file}
          hidden
          type="file"
          accept=".xlsx"
          aria-label="Tệp Excel đăng ký"
          onChange={(e) => void upload(e.target.files?.[0])}
        />
      </div>
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
      <div className="registration-table-scroll">
        <table className="registration-table">
          <colgroup>
            {[45, 90, 140, 60, 150, 120, 130, 80, 125, 180, 200].map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {[
                "STT",
                "Mã VĐV",
                "TRƯỜNG",
                "KHỐI",
                "HỌ VÀ TÊN",
                "CCCD",
                "NGÀY SINH",
                "GIỚI TÍNH",
                "Phân nhóm",
                "NỘI DUNG THI ĐẤU",
                "TRẠNG THÁI",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => (
              <tr
                key={a.draftId}
                className={
                  active?.athletes.some((saved) => saved.draftId === a.draftId)
                    ? "registration-saved-row"
                    : "registration-empty-row"
                }
              >
                <td>{i + 1}</td>
                <td>{a.athleteCode || "Chưa cấp"}</td>
                <td>{active?.schoolName ?? "—"}</td>
                <td>
                  <input
                    aria-label={`Lớp / nhóm dòng ${i + 1}`}
                    placeholder="Khối 1–9"
                    value={a.className.match(/^\d+/)?.[0] ?? a.className}
                    disabled={!active || busy}
                    readOnly={locked(a)}
                    onChange={(e) =>
                      change(a.draftId, { className: e.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={`Họ tên dòng ${i + 1}`}
                    placeholder="Nhập họ và tên..."
                    value={a.fullName}
                    disabled={!active || busy}
                    readOnly={locked(a)}
                    onChange={(e) =>
                      change(a.draftId, { fullName: e.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={`Mã định danh dòng ${i + 1}`}
                    placeholder="Số CCCD..."
                    inputMode="numeric"
                    maxLength={12}
                    value={a.identityNumber ?? ""}
                    disabled={!active || busy}
                    readOnly={locked(a)}
                    onChange={(e) =>
                      change(a.draftId, { identityNumber: e.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={`Ngày sinh dòng ${i + 1}`}
                    type="date"
                    value={a.birthDate ?? ""}
                    disabled={!active || busy}
                    readOnly={locked(a)}
                    onChange={(e) =>
                      change(a.draftId, { birthDate: e.target.value })
                    }
                  />
                </td>
                <td>
                  <select
                    aria-label={`Giới tính dòng ${i + 1}`}
                    value={a.gender ?? ""}
                    disabled={!active || busy || locked(a)}
                    onChange={(e) =>
                      change(a.draftId, {
                        gender: e.target.value as "male" | "female",
                      })
                    }
                  >
                    <option value="" disabled>
                      --
                    </option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                  </select>
                </td>
                <td>
                  {[
                    ...new Set(
                      (a.catalogSelections ?? []).map(
                        (code) => eventByCode(code)?.group ?? "Cả cấp",
                      ),
                    ),
                  ].join("; ") || "—"}
                </td>
                <td>
                  <input
                    aria-label={`Nội dung thi đấu dòng ${i + 1}`}
                    readOnly
                    value={(a.catalogSelections ?? [])
                      .map(
                        (code) =>
                          `${code} — ${eventByCode(code)?.name ?? code}`,
                      )
                      .join("; ")}
                    placeholder="Chọn qua Đăng ký môn"
                  />
                </td>
                <td className="registration-state">
                  <span className="registration-status-label">
                    {storageStatus === "error"
                      ? "Chưa lưu an toàn"
                      : storageStatus === "saving"
                        ? "Đang lưu…"
                        : storageStatus === "pending"
                          ? "Chờ lưu lên hệ thống"
                          : (a.catalogSelections?.length ??
                              a.eventSelections?.length)
                            ? `${a.catalogSelections?.length ?? a.eventSelections?.length ?? 0} nội dung nháp`
                            : locked(a)
                              ? "Đã lưu nháp"
                              : "Đang sửa"}
                  </span>
                  <div className="registration-row-buttons">
                    {onLookup && !locked(a) && (
                      <button
                        type="button"
                        disabled={busy || a.identityNumber?.length !== 12}
                        onClick={async () => {
                          setBusy(true);
                          setError("");
                          try {
                            const found = await onLookup(a.identityNumber!);
                            if (!found) {
                              setNotice(
                                "Không tìm thấy học sinh nền của trường theo CCCD này.",
                              );
                              return;
                            }
                            const differs = [
                              "fullName",
                              "birthDate",
                              "gender",
                              "className",
                            ].some((k) => {
                              const key = k as keyof AthleteDraft;
                              return a[key] && a[key] !== found[key];
                            });
                            if (
                              differs &&
                              !window.confirm(
                                "Thông tin đang nhập khác dữ liệu học sinh nền. Điền thông tin từ dữ liệu nền?",
                              )
                            )
                              return;
                            change(a.draftId, found);
                            setNotice(
                              "Đã điền thông tin học sinh nền. Đối chiếu rồi lưu hàng.",
                            );
                          } catch {
                            setError(
                              "Không tra cứu được học sinh nền. Kiểm tra quyền và kết nối.",
                            );
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Tra cứu học sinh
                      </button>
                    )}

                    {locked(a) ? (
                      <button
                        type="button"
                        className="row-edit"
                        aria-label={`Sửa VĐV dòng ${i + 1}`}
                        title="Sửa hồ sơ"
                        disabled={!active || busy}
                        onClick={() =>
                          setEditingIds(
                            (current) => new Set([...current, a.draftId]),
                          )
                        }
                      >
                        <Icon kind="edit" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="row-save"
                        aria-label={`Lưu VĐV dòng ${i + 1}`}
                        title="Lưu hồ sơ"
                        disabled={busy || !a.fullName.trim()}
                        onClick={() => save(a.draftId)}
                      >
                        <Icon kind="save" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="row-delete"
                      aria-label={`Xóa dòng ${i + 1}`}
                      title="Xóa VĐV khỏi bản đang nhập"
                      disabled={!active || busy}
                      onClick={() =>
                        active &&
                        (captureBase(active),
                        setEdited((current) => ({
                          ...current,
                          [active.draftId]:
                            rows.length === 1
                              ? [blank()]
                              : rows.filter((r) => r.draftId !== a.draftId),
                        })))
                      }
                    >
                      <Icon kind="trash" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="row-register"
                    aria-label={`Đăng ký môn cho ${a.fullName || `dòng ${i + 1}`}`}
                    disabled={busy || !a.fullName.trim()}
                    onClick={() => setOpenedAthleteId(a.draftId)}
                  >
                    <Icon kind="book" />
                    Đăng ký môn
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="registration-scroll-hint">
        Kéo bảng sang ngang để xem đủ 9 cột trên màn hình nhỏ.
      </p>
      <div className="registration-bottom">
        <button
          type="button"
          className="registration-add"
          disabled={!active || busy}
          onClick={() =>
            active &&
            (captureBase(active),
            setEdited((current) => ({
              ...current,
              [active.draftId]: [...rows, blank()],
            })))
          }
        >
          <span aria-hidden="true">＋</span> Thêm 1 hàng
        </button>
        <strong>
          Tổng số VĐV:{" "}
          <span>{rows.filter((a) => a.fullName.trim()).length}</span>
        </strong>
      </div>
      {!active && (
        <p className="registration-help">
          Chọn trường hoặc mở “Thiết lập phiếu trường” bên dưới để tạo phiếu
          mới.
        </p>
      )}
      <div className="registration-save">
        <span>
          {onlineFiles
            ? "Lưu hàng để cập nhật bảng, sau đó bấm Lưu lên hệ thống để gửi dữ liệu."
            : "Bản nháp lưu trên trình duyệt; chưa gửi duyệt."}
        </span>
        <button type="button" disabled={!active || busy} onClick={() => save()}>
          Lưu danh sách
        </button>
      </div>
      {openedAthleteId &&
        active &&
        rows.find((a) => a.draftId === openedAthleteId) && (
          <AthleteEventDialog
            key={openedAthleteId}
            onlineFiles={onlineFiles}
            year={year}
            catalogCodes={catalogCodes}
            athlete={rows.find((a) => a.draftId === openedAthleteId)!}
            school={active}
            onClose={() => setOpenedAthleteId(null)}
            onApply={(patch) => save(openedAthleteId, patch)}
          />
        )}
    </section>
  );
}
