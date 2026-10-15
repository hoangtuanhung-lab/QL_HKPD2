import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { athleteCatalog } from "./athlete-catalog.generated.js";
export interface ManagedSchool {
  id: string;
  code: string;
  name: string;
  level: "TH" | "THCS" | "TH_THCS";
}
export interface AdminSettings {
  revision: number;
  catalogCodes: string[];
  schools: ManagedSchool[];
}
export type SettingsAction = "catalog" | "school.save" | "school.delete";
export interface AdminRepository {
  load(): Promise<AdminSettings>;
  update(
    revision: number,
    action: SettingsAction,
    payload: Record<string, unknown>,
  ): Promise<AdminSettings>;
}
export const AdminRepositoryContext = createContext<AdminRepository | null>(
  null,
);
const officialCodes = new Set<string>(athleteCatalog.map((e) => e.code));
export function validateAdminSettings(data: unknown): AdminSettings {
  if (!data || typeof data !== "object")
    throw Error("Danh mục quản trị không hợp lệ.");
  const s = data as AdminSettings;
  if (
    !Number.isSafeInteger(s.revision) ||
    s.revision < 0 ||
    !Array.isArray(s.catalogCodes) ||
    s.catalogCodes.some((c) => !officialCodes.has(c)) ||
    new Set(s.catalogCodes).size !== s.catalogCodes.length ||
    !Array.isArray(s.schools)
  )
    throw Error("Danh mục quản trị không hợp lệ.");
  const ids = new Set<string>(),
    codes = new Set<string>();
  for (const school of s.schools) {
    if (
      !school ||
      typeof school.id !== "string" ||
      !school.id ||
      ids.has(school.id) ||
      typeof school.code !== "string" ||
      !/^[A-Z0-9_]{2,30}$/.test(school.code) ||
      codes.has(school.code) ||
      typeof school.name !== "string" ||
      school.name.trim().length < 2 ||
      school.name.length > 200 ||
      !["TH", "THCS", "TH_THCS"].includes(school.level)
    )
      throw Error("Danh sách trường không hợp lệ.");
    ids.add(school.id);
    codes.add(school.code);
  }
  return s;
}
export function supabaseAdminRepository(port: {
  rpc(
    name: string,
    args?: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: unknown }>;
}): AdminRepository {
  async function call(name: string, args?: Record<string, unknown>) {
    const result = await port.rpc(name, args);
    if (result.error) {
      const code = (result.error as { code?: string }).code;
      throw Error(
        code === "40001"
          ? "Danh mục đã được thay đổi ở nơi khác. Bấm Tải lại trước khi lưu."
          : code === "22023"
            ? "Dữ liệu chưa hợp lệ hoặc nội dung đã có lịch/kết quả nên không thể bỏ khỏi giải."
            : code === "23503"
              ? "Trường đã có tài khoản hoặc hồ sơ đăng ký. Xử lý dữ liệu liên quan trước khi xóa trường."
              : code === "23505"
                ? "Mã trường đã tồn tại."
                : code === "42501"
                  ? "Tài khoản không còn quyền quản trị. Hãy kiểm tra quyền."
                  : "Không đọc hoặc lưu được danh mục Supabase. Kiểm tra kết nối và migration 003.",
      );
    }
    return validateAdminSettings(result.data);
  }
  return {
    load: () => call("hkpd_admin_settings"),
    update: (revision, action, payload) =>
      call("hkpd_update_admin_settings", {
        p_revision: revision,
        p_action: action,
        p_payload: payload,
      }),
  };
}
export function localAdminRepository(
  storage: Pick<Storage, "getItem" | "setItem">,
  editionId: string,
  catalogCodes: readonly string[],
): AdminRepository {
  const key = `hkpd.admin-settings.${encodeURIComponent(editionId)}`;
  const read = () => {
    const raw = storage.getItem(key);
    return raw === null
      ? { revision: 0, schools: [], catalogCodes: [...catalogCodes] }
      : validateAdminSettings(JSON.parse(raw));
  };
  return {
    load: async () => read(),
    update: async (revision, action, payload) => {
      const current = read();
      if (current.revision !== revision)
        throw Error(
          "Danh mục đã được thay đổi ở nơi khác. Bấm Tải lại trước khi lưu.",
        );
      const next = structuredClone(current);
      if (action === "catalog") next.catalogCodes = payload.codes as string[];
      else if (action === "school.delete") {
        if (!next.schools.some((s) => s.id === payload.id))
          throw Error("Không tìm thấy trường.");
        next.schools = next.schools.filter((s) => s.id !== payload.id);
      } else {
        if (payload.id && !next.schools.some((s) => s.id === payload.id))
          throw Error("Không tìm thấy trường.");
        const school = {
          ...payload,
          id: payload.id || crypto.randomUUID(),
          code: String(payload.code ?? "")
            .trim()
            .toUpperCase(),
          name: String(payload.name ?? "").trim(),
        } as ManagedSchool;
        next.schools = [
          ...next.schools.filter((s) => s.id !== school.id),
          school,
        ];
      }
      next.revision++;
      validateAdminSettings(next);
      storage.setItem(key, JSON.stringify(next));
      return next;
    },
  };
}
export function useAdminSettings(repository: AdminRepository | null) {
  const [snapshot, setSnapshot] = useState<AdminSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const epoch = ++generation.current;
    setSnapshot(null);
    setError("");
    if (!repository) {
      setBusy(false);
      return;
    }
    setBusy(true);
    void repository
      .load()
      .then((next) => {
        if (epoch === generation.current) setSnapshot(next);
      })
      .catch(() => {
        if (epoch === generation.current)
          setError(
            "Không tải được danh mục. Kiểm tra kết nối, quyền quản trị và migration 003, rồi Tải lại.",
          );
      })
      .finally(() => {
        if (epoch === generation.current) setBusy(false);
      });
    return () => {
      generation.current++;
    };
  }, [repository, reload]);
  const save = useCallback(
    async (action: SettingsAction, payload: Record<string, unknown>) => {
      if (!repository || !snapshot || busy)
        throw Error("Chờ tải hoặc lưu danh mục hoàn tất.");
      const epoch = generation.current;
      setBusy(true);
      setError("");
      try {
        const next = await repository.update(
          snapshot.revision,
          action,
          payload,
        );
        if (epoch === generation.current) setSnapshot(next);
      } catch (e) {
        if (epoch === generation.current)
          setError(e instanceof Error ? e.message : "Không lưu được danh mục.");
        throw e;
      } finally {
        if (epoch === generation.current) setBusy(false);
      }
    },
    [repository, snapshot, busy],
  );
  return {
    snapshot,
    busy,
    error,
    save,
    refresh: () => setReload((n) => n + 1),
  };
}
