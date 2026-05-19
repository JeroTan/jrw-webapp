import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type {
  AdminAccountIdInput,
  AdminAccountListResult,
  AdminAccountResult,
  AdminActorInput,
  CreateAdminAccountResult,
  CreateAdminAccountServiceInput,
  LifecycleReasonInput,
  UpdateAdminAccountServiceInput,
} from "@/server/services/AdminAccountService";
import type { AppResult } from "@/utils/general/result";

export type AdminAccountServiceLike = {
  listAdminAccounts(
    input: Pick<AdminAccountIdInput, "actor" | "requestId">
  ): Promise<AppResult<AdminAccountListResult>>;
  getAdminAccount(input: AdminAccountIdInput): Promise<AppResult<AdminAccountResult>>;
  createAdminAccount(
    input: CreateAdminAccountServiceInput
  ): Promise<AppResult<CreateAdminAccountResult>>;
  updateAdminAccount(
    input: UpdateAdminAccountServiceInput
  ): Promise<AppResult<AdminAccountResult>>;
  approveAdminAccount(
    input: AdminAccountIdInput
  ): Promise<AppResult<AdminAccountResult>>;
  rejectAdminAccount(
    input: LifecycleReasonInput
  ): Promise<AppResult<AdminAccountResult>>;
  suspendAdminAccount(
    input: LifecycleReasonInput
  ): Promise<AppResult<AdminAccountResult>>;
  reactivateAdminAccount(
    input: AdminAccountIdInput
  ): Promise<AppResult<AdminAccountResult>>;
};

export type AdminAccountControllerResult<T> = {
  status: number;
  body: ApiResponse<T>;
};

export type AdminAccountControllerInput = {
  actor: AdminActorInput | undefined;
  requestId: string;
};

export type AdminAccountByIdControllerInput = AdminAccountControllerInput & {
  adminAccountId: string;
};

export type AdminAccountBodyControllerInput =
  AdminAccountByIdControllerInput & {
    body: Record<string, unknown>;
  };

export type CreateAdminAccountControllerInput = AdminAccountControllerInput & {
  body: Record<string, unknown>;
};

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): AdminAccountControllerResult<T> {
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
      publicErrorMessage(result.error.code, result.error.message),
      requestId,
      details
    ),
  };
}

export class AdminAccountController {
  constructor(private readonly service: AdminAccountServiceLike) {}

  async listAdminAccounts(
    input: AdminAccountControllerInput
  ): Promise<AdminAccountControllerResult<AdminAccountListResult>> {
    const result = await this.service.listAdminAccounts(input);

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

  async getAdminAccount(
    input: AdminAccountByIdControllerInput
  ): Promise<AdminAccountControllerResult<AdminAccountResult>> {
    const result = await this.service.getAdminAccount(input);

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

  async createAdminAccount(
    input: CreateAdminAccountControllerInput
  ): Promise<AdminAccountControllerResult<CreateAdminAccountResult>> {
    const result = await this.service.createAdminAccount(input);

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

  async updateAdminAccount(
    input: AdminAccountBodyControllerInput
  ): Promise<AdminAccountControllerResult<AdminAccountResult>> {
    const result = await this.service.updateAdminAccount(input);

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

  async decideAdminApproval(
    input: AdminAccountBodyControllerInput
  ): Promise<AdminAccountControllerResult<AdminAccountResult>> {
    const action = input.body.action;
    const result =
      action === "reject"
        ? await this.service.rejectAdminAccount(input)
        : await this.service.approveAdminAccount(input);

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

  async suspendAdminAccount(
    input: AdminAccountBodyControllerInput
  ): Promise<AdminAccountControllerResult<AdminAccountResult>> {
    const result = await this.service.suspendAdminAccount(input);

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

  async reactivateAdminAccount(
    input: AdminAccountByIdControllerInput
  ): Promise<AdminAccountControllerResult<AdminAccountResult>> {
    const result = await this.service.reactivateAdminAccount(input);

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
