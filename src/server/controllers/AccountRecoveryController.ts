import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type {
  ConfirmPasswordResetInput,
  PasswordResetConfirmedResult,
  RecoveryAcceptedResult,
  RequestEmailVerificationInput,
  RequestPasswordResetInput,
} from "@/server/services/AccountRecoveryService";
import type { AppResult } from "@/utils/general/result";

export type AccountRecoveryServiceLike = {
  requestPasswordReset(
    input: RequestPasswordResetInput
  ): Promise<AppResult<RecoveryAcceptedResult>>;
  confirmPasswordReset(
    input: ConfirmPasswordResetInput
  ): Promise<AppResult<PasswordResetConfirmedResult>>;
  requestEmailVerification(
    input: RequestEmailVerificationInput
  ): Promise<AppResult<RecoveryAcceptedResult>>;
};

export type AccountRecoveryControllerResult<T> = {
  status: number;
  body: ApiResponse<T>;
};

export type RequestPasswordResetControllerInput = {
  body: {
    email?: unknown;
  };
  requestId: string;
  sourceIpHash?: string;
};

export type ConfirmPasswordResetControllerInput = {
  body: {
    token?: unknown;
    password?: unknown;
  };
  requestId: string;
  sourceIpHash?: string;
};

export type RequestEmailVerificationControllerInput = {
  body: {
    email?: unknown;
  };
  requestId: string;
  sourceIpHash?: string;
};

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): AccountRecoveryControllerResult<T> {
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

export class AccountRecoveryController {
  constructor(private readonly service: AccountRecoveryServiceLike) {}

  async requestPasswordReset(
    input: RequestPasswordResetControllerInput
  ): Promise<AccountRecoveryControllerResult<RecoveryAcceptedResult>> {
    const result = await this.service.requestPasswordReset({
      email: input.body.email,
      requestId: input.requestId,
      sourceIpHash: input.sourceIpHash,
    });

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 202,
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "ACCEPTED",
      }),
    };
  }

  async confirmPasswordReset(
    input: ConfirmPasswordResetControllerInput
  ): Promise<AccountRecoveryControllerResult<PasswordResetConfirmedResult>> {
    const result = await this.service.confirmPasswordReset({
      token: input.body.token,
      password: input.body.password,
      requestId: input.requestId,
      sourceIpHash: input.sourceIpHash,
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

  async requestEmailVerification(
    input: RequestEmailVerificationControllerInput
  ): Promise<AccountRecoveryControllerResult<RecoveryAcceptedResult>> {
    const result = await this.service.requestEmailVerification({
      email: input.body.email,
      requestId: input.requestId,
      sourceIpHash: input.sourceIpHash,
    });

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 202,
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "ACCEPTED",
      }),
    };
  }
}
