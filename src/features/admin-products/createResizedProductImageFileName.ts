export function createResizedProductImageFileName(
  file: File,
  contentType: string
): string {
  const extension =
    contentType === "image/jpeg"
      ? "jpg"
      : contentType === "image/png"
        ? "png"
        : "webp";
  const baseName = file.name.replace(/\.[^/.]+$/, "").trim();

  return `${baseName || "product-image"}.${extension}`;
}
