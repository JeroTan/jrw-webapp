import { t } from "elysia";
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
  controllerFactory?: (input: OrderControllerFactoryInput) => OrderController;
};

const customerOrderAuth = {
  mode: "required",
  roles: ["CUSTOMER"],
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

const tboxCustomerOrderSummary = t.Object({
  createdAt: t.String(),
  currency: t.Literal("PHP"),
  fulfillment: tboxLane,
  itemCount: t.Integer({ minimum: 0 }),
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

const tboxCustomerOrderListData = t.Object({
  items: t.Array(tboxCustomerOrderSummary),
  pagination: t.Object({
    page: t.Integer({ minimum: 1 }),
    pageSize: t.Integer({ minimum: 1, maximum: 50 }),
    totalItems: t.Integer({ minimum: 0 }),
    totalPages: t.Integer({ minimum: 0 }),
  }),
});

const tboxCustomerOrderDetailData = t.Intersect([
  tboxCustomerOrderSummary,
  t.Object({
    items: t.Array(tboxCustomerOrderItem),
  }),
]);

const tboxCustomerOrderListQuery = t.Object(
  {
    page: t.Optional(t.Numeric({ minimum: 1, multipleOf: 1, default: 1 })),
    pageSize: t.Optional(
      t.Numeric({ minimum: 1, maximum: 50, multipleOf: 1, default: 20 })
    ),
  },
  { additionalProperties: false }
);

const tboxCustomerOrderParams = t.Object(
  {
    orderId: t.String({ minLength: 1, maxLength: 128 }),
  },
  { additionalProperties: false }
);

function createRuntimeController(
  input: OrderControllerFactoryInput
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
      repository: new DrizzleOrderRepository(createDb(db as D1Database)),
    })
  );
}

function getController(
  input: OrderControllerFactoryInput,
  options: OrderRoutesOptions
): OrderController {
  return options.controllerFactory?.(input) ?? createRuntimeController(input);
}

function customerActor(
  actor: RequestActorContext | undefined
): Parameters<OrderController["listCustomerOrders"]>[0]["actor"] {
  return actor
    ? {
        accountStatus: actor.accountStatus,
        actorId: actor.actorId,
        authenticated: actor.authenticated,
        eligibility: actor.eligibility,
        role: actor.role,
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
          actor: customerActor(requestContext.actor),
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
          actor: customerActor(requestContext.actor),
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
    );
}
