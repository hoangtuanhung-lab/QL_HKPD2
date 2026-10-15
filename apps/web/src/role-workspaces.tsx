import { useState, type ReactNode } from "react";
import { athleteCatalog } from "./athlete-catalog.generated.js";
import type { SchoolDraft } from "./registration-draft.js";

export const roles = {
  admin: "Quản trị",
  chief: "Tổ trưởng trọng tài",
  referee: "Trọng tài",
  school: "Nhà trường",
} as const;
export type WorkspaceRole = keyof typeof roles;
export type WorkspacePage =
  | "Quản lý tài khoản"
  | "Quản lý trường"
  | "Quản lý giải"
  | "Tổng quan"
  | "Danh mục môn thi"
  | "Đăng ký VĐV"
  | "Kiểm tra đăng ký"
  | "Phân công"
  | "Loại trực tiếp"
  | "Vòng tròn"
  | "Lịch thi đấu"
  | "Ngoại tuyến"
  | "Xác nhận kết quả"
  | "Công khai";
export const rolePages: Record<WorkspaceRole, readonly WorkspacePage[]> = {
  admin: [
    "Tổng quan",
    "Quản lý giải",
    "Quản lý trường",
    "Quản lý tài khoản",
    "Kiểm tra đăng ký",
    "Danh mục môn thi",
    "Phân công",
    "Lịch thi đấu",
    "Xác nhận kết quả",
    "Ngoại tuyến",
    "Công khai",
  ],
  chief: [
    "Tổng quan",
    "Phân công",
    "Kiểm tra đăng ký",
    "Danh mục môn thi",
    "Loại trực tiếp",
    "Vòng tròn",
    "Lịch thi đấu",
    "Xác nhận kết quả",
    "Ngoại tuyến",
  ],
  referee: [
    "Tổng quan",
    "Lịch thi đấu",
    "Danh mục môn thi",
    "Xác nhận kết quả",
    "Ngoại tuyến",
  ],
  school: [
    "Tổng quan",
    "Đăng ký VĐV",
    "Kiểm tra đăng ký",
    "Danh mục môn thi",
    "Lịch thi đấu",
    "Công khai",
  ],
};
const glyphs: Partial<Record<WorkspacePage, string>> = {
  "Tổng quan": "M3 10 12 3l9 7v11h-6v-7H9v7H3Z",
  "Đăng ký VĐV": "M8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  "Danh mục môn thi": "M4 4h16v16H4ZM8 8h8M8 12h8M8 16h5",
  "Lịch thi đấu": "M4 5h16v16H4ZM8 2v6M16 2v6M4 10h16M8 14h2M14 14h2",
  "Xác nhận kết quả": "M6 20V9h3v11M11 20V4h3v16M16 20v-8h3v8",
};
export function WorkspaceIcon({ page }: { page: WorkspacePage }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={glyphs[page] ?? "M5 3h14v18H5ZM8 8h8M8 12h8M8 16h5"} />
    </svg>
  );
}
export function HkpdLogo({ className = "" }: { className?: string }) {
  return (
    <img
      className={`hkpd-logo ${className}`}
      src="/branding/hkpd-quang-phu-2026.jpeg"
      alt="Logo Hội khỏe Phù Đổng xã Quảng Phú 2026"
    />
  );
}
export function RoleLayout({
  role,
  page,
  onRole,
  onPage,
  children,
  availableRoles = Object.keys(roles) as WorkspaceRole[],
  editionName = "2026",
  editionYear = 2026,
  online = false,
}: {
  role: WorkspaceRole;
  page: WorkspacePage;
  onRole: (role: WorkspaceRole) => void;
  onPage: (page: WorkspacePage) => void;
  children: ReactNode;
  availableRoles?: readonly WorkspaceRole[];
  editionName?: string;
  editionYear?: number;
  online?: boolean;
}) {
  return (
    <div className={`role-shell role-${role}`}>
      <aside className="role-sidebar">
        <div className="role-brand">
          <HkpdLogo />
          <strong>
            HKPĐ QUẢNG PHÚ<span>Năm {editionYear}</span>
          </strong>
        </div>
        <p className="role-menu-caption">BÀN LÀM VIỆC · {roles[role]}</p>
        <nav aria-label="Các luồng chức năng">
          {rolePages[role].map((item) => (
            <button
              key={item}
              type="button"
              aria-current={page === item ? "page" : undefined}
              className={page === item ? "selected" : ""}
              onClick={() => onPage(item)}
            >
              <WorkspaceIcon page={item} />
              <span>{item}</span>
            </button>
          ))}
        </nav>
        <p className="role-sidebar-note">
          Hội khỏe Phù Đổng
          <br />
          Xã Quảng Phú · 2026
        </p>
      </aside>
      <div className="role-body">
        <header className="role-topbar">
          <div>
            <strong>HỘI KHỎE PHÙ ĐỔNG XÃ QUẢNG PHÚ {editionYear}</strong>
            <span>
              {roles[role]} · {page} · {editionName}
            </span>
          </div>
          <label className="role-selector">
            Xem giao diện vai trò
            <select
              value={role}
              onChange={(e) => onRole(e.target.value as WorkspaceRole)}
            >
              {Object.entries(roles)
                .filter(([value]) =>
                  availableRoles.includes(value as WorkspaceRole),
                )
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
        </header>
        <div className="role-preview-note">
          {online
            ? "Phiên đăng nhập đã xác thực · Dữ liệu hiển thị theo quyền của tài khoản và giải hiện tại."
            : "Hệ thống đang được xây dựng · Dữ liệu nháp trên trình duyệt. Chọn vai trò để xem bố cục, chưa phải đăng nhập hoặc cấp quyền."}
        </div>
        <main
          className={`role-content ${page === "Đăng ký VĐV" ? "registration-mode" : ""}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
const roleHeadings: Record<WorkspaceRole, [string, string]> = {
  admin: [
    "Tổng quan quản trị",
    "Theo dõi danh sách trường, danh mục và các bước tổ chức thi đấu.",
  ],
  chief: [
    "Bàn làm việc tổ trưởng trọng tài",
    "Rà soát đăng ký, phối hợp lịch thi đấu và kiểm tra kết quả.",
  ],
  referee: [
    "Bàn làm việc trọng tài",
    "Tra cứu lịch, nhập kết quả và giữ bản nhập khi mất kết nối.",
  ],
  school: [
    "Bàn làm việc nhà trường",
    "Chuẩn bị danh sách VĐV và chọn nội dung phù hợp với học sinh.",
  ],
};
const quickPages: Record<WorkspaceRole, WorkspacePage[]> = {
  admin: [
    "Quản lý trường",
    "Kiểm tra đăng ký",
    "Danh mục môn thi",
    "Lịch thi đấu",
    "Xác nhận kết quả",
  ],
  chief: ["Phân công", "Kiểm tra đăng ký", "Lịch thi đấu", "Xác nhận kết quả"],
  referee: [
    "Lịch thi đấu",
    "Xác nhận kết quả",
    "Ngoại tuyến",
    "Danh mục môn thi",
  ],
  school: [
    "Đăng ký VĐV",
    "Danh mục môn thi",
    "Kiểm tra đăng ký",
    "Lịch thi đấu",
  ],
};
const sports = [
  ...new Map(athleteCatalog.map((e) => [e.sportCode, e.sportName])).entries(),
];
export function RoleOverview({
  role,
  drafts,
  onPage,
  sportCodes = [],
  catalogCodes,
  editionName = "2026",
  schoolCount,
}: {
  role: WorkspaceRole;
  schoolCount?: number;
  sportCodes?: readonly string[];
  catalogCodes?: readonly string[];
  editionName?: string;
  drafts: SchoolDraft[];
  onPage: (page: WorkspacePage) => void;
}) {
  const [query, setQuery] = useState("");
  const [heading, description] = roleHeadings[role];
  const staff = role === "chief" || role === "referee";
  const editionCatalog =
    catalogCodes === undefined
      ? athleteCatalog
      : athleteCatalog.filter((e) => catalogCodes.includes(e.code));
  const editionSports = [
    ...new Map(editionCatalog.map((e) => [e.sportCode, e.sportName])).entries(),
  ];
  const visibleSports = staff
    ? editionSports.filter(([code]) => sportCodes.includes(code))
    : editionSports;
  const scopedEvents = staff
    ? editionCatalog.filter((e) => sportCodes.includes(e.sportCode))
    : editionCatalog;
  const visible = drafts.filter((d) =>
    `${d.schoolName} ${d.editionName}`
      .toLocaleLowerCase("vi")
      .includes(query.toLocaleLowerCase("vi")),
  );
  return (
    <section className="role-overview">
      <div className="role-page-heading">
        <div>
          <p className="eyebrow">HỘI KHỎE PHÙ ĐỔNG · QUẢNG PHÚ</p>
          <h1>{heading}</h1>
          <p>{description}</p>
        </div>
        <span className="role-edition">Giải hiện tại: {editionName}</span>
      </div>
      <div className="role-metrics">
        {(role === "admin" || role === "school"
          ? [
              [
                role === "admin" && schoolCount !== undefined
                  ? "Trường trong danh mục"
                  : "Phiếu trường nháp",
                schoolCount ?? drafts.length,
              ],
              [
                "VĐV trong bản nháp",
                drafts.reduce((n, d) => n + d.athletes.length, 0),
              ],
              ["Môn thi đấu", visibleSports.length],
              ["Nội dung thi đấu", scopedEvents.length],
            ]
          : [
              ["Phân công chính thức", "—"],
              ["Trận được giao", "—"],
              ["Môn thi đấu", visibleSports.length],
              ["Nội dung thi đấu", scopedEvents.length],
            ]
        ).map(([label, value], index) => (
          <article key={label} className={`role-metric metric-${index}`}>
            <span className="metric-symbol">
              <WorkspaceIcon
                page={index > 1 ? "Danh mục môn thi" : "Đăng ký VĐV"}
              />
            </span>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>
                {index === 0 && role === "admin" && schoolCount !== undefined
                  ? "Theo danh mục trường"
                  : index > 1
                    ? "Theo danh mục đã nhập"
                    : role === "admin" || role === "school"
                      ? "Lưu trên trình duyệt này"
                      : "Chưa có phân công từ hệ thống"}
              </small>
            </div>
          </article>
        ))}
      </div>
      <div className="role-dashboard-grid">
        <section className="role-panel">
          <div className="role-panel-heading">
            <h2>
              {role === "referee"
                ? "Lịch thi đấu được phân công"
                : role === "chief"
                  ? "Theo dõi tổ trọng tài"
                  : "Danh sách phiếu của các trường"}
            </h2>
            {(role === "admin" || role === "school") && (
              <input
                aria-label="Tìm phiếu trường"
                placeholder="Tìm trường, kỳ giải…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            )}
          </div>
          {role === "admin" || role === "school" ? (
            <div className="table-scroll">
              <table className="role-school-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Trường</th>
                    <th>Kỳ giải</th>
                    <th>Số VĐV</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((d, i) => (
                    <tr key={d.draftId}>
                      <td>{i + 1}</td>
                      <td>{d.schoolName}</td>
                      <td>{d.editionName}</td>
                      <td>{d.athletes.length}</td>
                      <td>
                        <span className="role-draft-tag">Bản nháp</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visible.length && (
                <div className="role-empty">
                  <WorkspaceIcon page="Đăng ký VĐV" />
                  <h3>
                    {query
                      ? "Không tìm thấy phiếu phù hợp"
                      : "Chưa có phiếu trường"}
                  </h3>
                  <p>
                    Danh sách cập nhật khi tạo hoặc nhập phiếu của nhà trường.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onPage(
                        role === "admin" ? "Quản lý trường" : "Đăng ký VĐV",
                      )
                    }
                  >
                    {role === "admin" ? "Mở quản lý trường" : "Mở đăng ký VĐV"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="role-empty">
              <WorkspaceIcon page="Lịch thi đấu" />
              <h3>
                {visibleSports.length
                  ? "Các môn được phân công"
                  : "Chưa có phân công chính thức"}
              </h3>
              <p>
                Chỉ hiển thị dữ liệu thuộc môn được giao trong kỳ giải. Chưa có
                dữ liệu lịch/trận từ hệ thống.
              </p>
            </div>
          )}
        </section>
        <section className="role-panel">
          <h2>Thao tác nhanh</h2>
          <div className="role-quick-actions">
            {quickPages[role].map((page) => (
              <button type="button" key={page} onClick={() => onPage(page)}>
                <WorkspaceIcon page={page} />
                <span>{page}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
      <section className="role-panel role-sport-panel">
        <div className="role-panel-heading">
          <h2>Danh mục môn thi</h2>
          <button
            className="text-button"
            type="button"
            onClick={() => onPage("Danh mục môn thi")}
          >
            Xem {scopedEvents.length} nội dung →
          </button>
        </div>
        <div className="role-sport-chips">
          {visibleSports.map(([code, name]) => (
            <button
              type="button"
              key={code}
              onClick={() => onPage("Danh mục môn thi")}
            >
              <span>{code}</span>
              {name}
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
export function CatalogWorkspace({
  sportCodes,
  catalogCodes,
}: { sportCodes?: readonly string[]; catalogCodes?: readonly string[] } = {}) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [gender, setGender] = useState("");
  const scoped = athleteCatalog.filter(
    (e) =>
      (sportCodes === undefined || sportCodes.includes(e.sportCode)) &&
      (catalogCodes === undefined || catalogCodes.includes(e.code)),
  );
  const events = scoped.filter(
    (e) =>
      (!level || e.level === level) &&
      (!gender || e.gender === gender || e.gender === "Nam - nữ") &&
      `${e.code} ${e.sportName} ${e.name} ${e.group ?? ""}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi")),
  );
  return (
    <section className="role-panel catalog-workspace">
      <h1>Danh mục môn thi</h1>
      <p>
        {new Set(scoped.map((e) => e.sportCode)).size} môn · {scoped.length} nội
        dung{" "}
        {sportCodes === undefined
          ? "từ danh mục được cung cấp."
          : "thuộc phân công của bạn."}{" "}
        Bảng tra cứu không thay điều kiện đăng ký của từng VĐV.
      </p>
      <div className="role-catalog-filters">
        <label>
          Tìm nội dung
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mã, môn hoặc tên nội dung…"
          />
        </label>
        <label>
          Cấp học
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Tất cả cấp học</option>
            <option value="TH">Tiểu học</option>
            <option value="THCS">Trung học cơ sở</option>
          </select>
        </label>
        <label>
          Giới tính
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Tất cả giới tính</option>
            <option>Nam</option>
            <option>Nữ</option>
          </select>
        </label>
      </div>
      <p role="status">{events.length} nội dung phù hợp</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã nội dung</th>
              <th>Môn</th>
              <th>Cấp học</th>
              <th>Giới tính</th>
              <th>Phân nhóm</th>
              <th>Tên nội dung</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={e.code}>
                <td>{i + 1}</td>
                <td>
                  <code>{e.code}</code>
                </td>
                <td>{e.sportName}</td>
                <td>{e.level}</td>
                <td>{e.gender}</td>
                <td>{e.group ?? "Không phân nhóm"}</td>
                <td>{e.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!events.length && (
          <div className="role-empty">Không tìm thấy nội dung phù hợp.</div>
        )}
      </div>
    </section>
  );
}

export function StaffObservation({
  page,
  sportCodes,
}: {
  page: WorkspacePage;
  sportCodes: readonly string[];
}) {
  const assigned = sports.filter(([code]) => sportCodes.includes(code));
  return (
    <section className="role-panel staff-observation">
      <h1>{page === "Phân công" ? "Phân công của tôi" : page}</h1>
      <p>Chỉ quan sát môn được phân công trong kỳ giải hiện tại.</p>
      {assigned.length ? (
        <>
          <div className="role-sport-chips">
            {assigned.map(([code, name]) => (
              <div className="role-draft-tag" key={code}>
                {name}
              </div>
            ))}
          </div>
          <div className="role-empty">
            <h3>
              Chưa có dữ liệu {page.toLocaleLowerCase("vi")} của các môn được
              giao
            </h3>
            <p>
              Dữ liệu sẽ hiển thị khi kết nối hệ thống. Công cụ thử nghiệm chung
              không được mở trong bàn làm việc trọng tài.
            </p>
          </div>
        </>
      ) : (
        <div className="role-empty">
          <h3>Chưa có môn được phân công</h3>
          <p>Liên hệ Ban tổ chức để được phân công môn thi đấu.</p>
        </div>
      )}
    </section>
  );
}
