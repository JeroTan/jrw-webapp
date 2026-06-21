import { createGeneratedCustomerDisplayName } from "@/domain/customers/customer-display-name";
import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type {
  CustomerActorInput,
  CustomerProfileDto,
  RegisterCustomerResult,
  VerifyEmailResult,
} from "@/server/services/CustomerAccountService";
import type { AppResult } from "@/utils/general/result";

export type CustomerAccountServiceLike = {
  registerCustomer(
    input: Record<string, unknown> & {
      requestId: string;
      sourceIpHash?: string;
    }
  ): Promise<AppResult<RegisterCustomerResult>>;
  verifyEmail(input: {
    token: unknown;
    requestId: string;
  }): Promise<AppResult<VerifyEmailResult>>;
  getProfile(input: {
    actor: CustomerActorInput | undefined;
    requestId: string;
  }): Promise<AppResult<CustomerProfileDto>>;
  updateProfile(input: {
    actor: CustomerActorInput | undefined;
    requestId: string;
    profile: Record<string, unknown>;
  }): Promise<AppResult<CustomerProfileDto>>;
};

export type CustomerAccountControllerResult<T> = {
  status: number;
  body: ApiResponse<T>;
};

export type RegisterCustomerControllerInput = {
  body: Record<string, unknown>;
  requestId: string;
  sourceIpHash?: string;
};

export type VerifyEmailControllerInput = {
  body: {
    token?: unknown;
  };
  requestId: string;
};

export type CustomerProfileControllerInput = {
  actor: CustomerActorInput | undefined;
  requestId: string;
};

export type UpdateCustomerProfileControllerInput =
  CustomerProfileControllerInput & {
    body: Record<string, unknown>;
  };

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): CustomerAccountControllerResult<T> {
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
    status: errorCodeToHttpStatus(result.error.code),
    body: apiErrorWithRequestId(
      result.error.code,
      publicErrorMessage(result.error.code),
      requestId,
      details
    ),
  };
}

export class CustomerAccountController {
  constructor(private readonly service: CustomerAccountServiceLike) {}

  async registerCustomer(
    input: RegisterCustomerControllerInput
  ): Promise<CustomerAccountControllerResult<RegisterCustomerResult>> {
    const generatedBody = {
      ...input.body,
      displayName: createGeneratedCustomerDisplayName(
        typeof input.body.email === "string" ? input.body.email : "customer"
      ),
    };
    const result = await this.service.registerCustomer({
      ...generatedBody,
      requestId: input.requestId,
      sourceIpHash: input.sourceIpHash,
    });

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 201,
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
    };
  }

  async verifyEmail(
    input: VerifyEmailControllerInput
  ): Promise<CustomerAccountControllerResult<VerifyEmailResult>> {
    const result = await this.service.verifyEmail({
      token: input.body.token,
      requestId: input.requestId,
    });

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 200,
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
    };
  }

  async getProfile(
    input: CustomerProfileControllerInput
  ): Promise<CustomerAccountControllerResult<CustomerProfileDto>> {
    const result = await this.service.getProfile(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 200,
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
    };
  }

  async updateProfile(
    input: UpdateCustomerProfileControllerInput
  ): Promise<CustomerAccountControllerResult<CustomerProfileDto>> {
    const result = await this.service.updateProfile({
      actor: input.actor,
      requestId: input.requestId,
      profile: input.body,
    });

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 200,
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
    };
  }
}
