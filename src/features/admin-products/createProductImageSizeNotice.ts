import { formatProductImageFileSize } from "./formatProductImageFileSize";
import { isProductImageResizeRequired } from "./isProductImageResizeRequired";
import { productImageUploadMaxLabel } from "./productImageUploadPolicy";

export function createProductImageSizeNotice(file: File): string {
  const size = formatProductImageFileSize(file.size);

  if (isProductImageResizeRequired(file)) {
    return `Image size detected: ${size}. Bigger than ${productImageUploadMaxLabel}; reducing before upload. Choose another image if you do not want resizing.`;
  }

  return `Image size detected: ${size}. Uploading now.`;
}
