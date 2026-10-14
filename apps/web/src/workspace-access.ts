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
    grant.role !== "admin" ||
    grant.approved !== true
  )
    throw new Error("Quyền tài khoản không hợp lệ hoặc đã thay đổi.");
  return {
    source: "supabase",
    editionId: grant.editionId,
    actor: {
      id: userId,
      approved: true,
      assignments: [{ editionId: grant.editionId, role: "admin" }],
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
