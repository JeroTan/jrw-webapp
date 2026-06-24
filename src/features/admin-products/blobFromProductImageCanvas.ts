export function blobFromProductImageCanvas(
  canvas: HTMLCanvasElement,
  contentType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image could not be resized."));
          return;
        }

        resolve(blob);
      },
      contentType,
      quality
    );
  });
}
