import {
  productImageUploadAcceptedTypes,
  productImageUploadMaxBytes,
} from "./productImageUploadPolicy";

export function isProductImageResizeRequired(file: File): boolean {
  return (
    productImageUploadAcceptedTypes.includes(
      file.type as (typeof productImageUploadAcceptedTypes)[number]
    ) && file.size > productImageUploadMaxBytes
  );
}
