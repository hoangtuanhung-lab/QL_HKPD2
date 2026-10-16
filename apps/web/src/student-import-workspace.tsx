import {
  mergeRegistrationRows,
  normalizedSchool,
} from "./registration-import.js";
import { useEffect, useState } from "react";
import {
  readRegistrationWorkbook,
  readStudentWorkbook,
  registrationWorkbook,
  studentWorkbook,
} from "./registration-excel.js";
import type { AthleteDraft } from "./registration-draft.js";
import type {
  LiveState,
  LiveRepository,
  StudentRecord,
} from "./live-repository.js";
export function StudentImportWorkspace({
  base,
  data,
  repository,
  onDirty,
  save,
}: {
  base: boolean;
  data: LiveState;
  repository: LiveRepository;
  onDirty: (v: boolean) => void;
  save: (action: () => Promise<LiveState>) => Promise<boolean>;
}) {
  const [rows, setRows] = useState<(AthleteDraft & { schoolId: string })[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [differences, setDifferences] = useState<string[]>([]);
  useEffect(() => {
    onDirty(rows.length > 0 || busy);
    return () => onDirty(false);
  }, [rows.length, busy, onDirty]);
  async function read(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (!file.name.toLowerCase().endsWith(".xlsx"))
        throw Error("Chọn tệp .xlsx.");
      const parsed = await (
        base ? readStudentWorkbook : readRegistrationWorkbook
      )(await file.arrayBuffer());
      const mapped = parsed.map((a) => {
        const matches = data.schools.filter((s) =>
          [s.name, s.code].some(
            (x) => normalizedSchool(x) === normalizedSchool(a.schoolName ?? ""),
          ),
        );
        if (matches.length !== 1)
          throw Error(
            `Không xác định duy nhất trường của ${a.fullName}. Dùng đúng tên hoặc mã trường.`,
          );
        return { ...a, schoolId: matches[0]!.id };
      });
      const originals = await repository.students(
        mapped.map((a) => a.identityNumber!),
      );
      const diffs: string[] = [];
      for (const a of mapped) {
        const found = originals.find(
          (x) => x.identityNumber === a.identityNumber,
        );
        if (found) {
          if (found.schoolId !== a.schoolId)
            throw Error(
              `CCCD ${a.identityNumber}: dữ liệu nền thuộc trường khác.`,
            );
          for (const key of [
            "fullName",
            "birthDate",
            "gender",
            "className",
          ] as const)
            if (found[key] !== a[key])
              diffs.push(
                `${a.fullName}: ${{ fullName: "Họ và tên", birthDate: "Ngày sinh", gender: "Giới tính", className: "Khối" }[key]} trong Excel khác dữ liệu nền (${key === "gender" ? (found[key] === "male" ? "Nam" : "Nữ") : found[key]}).`,
              );
        }
      }
      setRows(mapped);
      setDifferences(diffs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    setError("");
    try {
      if (!rows.length) return;
      if (
        differences.length &&
        !window.confirm(
          "Đã đối chiếu các khác biệt với dữ liệu nền và muốn nhập theo Excel?",
        )
      )
        return;
      if (base) {
        if (
          await save(() =>
            repository.importStudents(
              data.registryRevision ?? 0,
              rows.map((a) => ({ ...a }) as StudentRecord),
            ),
          )
        ) {
          setRows([]);
          setDifferences([]);
        }
        return;
      }
      const rosters = data.schools
        .filter((s) => rows.some((a) => a.schoolId === s.id))
        .map((s) => {
          if (!["draft", "returned"].includes(s.status))
            throw Error(
              `${s.name}: phiếu đã khóa. Cần trả lại trước khi nhập.`,
            );
          const athletes = mergeRegistrationRows(
            s.athletes,
            rows.filter((a) => a.schoolId === s.id),
          );
          return { schoolId: s.id, revision: s.revision, athletes };
        });
      if (await save(() => repository.importRegistrations(rosters))) {
        setRows([]);
        setDifferences([]);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="card">
      <h1>{base ? "Dữ liệu học sinh nền" : "Nhập danh sách đăng ký"}</h1>
      <p>
        {base
          ? `${data.studentCount ?? 0} học sinh nền. Import theo CCCD; không tự thay hồ sơ đã đăng ký.`
          : "Excel chỉ có thông tin học sinh. Phân nhóm, nội dung thi đấu cập nhật qua Đăng ký môn. Mã VĐV mới do máy chủ cấp."}
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          const bytes = await (base
            ? studentWorkbook()
            : registrationWorkbook());
          const url = URL.createObjectURL(new Blob([bytes as BlobPart]));
          const a = document.createElement("a");
          a.href = url;
          a.download = base ? "hoc-sinh-nen.xlsx" : "dang-ky-vdv.xlsx";
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}
      >
        Tải biểu mẫu {base ? "học sinh nền" : "đăng ký"}
      </button>
      <input
        aria-label={base ? "Excel học sinh nền" : "Excel danh sách đăng ký"}
        type="file"
        accept=".xlsx"
        disabled={busy || rows.length > 0}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          void read(f);
        }}
      />
      {error && <p role="alert">{error}</p>}
      {differences.length > 0 && (
        <div role="alert">
          <p>Cần đối chiếu trước khi nhập:</p>
          <ul>
            {differences.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}
      {rows.length > 0 && (
        <>
          <p>
            {rows.length} dòng sẵn sàng kiểm tra. Thao tác nhập là một giao
            dịch; không ghi một phần khi có lỗi.
          </p>
          <div className="table-scroll">
            <table>
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
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((a, i) => (
                  <tr key={a.draftId}>
                    <td>{i + 1}</td>
                    <td>{a.athleteCode || "Máy chủ cấp"}</td>
                    <td>{a.schoolName}</td>
                    <td>{a.className}</td>
                    <td>{a.fullName}</td>
                    <td>{a.identityNumber}</td>
                    <td>{a.birthDate?.split("-").reverse().join("/")}</td>
                    <td>{a.gender === "male" ? "Nam" : "Nữ"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button disabled={busy} onClick={() => void commit()}>
            Xác nhận nhập {rows.length} dòng
          </button>
          <button
            disabled={busy}
            onClick={() => {
              setRows([]);
              setDifferences([]);
            }}
          >
            Bỏ bản xem trước
          </button>
        </>
      )}
    </section>
  );
}
