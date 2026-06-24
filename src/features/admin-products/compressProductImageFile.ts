import { blobFromProductImageCanvas } from "./blobFromProductImageCanvas";
import { createResizedProductImageFileName } from "./createResizedProductImageFileName";
import { isProductImageResizeRequired } from "./isProductImageResizeRequired";
import { loadProductImageElement } from "./loadProductImageElement";
import {
  productImageUploadMaxBytes,
  productImageUploadMaxDimension,
  productImageUploadResizeType,
} from "./productImageUploadPolicy";
import { resizeProductImageDimensions } from "./resizeProductImageDimensions";

export type ProductImageCompressionResult = {
  file: File;
  originalSize: number;
  resized: boolean;
  resizedSize: number;
};

export async function compressProductImageFile(
  file: File
): Promise<ProductImageCompressionResult> {
  if (!isProductImageResizeRequired(file)) {
    return {
      file,
      originalSize: file.size,
      resized: false,
      resizedSize: file.size,
    };
  }

  if (typeof document === "undefined") {
    throw new Error("Browser canvas APIs are unavailable.");
  }

  const image = await loadProductImageElement(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image could not be resized.");
  }

  let dimensions = resizeProductImageDimensions({
    height: image.naturalHeight || image.height,
    maxDimension: productImageUploadMaxDimension,
    width: image.naturalWidth || image.width,
  });
  let quality = 0.86;
  let smallestBlob: Blob | null = null;

  for (let attempt = 0; attempt < 14; attempt += 1) {
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    context.clearRect(0, 0, dimensions.width, dimensions.height);
    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

    const candidate = await blobFromProductImageCanvas(
      canvas,
      productImageUploadResizeType,
      quality
    );

    if (!smallestBlob || candidate.size < smallestBlob.size) {
      smallestBlob = candidate;
    }

    if (candidate.size <= productImageUploadMaxBytes) {
      smallestBlob = candidate;
      break;
    }

    if (quality > 0.58) {
      quality = Math.max(0.58, quality - 0.08);
      continue;
    }

    dimensions = {
      height: Math.max(1, Math.round(dimensions.height * 0.84)),
      width: Math.max(1, Math.round(dimensions.width * 0.84)),
    };
    quality = 0.82;
  }

  if (!smallestBlob || smallestBlob.size > productImageUploadMaxBytes) {
    throw new Error("Image is still larger than 5MB after resizing.");
  }

  const contentType = smallestBlob.type || productImageUploadResizeType;
  const resizedFile = new File(
    [smallestBlob],
    createResizedProductImageFileName(file, contentType),
    {
      lastModified: Date.now(),
      type: contentType,
    }
  );

  return {
    file: resizedFile,
    originalSize: file.size,
    resized: true,
    resizedSize: resizedFile.size,
  };
}
