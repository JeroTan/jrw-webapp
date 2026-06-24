export const productImageUploadMaxBytes = 5 * 1024 * 1024;
export const productImageUploadMaxLabel = "5MB";
export const productImageUploadMaxDimension = 2400;
export const productImageUploadAcceptedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const productImageUploadResizeType = "image/webp";
