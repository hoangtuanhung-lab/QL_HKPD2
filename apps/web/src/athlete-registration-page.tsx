import { useEffect, useRef, useState } from "react";
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
function Icon({ kind }: { kind: "school" | "upload" | "download" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="currentColor"
    >
      {kind === "school" ? (
        <path d="M3 5h7V2h4v3h7v16h-7v-5h-4v5H3V5zm3 3v3h2V8H6zm0 6v3h2v-3H6zm10-6v3h2V8h-2zm0 6v3h2v-3h-2zm-5-7v4h2V7h-2z" />
      ) : (
        <path
          d={
            kind === "upload"
              ? "M5 2h9l5 5v15H5V2zm9 1v5h5L14 3zm-3 14h2v-5l2 2 1-1-4-4-4 4 1 1 2-2v5z"
              : "M5 2h9l5 5v15H5V2zm9 1v5h5L14 3zm-3 7v5l-2-2-1 1 4 4 4-4-1-1-2 2v-5h-2z"
          }
        />
      )}
    </svg>
  );
}
export function AthleteRegistrationPage({
  schools,
  activeId,
  onSelect,
  onSave,
  onDirty,
}: {
  schools: SchoolDraft[];
  activeId: string;
  onSelect: (id: string) => void;
  onSave: (school: SchoolDraft) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const active = schools.find((s) => s.draftId === activeId);
  const [edited, setEdited] = useState<Record<string, AthleteDraft[]>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const bases = useRef<Record<string, string>>({});
  function captureBase(school: SchoolDraft) {
    bases.current[school.draftId] ??= JSON.stringify(school.athletes);
  }
  const rows = active
    ? (edited[active.draftId] ?? [...active.athletes, blank()])
    : [];
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
  function save() {
    if (!active) return;
    try {
      if (
        bases.current[active.draftId] !== undefined &&
        bases.current[active.draftId] !== JSON.stringify(active.athletes)
      )
        throw Error(
          "Phiếu đã được sửa bằng công cụ khác. Bảng đang nhập vẫn được giữ; hãy đối chiếu trước khi lưu.",
        );
      const entered = rows.filter(
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
          ...athleteDetails({ ...a }),
        };
      });
      onSave({ ...active, athletes });
      delete bases.current[active.draftId];
      setEdited((current) => {
        const next = { ...current };
        delete next[active.draftId];
        return next;
      });
      setError("");
      setNotice("Đã cập nhật danh sách bản nháp; chưa gửi duyệt.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function download() {
    setBusy(true);
    setError("");
    try {
      const bytes = await registrationWorkbook();
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
      captureBase(active);
      setEdited((current) => ({
        ...current,
        [target]: [
          ...(current[target] ?? active.athletes).filter(
            (a) =>
              a.fullName.trim() || a.identityNumber || a.birthDate || a.note,
          ),
          ...imported,
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
        <h1>HỘI KHỎE PHÙ ĐỔNG XÃ QUẢNG PHÚ NĂM 2026</h1>
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
            <col className="registration-number" />
            <col className="registration-name" />
            <col />
            <col />
            <col className="registration-gender" />
            <col />
          </colgroup>
          <thead>
            <tr>
              {[
                "STT",
                "HỌ VÀ TÊN",
                "CCCD/MÃ ĐD",
                "NGÀY SINH",
                "GIỚI TÍNH",
                "GHI CHÚ",
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
                <td>
                  <input
                    aria-label={`Họ tên dòng ${i + 1}`}
                    placeholder="Nhập họ và tên..."
                    value={a.fullName}
                    disabled={busy}
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
                    disabled={busy}
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
                    disabled={busy}
                    onChange={(e) =>
                      change(a.draftId, { birthDate: e.target.value })
                    }
                  />
                </td>
                <td>
                  <select
                    aria-label={`Giới tính dòng ${i + 1}`}
                    value={a.gender ?? ""}
                    disabled={busy}
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
                  <input
                    aria-label={`Ghi chú dòng ${i + 1}`}
                    placeholder="Ghi chú..."
                    maxLength={2000}
                    value={a.note ?? ""}
                    disabled={busy}
                    onChange={(e) =>
                      change(a.draftId, { note: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="registration-remove"
                    aria-label={`Xóa dòng ${i + 1}`}
                    disabled={busy}
                    onClick={() =>
                      active &&
                      (captureBase(active),
                      setEdited((current) => ({
                        ...current,
                        [active.draftId]: rows.filter(
                          (r) => r.draftId !== a.draftId,
                        ),
                      })))
                    }
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
        <span>Bản nháp lưu trên trình duyệt; chưa gửi duyệt.</span>
        <button type="button" disabled={!active || busy} onClick={save}>
          Lưu danh sách
        </button>
      </div>
    </section>
  );
}
