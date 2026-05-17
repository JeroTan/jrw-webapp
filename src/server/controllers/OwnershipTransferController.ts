import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type {
  OwnershipTransferActorInput,
  OwnershipTransferCandidateListResult,
  OwnershipTransferResult,
  SubmitOwnershipTransferInput,
} from "@/server/services/OwnershipTransferService";
import type { AppResult } from "@/utils/general/result";

export type OwnershipTransferCookieInstruction = {
  kind: "clear";
};

export type OwnershipTransferServiceLike = {
  listCandidates(input: {
    actor: OwnershipTransferActorInput | undefined;
    requestId: string;
  }): Promise<AppResult<OwnershipTransferCandidateListResult>>;
  submitTransfer(
    input: SubmitOwnershipTransferInput
  ): Promise<AppResult<OwnershipTransferResult>>;
};

export type OwnershipTransferControllerResult<T> = {
  status: number;
  body: ApiResponse<T>;
  cookie?: OwnershipTransferCookieInstruction;
};

export type OwnershipTransferControllerInput = {
  actor: OwnershipTransferActorInput | undefined;
  requestId: string;
};

export type SubmitOwnershipTransferControllerInput =
  OwnershipTransferControllerInput & {
    body: Record<string, unknown>;
  };

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): OwnershipTransferControllerResult<T> {
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

export class OwnershipTransferController {
  constructor(private readonly service: OwnershipTransferServiceLike) {}

  async listCandidates(
    input: OwnershipTransferControllerInput
  ): Promise<
    OwnershipTransferControllerResult<OwnershipTransferCandidateListResult>
  > {
    const result = await this.service.listCandidates(input);

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

  async submitTransfer(
    input: SubmitOwnershipTransferControllerInput
  ): Promise<OwnershipTransferControllerResult<OwnershipTransferResult>> {
    const result = await this.service.submitTransfer(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 200,
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
      cookie: result.content.sessionRefreshRequired
        ? { kind: "clear" }
        : undefined,
    };
  }
}
