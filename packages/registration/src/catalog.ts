import {
  ensure,
  immutable,
  type CatalogNode,
  type CatalogSnapshot,
  type Rules,
} from "./model.js";
export function snapshotCatalog(
  id: string,
  editionId: string,
  sourceVersion: number,
  nodes: readonly CatalogNode[],
): CatalogSnapshot {
  ensure(
    id && editionId && Number.isSafeInteger(sourceVersion) && sourceVersion > 0,
    "INVALID_CATALOG",
    "Thiếu phiên bản danh mục.",
  );
  const ids = new Set<string>(),
    codes = new Set<string>();
  for (const n of nodes) {
    ensure(
      n.id &&
        n.code.trim() &&
        n.name.trim() &&
        !ids.has(n.id) &&
        !codes.has(n.code) &&
        Number.isSafeInteger(n.order),
      "INVALID_CATALOG",
      "Mã/ID danh mục trùng hoặc thiếu.",
    );
    ids.add(n.id);
    codes.add(n.code);
    for (const [key, value] of Object.entries(n.rules)) {
      ensure(
        [
          "gender",
          "schoolQuota",
          "maxEventsPerSport",
          "categoryLimits",
          "minAge",
          "maxAge",
          "minGrade",
          "maxGrade",
          "minMembers",
          "maxMembers",
          "minEachSex",
          "maxEachSex",
          "requireIndividual",
        ].includes(key),
        "INVALID_CATALOG",
        "Trường cấu hình chưa được hỗ trợ.",
      );
      if (key === "gender")
        ensure(
          ["male", "female", "mixed"].includes(String(value)),
          "INVALID_CATALOG",
          "Giới tính cấu hình không hợp lệ.",
        );
      else if (key === "requireIndividual")
        ensure(
          typeof value === "boolean",
          "INVALID_CATALOG",
          "Cấu hình cá nhân không hợp lệ.",
        );
      else if (key === "categoryLimits")
        ensure(
          value &&
            typeof value === "object" &&
            Object.values(value).every(
              (v) => Number.isSafeInteger(v) && Number(v) >= 1,
            ),
          "INVALID_CATALOG",
          "Giới hạn nhóm nội dung không hợp lệ.",
        );
      else
        ensure(
          Number.isSafeInteger(value) && Number(value) >= 0,
          "INVALID_CATALOG",
          "Hạn mức phải là số nguyên không âm.",
        );
    }
    ensure(
      ["sport", "group", "event"].includes(n.kind) &&
        typeof n.active === "boolean",
      "INVALID_CATALOG",
      "Loại danh mục không hợp lệ.",
    );
    if (n.kind === "event")
      ensure(
        n.participantKind === "athlete" || n.participantKind === "team",
        "INVALID_CATALOG",
        "Nội dung thiếu loại VĐV/đội.",
      );
  }
  for (const n of nodes) {
    if (n.kind === "sport")
      ensure(n.parentId === null, "INVALID_CATALOG", "Môn không có cha.");
    else {
      const parent = nodes.find((p) => p.id === n.parentId);
      ensure(
        parent && parent.kind !== "event",
        "INVALID_CATALOG",
        "Cha danh mục không hợp lệ.",
      );
      const seen = new Set([n.id]);
      let p: CatalogNode | undefined = parent;
      while (p) {
        ensure(!seen.has(p.id), "INVALID_CATALOG", "Danh mục có vòng lặp.");
        seen.add(p.id);
        p = nodes.find((x) => x.id === p?.parentId);
      }
    }
  }
  const result = immutable(
    structuredClone({ id, editionId, sourceVersion, nodes }),
  );
  for (const n of nodes.filter((n) => n.kind === "event")) {
    const r = resolveEvent(result, n.id).rules;
    for (const [low, high] of [
      [r.minAge, r.maxAge],
      [r.minGrade, r.maxGrade],
      [r.minMembers, r.maxMembers],
      [r.minEachSex, r.maxEachSex],
    ])
      ensure(
        low === undefined || high === undefined || low <= high,
        "INVALID_CATALOG",
        "Khoảng cấu hình đảo ngược.",
      );
  }
  return result;
}
export function resolveEvent(snapshot: CatalogSnapshot, eventId: string) {
  const node = snapshot.nodes.find((n) => n.id === eventId);
  ensure(node?.kind === "event", "EVENT_NOT_FOUND", "Không tìm thấy nội dung.");
  const chain: CatalogNode[] = [node];
  let p = node;
  while (p.parentId !== null) {
    const parent = snapshot.nodes.find((n) => n.id === p.parentId);
    ensure(
      parent && !chain.some((n) => n.id === parent.id),
      "INVALID_CATALOG",
      "Cây danh mục không hợp lệ.",
    );
    chain.unshift(parent);
    p = parent;
  }
  ensure(chain[0]?.kind === "sport", "INVALID_CATALOG", "Nội dung thiếu môn.");
  const rules: Rules = {};
  for (const part of chain) Object.assign(rules, structuredClone(part.rules));
  return {
    node,
    sportId: chain[0].id,
    rules,
    active: chain.every((n) => n.active),
    path: chain.map((n) => n.name),
  };
}
export function suspendEvent(
  snapshot: CatalogSnapshot,
  eventId: string,
): CatalogSnapshot {
  resolveEvent(snapshot, eventId);
  return snapshotCatalog(
    snapshot.id,
    snapshot.editionId,
    snapshot.sourceVersion + 1,
    snapshot.nodes.map((n) => (n.id === eventId ? { ...n, active: false } : n)),
  );
}
export function registeredCatalog(
  snapshot: CatalogSnapshot,
  registrations: readonly { editionId: string; eventId: string }[],
) {
  const keep = new Set<string>();
  for (const registration of registrations) {
    ensure(
      registration.editionId === snapshot.editionId,
      "FORBIDDEN",
      "Đăng ký không cùng kỳ giải.",
    );
    resolveEvent(snapshot, registration.eventId);
    let n = snapshot.nodes.find((x) => x.id === registration.eventId)!;
    while (true) {
      keep.add(n.id);
      if (!n.parentId) break;
      n = snapshot.nodes.find((x) => x.id === n.parentId)!;
    }
  }
  return snapshot.nodes.filter((n) => keep.has(n.id));
}
