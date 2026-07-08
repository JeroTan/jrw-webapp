import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { AppDb } from "@/adapter/infrastructure/db/client";
import {
  buildCustomerOrderStatusLanes,
  type CustomerOrderStatusLane,
} from "@/domain/orders/customer-order-status";
import { order_snapshots, orders } from "@/domain/schema/transactions";

export type CustomerOrderSnapshotOption = {
  group: string;
  name: string;
};

export type CustomerOrderSnapshotItem = {
  imageR2Key: string | null;
  lineTotalCentavos: number;
  productName: string;
  productSlug: string | null;
  quantity: number;
  unitPriceCentavos: number;
  variantLabel: string;
  variantOptions: CustomerOrderSnapshotOption[];
};

export type CustomerOrderReadModel = {
  createdAt: string;
  currency: "PHP";
  fulfillment: CustomerOrderStatusLane;
  itemCount: number;
  orderId: string;
  orderNumber: string;
  payment: CustomerOrderStatusLane;
  refund: CustomerOrderStatusLane;
  return: CustomerOrderStatusLane;
  subtotalCentavos: number;
  totalCentavos: number;
  totalQuantity: number;
  updatedAt: string;
};

export type CustomerOrderDetailReadModel = CustomerOrderReadModel & {
  items: CustomerOrderSnapshotItem[];
};

export type CustomerOrderListResult = {
  items: CustomerOrderReadModel[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type ListCustomerOrdersInput = {
  customerId: string;
  page?: number;
  pageSize?: number;
};

export type GetCustomerOrderDetailInput = {
  customerId: string;
  orderIdOrNumber: string;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function normalizePositiveInteger(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function normalizePageSize(value: number | undefined) {
  return Math.min(
    normalizePositiveInteger(value, DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );
}

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function safeCentavos(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

function parseVariantOptions(value: unknown): CustomerOrderSnapshotOption[] {
  const parsed =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return [];
          }
        })()
      : value;

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter(
      (option): option is Record<string, unknown> =>
        typeof option === "object" && option !== null
    )
    .map((option) => ({
      group: safeString(option.group) ?? "",
      name: safeString(option.name) ?? "",
    }))
    .filter((option) => option.group.length > 0 && option.name.length > 0);
}

function toSnapshotItem(row: {
  imageR2Key: string | null;
  priceCentavos: number;
  productName: string;
  productSlug: string | null;
  quantity: number;
  variantName: string;
  variantOptions: unknown;
}): CustomerOrderSnapshotItem {
  const quantity = Math.max(0, Number(row.quantity) || 0);
  const unitPriceCentavos = safeCentavos(Number(row.priceCentavos));

  return {
    imageR2Key: row.imageR2Key,
    lineTotalCentavos: unitPriceCentavos * quantity,
    productName: row.productName,
    productSlug: row.productSlug,
    quantity,
    unitPriceCentavos,
    variantLabel: row.variantName,
    variantOptions: parseVariantOptions(row.variantOptions),
  };
}

function buildOrderReadModel(
  row: {
    createdAt: string;
    currency: string;
    fulfillmentStatus: string;
    orderId: string;
    orderNumber: string | null;
    paymentStatus: string;
    subtotalCentavos: number;
    totalCentavos: number;
    updatedAt: string;
  },
  items: CustomerOrderSnapshotItem[] = []
): CustomerOrderReadModel {
  const lanes = buildCustomerOrderStatusLanes({
    fulfillmentStatus: row.fulfillmentStatus,
    paymentStatus: row.paymentStatus,
    updatedAt: row.updatedAt,
  });

  return {
    createdAt: row.createdAt,
    currency: "PHP",
    fulfillment: lanes.fulfillment,
    itemCount: items.length,
    orderId: row.orderId,
    orderNumber: row.orderNumber ?? row.orderId,
    payment: lanes.payment,
    refund: lanes.refund,
    return: lanes.return,
    subtotalCentavos: safeCentavos(Number(row.subtotalCentavos)),
    totalCentavos: safeCentavos(Number(row.totalCentavos)),
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    updatedAt: row.updatedAt,
  };
}

export class DrizzleOrderRepository {
  constructor(private readonly db: AppDb) {}

  async listCustomerOrders(
    input: ListCustomerOrdersInput
  ): Promise<CustomerOrderListResult> {
    const page = normalizePositiveInteger(input.page, 1);
    const pageSize = normalizePageSize(input.pageSize);
    const offset = (page - 1) * pageSize;
    const countRows = await this.db
      .select({
        count: sql<number>`cast(count(${orders.id}) as integer)`,
      })
      .from(orders)
      .where(eq(orders.customer_id, input.customerId));
    const totalItems = Number(countRows[0]?.count ?? 0);
    const orderRows = await this.db
      .select({
        createdAt: orders.created_at,
        currency: orders.currency,
        fulfillmentStatus: orders.fulfillment_status,
        orderId: orders.id,
        orderNumber: orders.order_number,
        paymentStatus: orders.payment_status,
        subtotalCentavos: orders.subtotal_centavos,
        totalCentavos: orders.total_centavos,
        updatedAt: orders.updated_at,
      })
      .from(orders)
      .where(eq(orders.customer_id, input.customerId))
      .orderBy(desc(orders.created_at), desc(orders.id))
      .limit(pageSize)
      .offset(offset);
    const snapshotsByOrderId = await this.snapshotsByOrderId(
      orderRows.map((row) => row.orderId)
    );

    return {
      items: orderRows.map((row) =>
        buildOrderReadModel(row, snapshotsByOrderId.get(row.orderId) ?? [])
      ),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0,
      },
    };
  }

  async getCustomerOrderDetail(
    input: GetCustomerOrderDetailInput
  ): Promise<CustomerOrderDetailReadModel | null> {
    const rows = await this.db
      .select({
        createdAt: orders.created_at,
        currency: orders.currency,
        fulfillmentStatus: orders.fulfillment_status,
        orderId: orders.id,
        orderNumber: orders.order_number,
        paymentStatus: orders.payment_status,
        subtotalCentavos: orders.subtotal_centavos,
        totalCentavos: orders.total_centavos,
        updatedAt: orders.updated_at,
      })
      .from(orders)
      .where(
        and(
          eq(orders.customer_id, input.customerId),
          or(
            eq(orders.id, input.orderIdOrNumber),
            eq(orders.order_number, input.orderIdOrNumber)
          )
        )
      )
      .limit(1);
    const row = rows[0];

    if (!row) {
      return null;
    }

    const items = await this.orderSnapshotItems(row.orderId);

    return {
      ...buildOrderReadModel(row, items),
      items,
    };
  }

  private async snapshotsByOrderId(
    orderIds: string[]
  ): Promise<Map<string, CustomerOrderSnapshotItem[]>> {
    const snapshots = new Map<string, CustomerOrderSnapshotItem[]>();

    if (orderIds.length === 0) {
      return snapshots;
    }

    const rows = await this.db
      .select({
        imageR2Key: order_snapshots.image_r2_key,
        orderId: order_snapshots.order_id,
        priceCentavos: order_snapshots.price_centavos,
        productName: order_snapshots.product_name,
        productSlug: order_snapshots.product_slug,
        quantity: order_snapshots.quantity,
        variantName: order_snapshots.variant_name,
        variantOptions: order_snapshots.variant_options,
      })
      .from(order_snapshots)
      .where(inArray(order_snapshots.order_id, orderIds))
      .orderBy(
        asc(order_snapshots.snapshot_timestamp),
        asc(order_snapshots.id)
      );

    for (const row of rows) {
      const items = snapshots.get(row.orderId) ?? [];
      items.push(toSnapshotItem(row));
      snapshots.set(row.orderId, items);
    }

    return snapshots;
  }

  private async orderSnapshotItems(
    orderId: string
  ): Promise<CustomerOrderSnapshotItem[]> {
    return (await this.snapshotsByOrderId([orderId])).get(orderId) ?? [];
  }
}
