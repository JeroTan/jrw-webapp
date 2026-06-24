export function loadProductImageElement(file: File): Promise<HTMLImageElement> {
  if (typeof Image === "undefined" || typeof URL === "undefined") {
    return Promise.reject(new Error("Browser image APIs are unavailable."));
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";

  return new Promise((resolve, reject) => {
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image file could not be loaded."));
    };
    image.src = objectUrl;
  });
}
