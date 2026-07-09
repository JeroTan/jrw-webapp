import { t } from "elysia";
import { createFulfillmentStatusEmailNotifier } from "@/adapter/infrastructure/resend/FulfillmentStatusEmailNotifier";
import type { OperationalLogger } from "@/adapter/infrastructure/logging/operational-log";
import type { AuditEventPublisher } from "@/domain/audit/events";
import type { FulfillmentStatusEmailNotifier } from "@/domain/notifications/fulfillment-status-email";
import { createDb } from "@/adapter/infrastructure/db/client";
import { openApiErrorResponses, tboxApiSuccess } from "@/lib/typebox/api";
import { OrderController } from "@/server/controllers/OrderController";
import type {
  RequestActorContext,
  RequestContextDecorations,
} from "@/server/context/request-context";
import { rbacGuard } from "@/server/middleware/rbac";
import { routeDetail } from "@/server/openapi/route-metadata";
import { DrizzleOrderRepository } from "@/server/repositories/OrderRepository";
import { OrderService } from "@/server/services/OrderService";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

export type OrderControllerFactoryInput = {
  request: Request;
  requestId: string;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
};

export type OrderRoutesOptions = {
  auditPublisher?: AuditEventPublisher;
  controllerFactory?: (input: OrderControllerFactoryInput) => OrderController;
  emailNotifier?: FulfillmentStatusEmailNotifier;
  operationalLogger?: OperationalLogger;
};

const customerOrderAuth = {
  mode: "required",
  roles: ["CUSTOMER"],
} as const;

const adminOrderAuth = {
  mode: "required",
  roles: ["ADMIN"],
} as const;

const customerOrderErrors = [
  "AUTH_REQUIRED",
  "AUTH_FORBIDDEN",
  "ACCOUNT_SUSPENDED",
  "EMAIL_NOT_VERIFIED",
  "RESOURCE_NOT_FOUND",
  "VALIDATION_FAILED",
  "INTERNAL_ERROR",
] as const;

const adminOrderErrors = [
  "AUTH_REQUIRED",
  "AUTH_FORBIDDEN",
  "ACCOUNT_SUSPENDED",
  "EMAIL_NOT_VERIFIED",
  "ADMIN_APPROVAL_REQUIRED",
  "VALIDATION_FAILED",
  "RESOURCE_NOT_FOUND",
  "CONFLICT_STATE",
  "PROVIDER_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

const tboxLane = t.Object({
  kind: t.Union([
    t.Literal("payment"),
    t.Literal("fulfillment"),
    t.Literal("return"),
    t.Literal("refund"),
  ]),
  label: t.String(),
  updatedAt: t.Union([t.String(), t.Null()]),
  value: t.String(),
});

const tboxCustomerOrderItem = t.Object({
  imageR2Key: t.Union([t.String(), t.Null()]),
  lineTotalCentavos: t.Integer({ minimum: 0 }),
  productName: t.String(),
  productSlug: t.Union([t.String(), t.Null()]),
  quantity: t.Integer({ minimum: 0 }),
  unitPriceCentavos: t.Integer({ minimum: 0 }),
  variantLabel: t.String(),
  variantOptions: t.Array(
    t.Object({
      group: t.String(),
      name: t.String(),
    })
  ),
});

const tboxAdminOrderItem = t.Intersect([
  tboxCustomerOrderItem,
  t.Object({
    snapshotId: t.String(),
  }),
]);

const tboxCustomerOrderSummary = t.Object({
  createdAt: t.String(),
  currency: t.Literal("PHP"),
  fulfillment: tboxLane,
  itemCount: t.Integer({ minimum: 0 }),
  items: t.Array(tboxCustomerOrderItem),
  orderId: t.String(),
  orderNumber: t.String(),
  payment: tboxLane,
  refund: tboxLane,
  return: tboxLane,
  subtotalCentavos: t.Integer({ minimum: 0 }),
  totalCentavos: t.Integer({ minimum: 0 }),
  totalQuantity: t.Integer({ minimum: 0 }),
  updatedAt: t.String(),
});

const tboxCustomerOrderListData = t.Object({
  items: t.Array(tboxCustomerOrderSummary),
  pagination: t.Object({
    page: t.Integer({ minimum: 1 }),
    pageSize: t.Integer({ minimum: 1, maximum: 50 }),
    totalItems: t.Integer({ minimum: 0 }),
    totalPages: t.Integer({ minimum: 0 }),
  }),
});

const tboxAdminOrderSummary = t.Intersect([
  tboxCustomerOrderSummary,
  t.Object({
    checkoutEmailMasked: t.Union([t.String(), t.Null()]),
    customerKind: t.Union([t.Literal("CUSTOMER"), t.Literal("GUEST")]),
    customerLabel: t.String(),
  }),
]);

const tboxAdminOrderListData = t.Object({
  items: t.Array(tboxAdminOrderSummary),
  pagination: t.Object({
    page: t.Integer({ minimum: 1 }),
    pageSize: t.Integer({ minimum: 1, maximum: 100 }),
    totalItems: t.Integer({ minimum: 0 }),
    totalPages: t.Integer({ minimum: 0 }),
  }),
});

const tboxCustomerOrderDetailData = tboxCustomerOrderSummary;

const tboxReturnStatus = t.Union([
  t.Literal("RETURN_REQUESTED"),
  t.Literal("RETURN_APPROVED"),
  t.Literal("RETURN_REJECTED"),
  t.Literal("RETURN_RECEIVED"),
  t.Literal("RETURN_COMPLETED"),
  t.Literal("RETURN_CANCELLED"),
]);

const tboxReturnTargetType = t.Union([t.Literal("ORDER"), t.Literal("ITEM")]);

const tboxAdminReturnRecord = t.Object({
  actorId: t.Union([t.String(), t.Null()]),
  amountCentavos: t.Union([t.Integer({ minimum: 0 }), t.Null()]),
  createdAt: t.String(),
  currency: t.Literal("PHP"),
  id: t.String(),
  notes: t.Union([t.String(), t.Null()]),
  orderId: t.String(),
  orderSnapshotId: t.Union([t.String(), t.Null()]),
  previousStatus: t.Union([tboxReturnStatus, t.Null()]),
  reason: t.String(),
  referenceId: t.Union([t.String(), t.Null()]),
  status: tboxReturnStatus,
  statusLabel: t.String(),
  targetLabel: t.String(),
  targetType: tboxReturnTargetType,
  updatedAt: t.String(),
});

const tboxAdminOrderDetailData = t.Object({
  checkoutEmailMasked: t.Union([t.String(), t.Null()]),
  contact: t.Object({
    checkoutEmail: t.Union([t.String(), t.Null()]),
    fullName: t.Union([t.String(), t.Null()]),
    phone: t.Union([t.String(), t.Null()]),
  }),
  createdAt: t.String(),
  currency: t.Literal("PHP"),
  customerKind: t.Union([t.Literal("CUSTOMER"), t.Literal("GUEST")]),
  customerLabel: t.String(),
  fulfillment: tboxLane,
  itemCount: t.Integer({ minimum: 0 }),
  items: t.Array(tboxAdminOrderItem),
  orderId: t.String(),
  orderNumber: t.String(),
  payment: tboxLane,
  refund: tboxLane,
  return: tboxLane,
  returnHistory: t.Array(tboxAdminReturnRecord),
  shippingAddress: t.Object({
    barangay: t.Union([t.String(), t.Null()]),
    cityProvince: t.Union([t.String(), t.Null()]),
    postalCode: t.Union([t.String(), t.Null()]),
    shippingType: t.String(),
    streetAddress: t.Union([t.String(), t.Null()]),
  }),
  subtotalCentavos: t.Integer({ minimum: 0 }),
  totalCentavos: t.Integer({ minimum: 0 }),
  totalQuantity: t.Integer({ minimum: 0 }),
  updatedAt: t.String(),
});

const tboxCustomerOrderListQuery = t.Object(
  {
    page: t.Optional(t.Numeric({ minimum: 1, multipleOf: 1, default: 1 })),
    pageSize: t.Optional(
      t.Numeric({ minimum: 1, maximum: 50, multipleOf: 1, default: 20 })
    ),
  },
  { additionalProperties: false }
);

const tboxAdminOrderListQuery = t.Object(
  {
    createdFrom: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
    createdTo: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
    fulfillmentStatus: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
    page: t.Optional(t.Numeric({ minimum: 1, multipleOf: 1, default: 1 })),
    pageSize: t.Optional(
      t.Numeric({ minimum: 1, maximum: 100, multipleOf: 1, default: 20 })
    ),
    paymentStatus: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
    search: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
  },
  { additionalProperties: false }
);

const tboxCustomerOrderParams = t.Object(
  {
    orderId: t.String({ minLength: 1, maxLength: 128 }),
  },
  { additionalProperties: false }
);

const tboxAdminOrderParams = t.Object(
  {
    orderId: t.String({ minLength: 1, maxLength: 128 }),
  },
  { additionalProperties: false }
);

const tboxFulfillmentStatus = t.Union([
  t.Literal("ORDER_PLACED"),
  t.Literal("PROCESSING"),
  t.Literal("SHIPPED"),
  t.Literal("DELIVERED"),
  t.Literal("CANCELLED"),
]);

const tboxFulfillmentEmailStatus = t.Union([
  t.Literal("FAILED"),
  t.Literal("PENDING"),
  t.Literal("SENT"),
  t.Literal("SENDING"),
]);

const tboxAdminFulfillmentBody = t.Object(
  {
    targetStatus: tboxFulfillmentStatus,
  },
  { additionalProperties: false }
);

const tboxAdminReturnBody = t.Object(
  {
    amountCentavos: t.Optional(t.Integer({ minimum: 0 })),
    notes: t.Optional(t.String({ maxLength: 2000 })),
    orderSnapshotId: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
    reason: t.String({ minLength: 1, maxLength: 512 }),
    referenceId: t.Optional(t.String({ maxLength: 128 })),
    targetStatus: tboxReturnStatus,
    targetType: tboxReturnTargetType,
  },
  { additionalProperties: false }
);

const tboxAdminFulfillmentData = t.Object({
  allowedNextStatuses: t.Array(tboxFulfillmentStatus),
  email: t.Object({
    status: tboxFulfillmentEmailStatus,
  }),
  order: tboxAdminOrderDetailData,
  transition: t.Object({
    eventId: t.String(),
    newStatus: tboxFulfillmentStatus,
    oldStatus: tboxFulfillmentStatus,
  }),
});

const tboxAdminReturnData = t.Object({
  allowedNextStatuses: t.Array(tboxReturnStatus),
  order: tboxAdminOrderDetailData,
  returnRecord: tboxAdminReturnRecord,
});

function createRuntimeController(
  input: OrderControllerFactoryInput,
  options: OrderRoutesOptions
): OrderController {
  const db = input.runtimeEnv?.DB;

  if (!db) {
    throw new GeneralError(
      { reason: "missing_db_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  return new OrderController(
    new OrderService({
      auditPublisher: options.auditPublisher,
      emailNotifier:
        options.emailNotifier ??
        createFulfillmentStatusEmailNotifier(input.runtimeEnv ?? {}),
      operationalLogger: options.operationalLogger,
      repository: new DrizzleOrderRepository(createDb(db as D1Database)),
    })
  );
}

function getController(
  input: OrderControllerFactoryInput,
  options: OrderRoutesOptions
): OrderController {
  return (
    options.controllerFactory?.(input) ??
    createRuntimeController(input, options)
  );
}

function orderActor(
  actor: RequestActorContext | undefined
): Parameters<OrderController["listCustomerOrders"]>[0]["actor"] {
  return actor
    ? {
        accountStatus: actor.accountStatus,
        actorId: actor.actorId,
        authenticated: actor.authenticated,
        eligibility: actor.eligibility,
        role: actor.role,
        safeActorId: actor.safeActorId,
      }
    : undefined;
}

export function ordersRoutes(app: AnyElysia, options: OrderRoutesOptions = {}) {
  return app
    .get(
      "/customer/orders",
      async (ctx) => {
        const { request, requestContext, requestId, runtimeEnv, set, query } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              query: { page?: number; pageSize?: number };
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
            };
        const controller = getController(
          { request, requestId, runtimeEnv },
          options
        );
        const result = await controller.listCustomerOrders({
          actor: orderActor(requestContext.actor),
          page: query.page,
          pageSize: query.pageSize,
          requestId,
        });

        set.status = result.status;

        return result.body as never;
      },
      {
        detail: routeDetail({
          summary: "List current customer orders",
          description:
            "Lists orders for the authenticated Customer using the server-side orders.customer_id ownership predicate. The endpoint returns snapshot-based totals and separate payment, fulfillment, return, and refund lanes. It does not support raw email lookup, checkout contact lookup, provider identifiers, or open order-number search.",
          tags: ["Orders"],
          auth: customerOrderAuth,
          rateLimitClass: "public-read",
          errorCodes: [...customerOrderErrors],
        }),
        query: tboxCustomerOrderListQuery,
        response: {
          200: tboxApiSuccess(tboxCustomerOrderListData),
          ...openApiErrorResponses([400, 401, 403, 404, 500]),
        },
        transform: rbacGuard(customerOrderAuth),
      }
    )
    .get(
      "/customer/orders/:orderId",
      async (ctx) => {
        const { request, requestContext, requestId, runtimeEnv, set, params } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              params: { orderId: string };
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
            };
        const controller = getController(
          { request, requestId, runtimeEnv },
          options
        );
        const result = await controller.getCustomerOrderDetail({
          actor: orderActor(requestContext.actor),
          orderIdOrNumber: params.orderId,
          requestId,
        });

        set.status = result.status;

        return result.body as never;
      },
      {
        detail: routeDetail({
          summary: "Get current customer order detail",
          description:
            "Returns one order detail for the authenticated Customer when the owned order id or order number matches. Other customers' orders use the same not found contract as unknown orders. Item names, variants, prices, quantity, and optional image references come from order_snapshots only.",
          tags: ["Orders"],
          auth: customerOrderAuth,
          rateLimitClass: "public-read",
          errorCodes: [...customerOrderErrors],
        }),
        params: tboxCustomerOrderParams,
        response: {
          200: tboxApiSuccess(tboxCustomerOrderDetailData),
          ...openApiErrorResponses([400, 401, 403, 404, 500]),
        },
        transform: rbacGuard(customerOrderAuth),
      }
    )
    .get(
      "/admin/orders",
      async (ctx) => {
        const { request, requestContext, requestId, runtimeEnv, set, query } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              query: {
                createdFrom?: string;
                createdTo?: string;
                fulfillmentStatus?: string;
                page?: number;
                pageSize?: number;
                paymentStatus?: string;
                search?: string;
              };
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
            };
        const controller = getController(
          { request, requestId, runtimeEnv },
          options
        );
        const result = await controller.listAdminOrders({
          actor: orderActor(requestContext.actor),
          createdFrom: query.createdFrom,
          createdTo: query.createdTo,
          fulfillmentStatus: query.fulfillmentStatus,
          page: query.page,
          pageSize: query.pageSize,
          paymentStatus: query.paymentStatus,
          requestId,
          search: query.search,
        });

        set.status = result.status;

        return result.body as never;
      },
      {
        detail: routeDetail({
          summary: "List Admin orders",
          description:
            "Lists JRW orders for active approved Admin daily operations. Results use snapshot-derived item totals, newest-first pagination by created_at then id, separate payment and fulfillment lanes, idle return/refund indicators, and list-safe customer/contact summaries without provider identifiers or full shipping contact.",
          tags: ["Orders"],
          auth: adminOrderAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...adminOrderErrors],
        }),
        query: tboxAdminOrderListQuery,
        response: {
          200: tboxApiSuccess(tboxAdminOrderListData),
          ...openApiErrorResponses([400, 401, 403, 404, 500, 503]),
        },
        transform: rbacGuard(adminOrderAuth),
      }
    )
    .get(
      "/admin/orders/:orderId",
      async (ctx) => {
        const { request, requestContext, requestId, runtimeEnv, set, params } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              params: { orderId: string };
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
            };
        const controller = getController(
          { request, requestId, runtimeEnv },
          options
        );
        const result = await controller.getAdminOrderDetail({
          actor: orderActor(requestContext.actor),
          orderIdOrNumber: params.orderId,
          requestId,
        });

        set.status = result.status;

        return result.body as never;
      },
      {
        detail: routeDetail({
          summary: "Get Admin order detail",
          description:
            "Returns one JRW order for active approved Admin support and fulfillment work by order id or order number. Item truth comes from order_snapshots only. Detail exposes fulfillment-needed contact and shipping fields while excluding provider payloads, checkout URLs, raw PayMongo ids, request ids, email message ids, tokens, secrets, and raw card details.",
          tags: ["Orders"],
          auth: adminOrderAuth,
          rateLimitClass: "admin-read",
          errorCodes: [...adminOrderErrors],
        }),
        params: tboxAdminOrderParams,
        response: {
          200: tboxApiSuccess(tboxAdminOrderDetailData),
          ...openApiErrorResponses([400, 401, 403, 404, 500, 503]),
        },
        transform: rbacGuard(adminOrderAuth),
      }
    )
    .patch(
      "/admin/orders/:orderId/fulfillment",
      async (ctx) => {
        const {
          body,
          request,
          requestContext,
          requestId,
          runtimeEnv,
          set,
          params,
        } = ctx as typeof ctx &
          RequestContextDecorations & {
            body: { targetStatus: string };
            params: { orderId: string };
            runtimeEnv?: Partial<Env> & Record<string, unknown>;
          };
        const controller = getController(
          { request, requestId, runtimeEnv },
          options
        );
        const result = await controller.updateAdminOrderFulfillment({
          actor: orderActor(requestContext.actor),
          orderIdOrNumber: params.orderId,
          requestId,
          targetStatus: body.targetStatus,
        });

        set.status = result.status;

        return result.body as never;
      },
      {
        body: tboxAdminFulfillmentBody,
        detail: routeDetail({
          summary: "Update Admin order fulfillment",
          description:
            "Moves one paid JRW order to a valid next fulfillment status for active approved Admin daily operations. The endpoint preserves payment, return, and refund lanes, records a fulfillment event with request id, emits safe audit metadata, and tracks the customer fulfillment email state without exposing provider payloads or secrets.",
          tags: ["Orders"],
          auth: adminOrderAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...adminOrderErrors],
        }),
        params: tboxAdminOrderParams,
        response: {
          200: tboxApiSuccess(tboxAdminFulfillmentData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
        transform: rbacGuard(adminOrderAuth),
      }
    )
    .post(
      "/admin/orders/:orderId/returns",
      async (ctx) => {
        const {
          body,
          request,
          requestContext,
          requestId,
          runtimeEnv,
          set,
          params,
        } = ctx as typeof ctx &
          RequestContextDecorations & {
            body: {
              amountCentavos?: number;
              notes?: string;
              orderSnapshotId?: string;
              reason: string;
              referenceId?: string;
              targetStatus: string;
              targetType: string;
            };
            params: { orderId: string };
            runtimeEnv?: Partial<Env> & Record<string, unknown>;
          };
        const controller = getController(
          { request, requestId, runtimeEnv },
          options
        );
        const result = await controller.recordAdminOrderReturn({
          actor: orderActor(requestContext.actor),
          amountCentavos: body.amountCentavos,
          notes: body.notes,
          orderIdOrNumber: params.orderId,
          orderSnapshotId: body.orderSnapshotId,
          reason: body.reason,
          referenceId: body.referenceId,
          requestId,
          targetStatus: body.targetStatus,
          targetType: body.targetType,
        });

        set.status = result.status;

        return result.body as never;
      },
      {
        body: tboxAdminReturnBody,
        detail: routeDetail({
          summary: "Record Admin order return",
          description:
            "Records an append-only return history entry for a paid, delivered JRW order. Active approved Admins can record order-level or order_snapshots item-level return progress. The endpoint preserves payment, fulfillment, and refund lanes, exposes updated Admin order detail, and does not trigger PayMongo refunds, inventory changes, customer mutations, email, provider payload storage, or raw request-id display.",
          tags: ["Orders"],
          auth: adminOrderAuth,
          rateLimitClass: "admin-write",
          errorCodes: [...adminOrderErrors],
        }),
        params: tboxAdminOrderParams,
        response: {
          200: tboxApiSuccess(tboxAdminReturnData),
          ...openApiErrorResponses([400, 401, 403, 404, 409, 500, 503]),
        },
        transform: rbacGuard(adminOrderAuth),
      }
    );
}
