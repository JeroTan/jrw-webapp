import { createId } from "@paralleldrive/cuid2";
import { asc, eq } from "drizzle-orm";
import { createDb, type AppDb } from "@/adapter/infrastructure/db/client";
import {
  zodCreateOrderSnapshotInput,
  zodOrderSnapshot,
} from "@/domain/snapshots/schemas";
import type {
  CreateOrderSnapshotInput,
  OrderSnapshot,
  SnapshotVariantOption,
} from "@/domain/snapshots/types";
import { order_snapshots } from "@/domain/schema/transactions";
import { toApiDateTime } from "@/lib/api/date-time";

type SnapshotRow = typeof order_snapshots.$inferSelect;

export type SnapshotRepository = {
  createSnapshot(input: CreateOrderSnapshotInput): Promise<OrderSnapshot>;
  getSnapshot(snapshotId: string): Promise<OrderSnapshot | null>;
  getSnapshotsByOrderId(orderId: string): Promise<OrderSnapshot[]>;
};

function parseVariantOptions(value: unknown): SnapshotVariantOption[] {
  if (Array.isArray(value)) {
    return value
      .filter(
        (option): option is SnapshotVariantOption =>
          typeof option === "object" &&
          option !== null &&
          "group" in option &&
          "name" in option &&
          typeof option.group === "string" &&
          typeof option.name === "string"
      )
      .map((option) => ({
        group: option.group,
        name: option.name,
      }));
  }

  if (typeof value === "string" && value.trim().length > 0) {
    try {
      return parseVariantOptions(JSON.parse(value));
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeVariantOptions(
  options: readonly SnapshotVariantOption[]
): SnapshotVariantOption[] {
  return options.map((option) => ({
    group: option.group.trim(),
    name: option.name.trim(),
  }));
}

export function createSnapshotSignature(
  input: CreateOrderSnapshotInput
): string {
  // Excludes timestamp so retries reuse exact same order-line snapshot without hiding later catalog changes.
  return JSON.stringify({
    orderId: input.orderId,
    productId: input.productId,
    productName: input.productName,
    productSlug: input.productSlug,
    variantId: input.variantId,
    variantLabel: input.variantLabel,
    variantOptions: normalizeVariantOptions(input.variantOptions),
    priceCentavos: input.priceCentavos,
    quantity: input.quantity,
    imageReference: input.imageReference ?? null,
  });
}

function toSnapshot(row: SnapshotRow): OrderSnapshot {
  const snapshot = {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    productSlug: row.product_slug,
    variantId: row.variant_id,
    variantLabel: row.variant_name,
    variantOptions: parseVariantOptions(row.variant_options),
    priceCentavos: Number(row.price_centavos),
    quantity: Number(row.quantity),
    imageReference: row.image_r2_key,
    snapshotTimestamp: toApiDateTime(row.snapshot_timestamp),
  };

  return zodOrderSnapshot.parse(snapshot);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /SQLITE_CONSTRAINT|UNIQUE constraint failed|constraint failed/i.test(
      error.message
    )
  );
}

export class DrizzleSnapshotRepository implements SnapshotRepository {
  constructor(private readonly db: AppDb) {}

  private async findBySignature(
    signature: string
  ): Promise<OrderSnapshot | null> {
    const [row] = await this.db
      .select()
      .from(order_snapshots)
      .where(eq(order_snapshots.snapshot_signature, signature))
      .limit(1);

    return row ? toSnapshot(row) : null;
  }

  async createSnapshot(
    input: CreateOrderSnapshotInput
  ): Promise<OrderSnapshot> {
    const parsed = zodCreateOrderSnapshotInput.safeParse(input);
    if (!parsed.success) {
      throw new Error("SNAPSHOT_VALIDATION_FAILED");
    }

    const signature = createSnapshotSignature(parsed.data);
    const existing = await this.findBySignature(signature);
    if (existing) {
      return existing;
    }

    try {
      const [row] = await this.db
        .insert(order_snapshots)
        .values({
          id: parsed.data.id ?? createId(),
          order_id: parsed.data.orderId,
          product_id: parsed.data.productId,
          product_slug: parsed.data.productSlug,
          variant_id: parsed.data.variantId,
          product_name: parsed.data.productName,
          variant_name: parsed.data.variantLabel,
          variant_options: normalizeVariantOptions(parsed.data.variantOptions),
          price_at_purchase: parsed.data.priceCentavos,
          price_centavos: parsed.data.priceCentavos,
          quantity: parsed.data.quantity,
          image_r2_key: parsed.data.imageReference,
          snapshot_timestamp: parsed.data.snapshotTimestamp,
          snapshot_signature: signature,
        })
        .returning();

      return toSnapshot(row);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const duplicate = await this.findBySignature(signature);
        if (duplicate) {
          return duplicate;
        }
      }

      throw error;
    }
  }

  async getSnapshot(snapshotId: string): Promise<OrderSnapshot | null> {
    const [row] = await this.db
      .select()
      .from(order_snapshots)
      .where(eq(order_snapshots.id, snapshotId))
      .limit(1);

    return row ? toSnapshot(row) : null;
  }

  async getSnapshotsByOrderId(orderId: string): Promise<OrderSnapshot[]> {
    const rows = await this.db
      .select()
      .from(order_snapshots)
      .where(eq(order_snapshots.order_id, orderId))
      .orderBy(
        asc(order_snapshots.snapshot_timestamp),
        asc(order_snapshots.id)
      );

    return rows.map((row) => toSnapshot(row));
  }
}

export function createSnapshotRepositories(dbBinding: D1Database) {
  const db = createDb(dbBinding);

  return {
    snapshotRepository: new DrizzleSnapshotRepository(db),
  };
}
