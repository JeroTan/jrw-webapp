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
import { createId } from "@paralleldrive/cuid2";
import type { AppDb } from "@/adapter/infrastructure/db/client";
import {
  type FulfillmentStatus,
  fulfillmentStatusLabel,
} from "@/domain/orders/fulfillment-transitions";
import {
  type ReturnStatus,
  returnStatusLabel,
} from "@/domain/orders/return-transitions";
import {
  buildCustomerOrderStatusLanes,
  type CustomerOrderStatusLane,
} from "@/domain/orders/customer-order-status";
import type {
  FulfillmentStatusEmailInput,
  FulfillmentStatusEmailItem,
} from "@/domain/notifications/fulfillment-status-email";
import {
  order_fulfillment_events,
  order_return_records,
  order_snapshots,
  orders,
} from "@/domain/schema/transactions";

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

export type AdminOrderSnapshotItem = CustomerOrderSnapshotItem & {
  snapshotId: string;
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
  items: AdminOrderSnapshotItem[];
  returnHistory: AdminReturnRecordReadModel[];
  shippingAddress: {
    barangay: string | null;
    cityProvince: string | null;
    postalCode: string | null;
    shippingType: string;
    streetAddress: string | null;
  };
};

export type AdminReturnTargetType = "ITEM" | "ORDER";

export type AdminReturnRecordReadModel = {
  actorId: string | null;
  amountCentavos: number | null;
  createdAt: string;
  currency: "PHP";
  id: string;
  notes: string | null;
  orderId: string;
  orderSnapshotId: string | null;
  previousStatus: ReturnStatus | null;
  reason: string;
  referenceId: string | null;
  requestId: string;
  status: ReturnStatus;
  statusLabel: string;
  targetLabel: string;
  targetType: AdminReturnTargetType;
  updatedAt: string;
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

export type FulfillmentEmailStatus = "FAILED" | "PENDING" | "SENT" | "SENDING";

export type AdminFulfillmentTransitionSubject = {
  checkoutEmail: string | null;
  currency: "PHP";
  fulfillmentStatus: string;
  items: CustomerOrderSnapshotItem[];
  orderId: string;
  orderNumber: string;
  paymentStatus: string;
  totalCentavos: number;
  updatedAt: string;
};

export type AdminReturnTransitionSubject = {
  currency: "PHP";
  currentReturnStatus: ReturnStatus | null;
  currentReturnUpdatedAt: string | null;
  fulfillmentStatus: string;
  items: AdminOrderSnapshotItem[];
  orderId: string;
  orderNumber: string;
  paymentStatus: string;
  returnHistory?: AdminReturnRecordReadModel[];
  totalCentavos: number;
  updatedAt: string;
};

export type OrderFulfillmentEventRecord = {
  actorId: string | null;
  createdAt: string;
  emailLastAttemptAt: string | null;
  emailMessageId: string | null;
  emailSentAt: string | null;
  emailStatus: FulfillmentEmailStatus;
  eventId: string;
  newFulfillmentStatus: FulfillmentStatus;
  oldFulfillmentStatus: FulfillmentStatus;
  orderId: string;
  requestId: string;
  updatedAt: string;
};

export type TransitionAdminOrderFulfillmentInput = {
  actorId: string;
  expectedFulfillmentStatus: FulfillmentStatus;
  now?: string;
  orderId: string;
  requestId: string;
  targetStatus: FulfillmentStatus;
};

export type TransitionAdminOrderFulfillmentResult =
  | {
      decision: "transitioned" | "already-requested";
      event: OrderFulfillmentEventRecord;
      order: AdminOrderDetailReadModel;
    }
  | {
      currentFulfillmentStatus: string;
      decision: "stale";
      orderId: string;
    }
  | { decision: "missing-order" };

export type RecordAdminOrderReturnInput = {
  actorId: string;
  amountCentavos: number | null;
  expectedReturnStatus: ReturnStatus | null;
  notes: string | null;
  now?: string;
  orderId: string;
  orderSnapshotId: string | null;
  reason: string;
  referenceId: string | null;
  requestId: string;
  targetStatus: ReturnStatus;
  targetType: AdminReturnTargetType;
};

export type RecordAdminOrderReturnResult =
  | {
      decision: "already-requested" | "recorded";
      order: AdminOrderDetailReadModel;
      returnRecord: AdminReturnRecordReadModel;
    }
  | {
      currentReturnStatus: ReturnStatus | null;
      decision: "stale";
      orderId: string;
      reason?: "REQUEST_ID_MISMATCH" | "STALE_RETURN_STATUS";
    }
  | {
      decision: "invalid-target";
      orderId: string;
    }
  | { decision: "missing-order" };

export type FulfillmentStatusEmailRecord = Omit<
  FulfillmentStatusEmailInput,
  "requestId"
>;

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
const EMAIL_SEND_CLAIM_TIMEOUT_MS = 15 * 60 * 1000;

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

function safeEmailStatus(value: string): FulfillmentEmailStatus {
  switch (value) {
    case "FAILED":
    case "PENDING":
    case "SENT":
    case "SENDING":
      return value;
    default:
      return "PENDING";
  }
}

function fulfillmentStatusPath(orderIdOrNumber: string): string {
  return `/account/orders/${encodeURIComponent(orderIdOrNumber)}`;
}

function staleEmailClaimCutoff(now: string): string | null {
  const parsed = Date.parse(now);

  return Number.isFinite(parsed)
    ? new Date(parsed - EMAIL_SEND_CLAIM_TIMEOUT_MS).toISOString()
    : null;
}

function errorSearchText(error: unknown): string {
  if (!(error instanceof Error)) {
    return "";
  }

  const causeText = "cause" in error ? ` ${errorSearchText(error.cause)}` : "";

  return `${error.message}${causeText}`;
}

function isD1ExplicitTransactionUnsupported(error: unknown): boolean {
  return /Failed query:\s*begin|SQL BEGIN|SAVEPOINT|state\.storage\.transaction/i.test(
    errorSearchText(error)
  );
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

function toAdminSnapshotItem(
  row: {
    snapshotId: string;
  } & Parameters<typeof toSnapshotItem>[0]
): AdminOrderSnapshotItem {
  return {
    ...toSnapshotItem(row),
    snapshotId: row.snapshotId,
  };
}

function returnTargetLabel(row: {
  productName: string | null;
  targetType: string;
  variantName: string | null;
}): string {
  if (row.targetType === "ORDER") {
    return "Entire order";
  }

  const productName = safeString(row.productName);
  const variantName = safeString(row.variantName);

  return productName
    ? variantName
      ? `${productName} - ${variantName}`
      : productName
    : "Purchased item";
}

function toAdminReturnRecord(row: {
  actorId: string | null;
  amountCentavos: number | null;
  createdAt: string;
  currency: string;
  id: string;
  notes: string | null;
  orderId: string;
  orderSnapshotId: string | null;
  previousStatus: string | null;
  productName: string | null;
  reason: string;
  referenceId: string | null;
  requestId: string;
  status: string;
  targetType: string;
  updatedAt: string;
  variantName: string | null;
}): AdminReturnRecordReadModel {
  const status = row.status as ReturnStatus;

  return {
    actorId: row.actorId,
    amountCentavos:
      typeof row.amountCentavos === "number"
        ? safeCentavos(row.amountCentavos)
        : null,
    createdAt: row.createdAt,
    currency: "PHP",
    id: row.id,
    notes: safeString(row.notes),
    orderId: row.orderId,
    orderSnapshotId: row.orderSnapshotId,
    previousStatus: row.previousStatus as ReturnStatus | null,
    reason: row.reason,
    referenceId: safeString(row.referenceId),
    requestId: row.requestId,
    status,
    statusLabel: returnStatusLabel(status),
    targetLabel: returnTargetLabel(row),
    targetType: row.targetType === "ITEM" ? "ITEM" : "ORDER",
    updatedAt: row.updatedAt,
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
    returnStatus?: string | null;
    returnUpdatedAt?: string | null;
    subtotalCentavos: number;
    totalCentavos: number;
    updatedAt: string;
  },
  items: CustomerOrderSnapshotItem[] = []
): CustomerOrderReadModel {
  const lanes = buildCustomerOrderStatusLanes({
    fulfillmentStatus: row.fulfillmentStatus,
    paymentStatus: row.paymentStatus,
    returnStatus: row.returnStatus,
    returnUpdatedAt: row.returnUpdatedAt,
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
    returnStatus?: string | null;
    returnUpdatedAt?: string | null;
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

function toFulfillmentEventRecord(row: {
  actorId: string | null;
  createdAt: string;
  emailLastAttemptAt: string | null;
  emailMessageId: string | null;
  emailSentAt: string | null;
  emailStatus: string;
  eventId: string;
  newFulfillmentStatus: string;
  oldFulfillmentStatus: string;
  orderId: string;
  requestId: string;
  updatedAt: string;
}): OrderFulfillmentEventRecord {
  return {
    actorId: row.actorId,
    createdAt: row.createdAt,
    emailLastAttemptAt: row.emailLastAttemptAt,
    emailMessageId: row.emailMessageId,
    emailSentAt: row.emailSentAt,
    emailStatus: safeEmailStatus(row.emailStatus),
    eventId: row.eventId,
    newFulfillmentStatus: row.newFulfillmentStatus as FulfillmentStatus,
    oldFulfillmentStatus: row.oldFulfillmentStatus as FulfillmentStatus,
    orderId: row.orderId,
    requestId: row.requestId,
    updatedAt: row.updatedAt,
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
    const latestReturnByOrderId = await this.latestReturnByOrderId(
      orderRows.map((row) => row.orderId)
    );

    return {
      items: orderRows.map((row) => {
        const latestReturn = latestReturnByOrderId.get(row.orderId);

        return buildOrderReadModel(
          {
            ...row,
            returnStatus: latestReturn?.status,
            returnUpdatedAt: latestReturn?.createdAt,
          },
          snapshotsByOrderId.get(row.orderId) ?? []
        );
      }),
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
    const latestReturn = (
      await this.latestReturnByOrderId([row.orderId])
    ).get(row.orderId);

    return {
      ...buildOrderReadModel(
        {
          ...row,
          returnStatus: latestReturn?.status,
          returnUpdatedAt: latestReturn?.createdAt,
        },
        items
      ),
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
    const latestReturnByOrderId = await this.latestReturnByOrderId(
      orderRows.map((row) => row.orderId)
    );

    return {
      items: orderRows.map((row) => {
        const latestReturn = latestReturnByOrderId.get(row.orderId);

        return buildAdminOrderReadModel(
          {
            ...row,
            returnStatus: latestReturn?.status,
            returnUpdatedAt: latestReturn?.createdAt,
          },
          snapshotsByOrderId.get(row.orderId) ?? []
        );
      }),
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

    const items = await this.adminOrderSnapshotItems(row.orderId);
    const returnHistory = await this.orderReturnHistory(row.orderId);
    const latestReturn = returnHistory[0];

    return {
      ...buildAdminOrderReadModel(
        {
          ...row,
          returnStatus: latestReturn?.status,
          returnUpdatedAt: latestReturn?.createdAt,
        },
        items
      ),
      contact: {
        checkoutEmail: safeString(row.checkoutEmail),
        fullName: safeString(row.fullName),
        phone: safeString(row.phone),
      },
      items,
      returnHistory,
      shippingAddress: {
        barangay: safeString(row.barangay),
        cityProvince: safeString(row.cityProvince),
        postalCode: safeString(row.postalCode),
        shippingType: safeString(row.shippingType) ?? "STANDARD",
        streetAddress: safeString(row.streetAddress),
      },
    };
  }

  async getAdminFulfillmentTransitionSubject(input: {
    orderIdOrNumber: string;
  }): Promise<AdminFulfillmentTransitionSubject | null> {
    const rows = await this.db
      .select({
        checkoutEmail: orders.checkout_email,
        currency: orders.currency,
        fulfillmentStatus: orders.fulfillment_status,
        orderId: orders.id,
        orderNumber: orders.order_number,
        paymentStatus: orders.payment_status,
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

    return {
      checkoutEmail: safeString(row.checkoutEmail),
      currency: "PHP",
      fulfillmentStatus: row.fulfillmentStatus,
      items: await this.orderSnapshotItems(row.orderId),
      orderId: row.orderId,
      orderNumber: row.orderNumber ?? row.orderId,
      paymentStatus: row.paymentStatus,
      totalCentavos: safeCentavos(Number(row.totalCentavos)),
      updatedAt: row.updatedAt,
    };
  }

  async getAdminReturnTransitionSubject(input: {
    orderIdOrNumber: string;
  }): Promise<AdminReturnTransitionSubject | null> {
    const rows = await this.db
      .select({
        currency: orders.currency,
        fulfillmentStatus: orders.fulfillment_status,
        orderId: orders.id,
        orderNumber: orders.order_number,
        paymentStatus: orders.payment_status,
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

    const latestReturn = await this.latestReturnForOrder(this.db, row.orderId);
    const returnHistory = await this.orderReturnHistory(row.orderId);

    return {
      currency: "PHP",
      currentReturnStatus: latestReturn?.status ?? null,
      currentReturnUpdatedAt: latestReturn?.createdAt ?? null,
      fulfillmentStatus: row.fulfillmentStatus,
      items: await this.adminOrderSnapshotItems(row.orderId),
      orderId: row.orderId,
      orderNumber: row.orderNumber ?? row.orderId,
      paymentStatus: row.paymentStatus,
      returnHistory,
      totalCentavos: safeCentavos(Number(row.totalCentavos)),
      updatedAt: row.updatedAt,
    };
  }

  async recordAdminOrderReturn(
    input: RecordAdminOrderReturnInput
  ): Promise<RecordAdminOrderReturnResult> {
    const now = input.now ?? new Date().toISOString();
    const applyRecord = async (db: AppDb) => {
      const existingRows = await db
        .select({
          actorId: order_return_records.actor_id,
          amountCentavos: order_return_records.amount_centavos,
          createdAt: order_return_records.created_at,
          currency: order_return_records.currency,
          id: order_return_records.id,
          notes: order_return_records.notes,
          orderId: order_return_records.order_id,
          orderSnapshotId: order_return_records.order_snapshot_id,
          previousStatus: order_return_records.previous_return_status,
          productName: order_snapshots.product_name,
          reason: order_return_records.reason,
          referenceId: order_return_records.reference_id,
          requestId: order_return_records.request_id,
          status: order_return_records.return_status,
          targetType: order_return_records.target_type,
          updatedAt: order_return_records.updated_at,
          variantName: order_snapshots.variant_name,
        })
        .from(order_return_records)
        .leftJoin(
          order_snapshots,
          eq(order_snapshots.id, order_return_records.order_snapshot_id)
        )
        .where(eq(order_return_records.request_id, input.requestId))
        .limit(1);
      const existing = existingRows[0];

      if (existing) {
        const exactMatch =
          existing.orderId === input.orderId &&
          (existing.actorId ?? null) === input.actorId &&
          existing.targetType === input.targetType &&
          (existing.orderSnapshotId ?? null) === input.orderSnapshotId &&
          (existing.previousStatus ?? null) === input.expectedReturnStatus &&
          existing.status === input.targetStatus &&
          (existing.amountCentavos ?? null) === input.amountCentavos &&
          existing.reason === input.reason &&
          (existing.notes ?? null) === input.notes &&
          (existing.referenceId ?? null) === input.referenceId;

        if (!exactMatch) {
          const latest = await this.latestReturnForTarget(db, input);

          return {
            currentReturnStatus: latest?.status ?? null,
            decision: "stale" as const,
            orderId: input.orderId,
            reason: "REQUEST_ID_MISMATCH" as const,
          };
        }

        return {
          decision: "already-requested" as const,
          returnRecord: toAdminReturnRecord(existing),
        };
      }

      const orderRows = await db
        .select({
          id: orders.id,
        })
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!orderRows[0]) {
        return { decision: "missing-order" as const };
      }

      if (input.targetType === "ORDER" && input.orderSnapshotId) {
        return { decision: "invalid-target" as const, orderId: input.orderId };
      }

      if (input.targetType === "ITEM") {
        if (!input.orderSnapshotId) {
          return {
            decision: "invalid-target" as const,
            orderId: input.orderId,
          };
        }

        const snapshotRows = await db
          .select({ id: order_snapshots.id })
          .from(order_snapshots)
          .where(
            and(
              eq(order_snapshots.id, input.orderSnapshotId),
              eq(order_snapshots.order_id, input.orderId)
            )
          )
          .limit(1);

        if (!snapshotRows[0]) {
          return {
            decision: "invalid-target" as const,
            orderId: input.orderId,
          };
        }
      }

      const latest = await this.latestReturnForTarget(db, input);

      if ((latest?.status ?? null) !== input.expectedReturnStatus) {
        return {
          currentReturnStatus: latest?.status ?? null,
          decision: "stale" as const,
          orderId: input.orderId,
          reason: "STALE_RETURN_STATUS" as const,
        };
      }

      const recordId = createId();

      await db.insert(order_return_records).values({
        actor_id: input.actorId,
        amount_centavos: input.amountCentavos,
        created_at: now,
        currency: "PHP",
        id: recordId,
        notes: input.notes,
        order_id: input.orderId,
        order_snapshot_id: input.orderSnapshotId,
        previous_return_status: input.expectedReturnStatus,
        reason: input.reason,
        reference_id: input.referenceId,
        request_id: input.requestId,
        return_status: input.targetStatus,
        target_type: input.targetType,
        updated_at: now,
      });

      const returnRecord = await this.returnRecordById(db, recordId);

      if (!returnRecord) {
        return { decision: "missing-order" as const };
      }

      return {
        decision: "recorded" as const,
        returnRecord,
      };
    };

    let result: Awaited<ReturnType<typeof applyRecord>>;

    try {
      result = await this.db.transaction((tx) =>
        applyRecord(tx as unknown as AppDb)
      );
    } catch (error) {
      if (!isD1ExplicitTransactionUnsupported(error)) {
        throw error;
      }

      result = await applyRecord(this.db);
    }

    if (
      result.decision === "missing-order" ||
      result.decision === "stale" ||
      result.decision === "invalid-target"
    ) {
      return result;
    }

    const order = await this.getAdminOrderDetail({
      orderIdOrNumber: result.returnRecord.orderId,
    });

    if (!order) {
      return { decision: "missing-order" };
    }

    return {
      decision: result.decision,
      order,
      returnRecord: result.returnRecord,
    };
  }

  async transitionAdminOrderFulfillment(
    input: TransitionAdminOrderFulfillmentInput
  ): Promise<TransitionAdminOrderFulfillmentResult> {
    const now = input.now ?? new Date().toISOString();
    const applyTransition = async (db: AppDb) => {
      const existingRows = await db
        .select({
          actorId: order_fulfillment_events.actor_id,
          createdAt: order_fulfillment_events.created_at,
          emailLastAttemptAt: order_fulfillment_events.email_last_attempt_at,
          emailMessageId: order_fulfillment_events.email_message_id,
          emailSentAt: order_fulfillment_events.email_sent_at,
          emailStatus: order_fulfillment_events.email_status,
          eventId: order_fulfillment_events.id,
          newFulfillmentStatus: order_fulfillment_events.new_fulfillment_status,
          oldFulfillmentStatus: order_fulfillment_events.old_fulfillment_status,
          orderId: order_fulfillment_events.order_id,
          requestId: order_fulfillment_events.request_id,
          updatedAt: order_fulfillment_events.updated_at,
        })
        .from(order_fulfillment_events)
        .where(eq(order_fulfillment_events.request_id, input.requestId))
        .limit(1);
      const existing = existingRows[0];

      if (existing) {
        if (
          existing.orderId !== input.orderId ||
          existing.oldFulfillmentStatus !== input.expectedFulfillmentStatus ||
          existing.newFulfillmentStatus !== input.targetStatus
        ) {
          const latestRows = await db
            .select({
              fulfillmentStatus: orders.fulfillment_status,
              id: orders.id,
            })
            .from(orders)
            .where(eq(orders.id, input.orderId))
            .limit(1);
          const latest = latestRows[0];

          if (!latest) {
            return { decision: "missing-order" as const };
          }

          return {
            currentFulfillmentStatus: latest.fulfillmentStatus,
            decision: "stale" as const,
            orderId: latest.id,
          };
        }

        return {
          decision: "already-requested" as const,
          event: toFulfillmentEventRecord(existing),
        };
      }

      const updatedRows = await db
        .update(orders)
        .set({
          fulfillment_status: input.targetStatus,
          updated_at: now,
          updated_request_id: input.requestId,
        })
        .where(
          and(
            eq(orders.id, input.orderId),
            eq(orders.payment_status, "PAYMENT_PAID"),
            eq(orders.fulfillment_status, input.expectedFulfillmentStatus)
          )
        )
        .returning({
          fulfillmentStatus: orders.fulfillment_status,
          id: orders.id,
        });

      if (!updatedRows[0]) {
        const latestRows = await db
          .select({
            fulfillmentStatus: orders.fulfillment_status,
            id: orders.id,
          })
          .from(orders)
          .where(eq(orders.id, input.orderId))
          .limit(1);
        const latest = latestRows[0];

        if (!latest) {
          return { decision: "missing-order" as const };
        }

        return {
          currentFulfillmentStatus: latest.fulfillmentStatus,
          decision: "stale" as const,
          orderId: latest.id,
        };
      }

      const eventRows = await db
        .insert(order_fulfillment_events)
        .values({
          actor_id: input.actorId,
          created_at: now,
          email_status: "PENDING",
          id: createId(),
          new_fulfillment_status: input.targetStatus,
          old_fulfillment_status: input.expectedFulfillmentStatus,
          order_id: input.orderId,
          request_id: input.requestId,
          updated_at: now,
        })
        .returning({
          actorId: order_fulfillment_events.actor_id,
          createdAt: order_fulfillment_events.created_at,
          emailLastAttemptAt: order_fulfillment_events.email_last_attempt_at,
          emailMessageId: order_fulfillment_events.email_message_id,
          emailSentAt: order_fulfillment_events.email_sent_at,
          emailStatus: order_fulfillment_events.email_status,
          eventId: order_fulfillment_events.id,
          newFulfillmentStatus: order_fulfillment_events.new_fulfillment_status,
          oldFulfillmentStatus: order_fulfillment_events.old_fulfillment_status,
          orderId: order_fulfillment_events.order_id,
          requestId: order_fulfillment_events.request_id,
          updatedAt: order_fulfillment_events.updated_at,
        });

      return {
        decision: "transitioned" as const,
        event: toFulfillmentEventRecord(eventRows[0]),
      };
    };

    let transition: Awaited<ReturnType<typeof applyTransition>>;

    try {
      transition = await this.db.transaction((tx) =>
        applyTransition(tx as unknown as AppDb)
      );
    } catch (error) {
      if (!isD1ExplicitTransactionUnsupported(error)) {
        throw error;
      }

      transition = await applyTransition(this.db);
    }

    if (
      transition.decision === "missing-order" ||
      transition.decision === "stale"
    ) {
      return transition;
    }

    const order = await this.getAdminOrderDetail({
      orderIdOrNumber: transition.event.orderId,
    });

    if (!order) {
      return { decision: "missing-order" };
    }

    return {
      decision: transition.decision,
      event: transition.event,
      order,
    };
  }

  async findFulfillmentEventByRequestId(
    requestId: string
  ): Promise<OrderFulfillmentEventRecord | null> {
    const rows = await this.db
      .select({
        actorId: order_fulfillment_events.actor_id,
        createdAt: order_fulfillment_events.created_at,
        emailLastAttemptAt: order_fulfillment_events.email_last_attempt_at,
        emailMessageId: order_fulfillment_events.email_message_id,
        emailSentAt: order_fulfillment_events.email_sent_at,
        emailStatus: order_fulfillment_events.email_status,
        eventId: order_fulfillment_events.id,
        newFulfillmentStatus: order_fulfillment_events.new_fulfillment_status,
        oldFulfillmentStatus: order_fulfillment_events.old_fulfillment_status,
        orderId: order_fulfillment_events.order_id,
        requestId: order_fulfillment_events.request_id,
        updatedAt: order_fulfillment_events.updated_at,
      })
      .from(order_fulfillment_events)
      .where(eq(order_fulfillment_events.request_id, requestId))
      .limit(1);
    const row = rows[0];

    return row ? toFulfillmentEventRecord(row) : null;
  }

  async claimFulfillmentStatusEmail(input: {
    eventId: string;
    now?: string;
    requestId: string;
  }): Promise<boolean> {
    const now = input.now ?? new Date().toISOString();
    const staleSendingBefore = staleEmailClaimCutoff(now);
    const rows = await this.db
      .update(order_fulfillment_events)
      .set({
        email_last_attempt_at: now,
        email_status: "SENDING",
        updated_at: now,
      })
      .where(
        and(
          eq(order_fulfillment_events.id, input.eventId),
          staleSendingBefore
            ? sql`(${order_fulfillment_events.email_status} IN ('PENDING', 'FAILED') OR (${order_fulfillment_events.email_status} = 'SENDING' AND (${order_fulfillment_events.email_last_attempt_at} IS NULL OR ${order_fulfillment_events.email_last_attempt_at} <= ${staleSendingBefore})))`
            : sql`${order_fulfillment_events.email_status} IN ('PENDING', 'FAILED')`
        )
      )
      .returning({ id: order_fulfillment_events.id });

    void input.requestId;

    return rows.length === 1;
  }

  async markFulfillmentStatusEmailSent(input: {
    eventId: string;
    messageId?: string;
    now?: string;
    requestId: string;
  }): Promise<void> {
    const now = input.now ?? new Date().toISOString();

    await this.db
      .update(order_fulfillment_events)
      .set({
        email_last_attempt_at: now,
        email_message_id: input.messageId ?? null,
        email_sent_at: now,
        email_status: "SENT",
        updated_at: now,
      })
      .where(eq(order_fulfillment_events.id, input.eventId));
    void input.requestId;
  }

  async markFulfillmentStatusEmailFailed(input: {
    eventId: string;
    now?: string;
    requestId: string;
  }): Promise<void> {
    const now = input.now ?? new Date().toISOString();

    await this.db
      .update(order_fulfillment_events)
      .set({
        email_last_attempt_at: now,
        email_status: "FAILED",
        updated_at: now,
      })
      .where(eq(order_fulfillment_events.id, input.eventId));
    void input.requestId;
  }

  async getFulfillmentStatusEmail(
    eventId: string
  ): Promise<FulfillmentStatusEmailRecord | null> {
    const rows = await this.db
      .select({
        checkoutEmail: orders.checkout_email,
        currency: orders.currency,
        newFulfillmentStatus: order_fulfillment_events.new_fulfillment_status,
        orderId: orders.id,
        orderNumber: orders.order_number,
        totalCentavos: orders.total_centavos,
      })
      .from(order_fulfillment_events)
      .innerJoin(orders, eq(orders.id, order_fulfillment_events.order_id))
      .where(eq(order_fulfillment_events.id, eventId))
      .limit(1);
    const row = rows[0];

    if (!row?.checkoutEmail) {
      return null;
    }

    const items = await this.orderSnapshotItems(row.orderId);
    const emailItems: FulfillmentStatusEmailItem[] = items.map((item) => ({
      amountCentavos: item.unitPriceCentavos,
      name: `${item.productName} - ${item.variantLabel}`,
      quantity: item.quantity,
    }));
    const orderNumber = row.orderNumber ?? row.orderId;

    return {
      currency: "PHP",
      fulfillmentStatusLabel: fulfillmentStatusLabel(row.newFulfillmentStatus),
      items: emailItems,
      orderNumber,
      statusUrl: fulfillmentStatusPath(orderNumber),
      toEmail: row.checkoutEmail,
      totalCentavos: safeCentavos(Number(row.totalCentavos)),
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
        snapshotId: order_snapshots.id,
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

  private async adminOrderSnapshotItems(
    orderId: string
  ): Promise<AdminOrderSnapshotItem[]> {
    const rows = await this.db
      .select({
        imageR2Key: order_snapshots.image_r2_key,
        priceCentavos: order_snapshots.price_centavos,
        productName: order_snapshots.product_name,
        productSlug: order_snapshots.product_slug,
        quantity: order_snapshots.quantity,
        snapshotId: order_snapshots.id,
        variantName: order_snapshots.variant_name,
        variantOptions: order_snapshots.variant_options,
      })
      .from(order_snapshots)
      .where(eq(order_snapshots.order_id, orderId))
      .orderBy(
        asc(order_snapshots.snapshot_timestamp),
        asc(order_snapshots.id)
      );

    return rows.map((row) => toAdminSnapshotItem(row));
  }

  private async latestReturnByOrderId(orderIds: string[]): Promise<
    Map<
      string,
      {
        createdAt: string;
        status: ReturnStatus;
      }
    >
  > {
    const latest = new Map<
      string,
      {
        createdAt: string;
        status: ReturnStatus;
      }
    >();

    if (orderIds.length === 0) {
      return latest;
    }

    const rows = await this.db
      .select({
        createdAt: order_return_records.created_at,
        orderId: order_return_records.order_id,
        status: order_return_records.return_status,
      })
      .from(order_return_records)
      .where(inArray(order_return_records.order_id, orderIds))
      .orderBy(
        desc(order_return_records.created_at),
        desc(order_return_records.id)
      );

    for (const row of rows) {
      if (!latest.has(row.orderId)) {
        latest.set(row.orderId, {
          createdAt: row.createdAt,
          status: row.status as ReturnStatus,
        });
      }
    }

    return latest;
  }

  private async latestReturnForOrder(
    db: AppDb,
    orderId: string
  ): Promise<{ createdAt: string; status: ReturnStatus } | null> {
    const rows = await db
      .select({
        createdAt: order_return_records.created_at,
        status: order_return_records.return_status,
      })
      .from(order_return_records)
      .where(eq(order_return_records.order_id, orderId))
      .orderBy(
        desc(order_return_records.created_at),
        desc(order_return_records.id)
      )
      .limit(1);
    const row = rows[0];

    return row
      ? { createdAt: row.createdAt, status: row.status as ReturnStatus }
      : null;
  }

  private async latestReturnForTarget(
    db: AppDb,
    input: {
      orderId: string;
      orderSnapshotId: string | null;
      targetType: AdminReturnTargetType;
    }
  ): Promise<{ createdAt: string; status: ReturnStatus } | null> {
    const targetFilter =
      input.targetType === "ITEM"
        ? and(
            eq(order_return_records.target_type, "ITEM"),
            input.orderSnapshotId
              ? eq(order_return_records.order_snapshot_id, input.orderSnapshotId)
              : sql`${order_return_records.order_snapshot_id} IS NULL`
          )
        : and(
            eq(order_return_records.target_type, "ORDER"),
            sql`${order_return_records.order_snapshot_id} IS NULL`
          );

    const rows = await db
      .select({
        createdAt: order_return_records.created_at,
        status: order_return_records.return_status,
      })
      .from(order_return_records)
      .where(and(eq(order_return_records.order_id, input.orderId), targetFilter))
      .orderBy(
        desc(order_return_records.created_at),
        desc(order_return_records.id)
      )
      .limit(1);
    const row = rows[0];

    return row
      ? { createdAt: row.createdAt, status: row.status as ReturnStatus }
      : null;
  }

  private async returnRecordById(
    db: AppDb,
    recordId: string
  ): Promise<AdminReturnRecordReadModel | null> {
    const rows = await db
      .select({
        actorId: order_return_records.actor_id,
        amountCentavos: order_return_records.amount_centavos,
        createdAt: order_return_records.created_at,
        currency: order_return_records.currency,
        id: order_return_records.id,
        notes: order_return_records.notes,
        orderId: order_return_records.order_id,
        orderSnapshotId: order_return_records.order_snapshot_id,
        previousStatus: order_return_records.previous_return_status,
        productName: order_snapshots.product_name,
        reason: order_return_records.reason,
        referenceId: order_return_records.reference_id,
        requestId: order_return_records.request_id,
        status: order_return_records.return_status,
        targetType: order_return_records.target_type,
        updatedAt: order_return_records.updated_at,
        variantName: order_snapshots.variant_name,
      })
      .from(order_return_records)
      .leftJoin(
        order_snapshots,
        eq(order_snapshots.id, order_return_records.order_snapshot_id)
      )
      .where(eq(order_return_records.id, recordId))
      .limit(1);
    const row = rows[0];

    return row ? toAdminReturnRecord(row) : null;
  }

  private async orderReturnHistory(
    orderId: string
  ): Promise<AdminReturnRecordReadModel[]> {
    const rows = await this.db
      .select({
        actorId: order_return_records.actor_id,
        amountCentavos: order_return_records.amount_centavos,
        createdAt: order_return_records.created_at,
        currency: order_return_records.currency,
        id: order_return_records.id,
        notes: order_return_records.notes,
        orderId: order_return_records.order_id,
        orderSnapshotId: order_return_records.order_snapshot_id,
        previousStatus: order_return_records.previous_return_status,
        productName: order_snapshots.product_name,
        reason: order_return_records.reason,
        referenceId: order_return_records.reference_id,
        requestId: order_return_records.request_id,
        status: order_return_records.return_status,
        targetType: order_return_records.target_type,
        updatedAt: order_return_records.updated_at,
        variantName: order_snapshots.variant_name,
      })
      .from(order_return_records)
      .leftJoin(
        order_snapshots,
        eq(order_snapshots.id, order_return_records.order_snapshot_id)
      )
      .where(eq(order_return_records.order_id, orderId))
      .orderBy(
        desc(order_return_records.created_at),
        desc(order_return_records.id)
      );

    return rows.map((row) => toAdminReturnRecord(row));
  }
}
