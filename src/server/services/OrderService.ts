import { evaluateRouteAccess, type RbacActorContext } from "@/domain/auth/rbac";
import type {
  AdminOrderDetailReadModel,
  AdminOrderListResult,
  CustomerOrderDetailReadModel,
  CustomerOrderListResult,
  GetAdminOrderDetailInput,
  GetCustomerOrderDetailInput,
  ListAdminOrdersInput,
  ListCustomerOrdersInput,
} from "@/server/repositories/OrderRepository";
import { GeneralError, type ErrorCodeType } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

const adminOrderAuth = {
  mode: "required",
  roles: ["ADMIN"],
} as const;

export type CustomerOrderRepositoryLike = {
  getCustomerOrderDetail(
    input: GetCustomerOrderDetailInput
  ): Promise<CustomerOrderDetailReadModel | null>;
  listCustomerOrders(
    input: ListCustomerOrdersInput
  ): Promise<CustomerOrderListResult>;
};

export type AdminOrderRepositoryLike = {
  getAdminOrderDetail(
    input: GetAdminOrderDetailInput
  ): Promise<AdminOrderDetailReadModel | null>;
  listAdminOrders(input: ListAdminOrdersInput): Promise<AdminOrderListResult>;
};

export type OrderRepositoryLike = CustomerOrderRepositoryLike &
  AdminOrderRepositoryLike;

export type OrderActorInput = {
  accountStatus?: {
    approved: boolean;
    emailVerified: boolean;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  };
  actorId?: string;
  authenticated: boolean;
  eligibility?: {
    active: boolean;
    approved: boolean;
    emailVerified: boolean;
  };
  role: string;
  safeActorId?: string;
};

export type CustomerOrderActorInput = OrderActorInput;

export type ListCustomerOrdersServiceInput = {
  actor: CustomerOrderActorInput | undefined;
  page?: number;
  pageSize?: number;
  requestId: string;
};

export type GetCustomerOrderDetailServiceInput = {
  actor: CustomerOrderActorInput | undefined;
  orderIdOrNumber: string;
  requestId: string;
};

export type ListAdminOrdersServiceInput = ListAdminOrdersInput & {
  actor: OrderActorInput | undefined;
  requestId: string;
};

export type GetAdminOrderDetailServiceInput = {
  actor: OrderActorInput | undefined;
  orderIdOrNumber: string;
  requestId: string;
};

export type OrderServiceOptions = {
  repository: OrderRepositoryLike;
};

function serviceError(
  code: ErrorCodeType,
  data: Record<string, unknown> = {}
): GeneralError<Record<string, never>> {
  return new GeneralError(data as Record<string, never>, code);
}

function providerFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    /D1_|SQLITE_|database|query|constraint|prepare|execute|transaction/i.test(
      error.message
    )
  );
}

function requireCustomerActor(
  actor: CustomerOrderActorInput | undefined
): AppResult<{ customerId: string }> {
  if (!actor?.authenticated) {
    return Result.error(serviceError("AUTH_REQUIRED"));
  }

  if (actor.role !== "CUSTOMER") {
    return Result.error(serviceError("AUTH_FORBIDDEN"));
  }

  if (!actor.actorId) {
    return Result.error(serviceError("AUTH_REQUIRED"));
  }

  if (actor.accountStatus?.status === "SUSPENDED") {
    return Result.error(serviceError("ACCOUNT_SUSPENDED"));
  }

  if (
    actor.accountStatus?.status === "INACTIVE" ||
    actor.eligibility?.active === false
  ) {
    return Result.error(serviceError("AUTH_FORBIDDEN"));
  }

  if (
    actor.accountStatus?.emailVerified === false ||
    actor.eligibility?.emailVerified === false
  ) {
    return Result.error(serviceError("EMAIL_NOT_VERIFIED"));
  }

  return Result.okay({ customerId: actor.actorId });
}

function requireAdminActor(
  actor: OrderActorInput | undefined
): AppResult<{ adminId: string }> {
  const decision = evaluateRouteAccess({
    auth: adminOrderAuth,
    actor: actor
      ? {
          ...actor,
          role: actor.role as RbacActorContext["role"],
        }
      : undefined,
  });

  if (!decision.allowed) {
    return Result.error(serviceError(decision.code));
  }

  if (!actor?.actorId) {
    return Result.error(serviceError("AUTH_REQUIRED"));
  }

  if (decision.actorRole !== "ADMIN") {
    return Result.error(serviceError("AUTH_FORBIDDEN"));
  }

  return Result.okay({ adminId: actor.actorId });
}

export class OrderService {
  private readonly repository: OrderRepositoryLike;

  constructor(options: OrderServiceOptions) {
    this.repository = options.repository;
  }

  async listCustomerOrders(
    input: ListCustomerOrdersServiceInput
  ): Promise<AppResult<CustomerOrderListResult>> {
    const actor = requireCustomerActor(input.actor);

    if (actor.error) {
      return actor;
    }

    return Result.okay(
      await this.repository.listCustomerOrders({
        customerId: actor.content.customerId,
        page: input.page,
        pageSize: input.pageSize,
      })
    );
  }

  async getCustomerOrderDetail(
    input: GetCustomerOrderDetailServiceInput
  ): Promise<AppResult<CustomerOrderDetailReadModel>> {
    const actor = requireCustomerActor(input.actor);

    if (actor.error) {
      return actor;
    }

    if (input.orderIdOrNumber.trim().length === 0) {
      return Result.error(serviceError("VALIDATION_FAILED"));
    }

    const order = await this.repository.getCustomerOrderDetail({
      customerId: actor.content.customerId,
      orderIdOrNumber: input.orderIdOrNumber.trim(),
    });

    if (!order) {
      return Result.error(serviceError("RESOURCE_NOT_FOUND"));
    }

    return Result.okay(order);
  }

  async listAdminOrders(
    input: ListAdminOrdersServiceInput
  ): Promise<AppResult<AdminOrderListResult>> {
    const actor = requireAdminActor(input.actor);

    if (actor.error) {
      return actor;
    }

    try {
      return Result.okay(
        await this.repository.listAdminOrders({
          createdFrom: input.createdFrom,
          createdTo: input.createdTo,
          fulfillmentStatus: input.fulfillmentStatus,
          page: input.page,
          pageSize: input.pageSize,
          paymentStatus: input.paymentStatus,
          search: input.search,
        })
      );
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async getAdminOrderDetail(
    input: GetAdminOrderDetailServiceInput
  ): Promise<AppResult<AdminOrderDetailReadModel>> {
    const actor = requireAdminActor(input.actor);

    if (actor.error) {
      return actor;
    }

    if (input.orderIdOrNumber.trim().length === 0) {
      return Result.error(serviceError("VALIDATION_FAILED"));
    }

    try {
      const order = await this.repository.getAdminOrderDetail({
        orderIdOrNumber: input.orderIdOrNumber.trim(),
      });

      if (!order) {
        return Result.error(serviceError("RESOURCE_NOT_FOUND"));
      }

      return Result.okay(order);
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }
}
