import type {
  CustomerOrderDetailReadModel,
  CustomerOrderListResult,
  GetCustomerOrderDetailInput,
  ListCustomerOrdersInput,
} from "@/server/repositories/OrderRepository";
import { GeneralError, type ErrorCodeType } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

export type CustomerOrderRepositoryLike = {
  getCustomerOrderDetail(
    input: GetCustomerOrderDetailInput
  ): Promise<CustomerOrderDetailReadModel | null>;
  listCustomerOrders(
    input: ListCustomerOrdersInput
  ): Promise<CustomerOrderListResult>;
};

export type CustomerOrderActorInput = {
  authenticated: boolean;
  role: string;
  actorId?: string;
  accountStatus?: {
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    emailVerified: boolean;
    approved: boolean;
  };
  eligibility?: {
    active: boolean;
    emailVerified: boolean;
    approved: boolean;
  };
};

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

export type OrderServiceOptions = {
  repository: CustomerOrderRepositoryLike;
};

function serviceError(
  code: ErrorCodeType
): GeneralError<Record<string, never>> {
  return new GeneralError({}, code);
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

export class OrderService {
  private readonly repository: CustomerOrderRepositoryLike;

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
}
