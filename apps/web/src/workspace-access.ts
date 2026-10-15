import { athleteCatalog } from "./athlete-catalog.generated.js";
import type { ManagedSchool } from "./admin-settings.js";
import type { WorkspaceSession } from "./staff-scope.js";

export interface AccessPort {
  rpc(name: "hkpd_workspace_access"): PromiseLike<{
    data: unknown;
    error: unknown;
  }>;
}
/** Only the server-owned grant is accepted; browser metadata cannot grant roles. */
export async function loadWorkspaceAccess(
  port: AccessPort,
  userId: string,
): Promise<WorkspaceSession | null> {
  const { data, error } = await port.rpc("hkpd_workspace_access");
  if (error)
    throw new Error(
      "Không đọc được quyền từ Supabase. Kiểm tra cấu hình cấp quyền hoặc thử lại.",
    );
  if (data === null) return null;
  if (typeof data !== "object" || Array.isArray(data))
    throw new Error("Phản hồi cấp quyền không hợp lệ.");
  const grant = data as Record<string, unknown>;
  if (
    grant.userId !== userId ||
    grant.editionId !== "edition-2026" ||
    grant.approved !== true ||
    typeof grant.role !== "string" ||
    !["admin", "school", "leader", "referee"].includes(grant.role)
  )
    throw new Error("Quyền tài khoản không hợp lệ hoặc đã thay đổi.");
  const validCodes = new Set<string>(athleteCatalog.map((e) => e.code));
  const knownSports = new Set<string>(athleteCatalog.map((e) => e.sportCode));
  const catalogCodes = grant.catalogCodes;
  if (
    catalogCodes !== undefined &&
    (!Array.isArray(catalogCodes) ||
      catalogCodes.some((c) => typeof c !== "string" || !validCodes.has(c)) ||
      new Set(catalogCodes).size !== catalogCodes.length)
  )
    throw new Error("Danh mục quyền không hợp lệ.");
  const common = {
    source: "supabase" as const,
    editionId: "edition-2026",
    ...(catalogCodes !== undefined
      ? { catalogCodes: catalogCodes as string[] }
      : {}),
  };
  if (grant.role === "admin")
    return {
      ...common,
      actor: {
        id: userId,
        approved: true,
        assignments: [{ editionId: common.editionId, role: "admin" }],
      },
    };
  if (!Array.isArray(catalogCodes))
    throw new Error("Thiếu phạm vi danh mục giải.");
  if (grant.role === "school") {
    const school = grant.school as ManagedSchool | null;
    if (
      !school ||
      typeof school.id !== "string" ||
      !school.id ||
      typeof school.code !== "string" ||
      !/^[A-Z0-9_]{2,30}$/.test(school.code) ||
      typeof school.name !== "string" ||
      !school.name.trim() ||
      !["TH", "THCS", "TH_THCS"].includes(school.level) ||
      !Array.isArray(grant.sportCodes) ||
      grant.sportCodes.length
    )
      throw new Error("Thiếu phân công trường hợp lệ.");
    return {
      ...common,
      school,
      actor: {
        id: userId,
        approved: true,
        schoolId: school.id,
        assignments: [
          { editionId: common.editionId, role: "school", schoolId: school.id },
        ],
      },
    };
  }
  const sportCodes = grant.sportCodes;
  if (
    grant.school !== null ||
    !Array.isArray(sportCodes) ||
    !sportCodes.length ||
    sportCodes.some((s) => typeof s !== "string" || !knownSports.has(s)) ||
    new Set(sportCodes).size !== sportCodes.length
  )
    throw new Error("Thiếu phân công môn hợp lệ.");
  const role = grant.role as "leader" | "referee";
  return {
    ...common,
    actor: {
      id: userId,
      approved: true,
      assignments: sportCodes.map((sportId: string) => ({
        editionId: common.editionId,
        role,
        sportId,
      })),
    },
  };
}

/** Preserve preview drafts while isolating drafts belonging to different logins. */
export function accountStorage(
  storage: Storage,
  userId?: string,
): Pick<Storage, "getItem" | "setItem"> {
  const prefix = userId ? `hkpd.account.${encodeURIComponent(userId)}.` : "";
  return {
    getItem: (key) => storage.getItem(prefix + key),
    setItem: (key, value) => storage.setItem(prefix + key, value),
  };
}
