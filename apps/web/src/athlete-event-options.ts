/** Reference choices transcribed from docs/business/sources/dieu-le-2026.txt, chapter II.
 * These are draft preferences, not an approved catalog snapshot or eligibility decision. */
export const sportNames = {
  athletics: "Điền kinh",
  swimming: "Bơi",
  badminton: "Cầu lông",
  shuttlecock: "Đá cầu",
  chess: "Cờ vua",
  football: "Bóng đá",
  tug: "Kéo co",
  stick: "Đẩy gậy",
  vovinam: "Vovinam",
} as const;
export type SportId = keyof typeof sportNames;
export interface EventPreference {
  sportId: SportId;
  level: "TH" | "THCS";
  eventLabel: string;
}
export function eventOptions(
  sport: SportId,
  level: "TH" | "THCS",
  gender?: "male" | "female",
): string[] {
  if (!gender) return [];
  const male = gender === "male";
  if (
    level === "TH" &&
    ["badminton", "tug", "stick", "vovinam"].includes(sport)
  )
    return [];
  switch (sport) {
    case "athletics":
      return level === "TH"
        ? ["Chạy 60 m", "Bật xa tại chỗ", "Tiếp sức 4 × 50 m"]
        : [
            "Chạy 100 m",
            "Chạy 200 m",
            male ? "Chạy 1.500 m" : "Chạy 800 m",
            "Nhảy xa",
            "Nhảy cao",
            "Tiếp sức 4 × 100 m",
          ];
    case "swimming":
      return [
        ...(level === "TH" ? [50, 100] : [50, 100, 200]).flatMap((n) => [
          `Tự do ${n} m`,
          `Ếch ${n} m`,
        ]),
        level === "TH"
          ? "Tiếp sức tự do 4 × 50 m (nam nữ)"
          : "Tiếp sức tự do 4 × 100 m (nam nữ)",
      ];
    case "badminton":
    case "shuttlecock":
      return [
        male ? "Đơn nam" : "Đơn nữ",
        male ? "Đôi nam" : "Đôi nữ",
        "Đôi nam nữ",
      ];
    case "chess":
      return [
        male ? "Cá nhân nam" : "Cá nhân nữ",
        male ? "Đồng đội nam" : "Đồng đội nữ",
      ];
    case "football":
      return male ? ["Bóng đá 5 người nam"] : [];
    case "tug":
      return [
        male ? "Đội nam (không quá 460 kg)" : "Đội nữ (không quá 420 kg)",
        "Đội nam nữ (không quá 440 kg)",
      ];
    case "stick":
      return male
        ? [41, 44, 47, 50, 53, 56]
            .map((n) => `Đến ${n} kg`)
            .concat("Trên 56 kg")
        : [35, 38, 41, 44, 47, 50]
            .map((n) => `Đến ${n} kg`)
            .concat("Trên 50 kg");
    case "vovinam":
      return [
        male ? "Tứ trụ quyền" : "Long hổ quyền",
        "Tinh hoa lưỡng nghi kiếm pháp",
        male ? "Song luyện 1 nam" : "Song luyện 1 nữ",
        "Đối kháng trên 39 đến 42 kg",
        "Đối kháng trên 42 đến 45 kg",
        "Đối kháng trên 45 đến 48 kg",
        "Đối kháng trên 48 đến 51 kg",
        "Đối kháng trên 51 đến 54 kg",
      ];
  }
}
