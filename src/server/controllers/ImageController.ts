import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type {
  GetImageServiceInput,
  ImageDetailResult,
  ImageListServiceResult,
  ListProductImagesServiceInput,
  RemoveImageServiceInput,
  SetPrimaryImageServiceInput,
  UpdateImageOrderServiceInput,
  UploadImageServiceInput,
} from "@/server/services/ImageService";
import type { AppResult } from "@/utils/general/result";

export type ImageServiceLike = {
  uploadImage(input: UploadImageServiceInput): Promise<AppResult<ImageDetailResult>>;
  listProductImages(
    input: ListProductImagesServiceInput
  ): Promise<AppResult<ImageListServiceResult>>;
  updateImageOrder(
    input: UpdateImageOrderServiceInput
  ): Promise<AppResult<ImageDetailResult>>;
  setPrimaryImage(
    input: SetPrimaryImageServiceInput
  ): Promise<AppResult<ImageDetailResult>>;
  removeImage(input: RemoveImageServiceInput): Promise<AppResult<ImageDetailResult>>;
  getImage(input: GetImageServiceInput): Promise<AppResult<ImageDetailResult>>;
};

export type ImageControllerResult<T> = {
  status: number;
  body: ApiResponse<T>;
};

export type UploadImageControllerInput = {
  actor: UploadImageServiceInput["actor"];
  requestId: string;
  productId: string;
  file: File;
  name?: string | null;
};

export type ListProductImagesControllerInput = {
  actor: ListProductImagesServiceInput["actor"];
  requestId: string;
  productId: string;
};

export type UpdateImageOrderControllerInput = {
  actor: UpdateImageOrderServiceInput["actor"];
  requestId: string;
  productId: string;
  photoId: string;
  body: Record<string, unknown>;
};

export type SetPrimaryImageControllerInput = {
  actor: SetPrimaryImageServiceInput["actor"];
  requestId: string;
  productId: string;
  photoId: string;
};

export type RemoveImageControllerInput = {
  actor: RemoveImageServiceInput["actor"];
  requestId: string;
  productId: string;
  photoId: string;
};

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): ImageControllerResult<T> {
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

export class ImageController {
  constructor(private readonly service: ImageServiceLike) {}

  async uploadImage(
    input: UploadImageControllerInput
  ): Promise<ImageControllerResult<ImageDetailResult>> {
    const result = await this.service.uploadImage(input);

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

  async listProductImages(
    input: ListProductImagesControllerInput
  ): Promise<ImageControllerResult<ImageListServiceResult>> {
    const result = await this.service.listProductImages(input);

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

  async updateImageOrder(
    input: UpdateImageOrderControllerInput
  ): Promise<ImageControllerResult<ImageDetailResult>> {
    const result = await this.service.updateImageOrder(input);

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

  async setPrimaryImage(
    input: SetPrimaryImageControllerInput
  ): Promise<ImageControllerResult<ImageDetailResult>> {
    const result = await this.service.setPrimaryImage(input);

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

  async removeImage(
    input: RemoveImageControllerInput
  ): Promise<ImageControllerResult<ImageDetailResult>> {
    const result = await this.service.removeImage(input);

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