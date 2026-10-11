import { useState } from "react";
import { FormField } from "@hkpd/ui";
import {
  snapshotCatalog,
  resolveEvent,
  previewCsv,
  validateRegistration,
  currentRevision,
  approvedRevision,
  reviseRegistration,
  transitionRegistration,
  RegistrationError,
  type CatalogNode,
  type Registry,
  type PreviewRow,
  type Registration,
} from "@hkpd/registration";
const sampleNodes: CatalogNode[] = [
  {
    id: "sport-sample",
    code: "SPORT-TEST",
    name: "Môn thử tổng hợp",
    parentId: null,
    kind: "sport",
    order: 1,
    active: true,
    rules: { schoolQuota: 2, maxEventsPerSport: 2 },
  },
  {
    id: "group-sample",
    code: "GROUP-TEST",
    name: "Nhóm tuổi thử",
    parentId: "sport-sample",
    kind: "group",
    order: 1,
    active: true,
    rules: { minAge: 10, maxAge: 15 },
  },
  {
    id: "event-sample",
    code: "EVENT-TEST",
    name: "Nội dung nam thử",
    parentId: "group-sample",
    kind: "event",
    order: 1,
    active: true,
    participantKind: "athlete",
    rules: { gender: "male" },
  },
];
const statusLabels = {
  draft: "Nháp thử",
  submitted: "Đã gửi bản thử",
  approved: "Đã duyệt bản thử",
  returned: "Trả lại bản thử",
};
/** Isolated in-memory preview. No authority, real athlete codes, persistence or API calls. */
export function RegistrationWorkspace() {
  const [catalogText, setCatalogText] = useState(""),
    [csv, setCsv] = useState(""),
    [school, setSchool] = useState(""),
    [year, setYear] = useState("2026");
  const [state, setState] = useState<Registry | null>(null),
    [preview, setPreview] = useState<readonly PreviewRow[]>([]);
  const [sportId, setSportId] = useState(""),
    [groupId, setGroupId] = useState(""),
    [eventId, setEventId] = useState(""),
    [athleteId, setAthleteId] = useState("");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  function action(run: () => void) {
    setError("");
    setNotice("");
    try {
      run();
    } catch (e) {
      setError(
        e instanceof RegistrationError
          ? e.message
          : "Dữ liệu cấu hình hoặc thao tác chưa hợp lệ.",
      );
    }
  }
  function loadCatalog() {
    action(() => {
      if (
        !school.trim() ||
        !/^\d{4}$/.test(year) ||
        Number(year) < 1900 ||
        Number(year) > 2100
      )
        throw new RegistrationError(
          "CONTEXT",
          "Nhập tên trường và năm giải hợp lệ.",
        );
      const nodes: CatalogNode[] = JSON.parse(catalogText);
      const editionId = crypto.randomUUID(),
        schoolId = crypto.randomUUID();
      const catalog = snapshotCatalog(crypto.randomUUID(), editionId, 1, nodes);
      setState({
        editionId,
        year: Number(year),
        version: 1,
        registrationOpen: true,
        deadline: `${year}-12-31T23:59:59+07:00`,
        schoolCodes: { [schoolId]: "00" },
        athleteSequenceWidth: 0,
        masterListPresent: false,
        catalog,
        students: [],
        athletes: [],
        teams: [],
        registrations: [],
      });
      setPreview([]);
      setSportId("");
      setGroupId("");
      setEventId("");
      setAthleteId("");
      setNotice(
        "Đã nạp danh mục thử; mọi bản thử trước được xóa. Hạn mức trong mẫu chỉ để thử.",
      );
    });
  }
  const localSchoolId = state ? Object.keys(state.schoolCodes)[0]! : "";
  const availableEvents =
    state?.catalog.nodes.filter(
      (n) =>
        n.kind === "event" &&
        n.participantKind === "athlete" &&
        resolveEvent(state.catalog, n.id).active &&
        (!sportId || resolveEvent(state.catalog, n.id).sportId === sportId) &&
        (!groupId ||
          (() => {
            let parent = n.parentId;
            while (parent) {
              if (parent === groupId) return true;
              parent =
                state.catalog.nodes.find((p) => p.id === parent)?.parentId ??
                null;
            }
            return false;
          })()),
    ) ?? [];
  function update(r: Registration) {
    if (state)
      setState({
        ...state,
        version: state.version + 1,
        registrations: state.registrations.map((old) =>
          old.id === r.id ? r : old,
        ),
      });
  }
  const warningText = (r: Registration) =>
    state
      ? validateRegistration(state, r, "draft")
          .warnings.map((w) => w.message)
          .join(" ")
      : "";
  return (
    <section className="card">
      <h2>Kiểm tra danh mục và đăng ký</h2>
      <p className="notice">
        Bản thử cục bộ, chưa gửi nhà tổ chức và không xác nhận quyền tài khoản.
        Chỉ dùng dữ liệu tổng hợp; đổi tab hoặc tải lại sẽ mất bản thử. Phiếu
        đăng ký nháp ở tab Đăng ký VĐV được lưu riêng.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <FormField
        label="Tên trường thử"
        value={school}
        onChange={(e) => setSchool(e.target.value)}
      />
      <FormField
        label="Năm giải thử"
        value={year}
        onChange={(e) => setYear(e.target.value)}
      />
      <label className="block">
        Cấu hình danh mục thử (JSON)
        <textarea
          rows={8}
          value={catalogText}
          onChange={(e) => setCatalogText(e.target.value)}
        />
      </label>
      <div className="form-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => setCatalogText(JSON.stringify(sampleNodes, null, 2))}
        >
          Điền cấu hình mẫu để thử
        </button>
        <button type="button" onClick={loadCatalog}>
          Nạp danh mục thử
        </button>
      </div>
      {state && (
        <>
          <h3>Danh sách tổng hợp để kiểm tra</h3>
          <p>
            Dùng CSV có cột student_code,name,sex,birth_year,grade; giới tính
            male/female. Mã học sinh do trường đặt, không phải mã VĐV server
            cấp. Chỉ nhập CSV; chưa đọc tệp Excel nhị phân.
          </p>
          <label className="block">
            CSV hồ sơ thử
            <textarea
              rows={6}
              value={csv}
              onChange={(e) => {
                setCsv(e.target.value);
                setPreview([]);
              }}
            />
          </label>
          <button
            type="button"
            onClick={() =>
              action(() => {
                setPreview(previewCsv(csv, localSchoolId, state.students));
              })
            }
          >
            Xem trước CSV thử
          </button>
          {!!preview.length && (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Dòng</th>
                      <th>Mã học sinh</th>
                      <th>Họ tên tổng hợp</th>
                      <th>Giấy tờ đã che</th>
                      <th>Lỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r) => (
                      <tr key={r.row}>
                        <td>{r.row}</td>
                        <td>{r.studentCode}</td>
                        <td>{r.name}</td>
                        <td>{r.identityMask ?? "—"}</td>
                        <td>
                          {[
                            ...r.errors,
                            ...(r.existingStudentId
                              ? ["Mã học sinh đã có"]
                              : []),
                          ].join(", ") || "Hợp lệ để thử"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() =>
                  action(() => {
                    if (
                      preview.some(
                        (r) => r.errors.length || r.existingStudentId,
                      )
                    )
                      throw new RegistrationError(
                        "IMPORT",
                        "Sửa mọi lỗi trước khi thêm; không ghi đè hồ sơ đã có.",
                      );
                    const people = preview.map((r) => ({
                      id: crypto.randomUUID(),
                      schoolId: localSchoolId,
                      studentCode: r.studentCode,
                      name: r.name,
                      sex: r.sex!,
                      birthYear: r.birthYear!,
                      grade: r.grade!,
                      profileStatus: "approved" as const,
                    }));
                    const athletes = people.map((p) => ({
                      ...p,
                      id: crypto.randomUUID(),
                      studentId: p.id,
                      editionId: state.editionId,
                      athleteCode: "",
                      version: 1,
                    }));
                    setState({
                      ...state,
                      students: [...state.students, ...people],
                      athletes: [...state.athletes, ...athletes],
                    });
                    setPreview([]);
                    setNotice(
                      "Đã thêm hồ sơ vào bản thử. Chưa cấp mã VĐV hoặc tạo thư mục kết quả.",
                    );
                  })
                }
              >
                Thêm danh sách vào bản thử
              </button>
            </>
          )}
          <h3>Chọn nội dung và kiểm tra revision</h3>
          <label className="block">
            Môn thử
            <select
              value={sportId}
              onChange={(e) => {
                setSportId(e.target.value);
                setGroupId("");
                setEventId("");
              }}
            >
              <option value="">Tất cả môn thử</option>
              {state.catalog.nodes
                .filter((n) => n.kind === "sport")
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            Nhóm thử
            <select
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                setEventId("");
              }}
            >
              <option value="">Tất cả nhóm thử</option>
              {state.catalog.nodes
                .filter((n) => n.kind === "group")
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            Nội dung cá nhân thử
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              <option value="">Chọn nội dung</option>
              {availableEvents.map((n) => (
                <option key={n.id} value={n.id}>
                  {resolveEvent(state.catalog, n.id).path.join(" / ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            VĐV thử
            <select
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
            >
              <option value="">Chọn VĐV</option>
              {state.athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.studentCode} · {a.name} · Chưa cấp mã VĐV
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() =>
              action(() => {
                if (!eventId || !athleteId)
                  throw new RegistrationError(
                    "SELECT",
                    "Chọn nội dung và VĐV trước.",
                  );
                const r: Registration = {
                  id: crypto.randomUUID(),
                  editionId: state.editionId,
                  schoolId: localSchoolId,
                  eventId,
                  version: 1,
                  revisions: [
                    {
                      id: crypto.randomUUID(),
                      version: 1,
                      status: "draft",
                      participant: { kind: "athlete", athleteId },
                    },
                  ],
                  approvedRevisionId: null,
                };
                const result = validateRegistration(state, r, "draft");
                if (!result.valid)
                  throw new RegistrationError(
                    result.errors[0]!.code,
                    result.errors[0]!.message,
                  );
                setState({
                  ...state,
                  registrations: [...state.registrations, r],
                });
                setNotice(
                  result.warnings.map((w) => w.message).join(" ") ||
                    "Đã tạo đăng ký nháp thử.",
                );
              })
            }
          >
            Thêm đăng ký thử
          </button>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nội dung</th>
                  <th>Bản hiện tại</th>
                  <th>Bản duyệt còn hiệu lực</th>
                  <th>Cảnh báo</th>
                  <th>Thao tác thử</th>
                </tr>
              </thead>
              <tbody>
                {state.registrations.map((r) => {
                  const current = currentRevision(r),
                    approved = approvedRevision(r);
                  const name = (p: typeof current.participant) =>
                    p.kind === "athlete"
                      ? (state.athletes.find((a) => a.id === p.athleteId)
                          ?.name ?? "Không tìm thấy")
                      : "Đội thử";
                  return (
                    <tr key={r.id}>
                      <td>
                        {resolveEvent(state.catalog, r.eventId).node.name}
                      </td>
                      <td>
                        {name(current.participant)} ·{" "}
                        {statusLabels[current.status]} · v{r.version}
                      </td>
                      <td>
                        {approved ? name(approved.participant) : "Chưa duyệt"}
                      </td>
                      <td>{warningText(r)}</td>
                      <td>
                        <div className="row-actions">
                          {(current.status === "draft" ||
                            current.status === "returned") && (
                            <button
                              type="button"
                              onClick={() =>
                                action(() => {
                                  update(
                                    transitionRegistration(
                                      state,
                                      r,
                                      "submit",
                                      r.version,
                                      new Date(),
                                    ),
                                  );
                                })
                              }
                            >
                              Gửi bản thử
                            </button>
                          )}
                          {current.status === "submitted" ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  action(() => {
                                    update(
                                      transitionRegistration(
                                        state,
                                        r,
                                        "approve",
                                        r.version,
                                        new Date(),
                                      ),
                                    );
                                  })
                                }
                              >
                                Duyệt bản thử
                              </button>
                              <button
                                type="button"
                                className="secondary"
                                onClick={() =>
                                  action(() => {
                                    update(
                                      transitionRegistration(
                                        state,
                                        r,
                                        "return",
                                        r.version,
                                        new Date(),
                                        "Rà soát bản thử",
                                      ),
                                    );
                                  })
                                }
                              >
                                Trả lại bản thử
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="secondary"
                              onClick={() =>
                                action(() => {
                                  if (!athleteId)
                                    throw new RegistrationError(
                                      "SELECT",
                                      "Chọn VĐV thay thế trước.",
                                    );
                                  const revised = reviseRegistration(
                                    r,
                                    crypto.randomUUID(),
                                    { kind: "athlete", athleteId },
                                    r.version,
                                  );
                                  const result = validateRegistration(
                                    state,
                                    revised,
                                    "draft",
                                  );
                                  if (!result.valid)
                                    throw new RegistrationError(
                                      result.errors[0]!.code,
                                      result.errors[0]!.message,
                                    );
                                  update(revised);
                                })
                              }
                            >
                              Sửa bản thử
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
