import type {
  PublicBrandDetailResult,
  PublicBrandListResult,
} from "@/domain/brands/public-types";
import type { PublicBrandRepository } from "@/server/repositories/PublicBrandRepository";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

export type PublicBrandListServiceInput = {
  requestId: string;
};

export type PublicBrandDetailServiceInput = {
  requestId: string;
  slugOrId: string;
};

export type PublicBrandServiceOptions = {
  repository: PublicBrandRepository;
};

function serviceError(
  code: "VALIDATION_FAILED" | "RESOURCE_NOT_FOUND" | "PROVIDER_UNAVAILABLE",
  data: Record<string, unknown> = {}
) {
  return new GeneralError(data, code);
}

function providerFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    /D1_|SQLITE_|database|query|constraint|prepare|execute|transaction|storage/i.test(
      error.message
    )
  );
}

export class PublicBrandService {
  private readonly repository: PublicBrandRepository;

  constructor(options: PublicBrandServiceOptions) {
    this.repository = options.repository;
  }

  async listBrands(
    _input: PublicBrandListServiceInput
  ): Promise<AppResult<PublicBrandListResult>> {
    try {
      const items = await this.repository.listBrandRows();

      return Result.okay({ items });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async getBrand(
    input: PublicBrandDetailServiceInput
  ): Promise<AppResult<PublicBrandDetailResult>> {
    const slugOrId = input.slugOrId.trim();

    if (!slugOrId) {
      return Result.error(
        serviceError("VALIDATION_FAILED", { reason: "MISSING_BRAND_ID" })
      );
    }

    try {
      const brand = await this.repository.findBrandRow(slugOrId);

      if (!brand) {
        return Result.error(serviceError("RESOURCE_NOT_FOUND", { slugOrId }));
      }

      return Result.okay({ brand });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }
}
