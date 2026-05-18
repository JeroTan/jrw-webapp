import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type {
  AcceptBrandInvitationServiceInput,
  ApproveBrandJoinRequestServiceInput,
  ArchiveBrandServiceInput,
  BrandAcceptInvitationResult,
  BrandApproveJoinRequestResult,
  BrandActorInput,
  BrandArchiveResult,
  BrandCreateResult,
  BrandInviteResult,
  BrandListAdminBrandsResult,
  BrandListProductsResult,
  BrandRejectJoinRequestResult,
  BrandRequestJoinResult,
  BrandUpdateResult,
  CreateBrandServiceInput,
  InviteBrandServiceInput,
  ListAdminBrandsServiceInput,
  ListBrandlessProductsServiceInput,
  ListBrandQueryInput,
  ListBrandScopedProductsServiceInput,
  RejectBrandJoinRequestServiceInput,
  RequestBrandJoinServiceInput,
  UpdateBrandServiceInput,
} from "@/server/services/BrandService";
import type { AppResult } from "@/utils/general/result";

export type BrandServiceLike = {
  createBrand(input: CreateBrandServiceInput): Promise<AppResult<BrandCreateResult>>;
  updateBrand(input: UpdateBrandServiceInput): Promise<AppResult<BrandUpdateResult>>;
  archiveBrand(
    input: ArchiveBrandServiceInput
  ): Promise<AppResult<BrandArchiveResult>>;
  inviteAdminToBrand(
    input: InviteBrandServiceInput
  ): Promise<AppResult<BrandInviteResult>>;
  acceptBrandInvitation(
    input: AcceptBrandInvitationServiceInput
  ): Promise<AppResult<BrandAcceptInvitationResult>>;
  requestBrandJoin(
    input: RequestBrandJoinServiceInput
  ): Promise<AppResult<BrandRequestJoinResult>>;
  approveBrandJoinRequest(
    input: ApproveBrandJoinRequestServiceInput
  ): Promise<AppResult<BrandApproveJoinRequestResult>>;
  rejectBrandJoinRequest(
    input: RejectBrandJoinRequestServiceInput
  ): Promise<AppResult<BrandRejectJoinRequestResult>>;
  listBrandScopedProducts(
    input: ListBrandScopedProductsServiceInput
  ): Promise<AppResult<BrandListProductsResult>>;
  listBrandlessProducts(
    input: ListBrandlessProductsServiceInput
  ): Promise<AppResult<BrandListProductsResult>>;
  listAdminBrands(
    input: ListAdminBrandsServiceInput
  ): Promise<AppResult<BrandListAdminBrandsResult>>;
};

export type BrandControllerResult<T> = {
  status: number;
  body: ApiResponse<T>;
};

export type CreateBrandControllerInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  body: Record<string, unknown>;
};

export type UpdateBrandControllerInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  brandId: string;
  body: Record<string, unknown>;
};

export type ArchiveBrandControllerInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  brandId: string;
};

export type InviteBrandControllerInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  brandId: string;
  body: Record<string, unknown>;
};

export type AcceptBrandInvitationControllerInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  brandId: string;
};

export type RequestBrandJoinControllerInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  brandId: string;
};

export type ApproveBrandJoinRequestControllerInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  brandId: string;
  adminId: string;
};

export type RejectBrandJoinRequestControllerInput =
  ApproveBrandJoinRequestControllerInput;

export type ListBrandScopedProductsControllerInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  brandId: string;
  query: ListBrandQueryInput;
};

export type ListBrandlessProductsControllerInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  query: ListBrandQueryInput;
};

export type ListAdminBrandsControllerInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  query: ListBrandQueryInput;
};

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): BrandControllerResult<T> {
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

export class BrandController {
  constructor(private readonly service: BrandServiceLike) {}

  async createBrand(
    input: CreateBrandControllerInput
  ): Promise<BrandControllerResult<BrandCreateResult>> {
    const result = await this.service.createBrand(input);

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

  async updateBrand(
    input: UpdateBrandControllerInput
  ): Promise<BrandControllerResult<BrandUpdateResult>> {
    const result = await this.service.updateBrand(input);

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

  async archiveBrand(
    input: ArchiveBrandControllerInput
  ): Promise<BrandControllerResult<BrandArchiveResult>> {
    const result = await this.service.archiveBrand(input);

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

  async inviteAdminToBrand(
    input: InviteBrandControllerInput
  ): Promise<BrandControllerResult<BrandInviteResult>> {
    const result = await this.service.inviteAdminToBrand(input);

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

  async acceptBrandInvitation(
    input: AcceptBrandInvitationControllerInput
  ): Promise<BrandControllerResult<BrandAcceptInvitationResult>> {
    const result = await this.service.acceptBrandInvitation(input);

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

  async requestBrandJoin(
    input: RequestBrandJoinControllerInput
  ): Promise<BrandControllerResult<BrandRequestJoinResult>> {
    const result = await this.service.requestBrandJoin(input);

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

  async approveBrandJoinRequest(
    input: ApproveBrandJoinRequestControllerInput
  ): Promise<BrandControllerResult<BrandApproveJoinRequestResult>> {
    const result = await this.service.approveBrandJoinRequest(input);

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

  async rejectBrandJoinRequest(
    input: RejectBrandJoinRequestControllerInput
  ): Promise<BrandControllerResult<BrandRejectJoinRequestResult>> {
    const result = await this.service.rejectBrandJoinRequest(input);

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

  async listBrandScopedProducts(
    input: ListBrandScopedProductsControllerInput
  ): Promise<BrandControllerResult<BrandListProductsResult>> {
    const result = await this.service.listBrandScopedProducts(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 200,
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
        page: result.content.page,
        pageSize: result.content.pageSize,
        totalItems: result.content.totalItems,
        totalPages: result.content.totalPages,
      }),
    };
  }

  async listBrandlessProducts(
    input: ListBrandlessProductsControllerInput
  ): Promise<BrandControllerResult<BrandListProductsResult>> {
    const result = await this.service.listBrandlessProducts(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 200,
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
        page: result.content.page,
        pageSize: result.content.pageSize,
        totalItems: result.content.totalItems,
        totalPages: result.content.totalPages,
      }),
    };
  }

  async listAdminBrands(
    input: ListAdminBrandsControllerInput
  ): Promise<BrandControllerResult<BrandListAdminBrandsResult>> {
    const result = await this.service.listAdminBrands(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 200,
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
        page: result.content.page,
        pageSize: result.content.pageSize,
        totalItems: result.content.totalItems,
        totalPages: result.content.totalPages,
      }),
    };
  }
}
