export const photoBox = { width: 360, height: 480 };
export const photoMaxLength = 60_000;
const qualities = [0.85, 0.7, 0.55, 0.4];

export function photoSize(width: number, height: number) {
  if (!(width > 0 && height > 0))
    throw Error("Ảnh không có kích thước hợp lệ.");
  const scale = Math.min(1, photoBox.width / width, photoBox.height / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Downscale to a 3×4 profile box and re-encode as JPEG so drafts stay far below browser storage limits. */
export function resizePhoto(
  image: HTMLImageElement,
  doc: Document = document,
): string {
  const { width, height } = photoSize(image.naturalWidth, image.naturalHeight);
  const canvas = doc.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context)
    throw Error(
      "Trình duyệt này không thu nhỏ được ảnh. Hãy dùng Chrome, Edge hoặc Firefox bản mới.",
    );
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  for (const quality of qualities) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (
      url.startsWith("data:image/jpeg;base64,") &&
      url.length <= photoMaxLength
    )
      return url;
  }
  throw Error("Không nén được ảnh đủ nhỏ. Hãy chọn ảnh khác.");
}
