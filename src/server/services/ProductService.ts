import {
  createProductDraft,
  normalizeProductListQuery,
  normalizeProductSlug,
  updateProductDraft,
} from "@/domain/products/product";
import {
  PRODUCT_SLUG_MAX_LENGTH,
  zodCreateProductInput,
  zodUpdateProductInput,
} from "@/domain/products/schemas";
import type {
  ProductListQueryInput,
  ProductListResult,
  ProductRecord,
} from "@/domain/products/types";
import { evaluateRouteAccess } from "@/domain/auth/rbac";
import type { RequestActorContext } from "@/server/context/request-context";
import type {
  ProductBrandMembershipRecord,
  ProductRepository,
  UpdateProductRecordInput,
} from "@/server/repositories/ProductRepository";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

type ProductAuth = {
  mode: "required";
  roles: readonly ["ADMIN", "SUPER_ADMIN"];
};

const productAuth: ProductAuth = {
  mode: "required",
  roles: ["ADMIN", "SUPER_ADMIN"],
};

const MAX_SLUG_SUFFIX_ATTEMPTS = 10_000;

export type ProductActorInput = Pick<
  RequestActorContext,
  "authenticated" | "role" | "actorId" | "accountStatus" | "eligibility"
>;

export type CreateProductServiceInput = {
  actor: ProductActorInput | undefined;
  requestId: string;
  body: Record<string, unknown>;
};

export type ListProductsServiceInput = {
  actor: ProductActorInput | undefined;
  requestId: string;
  query: ProductListQueryInput;
};

export type ProductDetailServiceInput = {
  actor: ProductActorInput | undefined;
  requestId: string;
  productId: string;
};

export type UpdateProductServiceInput = {
  actor: ProductActorInput | undefined;
  requestId: string;
  productId: string;
  body: Record<string, unknown>;
};

export type ProductCreateResult = {
  product: ProductRecord;
};

export type ProductDetailResult = ProductCreateResult;
export type ProductUpdateResult = ProductCreateResult;
export type ProductListProductsResult = ProductListResult;

export type ProductServiceOptions = {
  repository: ProductRepository;
  now?: () => Date;
};

function serviceError(
  code:
    | "AUTH_REQUIRED"
    | "AUTH_FORBIDDEN"
    | "ACCOUNT_SUSPENDED"
    | "EMAIL_NOT_VERIFIED"
    | "ADMIN_APPROVAL_REQUIRED"
    | "VALIDATION_FAILED"
    | "RESOURCE_NOT_FOUND"
    | "CONFLICT_STATE"
    | "PROVIDER_UNAVAILABLE",
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

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /SQLITE_CONSTRAINT|UNIQUE constraint failed|constraint failed/i.test(
      error.message
    )
  );
}

function zodReasons(error: unknown): string[] {
  if (!(error instanceof Error) || !("issues" in error)) {
    return ["payload:invalid"];
  }

  const issues = (
    error as {
      issues?: Array<{ path: Array<string | number>; message: string }>;
    }
  ).issues;
  if (!issues || issues.length === 0) {
    return ["payload:invalid"];
  }

  return issues.map((issue) => {
    const path = issue.path.map(String).join(".");
    return `${path || "payload"}:${issue.message}`;
  });
}

function isActiveMembership(
  membership: ProductBrandMembershipRecord | null
): membership is ProductBrandMembershipRecord {
  if (!membership) {
    return false;
  }

  if (membership.status !== "ACTIVE") {
    return false;
  }

  return membership.role === "OWNER" || membership.role === "MEMBER";
}

export class ProductService {
  private readonly repository: ProductRepository;
  private readonly now: () => Date;

  constructor(options: ProductServiceOptions) {
    this.repository = options.repository;
    this.now = options.now ?? (() => new Date());
  }

  private requireAdminActor(
    actor: ProductActorInput | undefined
  ): AppResult<{ actorId: string; role: "ADMIN" | "SUPER_ADMIN" }> {
    const decision = evaluateRouteAccess({
      auth: productAuth,
      actor,
    });

    if (!decision.allowed) {
      return Result.error(serviceError(decision.code));
    }

    if (!actor?.actorId) {
      return Result.error(serviceError("AUTH_REQUIRED"));
    }

    if (
      decision.actorRole !== "ADMIN" &&
      decision.actorRole !== "SUPER_ADMIN"
    ) {
      return Result.error(serviceError("AUTH_FORBIDDEN"));
    }

    return Result.okay({
      actorId: actor.actorId,
      role: decision.actorRole,
    });
  }

  private hasOwnField(body: Record<string, unknown>, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(body, key);
  }

  private normalizeCreateBody(body: Record<string, unknown>) {
    return {
      name: body.name,
      slug: this.hasOwnField(body, "slug") ? body.slug : undefined,
      summary: this.hasOwnField(body, "summary") ? body.summary : undefined,
      description: body.description,
    };
  }

  private normalizeUpdateBody(body: Record<string, unknown>) {
    const patch: Record<string, unknown> = {};

    if (this.hasOwnField(body, "name")) {
      patch.name = body.name;
    }
    if (this.hasOwnField(body, "slug")) {
      patch.slug = body.slug;
    }
    if (this.hasOwnField(body, "summary")) {
      patch.summary = body.summary;
    }
    if (this.hasOwnField(body, "description")) {
      patch.description = body.description;
    }

    return patch;
  }

  private hasExplicitSlug(body: Record<string, unknown>): boolean {
    return (
      this.hasOwnField(body, "slug") &&
      typeof body.slug === "string" &&
      body.slug.trim().length > 0
    );
  }

  private async resolveUniqueSlug(
    requestedSlug: string,
    excludeProductId?: string
  ): Promise<string> {
    const normalizedBase = normalizeProductSlug(requestedSlug);
    let candidate = normalizedBase.slice(0, PRODUCT_SLUG_MAX_LENGTH);

    for (let suffix = 0; suffix < MAX_SLUG_SUFFIX_ATTEMPTS; suffix += 1) {
      const existing = await this.repository.findBySlug(candidate);
      if (!existing || existing.id === excludeProductId) {
        return candidate;
      }

      const suffixToken = `-${suffix + 1}`;
      const maxBaseLength = PRODUCT_SLUG_MAX_LENGTH - suffixToken.length;
      candidate = `${normalizedBase.slice(0, maxBaseLength)}${suffixToken}`;
    }

    throw new Error("D1_ERROR: could not resolve unique slug");
  }

  private async resolveAvailableSlug(
    requestedSlug: string,
    excludeProductId?: string
  ): Promise<AppResult<string>> {
    const candidate = normalizeProductSlug(requestedSlug).slice(
      0,
      PRODUCT_SLUG_MAX_LENGTH
    );
    const existing = await this.repository.findBySlug(candidate);

    if (existing && existing.id !== excludeProductId) {
      return Result.error(
        serviceError("CONFLICT_STATE", { reason: "DUPLICATE_SLUG" })
      );
    }

    return Result.okay(candidate);
  }

  private async requireBrandMutationPermission(input: {
    actorId: string;
    role: "ADMIN" | "SUPER_ADMIN";
    brandId: string | null;
  }): Promise<AppResult<null>> {
    if (!input.brandId) {
      return Result.okay(null);
    }

    const brand = await this.repository.findBrandById(input.brandId);
    if (!brand) {
      return Result.error(
        serviceError("CONFLICT_STATE", { reason: "BRAND_NOT_FOUND" })
      );
    }

    if (brand.status === "ARCHIVED") {
      return Result.error(
        serviceError("CONFLICT_STATE", { reason: "BRAND_ARCHIVED" })
      );
    }

    if (input.role === "SUPER_ADMIN") {
      return Result.okay(null);
    }

    const membership = await this.repository.findBrandMembership(
      input.brandId,
      input.actorId
    );
    if (!isActiveMembership(membership)) {
      return Result.error(
        serviceError("AUTH_FORBIDDEN", { reason: "BRAND_MEMBERSHIP_REQUIRED" })
      );
    }

    return Result.okay(null);
  }

  async createProduct(
    input: CreateProductServiceInput
  ): Promise<AppResult<ProductCreateResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    const parsed = zodCreateProductInput.safeParse(
      this.normalizeCreateBody(input.body)
    );
    if (!parsed.success) {
      return Result.error(
        serviceError("VALIDATION_FAILED", { reasons: zodReasons(parsed.error) })
      );
    }

    const draft = createProductDraft(parsed.data);
    if (draft.error) {
      return Result.error(serviceError("VALIDATION_FAILED", draft.error.data));
    }

    try {
      const slugResult = this.hasExplicitSlug(input.body)
        ? await this.resolveAvailableSlug(draft.content.slug)
        : Result.okay(await this.resolveUniqueSlug(draft.content.slug));
      if (slugResult.error) {
        return Result.error(slugResult.error);
      }

      const timestamp = this.now().toISOString();
      const product = await this.repository.create({
        name: draft.content.name,
        slug: slugResult.content,
        summary: draft.content.summary,
        description: draft.content.description,
        status: "DRAFT",
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      return Result.okay({ product });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return Result.error(
          serviceError("CONFLICT_STATE", { reason: "DUPLICATE_SLUG" })
        );
      }

      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async getProduct(
    input: ProductDetailServiceInput
  ): Promise<AppResult<ProductDetailResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    try {
      const product = await this.repository.findById(input.productId);
      if (!product) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", { reason: "PRODUCT_NOT_FOUND" })
        );
      }

      const membership = await this.requireBrandMutationPermission({
        actorId: actor.content.actorId,
        role: actor.content.role,
        brandId: product.brandId,
      });
      if (membership.error) {
        return Result.error(membership.error);
      }

      return Result.okay({ product });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async listProducts(
    input: ListProductsServiceInput
  ): Promise<AppResult<ProductListProductsResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    const query = normalizeProductListQuery(input.query);
    if (query.error) {
      return Result.error(serviceError("VALIDATION_FAILED", query.error.data));
    }

    try {
      if (query.content.brandId) {
        const membership = await this.requireBrandMutationPermission({
          actorId: actor.content.actorId,
          role: actor.content.role,
          brandId: query.content.brandId,
        });
        if (membership.error) {
          return Result.error(membership.error);
        }
      }

      return Result.okay(
        await this.repository.list({
          ...query.content,
          viewerAdminId: actor.content.actorId,
          restrictToViewerMembership: actor.content.role !== "SUPER_ADMIN",
        })
      );
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async updateProduct(
    input: UpdateProductServiceInput
  ): Promise<AppResult<ProductUpdateResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    const parsed = zodUpdateProductInput.safeParse(
      this.normalizeUpdateBody(input.body)
    );
    if (!parsed.success) {
      return Result.error(
        serviceError("VALIDATION_FAILED", { reasons: zodReasons(parsed.error) })
      );
    }

    const patchDraft = updateProductDraft(parsed.data);
    if (patchDraft.error) {
      return Result.error(
        serviceError("VALIDATION_FAILED", patchDraft.error.data)
      );
    }

    try {
      const existing = await this.repository.findById(input.productId);
      if (!existing) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", { reason: "PRODUCT_NOT_FOUND" })
        );
      }

      const membership = await this.requireBrandMutationPermission({
        actorId: actor.content.actorId,
        role: actor.content.role,
        brandId: existing.brandId,
      });
      if (membership.error) {
        return Result.error(membership.error);
      }

      const updatePatch: UpdateProductRecordInput = {
        ...(patchDraft.content.name !== undefined
          ? { name: patchDraft.content.name }
          : {}),
        ...(patchDraft.content.summary !== undefined
          ? { summary: patchDraft.content.summary }
          : {}),
        ...(patchDraft.content.description !== undefined
          ? { description: patchDraft.content.description }
          : {}),
        updatedAt: this.now().toISOString(),
      };

      if (patchDraft.content.slug !== undefined) {
        const slugResult = await this.resolveAvailableSlug(
          patchDraft.content.slug,
          existing.id
        );
        if (slugResult.error) {
          return Result.error(slugResult.error);
        }

        updatePatch.slug = slugResult.content;
      }

      const product = await this.repository.update(input.productId, updatePatch);
      return Result.okay({ product });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return Result.error(
          serviceError("CONFLICT_STATE", { reason: "DUPLICATE_SLUG" })
        );
      }

      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }
}
