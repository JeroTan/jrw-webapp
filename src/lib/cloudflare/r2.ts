import { randomUUID } from "node:crypto";
import { env } from "cloudflare:workers";
import { Result } from "@/utils/general/result";
import { LogicError } from "@/utils/general/error";

export async function uploadPhotos({
  id = randomUUID(),
  file,
}: {
  id?: string;
  file: File;
}) {
  const result = await env.STORAGE.put(id, file, {
    httpMetadata: {
      contentType: file.type,
      contentDisposition: "inline",
    },
  });
  if (!result) {
    console.error("Failed to upload card image to R2");
    return Result.error(
      new LogicError("Failed to upload card image to R2", "UPLOAD_ERROR")
    );
  }
  return Result.okay(id);
}

export async function getPhotos(id: string) {
  const result = await env.STORAGE.get(id);

  if (!result) {
    return Result.error(new LogicError("Card image not found", "NOT_FOUND"));
  }

  // Convert R2ObjectBody to File
  const blob = await result.blob();
  const file = new File([blob], id, {
    type: result.httpMetadata?.contentType || "application/octet-stream",
    lastModified: result.uploaded.getTime(),
  });
  return Result.okay(file);
}

export async function deletePhotos(id: string) {
  await env.STORAGE.delete(id);
}

export async function idToLink(id: string) {
  return `${env.R2_PUBLIC_URL}/${id}`;
}
