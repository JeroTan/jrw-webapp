import { formatProductImageFileSize } from "./formatProductImageFileSize";
import { productImageUploadMaxLabel } from "./productImageUploadPolicy";

export function createProductImageResizeFailureNotice(file: File): string {
  return `Image size detected: ${formatProductImageFileSize(
    file.size
  )}. Could not reduce below ${productImageUploadMaxLabel} here. Choose smaller image.`;
}
