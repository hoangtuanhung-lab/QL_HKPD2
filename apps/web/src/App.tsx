import { AthleteRegistrationPage } from "./athlete-registration-page.js";
import { OfflineWorkspace } from "./offline-ui.js";
import { CompetitionWorkspace } from "./competition-ui.js";
import { ResultsWorkspace } from "./results-ui.js";
import { RegistrationWorkspace } from "./registration-ui.js";
import { ScheduleWorkspace } from "./schedule-ui.js";
import { FormField } from "@hkpd/ui";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  clean,
  fromSheet,
  readDraftSnapshot,
  DraftWriter,
  newDraftId,
  sameSchool,
  toSheet,
  upsertAthlete,
  type AthleteDraft,
  type SchoolDraft,
} from "./registration-draft.js";

const steps = [
  "Đăng ký VĐV",
  "Kiểm tra đăng ký",
  "Phân công",
  "Sơ đồ thi đấu",
  "Vòng tròn",
  "Lịch và phân làn",
  "Ngoại tuyến",
  "Xác nhận kết quả",
  "Công khai",
] as const;
type Step = (typeof steps)[number];
const outlines: Record<
  Exclude<
    Step,
    | "Đăng ký VĐV"
    | "Kiểm tra đăng ký"
    | "Ngoại tuyến"
    | "Xác nhận kết quả"
    | "Sơ đồ thi đấu"
    | "Vòng tròn"
    | "Lịch và phân làn"
  >,
  { role: string; steps: string[]; handoff: string }
> = {
  "Phân công": {
    role: "Quản trị / điều phối",
    steps: [
      "Chọn kỳ giải và môn",
      "Chọn tổ trưởng, trọng tài và checklist",
      "Rà soát phân công trước khi lưu",
    ],
    handoff: "Chờ danh mục, tài khoản và kiểm quyền từ hệ thống.",
  },
  "Công khai": {
    role: "Người theo dõi",
    steps: [
      "Chọn kỳ giải đã công bố",
      "Xem thành tích và bảng đã chốt",
      "Tra cứu thông tin được phép công khai",
    ],
    handoff: "Chưa có kết quả được công bố. Phiếu nháp không hiển thị tại đây.",
  },
};
function initialDrafts() {
  try {
    return { ...readDraftSnapshot(localStorage), error: "" };
  } catch {
    return {
      drafts: [] as SchoolDraft[],
      revision: 0,
      token: null,
      error:
        "Không đọc được bản nháp đã lưu. Dữ liệu cũ vẫn được giữ; hãy nhập phiếu đã xuất hoặc dùng trình duyệt khác.",
    };
  }
}
export function App() {
  const [initial] = useState(initialDrafts);
  const [drafts, setDrafts] = useState(initial.drafts);
  const [writer] = useState(
    () =>
      new DraftWriter(localStorage, {
        revision: initial.revision,
        token: initial.token,
      }),
  );
  const [activeId, setActiveId] = useState(initial.drafts[0]?.draftId ?? "");
  const [step, setStep] = useState<Step>("Đăng ký VĐV");
  const [tableDirty, setTableDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(initial.error);
  const [storageError, setStorageError] = useState("");
  const [pendingWrites, setPendingWrites] = useState(0);
  useEffect(() => {
    if (!pendingWrites && (!storageError || !drafts.length)) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pendingWrites, storageError, drafts.length]);
  const [editionName, setEditionName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [athlete, setAthlete] = useState<AthleteDraft>({
    draftId: "",
    fullName: "",
    className: "",
    requestedEvent: "",
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const draftsRef = useRef(drafts);
  const active = drafts.find((school) => school.draftId === activeId);
  const totalAthletes = drafts.reduce(
    (count, school) => count + school.athletes.length,
    0,
  );
  function commit(next: SchoolDraft[]) {
    draftsRef.current = next;
    setDrafts(next);
    if (initial.error) {
      setStorageError(
        "Bản nháp đang giữ trong phiên này để bảo toàn dữ liệu cũ. Hãy xuất phiếu trước khi đóng trang.",
      );
      return;
    }
    setPendingWrites((count) => count + 1);
    void writer
      .save(next)
      .catch((failure: unknown) => {
        setStorageError(
          failure instanceof Error
            ? `Không lưu được trên trình duyệt. ${failure.message} Bản nháp vẫn ở phiên này; hãy xuất phiếu trước khi đóng trang.`
            : "Không lưu được trên trình duyệt. Bản nháp vẫn ở phiên này; hãy xuất phiếu trước khi đóng trang.",
        );
      })
      .finally(() => setPendingWrites((count) => count - 1));
  }
  function resetAthlete() {
    setAthlete({
      draftId: "",
      fullName: "",
      className: "",
      requestedEvent: "",
    });
  }
  function selectSchool(id: string) {
    setActiveId(id);
    resetAthlete();
    setError("");
    setMessage("");
  }
  function addSchool(event: FormEvent) {
    event.preventDefault();
    const next: SchoolDraft = {
      draftId: newDraftId(),
      editionName: clean(editionName),
      schoolName: clean(schoolName),
      athletes: [],
    };
    if (!next.editionName || !next.schoolName) {
      setError("Nhập tên kỳ giải và tên trường.");
      return;
    }
    const existing = drafts.find((school) => sameSchool(school, next));
    if (existing) {
      selectSchool(existing.draftId);
      setMessage("Đã mở phiếu hiện có của trường trong kỳ giải này.");
      return;
    }
    commit([...drafts, next]);
    selectSchool(next.draftId);
    setSchoolName("");
    setMessage(
      "Đã tạo phiếu nháp. Trường có thể nhập VĐV theo số lượng thực tế.",
    );
  }
  function addAthlete(event: FormEvent) {
    event.preventDefault();
    if (!active) return;
    try {
      const updated = upsertAthlete(active, {
        ...athlete,
        draftId: athlete.draftId || newDraftId(),
      });
      commit(
        drafts.map((school) =>
          school.draftId === active.draftId ? updated : school,
        ),
      );
      resetAthlete();
      setError("");
      setMessage("Đã thêm VĐV vào phiếu nháp; đang lưu trên trình duyệt.");
    } catch (failure) {
      setError((failure as Error).message);
    }
  }
  async function importSheet(file?: File) {
    if (!file) return;
    try {
      const imported = fromSheet(JSON.parse(await file.text()) as unknown);
      if (draftsRef.current.some((school) => sameSchool(school, imported))) {
        throw new Error(
          "Đã có phiếu nháp của trường và kỳ giải này. Phiếu nhập chưa được lưu để tránh ghi đè; hãy xuất bản hiện có và rà soát trước.",
        );
      }
      commit([...draftsRef.current, imported]);
      selectSchool(imported.draftId);
      setMessage("Đã nhập phiếu nháp; chưa gửi duyệt hoặc cấp mã VĐV.");
    } catch (failure) {
      setError(
        failure instanceof SyntaxError
          ? "Tệp không phải JSON hợp lệ."
          : (failure as Error).message,
      );
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  function exportSheet() {
    if (!active) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(toSheet(active), null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "phieu-dang-ky-nhap.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Đã xuất phiếu nháp để bàn giao. Phiếu chưa được gửi duyệt.");
  }
  return (
    <main className={step === "Đăng ký VĐV" ? "registration-mode" : ""}>
      {step === "Đăng ký VĐV" && (
        <AthleteRegistrationPage
          schools={drafts}
          activeId={activeId}
          onSelect={selectSchool}
          onDirty={setTableDirty}
          onSave={(updated) =>
            commit(
              draftsRef.current.map((s) =>
                s.draftId === updated.draftId ? updated : s,
              ),
            )
          }
        />
      )}
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            HK
          </span>
          <div>
            <strong>HỘI KHỎE PHÙ ĐỔNG</strong>
            <span>Quảng Phú · Bàn làm việc đăng ký</span>
          </div>
        </div>
        <span className="badge">Bản cơ bản · Lưu nháp</span>
      </header>
      <section className="intro">
        <p className="eyebrow">NHÀ TRƯỜNG CHỦ ĐỘNG ĐĂNG KÝ</p>
        <h1>Chuẩn bị danh sách tham gia</h1>
        <p>
          Tạo phiếu của trường, nhập VĐV theo thực tế và xuất danh sách để bàn
          giao.
        </p>
        <p className="draft-note">
          Hệ thống đang được xây dựng. Bản nháp lưu trên trình duyệt này; chức
          năng gửi duyệt và lưu chính thức sẽ được bổ sung.
        </p>
      </section>
      <div className="stats">
        <div>
          <strong>{drafts.length}</strong>
          <span>Phiếu trường theo kỳ giải</span>
        </div>
        <div>
          <strong>{totalAthletes}</strong>
          <span>VĐV trong các bản nháp</span>
        </div>
        <div>
          <strong>{active?.athletes.length ?? 0}</strong>
          <span>VĐV trong phiếu đang mở</span>
        </div>
      </div>
      <nav className="flow-nav" aria-label="Các luồng chức năng">
        {steps.map((item) => (
          <button
            key={item}
            type="button"
            aria-current={step === item ? "page" : undefined}
            className={step === item ? "selected" : ""}
            onClick={() => {
              if (
                item !== step &&
                tableDirty &&
                !window.confirm(
                  "Bảng đăng ký có thay đổi chưa lưu. Chuyển màn hình sẽ bỏ các thay đổi này. Bạn muốn tiếp tục?",
                )
              )
                return;
              setStep(item);
            }}
          >
            {item}
          </button>
        ))}
      </nav>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {storageError && (
        <p className="notice error" role="alert">
          {storageError}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {step === "Đăng ký VĐV" ? (
        <details className="registration-tools">
          <summary>Thiết lập phiếu trường và công cụ bổ sung</summary>
          <div className="workspace">
            <aside className="card">
              <h2>Phiếu của nhà trường</h2>
              <p>
                Tạo theo trường và kỳ giải. Số lượng tăng theo danh sách đăng
                ký.
              </p>
              <form onSubmit={addSchool}>
                <FormField
                  label="Tên kỳ giải"
                  required
                  value={editionName}
                  onChange={(event) => setEditionName(event.target.value)}
                  placeholder="Nhập kỳ giải muốn tham gia"
                />
                <FormField
                  label="Tên trường"
                  required
                  value={schoolName}
                  onChange={(event) => setSchoolName(event.target.value)}
                  placeholder="Nhập tên trường"
                />
                <button type="submit">Tạo / mở phiếu nháp</button>
              </form>
              <div className="school-list">
                {drafts.map((school) => (
                  <button
                    key={school.draftId}
                    className={
                      school.draftId === activeId
                        ? "school-item selected"
                        : "school-item"
                    }
                    type="button"
                    onClick={() => selectSchool(school.draftId)}
                  >
                    <strong>{school.schoolName}</strong>
                    <span>
                      {school.editionName} · {school.athletes.length} VĐV
                    </span>
                  </button>
                ))}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(event) => {
                  void importSheet(event.target.files?.[0]);
                }}
              />
              <button
                className="secondary"
                type="button"
                onClick={() => fileInput.current?.click()}
              >
                Nhập phiếu từ tệp
              </button>
            </aside>
            <section className="card roster">
              {active ? (
                <>
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">DANH SÁCH BẢN NHÁP</p>
                      <h2>{active.schoolName}</h2>
                      <p>{active.editionName}</p>
                    </div>
                    <button
                      type="button"
                      className="secondary"
                      onClick={exportSheet}
                    >
                      Xuất phiếu đăng ký
                    </button>
                  </div>
                  <form className="athlete-form" onSubmit={addAthlete}>
                    <label>
                      Họ và tên VĐV
                      <input
                        required
                        value={athlete.fullName}
                        onChange={(event) =>
                          setAthlete({
                            ...athlete,
                            fullName: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Lớp / nhóm học
                      <input
                        required
                        value={athlete.className}
                        onChange={(event) =>
                          setAthlete({
                            ...athlete,
                            className: event.target.value,
                          })
                        }
                        placeholder="Theo thông tin của trường"
                      />
                    </label>
                    <label>
                      Nội dung muốn tham gia
                      <input
                        required
                        value={athlete.requestedEvent}
                        onChange={(event) =>
                          setAthlete({
                            ...athlete,
                            requestedEvent: event.target.value,
                          })
                        }
                        placeholder="Nguyện vọng; chờ đối chiếu danh mục"
                      />
                    </label>
                    <div className="form-actions">
                      <button type="submit">
                        {athlete.draftId ? "Lưu thay đổi" : "Thêm VĐV"}
                      </button>
                      {athlete.draftId && (
                        <button
                          className="secondary"
                          type="button"
                          onClick={resetAthlete}
                        >
                          Hủy sửa
                        </button>
                      )}
                    </div>
                  </form>
                  {active.athletes.length ? (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>STT</th>
                            <th>VĐV / lớp</th>
                            <th>Nội dung dự kiến</th>
                            <th>Mã VĐV</th>
                            <th>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {active.athletes.map((item, index) => (
                            <tr key={item.draftId}>
                              <td>{index + 1}</td>
                              <td>
                                <strong>{item.fullName}</strong>
                                <span className="muted block">
                                  {item.className}
                                </span>
                              </td>
                              <td>{item.requestedEvent}</td>
                              <td className="muted">Chờ cấp mã</td>
                              <td>
                                <div className="row-actions">
                                  <button
                                    type="button"
                                    className="text-button"
                                    onClick={() => {
                                      setAthlete({ ...item });
                                      setMessage(
                                        "Đang sửa bản nháp; bấm Lưu thay đổi để hoàn tất.",
                                      );
                                    }}
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    className="text-button danger"
                                    onClick={() => {
                                      commit(
                                        drafts.map((school) =>
                                          school.draftId === active.draftId
                                            ? {
                                                ...school,
                                                athletes:
                                                  school.athletes.filter(
                                                    (entry) =>
                                                      entry.draftId !==
                                                      item.draftId,
                                                  ),
                                              }
                                            : school,
                                        ),
                                      );
                                      if (athlete.draftId === item.draftId)
                                        resetAthlete();
                                      setMessage("Đã xóa VĐV khỏi bản nháp.");
                                    }}
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty">
                      <h3>Chưa có VĐV trong phiếu</h3>
                      <p>
                        Nhà trường nhập từng VĐV khi có danh sách. Có thể bổ
                        sung sau.
                      </p>
                    </div>
                  )}
                  <p className="footer-note">
                    STT chỉ là thứ tự trong phiếu. Mã VĐV và kiểm điều kiện đăng
                    ký sẽ do hệ thống cấp và kiểm tra khi gửi duyệt.
                  </p>
                </>
              ) : (
                <div className="empty">
                  <span className="empty-symbol" aria-hidden="true">
                    +
                  </span>
                  <h2>Bắt đầu bằng phiếu của trường</h2>
                  <p>
                    Nhập tên kỳ giải và tên trường, sau đó thêm VĐV hoặc nhập
                    phiếu đã xuất.
                  </p>
                </div>
              )}
            </section>
          </div>
        </details>
      ) : step === "Ngoại tuyến" ? (
        <OfflineWorkspace />
      ) : step === "Xác nhận kết quả" ? (
        <ResultsWorkspace />
      ) : step === "Kiểm tra đăng ký" ? (
        <RegistrationWorkspace />
      ) : step === "Sơ đồ thi đấu" || step === "Vòng tròn" ? (
        <CompetitionWorkspace
          key={step}
          mode={step === "Sơ đồ thi đấu" ? "knockout" : "round_robin"}
        />
      ) : step === "Lịch và phân làn" ? (
        <ScheduleWorkspace />
      ) : (
        <section className="card outline">
          <p className="eyebrow">PHÁC THẢO LUỒNG · {outlines[step].role}</p>
          <h2>{step}</h2>
          <ol>
            {outlines[step].steps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <div className="empty">
            <p>{outlines[step].handoff}</p>
          </div>
          <p className="footer-note">
            Màn hình này mô tả bước thực hiện để nhóm phát triển tiếp; chưa thực
            hiện thao tác nghiệp vụ.
          </p>
        </section>
      )}
      <footer>
        Hội khỏe Phù Đổng Quảng Phú · Thông tin nháp chưa được công bố
      </footer>
    </main>
  );
}
