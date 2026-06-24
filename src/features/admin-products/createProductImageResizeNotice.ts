import { formatProductImageFileSize } from "./formatProductImageFileSize";

export function createProductImageResizeNotice(input: {
  originalSize: number;
  resizedSize: number;
}): string {
  return `Image reduced from ${formatProductImageFileSize(
    input.originalSize
  )} to ${formatProductImageFileSize(input.resizedSize)} before upload.`;
}
