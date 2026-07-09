import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
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
  items: CustomerOrderSnapshotItem[];
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

export type AdminOrderCustomerKind = "CUSTOMER" | "GUEST";

export type AdminOrderReadModel = CustomerOrderReadModel & {
  checkoutEmailMasked: string | null;
  customerKind: AdminOrderCustomerKind;
  customerLabel: string;
};

export type AdminOrderDetailReadModel = AdminOrderReadModel & {
  contact: {
    checkoutEmail: string | null;
    fullName: string | null;
    phone: string | null;
  };
  items: CustomerOrderSnapshotItem[];
  shippingAddress: {
    barangay: string | null;
    cityProvince: string | null;
    postalCode: string | null;
    shippingType: string;
    streetAddress: string | null;
  };
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

export type AdminOrderListResult = {
  items: AdminOrderReadModel[];
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

export type ListAdminOrdersInput = {
  createdFrom?: string;
  createdTo?: string;
  fulfillmentStatus?: string;
  page?: number;
  pageSize?: number;
  paymentStatus?: string;
  search?: string;
};

export type GetAdminOrderDetailInput = {
  orderIdOrNumber: string;
};

const DEFAULT_PAGE_SIZE = 20;
const CUSTOMER_MAX_PAGE_SIZE = 50;
const ADMIN_MAX_PAGE_SIZE = 100;

function normalizePositiveInteger(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function normalizePageSize(value: number | undefined, maxPageSize: number) {
  return Math.min(
    normalizePositiveInteger(value, DEFAULT_PAGE_SIZE),
    maxPageSize
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

function inclusiveCreatedTo(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value;
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

function maskEmail(value: unknown): string | null {
  const email = safeString(value);
  if (!email || !email.includes("@")) {
    return null;
  }

  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return null;
  }

  return `${localPart.slice(0, 1)}***@${domain}`;
}

function customerLabel(row: {
  customerId: string | null;
  fullName: string | null;
}): string {
  const fullName = safeString(row.fullName);
  if (!fullName) {
    return row.customerId ? "Customer" : "Guest checkout";
  }

  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0] ?? "Customer";
  }

  const first = parts[0] ?? "Customer";
  const lastInitial = parts.at(-1)?.slice(0, 1).toUpperCase();

  return lastInitial ? `${first} ${lastInitial}.` : first;
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
    items,
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

function buildAdminOrderReadModel(
  row: {
    checkoutEmail: string | null;
    createdAt: string;
    currency: string;
    customerId: string | null;
    fulfillmentStatus: string;
    fullName: string | null;
    orderId: string;
    orderNumber: string | null;
    paymentStatus: string;
    subtotalCentavos: number;
    totalCentavos: number;
    updatedAt: string;
  },
  items: CustomerOrderSnapshotItem[] = []
): AdminOrderReadModel {
  return {
    ...buildOrderReadModel(row, items),
    checkoutEmailMasked: maskEmail(row.checkoutEmail),
    customerKind: row.customerId ? "CUSTOMER" : "GUEST",
    customerLabel: customerLabel(row),
  };
}

function adminOrderFilters(input: ListAdminOrdersInput): SQL | undefined {
  const filters: SQL[] = [];
  const search = safeString(input.search);
  const paymentStatus = safeString(input.paymentStatus)?.toUpperCase();
  const fulfillmentStatus = safeString(input.fulfillmentStatus)?.toUpperCase();
  const createdFrom = safeString(input.createdFrom);
  const createdTo = safeString(input.createdTo);

  if (search) {
    const pattern = `%${search}%`;
    const searchFilter = or(
      like(orders.id, pattern),
      like(orders.order_number, pattern),
      like(orders.checkout_email, pattern),
      like(orders.full_name, pattern)
    );
    if (searchFilter) {
      filters.push(searchFilter);
    }
  }

  if (paymentStatus) {
    filters.push(eq(orders.payment_status, paymentStatus));
  }

  if (fulfillmentStatus) {
    filters.push(eq(orders.fulfillment_status, fulfillmentStatus));
  }

  if (createdFrom) {
    filters.push(gte(orders.created_at, createdFrom));
  }

  if (createdTo) {
    filters.push(lte(orders.created_at, inclusiveCreatedTo(createdTo)));
  }

  return filters.length > 0 ? and(...filters) : undefined;
}

export class DrizzleOrderRepository {
  constructor(private readonly db: AppDb) {}

  async listCustomerOrders(
    input: ListCustomerOrdersInput
  ): Promise<CustomerOrderListResult> {
    const page = normalizePositiveInteger(input.page, 1);
    const pageSize = normalizePageSize(input.pageSize, CUSTOMER_MAX_PAGE_SIZE);
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

  async listAdminOrders(
    input: ListAdminOrdersInput = {}
  ): Promise<AdminOrderListResult> {
    const page = normalizePositiveInteger(input.page, 1);
    const pageSize = normalizePageSize(input.pageSize, ADMIN_MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;
    const whereClause = adminOrderFilters(input);
    const countRows = await this.db
      .select({
        count: sql<number>`cast(count(${orders.id}) as integer)`,
      })
      .from(orders)
      .where(whereClause);
    const totalItems = Number(countRows[0]?.count ?? 0);
    const orderRows = await this.db
      .select({
        checkoutEmail: orders.checkout_email,
        createdAt: orders.created_at,
        currency: orders.currency,
        customerId: orders.customer_id,
        fulfillmentStatus: orders.fulfillment_status,
        fullName: orders.full_name,
        orderId: orders.id,
        orderNumber: orders.order_number,
        paymentStatus: orders.payment_status,
        subtotalCentavos: orders.subtotal_centavos,
        totalCentavos: orders.total_centavos,
        updatedAt: orders.updated_at,
      })
      .from(orders)
      .where(whereClause)
      .orderBy(desc(orders.created_at), desc(orders.id))
      .limit(pageSize)
      .offset(offset);
    const snapshotsByOrderId = await this.snapshotsByOrderId(
      orderRows.map((row) => row.orderId)
    );

    return {
      items: orderRows.map((row) =>
        buildAdminOrderReadModel(row, snapshotsByOrderId.get(row.orderId) ?? [])
      ),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0,
      },
    };
  }

  async getAdminOrderDetail(
    input: GetAdminOrderDetailInput
  ): Promise<AdminOrderDetailReadModel | null> {
    const rows = await this.db
      .select({
        barangay: orders.barangay,
        checkoutEmail: orders.checkout_email,
        cityProvince: orders.city_province,
        createdAt: orders.created_at,
        currency: orders.currency,
        customerId: orders.customer_id,
        fulfillmentStatus: orders.fulfillment_status,
        fullName: orders.full_name,
        orderId: orders.id,
        orderNumber: orders.order_number,
        paymentStatus: orders.payment_status,
        phone: orders.phone,
        postalCode: orders.postal_code,
        shippingType: orders.shipping_type,
        streetAddress: orders.street_address,
        subtotalCentavos: orders.subtotal_centavos,
        totalCentavos: orders.total_centavos,
        updatedAt: orders.updated_at,
      })
      .from(orders)
      .where(
        or(
          eq(orders.id, input.orderIdOrNumber),
          eq(orders.order_number, input.orderIdOrNumber)
        )
      )
      .limit(1);
    const row = rows[0];

    if (!row) {
      return null;
    }

    const items = await this.orderSnapshotItems(row.orderId);

    return {
      ...buildAdminOrderReadModel(row, items),
      contact: {
        checkoutEmail: safeString(row.checkoutEmail),
        fullName: safeString(row.fullName),
        phone: safeString(row.phone),
      },
      items,
      shippingAddress: {
        barangay: safeString(row.barangay),
        cityProvince: safeString(row.cityProvince),
        postalCode: safeString(row.postalCode),
        shippingType: safeString(row.shippingType) ?? "STANDARD",
        streetAddress: safeString(row.streetAddress),
      },
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
