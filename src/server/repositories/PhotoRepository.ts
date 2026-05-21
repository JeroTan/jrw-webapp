import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import type {
  CreateProductPhotoInput,
  ProductPhotoRecord,
  RemoveProductPhotoInput,
  UpdatePhotoOrderInput,
} from "@/domain/products/types";
import { product_photos } from "@/domain/schema/catalog";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

type PhotoRowLike = {
  id: string;
  product_id: string | null;
  image_id: string;
  name: string | null;
  sort_order: number;
  is_primary: boolean;
  r2_key: string;
  file_size: number | null;
  content_type: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
  updated_at: string;
};

export type CreatePhotoRecordInput = CreateProductPhotoInput;

export type PhotoRepository = {
  create(input: CreatePhotoRecordInput): Promise<ProductPhotoRecord>;
  findById(photoId: string): Promise<ProductPhotoRecord | null>;
  listByProductId(productId: string): Promise<ProductPhotoRecord[]>;
  updateOrder(
    input: UpdatePhotoOrderInput & { updatedAt: string }
  ): Promise<ProductPhotoRecord | null>;
  shiftSortOrderRange(input: {
    productId: string;
    fromSortOrder: number;
    toSortOrder: number;
    updatedAt: string;
  }): Promise<void>;
  setPrimary(
    productId: string,
    photoId: string,
    updatedAt: string
  ): Promise<ProductPhotoRecord | null>;
  removeFromProduct(
    input: RemoveProductPhotoInput & { updatedAt: string }
  ): Promise<ProductPhotoRecord | null>;
  findByIds(photoIds: string[]): Promise<ProductPhotoRecord[]>;
  nextSortOrder(productId: string): Promise<number>;
};

function encodeObjectKey(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function toPhotoRecord(input: {
  row: PhotoRowLike;
  resolvePublicUrl: (key: string) => string;
}): ProductPhotoRecord {
  return {
    id: input.row.id,
    productId: input.row.product_id,
    imageId: input.row.image_id,
    name: input.row.name,
    sortOrder: Number(input.row.sort_order),
    isPrimary: Boolean(input.row.is_primary),
    r2Key: input.row.r2_key,
    fileSize:
      input.row.file_size === null || input.row.file_size === undefined
        ? null
        : Number(input.row.file_size),
    contentType: input.row.content_type,
    width:
      input.row.width === null || input.row.width === undefined
        ? null
        : Number(input.row.width),
    height:
      input.row.height === null || input.row.height === undefined
        ? null
        : Number(input.row.height),
    createdAt: input.row.created_at,
    updatedAt: input.row.updated_at,
    uploadedAt: input.row.created_at,
    url: input.resolvePublicUrl(input.row.r2_key),
  };
}

export class DrizzlePhotoRepository implements PhotoRepository {
  private readonly db: AppDb;
  private readonly resolvePublicUrl: (key: string) => string;

  constructor(options: {
    db: AppDb;
    resolvePublicUrl?: (key: string) => string;
  }) {
    this.db = options.db;
    this.resolvePublicUrl =
      options.resolvePublicUrl ??
      ((key) => `/assets/${encodeObjectKey(key)}`);
  }

  async create(input: CreatePhotoRecordInput): Promise<ProductPhotoRecord> {
    const [row] = await this.db
      .insert(product_photos)
      .values({
        id: input.id,
        product_id: input.productId,
        image_id: input.imageId,
        name: input.name,
        sort_order: input.sortOrder,
        is_primary: input.isPrimary,
        r2_key: input.r2Key,
        file_size: input.fileSize,
        content_type: input.contentType,
        width: input.width,
        height: input.height,
        created_at: input.createdAt,
        updated_at: input.updatedAt,
      })
      .returning();

    return toPhotoRecord({
      row,
      resolvePublicUrl: this.resolvePublicUrl,
    });
  }

  async findById(photoId: string): Promise<ProductPhotoRecord | null> {
    const [row] = await this.db
      .select()
      .from(product_photos)
      .where(eq(product_photos.id, photoId))
      .limit(1);

    return row
      ? toPhotoRecord({
          row,
          resolvePublicUrl: this.resolvePublicUrl,
        })
      : null;
  }

  async listByProductId(productId: string): Promise<ProductPhotoRecord[]> {
    const rows = await this.db
      .select()
      .from(product_photos)
      .where(eq(product_photos.product_id, productId))
      .orderBy(
        asc(product_photos.sort_order),
        sql`case when ${product_photos.is_primary} = 1 then 0 else 1 end`,
        asc(product_photos.id)
      );

    return rows.map((row) =>
      toPhotoRecord({
        row,
        resolvePublicUrl: this.resolvePublicUrl,
      })
    );
  }

  async updateOrder(
    input: UpdatePhotoOrderInput & { updatedAt: string }
  ): Promise<ProductPhotoRecord | null> {
    const [row] = await this.db
      .update(product_photos)
      .set({
        sort_order: input.sortOrder,
        updated_at: input.updatedAt,
      })
      .where(
        and(
          eq(product_photos.id, input.photoId),
          eq(product_photos.product_id, input.productId)
        )
      )
      .returning();

    return row
      ? toPhotoRecord({
          row,
          resolvePublicUrl: this.resolvePublicUrl,
        })
      : null;
  }

  async shiftSortOrderRange(input: {
    productId: string;
    fromSortOrder: number;
    toSortOrder: number;
    updatedAt: string;
  }): Promise<void> {
    if (input.fromSortOrder === input.toSortOrder) {
      return;
    }

    if (input.toSortOrder < input.fromSortOrder) {
      await this.db
        .update(product_photos)
        .set({
          sort_order: sql`${product_photos.sort_order} + 1`,
          updated_at: input.updatedAt,
        })
        .where(
          and(
            eq(product_photos.product_id, input.productId),
            sql`${product_photos.sort_order} >= ${input.toSortOrder}`,
            sql`${product_photos.sort_order} < ${input.fromSortOrder}`
          )
        );
      return;
    }

    await this.db
      .update(product_photos)
      .set({
        sort_order: sql`${product_photos.sort_order} - 1`,
        updated_at: input.updatedAt,
      })
      .where(
        and(
          eq(product_photos.product_id, input.productId),
          sql`${product_photos.sort_order} <= ${input.toSortOrder}`,
          sql`${product_photos.sort_order} > ${input.fromSortOrder}`
        )
      );
  }

  async setPrimary(
    productId: string,
    photoId: string,
    updatedAt: string
  ): Promise<ProductPhotoRecord | null> {
    await this.db
      .update(product_photos)
      .set({
        is_primary: false,
        updated_at: updatedAt,
      })
      .where(eq(product_photos.product_id, productId));

    const [row] = await this.db
      .update(product_photos)
      .set({
        is_primary: true,
        updated_at: updatedAt,
      })
      .where(
        and(
          eq(product_photos.id, photoId),
          eq(product_photos.product_id, productId)
        )
      )
      .returning();

    return row
      ? toPhotoRecord({
          row,
          resolvePublicUrl: this.resolvePublicUrl,
        })
      : null;
  }

  async removeFromProduct(
    input: RemoveProductPhotoInput & { updatedAt: string }
  ): Promise<ProductPhotoRecord | null> {
    const [row] = await this.db
      .update(product_photos)
      .set({
        product_id: null,
        is_primary: false,
        updated_at: input.updatedAt,
      })
      .where(
        and(
          eq(product_photos.id, input.photoId),
          eq(product_photos.product_id, input.productId)
        )
      )
      .returning();

    return row
      ? toPhotoRecord({
          row,
          resolvePublicUrl: this.resolvePublicUrl,
        })
      : null;
  }

  async findByIds(photoIds: string[]): Promise<ProductPhotoRecord[]> {
    const normalizedIds = Array.from(
      new Set(
        photoIds
          .map((photoId) => photoId.trim())
          .filter((photoId) => photoId.length > 0)
      )
    );

    if (normalizedIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select()
      .from(product_photos)
      .where(inArray(product_photos.id, normalizedIds));

    return rows.map((row) =>
      toPhotoRecord({
        row,
        resolvePublicUrl: this.resolvePublicUrl,
      })
    );
  }

  async nextSortOrder(productId: string): Promise<number> {
    const [row] = await this.db
      .select({
        maxSort:
          sql<number | null>`cast(max(${product_photos.sort_order}) as integer)`,
      })
      .from(product_photos)
      .where(eq(product_photos.product_id, productId));

    const maxSort = row?.maxSort;
    if (maxSort === null || maxSort === undefined || Number.isNaN(maxSort)) {
      return 0;
    }

    return Number(maxSort) + 1;
  }
}

export function createPhotoRepositories(
  dbBinding: D1Database,
  options: {
    resolvePublicUrl?: (key: string) => string;
  } = {}
) {
  const db = createDb(dbBinding);

  return {
    photoRepository: new DrizzlePhotoRepository({
      db,
      resolvePublicUrl: options.resolvePublicUrl,
    }),
  };
}
