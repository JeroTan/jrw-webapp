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
  BrandDetailResult,
  BrandInviteResult,
  BrandListAdminBrandsResult,
  BrandListMembershipsResult,
  BrandListProductsResult,
  BrandProductMutationGuardResult,
  BrandRejectJoinRequestResult,
  BrandRequestJoinResult,
  BrandUpdateResult,
  CreateBrandServiceInput,
  GetBrandDetailServiceInput,
  GuardBrandProductCreateServiceInput,
  GuardBrandProductReassignmentServiceInput,
  GuardBrandProductUpdateServiceInput,
  GuardBrandlessProductMutationServiceInput,
  InviteBrandServiceInput,
  ListAdminBrandsServiceInput,
  ListBrandInvitesServiceInput,
  ListBrandJoinRequestsServiceInput,
  ListBrandMembersServiceInput,
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
  getBrandDetail(
    input: GetBrandDetailServiceInput
  ): Promise<AppResult<BrandDetailResult>>;
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
  guardBrandProductCreate(
    input: GuardBrandProductCreateServiceInput
  ): Promise<AppResult<BrandProductMutationGuardResult>>;
  guardBrandProductUpdate(
    input: GuardBrandProductUpdateServiceInput
  ): Promise<AppResult<BrandProductMutationGuardResult>>;
  guardBrandProductReassignment(
    input: GuardBrandProductReassignmentServiceInput
  ): Promise<AppResult<BrandProductMutationGuardResult>>;
  guardBrandlessProductMutation(
    input: GuardBrandlessProductMutationServiceInput
  ): Promise<AppResult<BrandProductMutationGuardResult>>;
  listBrandScopedProducts(
    input: ListBrandScopedProductsServiceInput
  ): Promise<AppResult<BrandListProductsResult>>;
  listBrandMembers(
    input: ListBrandMembersServiceInput
  ): Promise<AppResult<BrandListMembershipsResult>>;
  listBrandInvites(
    input: ListBrandInvitesServiceInput
  ): Promise<AppResult<BrandListMembershipsResult>>;
  listBrandJoinRequests(
    input: ListBrandJoinRequestsServiceInput
  ): Promise<AppResult<BrandListMembershipsResult>>;
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

export type BrandDetailControllerInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  brandId: string;
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

export type ListBrandMembersControllerInput = BrandDetailControllerInput;
export type ListBrandInvitesControllerInput = BrandDetailControllerInput;
export type ListBrandJoinRequestsControllerInput = BrandDetailControllerInput;

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

export type GuardBrandProductCreateControllerInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  brandId: string;
};

export type GuardBrandProductUpdateControllerInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  brandId: string;
  productId: string;
};

export type GuardBrandProductReassignmentControllerInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
  productId: string;
  body: Record<string, unknown>;
};

export type GuardBrandlessProductMutationControllerInput = {
  actor: BrandActorInput | undefined;
  requestId: string;
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

  async getBrandDetail(
    input: BrandDetailControllerInput
  ): Promise<BrandControllerResult<BrandDetailResult>> {
    const result = await this.service.getBrandDetail(input);

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

  async listBrandMembers(
    input: ListBrandMembersControllerInput
  ): Promise<BrandControllerResult<BrandListMembershipsResult>> {
    const result = await this.service.listBrandMembers(input);

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

  async listBrandInvites(
    input: ListBrandInvitesControllerInput
  ): Promise<BrandControllerResult<BrandListMembershipsResult>> {
    const result = await this.service.listBrandInvites(input);

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

  async listBrandJoinRequests(
    input: ListBrandJoinRequestsControllerInput
  ): Promise<BrandControllerResult<BrandListMembershipsResult>> {
    const result = await this.service.listBrandJoinRequests(input);

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

  async guardBrandProductCreate(
    input: GuardBrandProductCreateControllerInput
  ): Promise<BrandControllerResult<BrandProductMutationGuardResult>> {
    const result = await this.service.guardBrandProductCreate(input);

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

  async guardBrandProductUpdate(
    input: GuardBrandProductUpdateControllerInput
  ): Promise<BrandControllerResult<BrandProductMutationGuardResult>> {
    const result = await this.service.guardBrandProductUpdate(input);

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

  async guardBrandProductReassignment(
    input: GuardBrandProductReassignmentControllerInput
  ): Promise<BrandControllerResult<BrandProductMutationGuardResult>> {
    const result = await this.service.guardBrandProductReassignment({
      actor: input.actor,
      requestId: input.requestId,
      productId: input.productId,
      targetBrandId:
        typeof input.body.targetBrandId === "string"
          ? input.body.targetBrandId
          : "",
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

  async guardBrandlessProductMutation(
    input: GuardBrandlessProductMutationControllerInput
  ): Promise<BrandControllerResult<BrandProductMutationGuardResult>> {
    const result = await this.service.guardBrandlessProductMutation(input);

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
