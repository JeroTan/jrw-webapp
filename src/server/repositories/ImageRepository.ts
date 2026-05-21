export type UploadedImageMetadata = {
  key: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  etag: string | null;
  url: string;
};

export type ImageRepository = {
  upload(file: File, key: string): Promise<UploadedImageMetadata>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
};

function normalizePublicBaseUrl(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "";
  }

  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function encodeObjectKey(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export class R2ImageRepository implements ImageRepository {
  private readonly bucket: R2Bucket;
  private readonly publicBaseUrl: string;

  constructor(options: { bucket: R2Bucket; publicBaseUrl?: string }) {
    this.bucket = options.bucket;
    this.publicBaseUrl = normalizePublicBaseUrl(options.publicBaseUrl);
  }

  getPublicUrl(key: string): string {
    const encodedKey = encodeObjectKey(key);

    if (this.publicBaseUrl.length > 0) {
      return `${this.publicBaseUrl}/${encodedKey}`;
    }

    return `/assets/${encodedKey}`;
  }

  async upload(file: File, key: string): Promise<UploadedImageMetadata> {
    const contentType = file.type || "application/octet-stream";
    const uploadedAt = new Date().toISOString();

    const result = await this.bucket.put(key, file.stream(), {
      httpMetadata: {
        contentType,
      },
      customMetadata: {
        uploadedAt,
      },
    });

    return {
      key,
      size: file.size,
      contentType,
      uploadedAt,
      etag: result?.etag ?? null,
      url: this.getPublicUrl(key),
    };
  }

  async get(key: string): Promise<R2ObjectBody | null> {
    return this.bucket.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }
}
