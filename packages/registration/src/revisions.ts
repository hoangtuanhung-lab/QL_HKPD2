import {
  currentRevision,
  ensure,
  immutable,
  type Participant,
  type Registration,
  type Registry,
} from "./model.js";
import { validateRegistration } from "./rules.js";
export function assertWindow(state: Registry, now: Date) {
  ensure(
    Number.isFinite(now.getTime()) &&
      Number.isFinite(Date.parse(state.deadline)),
    "INVALID_DATE",
    "Hạn đăng ký không hợp lệ.",
  );
  ensure(
    state.registrationOpen && now.getTime() <= Date.parse(state.deadline),
    "REGISTRATION_CLOSED",
    "Đăng ký đã đóng hoặc hết hạn.",
  );
}
export function reviseRegistration(
  registration: Registration,
  id: string,
  participant: Participant,
  expectedVersion: number,
): Registration {
  ensure(
    registration.version === expectedVersion &&
      registration.version < Number.MAX_SAFE_INTEGER,
    "VERSION_CONFLICT",
    "Đăng ký đã thay đổi; tải lại bản mới.",
  );
  ensure(
    currentRevision(registration).status !== "submitted",
    "INVALID_STATE",
    "Bản đã gửi cần được duyệt hoặc trả lại trước khi sửa.",
  );
  ensure(
    id && !registration.revisions.some((r) => r.id === id),
    "REVISION_ID",
    "ID revision bị trùng.",
  );
  return immutable({
    ...structuredClone(registration),
    version: registration.version + 1,
    revisions: [
      ...structuredClone(registration.revisions),
      {
        id,
        version: registration.version + 1,
        status: "draft",
        participant: structuredClone(participant),
      },
    ],
  });
}
export function transitionRegistration(
  state: Registry,
  registration: Registration,
  action: "submit" | "approve" | "return",
  expectedVersion: number,
  now: Date,
  reason?: string,
): Registration {
  ensure(
    registration.version === expectedVersion &&
      registration.version < Number.MAX_SAFE_INTEGER,
    "VERSION_CONFLICT",
    "Đăng ký đã thay đổi; tải lại bản mới.",
  );
  const current = currentRevision(registration);
  if (action === "submit") {
    assertWindow(state, now);
    ensure(
      current.status === "draft" || current.status === "returned",
      "INVALID_STATE",
      "Chỉ gửi bản nháp hoặc trả lại.",
    );
  } else
    ensure(
      current.status === "submitted",
      "INVALID_STATE",
      "Chỉ duyệt/trả lại bản đã gửi.",
    );
  if (action !== "return") {
    const rules = validateRegistration(state, registration, action);
    ensure(
      rules.valid,
      rules.errors[0]?.code ?? "RULE_ERROR",
      rules.errors[0]?.message ?? "Đăng ký không hợp lệ.",
    );
  } else ensure(reason?.trim(), "REASON_REQUIRED", "Cần lý do trả lại.");
  return immutable({
    ...structuredClone(registration),
    version: registration.version + 1,
    approvedRevisionId:
      action === "approve" ? current.id : registration.approvedRevisionId,
    revisions: registration.revisions.map((r) =>
      r.id === current.id
        ? {
            ...structuredClone(r),
            version: registration.version + 1,
            status:
              action === "submit"
                ? ("submitted" as const)
                : action === "approve"
                  ? ("approved" as const)
                  : ("returned" as const),
            ...(action === "return" ? { reason: reason!.trim() } : {}),
          }
        : structuredClone(r),
    ),
  });
}
