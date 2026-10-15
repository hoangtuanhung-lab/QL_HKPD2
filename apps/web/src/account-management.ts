import { createContext } from "react";
import { athleteCatalog } from "./athlete-catalog.generated.js";
export type AccountRole = "" | "admin" | "school" | "leader" | "referee";
export interface ManagedAccount {
  userId: string;
  email: string;
  role: AccountRole;
  approved: boolean;
  schoolId: string | null;
  sportCodes: string[];
  revision: number;
  updatedAt: string | null;
}
export type AccountChange = Omit<ManagedAccount, "email" | "updatedAt">;
export interface AccountRepository {
  load(): Promise<ManagedAccount[]>;
  save(change: AccountChange): Promise<ManagedAccount[]>;
}
export const AccountRepositoryContext = createContext<AccountRepository | null>(
  null,
);
const sports = new Set<string>(athleteCatalog.map((e) => e.sportCode));
export function validateAccounts(value: unknown): ManagedAccount[] {
  if (!Array.isArray(value)) throw Error("Danh sách tài khoản không hợp lệ.");
  const ids = new Set<string>();
  for (const a of value as ManagedAccount[]) {
    if (
      !a ||
      typeof a.userId !== "string" ||
      !a.userId ||
      ids.has(a.userId) ||
      typeof a.email !== "string" ||
      !a.email.includes("@") ||
      !["", "admin", "school", "leader", "referee"].includes(a.role) ||
      typeof a.approved !== "boolean" ||
      !Number.isSafeInteger(a.revision) ||
      a.revision < 0 ||
      !Array.isArray(a.sportCodes) ||
      new Set(a.sportCodes).size !== a.sportCodes.length ||
      a.sportCodes.some((s) => !sports.has(s)) ||
      !(
        a.schoolId === null ||
        (typeof a.schoolId === "string" && a.schoolId.length > 0)
      ) ||
      !(a.updatedAt === null || typeof a.updatedAt === "string")
    )
      throw Error("Danh sách tài khoản không hợp lệ.");
    if (
      (a.role === "" && a.approved) ||
      (a.role === "school" && (!a.schoolId || a.sportCodes.length)) ||
      (["leader", "referee"].includes(a.role) &&
        (a.schoolId !== null || !a.sportCodes.length)) ||
      (["", "admin"].includes(a.role) &&
        (a.schoolId !== null || a.sportCodes.length))
    )
      throw Error("Phân công tài khoản không hợp lệ.");
    ids.add(a.userId);
  }
  return value as ManagedAccount[];
}
export function supabaseAccountRepository(port: {
  rpc(
    name: string,
    args?: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: unknown }>;
}): AccountRepository {
  async function call(name: string, args?: Record<string, unknown>) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let result: { data: unknown; error: unknown };
    try {
      result = await Promise.race([
        port.rpc(name, args),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(Error("timeout")), 20000);
        }),
      ]);
    } catch {
      throw Error(
        "Không nhận được kết quả quản lý tài khoản. Kiểm tra kết nối rồi tải lại trước khi thử tiếp.",
      );
    } finally {
      clearTimeout(timer);
    }
    if (result.error) {
      const code = (result.error as { code?: string }).code;
      throw Error(
        code === "40001"
          ? "Tài khoản đã được thay đổi ở nơi khác. Tải lại danh sách trước khi lưu."
          : code === "42501"
            ? "Bạn không còn quyền quản trị tài khoản. Kiểm tra quyền đăng nhập."
            : code === "22023"
              ? "Không lưu được phân quyền. Kiểm tra vai trò, trường, môn; không được thay đổi quyền tài khoản đang dùng."
              : "Không đọc hoặc lưu được tài khoản. Kiểm tra migration 004 và kết nối Supabase.",
      );
    }
    return validateAccounts(result.data);
  }
  return {
    load: () => call("hkpd_list_accounts"),
    save: (a) =>
      call("hkpd_update_account", {
        p_user_id: a.userId,
        p_revision: a.revision,
        p_role: a.role,
        p_approved: a.approved,
        p_school_id: a.schoolId,
        p_sport_codes: a.sportCodes,
      }),
  };
}
