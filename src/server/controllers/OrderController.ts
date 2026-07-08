import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type {
  AdminOrderDetailReadModel,
  AdminOrderListResult,
  CustomerOrderDetailReadModel,
  CustomerOrderListResult,
} from "@/server/repositories/OrderRepository";
import type {
  GetAdminOrderDetailServiceInput,
  GetCustomerOrderDetailServiceInput,
  ListAdminOrdersServiceInput,
  ListCustomerOrdersServiceInput,
} from "@/server/services/OrderService";
import type { AppResult } from "@/utils/general/result";

export type OrderServiceLike = {
  getAdminOrderDetail(
    input: GetAdminOrderDetailServiceInput
  ): Promise<AppResult<AdminOrderDetailReadModel>>;
  getCustomerOrderDetail(
    input: GetCustomerOrderDetailServiceInput
  ): Promise<AppResult<CustomerOrderDetailReadModel>>;
  listAdminOrders(
    input: ListAdminOrdersServiceInput
  ): Promise<AppResult<AdminOrderListResult>>;
  listCustomerOrders(
    input: ListCustomerOrdersServiceInput
  ): Promise<AppResult<CustomerOrderListResult>>;
};

export type OrderControllerResult<T> = {
  body: ApiResponse<T>;
  status: number;
};

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): OrderControllerResult<T> {
  if (!result.error) {
    throw new Error("Expected error result.");
  }

  const details =
    typeof result.error.data === "object" &&
    result.error.data !== null &&
    Object.keys(result.error.data).length > 0
      ? result.error.data
      : undefined;

  return {
    body: apiErrorWithRequestId(
      result.error.code,
      publicErrorMessage(result.error.code),
      requestId,
      details
    ),
    status: errorCodeToHttpStatus(result.error.code),
  };
}

export class OrderController {
  constructor(private readonly service: OrderServiceLike) {}

  async listCustomerOrders(
    input: ListCustomerOrdersServiceInput
  ): Promise<OrderControllerResult<CustomerOrderListResult>> {
    const result = await this.service.listCustomerOrders(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
      status: 200,
    };
  }

  async getCustomerOrderDetail(
    input: GetCustomerOrderDetailServiceInput
  ): Promise<OrderControllerResult<CustomerOrderDetailReadModel>> {
    const result = await this.service.getCustomerOrderDetail(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
      status: 200,
    };
  }

  async listAdminOrders(
    input: ListAdminOrdersServiceInput
  ): Promise<OrderControllerResult<AdminOrderListResult>> {
    const result = await this.service.listAdminOrders(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
      status: 200,
    };
  }

  async getAdminOrderDetail(
    input: GetAdminOrderDetailServiceInput
  ): Promise<OrderControllerResult<AdminOrderDetailReadModel>> {
    const result = await this.service.getAdminOrderDetail(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
      status: 200,
    };
  }
}
