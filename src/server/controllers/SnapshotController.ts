import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type {
  BuildSnapshotServiceInput,
  GetSnapshotServiceInput,
  ListOrderSnapshotsServiceInput,
} from "@/server/services/SnapshotService";
import type {
  SnapshotBuildResult,
  SnapshotDetailResult,
  SnapshotListResult,
} from "@/domain/snapshots/types";
import type { AppResult } from "@/utils/general/result";

export type SnapshotServiceLike = {
  buildSnapshot(
    input: BuildSnapshotServiceInput
  ): Promise<AppResult<SnapshotBuildResult>>;
  getSnapshot(
    input: GetSnapshotServiceInput
  ): Promise<AppResult<SnapshotDetailResult>>;
  listOrderSnapshots(
    input: ListOrderSnapshotsServiceInput
  ): Promise<AppResult<SnapshotListResult>>;
};

export type SnapshotControllerResult<T> = {
  status: number;
  body: ApiResponse<T>;
};

export type BuildSnapshotControllerInput = {
  actor: BuildSnapshotServiceInput["actor"];
  requestId: string;
  body: Record<string, unknown>;
};

export type GetSnapshotControllerInput = {
  actor: GetSnapshotServiceInput["actor"];
  requestId: string;
  snapshotId: string;
};

export type ListOrderSnapshotsControllerInput = {
  actor: ListOrderSnapshotsServiceInput["actor"];
  requestId: string;
  orderId: string;
};

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): SnapshotControllerResult<T> {
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

export class SnapshotController {
  constructor(private readonly service: SnapshotServiceLike) {}

  async buildSnapshot(
    input: BuildSnapshotControllerInput
  ): Promise<SnapshotControllerResult<SnapshotBuildResult>> {
    const result = await this.service.buildSnapshot(input);

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

  async getSnapshot(
    input: GetSnapshotControllerInput
  ): Promise<SnapshotControllerResult<SnapshotDetailResult>> {
    const result = await this.service.getSnapshot(input);

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

  async listOrderSnapshots(
    input: ListOrderSnapshotsControllerInput
  ): Promise<SnapshotControllerResult<SnapshotListResult>> {
    const result = await this.service.listOrderSnapshots(input);

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
