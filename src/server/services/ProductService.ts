import {
  createProductDraft,
  normalizeProductListQuery,
  normalizeProductSlug,
  updateProductDraft,
} from "@/domain/products/product";
import {
  evaluateProductPublishReadiness,
  validateProductStatusTransition,
} from "@/domain/products/readiness";
import {
  zodAssignProductBrandInput,
  zodAssignProductCategoriesInput,
  PRODUCT_SLUG_MAX_LENGTH,
  zodCreateProductInput,
  zodProductReadinessResult,
  zodUpdateProductInput,
} from "@/domain/products/schemas";
import type {
  ProductListQueryInput,
  ProductListResult,
  ProductOrganizationRecord,
  ProductReadinessResult,
  ProductRecord,
} from "@/domain/products/types";
import {
  createAuditEvent,
  NoopAuditEventPublisher,
  type AuditEventPublisher,
} from "@/domain/audit/events";
import { evaluateRouteAccess } from "@/domain/auth/rbac";
import type { RequestActorContext } from "@/server/context/request-context";
import type {
  ProductBrandMembershipRecord,
  ProductCategoryRecord,
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
  | "authenticated"
  | "role"
  | "actorId"
  | "safeActorId"
  | "accountStatus"
  | "eligibility"
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

export type AssignProductBrandServiceInput = {
  actor: ProductActorInput | undefined;
  requestId: string;
  productId: string;
  body: Record<string, unknown>;
};

export type RemoveProductBrandServiceInput = {
  actor: ProductActorInput | undefined;
  requestId: string;
  productId: string;
};

export type AssignProductCategoriesServiceInput = {
  actor: ProductActorInput | undefined;
  requestId: string;
  productId: string;
  body: Record<string, unknown>;
};

export type RemoveProductCategoryServiceInput = {
  actor: ProductActorInput | undefined;
  requestId: string;
  productId: string;
  categoryId: string;
};

export type ProductOrganizationServiceInput = {
  actor: ProductActorInput | undefined;
  requestId: string;
  productId: string;
};

export type ProductStatusMutationServiceInput = {
  actor: ProductActorInput | undefined;
  requestId: string;
  productId: string;
};

export type ProductCreateResult = {
  product: ProductRecord;
};

export type ProductDetailResult = ProductCreateResult;
export type ProductUpdateResult = ProductCreateResult;
export type ProductListProductsResult = ProductListResult;
export type ProductOrganizationMutationResult = {
  product: ProductRecord;
  organization: ProductOrganizationRecord;
};
export type ProductOrganizationResult = {
  organization: ProductOrganizationRecord;
};

export type ProductStatusMutationResult = {
  product: ProductRecord;
};

export type ProductReadinessServiceResult = {
  readiness: ProductReadinessResult;
};

export type ProductServiceOptions = {
  repository: ProductRepository;
  auditPublisher?: AuditEventPublisher;
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
  private readonly auditPublisher: AuditEventPublisher;
  private readonly now: () => Date;

  constructor(options: ProductServiceOptions) {
    this.repository = options.repository;
    this.auditPublisher =
      options.auditPublisher ?? new NoopAuditEventPublisher();
    this.now = options.now ?? (() => new Date());
  }

  private requireAdminActor(
    actor: ProductActorInput | undefined
  ): AppResult<{
    actorId: string;
    safeActorId: string;
    role: "ADMIN" | "SUPER_ADMIN";
  }> {
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
      safeActorId: actor.safeActorId ?? actor.actorId,
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

  private normalizeBrandAssignmentBody(body: Record<string, unknown>) {
    return {
      brandId: this.hasOwnField(body, "brandId") ? body.brandId : null,
    };
  }

  private normalizeCategoryAssignmentBody(body: Record<string, unknown>) {
    return {
      categoryIds: this.hasOwnField(body, "categoryIds") ? body.categoryIds : [],
    };
  }

  private hasExplicitSlug(body: Record<string, unknown>): boolean {
    return (
      this.hasOwnField(body, "slug") &&
      typeof body.slug === "string" &&
      body.slug.trim().length > 0
    );
  }

  private async loadProductOrError(
    productId: string
  ): Promise<AppResult<ProductRecord>> {
    const product = await this.repository.findById(productId);
    if (!product) {
      return Result.error(
        serviceError("RESOURCE_NOT_FOUND", { reason: "PRODUCT_NOT_FOUND" })
      );
    }

    return Result.okay(product);
  }

  private async loadOrganizationOrError(
    productId: string
  ): Promise<AppResult<ProductOrganizationRecord>> {
    const organization = await this.repository.findOrganization(productId);
    if (!organization) {
      return Result.error(
        serviceError("RESOURCE_NOT_FOUND", { reason: "PRODUCT_NOT_FOUND" })
      );
    }

    return Result.okay(organization);
  }

  private async validateCategoryAssignment(
    categoryIds: string[]
  ): Promise<AppResult<{ categoryIds: string[]; categories: ProductCategoryRecord[] }>> {
    const normalizedCategoryIds = Array.from(
      new Set(
        categoryIds
          .map((categoryId) => categoryId.trim())
          .filter((categoryId) => categoryId.length > 0)
      )
    );

    if (normalizedCategoryIds.length === 0) {
      return Result.okay({ categoryIds: [], categories: [] });
    }

    const categories = await this.repository.findCategoriesByIds(
      normalizedCategoryIds
    );
    const foundCategoryIds = new Set(categories.map((category) => category.id));
    const missingCategoryIds = normalizedCategoryIds.filter(
      (categoryId) => !foundCategoryIds.has(categoryId)
    );

    if (missingCategoryIds.length > 0) {
      return Result.error(
        serviceError("VALIDATION_FAILED", {
          reason: "INVALID_CATEGORY_IDS",
          categoryIds: missingCategoryIds,
        })
      );
    }

    const inactiveCategoryIds = categories
      .filter((category) => category.status !== "ACTIVE")
      .map((category) => category.id);
    if (inactiveCategoryIds.length > 0) {
      return Result.error(
        serviceError("VALIDATION_FAILED", {
          reason: "CATEGORY_NOT_ACTIVE",
          categoryIds: inactiveCategoryIds,
        })
      );
    }

    return Result.okay({
      categoryIds: normalizedCategoryIds,
      categories,
    });
  }

  private async publishOrganizationAudit(input: {
    requestId: string;
    actorId: string;
    safeActorId: string;
    actorRole: "ADMIN" | "SUPER_ADMIN";
    operation:
      | "assign_product_brand"
      | "remove_product_brand"
      | "assign_product_categories"
      | "remove_product_category";
    productId: string;
    oldOrganization: ProductOrganizationRecord;
    newOrganization: ProductOrganizationRecord;
    timestamp: string;
  }): Promise<void> {
    const event = createAuditEvent({
      requestId: input.requestId,
      action: "catalog.product_updated",
      actor: {
        type: "user",
        id: input.actorId,
        role: input.actorRole,
        safeIdentifier: input.safeActorId,
      },
      target: {
        entity: "catalog",
        entityId: input.productId,
      },
      safeDetails: {
        requestId: input.requestId,
        operation: input.operation,
        oldOrganization: input.oldOrganization,
        newOrganization: input.newOrganization,
        timestamp: input.timestamp,
      },
      occurredAt: input.timestamp,
    });

    await this.auditPublisher.publish(event);
  }

  private async publishStatusAudit(input: {
    requestId: string;
    actorId: string;
    safeActorId: string;
    actorRole: "ADMIN" | "SUPER_ADMIN";
    productId: string;
    oldStatus: ProductRecord["status"];
    newStatus: ProductRecord["status"];
    action: "catalog.product_published" | "catalog.product_updated" | "catalog.product_archived";
    operation: "publish_product" | "unpublish_product" | "archive_product";
    timestamp: string;
  }): Promise<void> {
    const event = createAuditEvent({
      requestId: input.requestId,
      action: input.action,
      actor: {
        type: "user",
        id: input.actorId,
        role: input.actorRole,
        safeIdentifier: input.safeActorId,
      },
      target: {
        entity: "catalog",
        entityId: input.productId,
      },
      safeDetails: {
        requestId: input.requestId,
        operation: input.operation,
        oldStatus: input.oldStatus,
        newStatus: input.newStatus,
        timestamp: input.timestamp,
      },
      occurredAt: input.timestamp,
    });

    await this.auditPublisher.publish(event);
  }

  private async resolveReadiness(
    productId: string
  ): Promise<AppResult<ProductReadinessResult>> {
    const snapshot = await this.repository.getPublishReadiness(productId);
    if (!snapshot) {
      return Result.error(
        serviceError("RESOURCE_NOT_FOUND", { reason: "PRODUCT_NOT_FOUND" })
      );
    }

    const readiness = evaluateProductPublishReadiness(snapshot);
    const parsed = zodProductReadinessResult.safeParse(readiness);
    if (!parsed.success) {
      return Result.error(serviceError("VALIDATION_FAILED"));
    }

    return Result.okay(parsed.data);
  }

  private async statusMutationConflict(input: {
    productId: string;
    nextStatus: ProductRecord["status"];
  }): Promise<GeneralError> {
    const current = await this.repository.findById(input.productId);
    if (!current) {
      return serviceError("RESOURCE_NOT_FOUND", {
        reason: "PRODUCT_NOT_FOUND",
      });
    }

    const transition = validateProductStatusTransition({
      currentStatus: current.status,
      nextStatus: input.nextStatus,
    });
    if (transition.error) {
      return transition.error;
    }

    return serviceError("CONFLICT_STATE", {
      reason: "PRODUCT_STATUS_CHANGED",
      currentStatus: current.status,
      nextStatus: input.nextStatus,
    });
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

  async assignProductBrand(
    input: AssignProductBrandServiceInput
  ): Promise<AppResult<ProductOrganizationMutationResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    const parsed = zodAssignProductBrandInput.safeParse(
      this.normalizeBrandAssignmentBody(input.body)
    );
    if (!parsed.success) {
      return Result.error(
        serviceError("VALIDATION_FAILED", { reasons: zodReasons(parsed.error) })
      );
    }

    try {
      const existing = await this.loadProductOrError(input.productId);
      if (existing.error) {
        return Result.error(existing.error);
      }

      const sourceMembership = await this.requireBrandMutationPermission({
        actorId: actor.content.actorId,
        role: actor.content.role,
        brandId: existing.content.brandId,
      });
      if (sourceMembership.error) {
        return Result.error(sourceMembership.error);
      }

      const targetBrandId = parsed.data.brandId;
      if (targetBrandId) {
        const targetMembership = await this.requireBrandMutationPermission({
          actorId: actor.content.actorId,
          role: actor.content.role,
          brandId: targetBrandId,
        });
        if (targetMembership.error) {
          return Result.error(targetMembership.error);
        }
      }

      const oldOrganization = await this.loadOrganizationOrError(input.productId);
      if (oldOrganization.error) {
        return Result.error(oldOrganization.error);
      }

      const timestamp = this.now().toISOString();
      const product = targetBrandId
        ? await this.repository.assignBrand(
            input.productId,
            targetBrandId,
            timestamp
          )
        : await this.repository.removeBrand(input.productId, timestamp);

      const newOrganization = await this.loadOrganizationOrError(input.productId);
      if (newOrganization.error) {
        return Result.error(newOrganization.error);
      }

      await this.publishOrganizationAudit({
        requestId: input.requestId,
        actorId: actor.content.actorId,
        safeActorId: actor.content.safeActorId,
        actorRole: actor.content.role,
        operation: targetBrandId
          ? "assign_product_brand"
          : "remove_product_brand",
        productId: input.productId,
        oldOrganization: oldOrganization.content,
        newOrganization: newOrganization.content,
        timestamp,
      });

      return Result.okay({
        product,
        organization: newOrganization.content,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async removeProductBrand(
    input: RemoveProductBrandServiceInput
  ): Promise<AppResult<ProductOrganizationMutationResult>> {
    return this.assignProductBrand({
      actor: input.actor,
      requestId: input.requestId,
      productId: input.productId,
      body: {
        brandId: null,
      },
    });
  }

  async assignProductCategories(
    input: AssignProductCategoriesServiceInput
  ): Promise<AppResult<ProductOrganizationMutationResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    const parsed = zodAssignProductCategoriesInput.safeParse(
      this.normalizeCategoryAssignmentBody(input.body)
    );
    if (!parsed.success) {
      return Result.error(
        serviceError("VALIDATION_FAILED", { reasons: zodReasons(parsed.error) })
      );
    }

    try {
      const existing = await this.loadProductOrError(input.productId);
      if (existing.error) {
        return Result.error(existing.error);
      }

      const membership = await this.requireBrandMutationPermission({
        actorId: actor.content.actorId,
        role: actor.content.role,
        brandId: existing.content.brandId,
      });
      if (membership.error) {
        return Result.error(membership.error);
      }

      const validatedCategories = await this.validateCategoryAssignment(
        parsed.data.categoryIds
      );
      if (validatedCategories.error) {
        return Result.error(validatedCategories.error);
      }

      const oldOrganization = await this.loadOrganizationOrError(input.productId);
      if (oldOrganization.error) {
        return Result.error(oldOrganization.error);
      }

      const timestamp = this.now().toISOString();
      await this.repository.assignCategories(
        input.productId,
        validatedCategories.content.categoryIds,
        timestamp
      );

      const product = await this.repository.findById(input.productId);
      if (!product) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", { reason: "PRODUCT_NOT_FOUND" })
        );
      }

      const newOrganization = await this.loadOrganizationOrError(input.productId);
      if (newOrganization.error) {
        return Result.error(newOrganization.error);
      }

      await this.publishOrganizationAudit({
        requestId: input.requestId,
        actorId: actor.content.actorId,
        safeActorId: actor.content.safeActorId,
        actorRole: actor.content.role,
        operation: "assign_product_categories",
        productId: input.productId,
        oldOrganization: oldOrganization.content,
        newOrganization: newOrganization.content,
        timestamp,
      });

      return Result.okay({
        product,
        organization: newOrganization.content,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async removeProductCategory(
    input: RemoveProductCategoryServiceInput
  ): Promise<AppResult<ProductOrganizationMutationResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    try {
      const existing = await this.loadProductOrError(input.productId);
      if (existing.error) {
        return Result.error(existing.error);
      }

      const membership = await this.requireBrandMutationPermission({
        actorId: actor.content.actorId,
        role: actor.content.role,
        brandId: existing.content.brandId,
      });
      if (membership.error) {
        return Result.error(membership.error);
      }

      const oldOrganization = await this.loadOrganizationOrError(input.productId);
      if (oldOrganization.error) {
        return Result.error(oldOrganization.error);
      }

      const timestamp = this.now().toISOString();
      await this.repository.removeCategory(
        input.productId,
        input.categoryId,
        timestamp
      );

      const product = await this.repository.findById(input.productId);
      if (!product) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", { reason: "PRODUCT_NOT_FOUND" })
        );
      }

      const newOrganization = await this.loadOrganizationOrError(input.productId);
      if (newOrganization.error) {
        return Result.error(newOrganization.error);
      }

      await this.publishOrganizationAudit({
        requestId: input.requestId,
        actorId: actor.content.actorId,
        safeActorId: actor.content.safeActorId,
        actorRole: actor.content.role,
        operation: "remove_product_category",
        productId: input.productId,
        oldOrganization: oldOrganization.content,
        newOrganization: newOrganization.content,
        timestamp,
      });

      return Result.okay({
        product,
        organization: newOrganization.content,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async getPublishReadiness(
    input: ProductStatusMutationServiceInput
  ): Promise<AppResult<ProductReadinessServiceResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    try {
      const existing = await this.loadProductOrError(input.productId);
      if (existing.error) {
        return Result.error(existing.error);
      }

      const membership = await this.requireBrandMutationPermission({
        actorId: actor.content.actorId,
        role: actor.content.role,
        brandId: existing.content.brandId,
      });
      if (membership.error) {
        return Result.error(membership.error);
      }

      const readiness = await this.resolveReadiness(input.productId);
      if (readiness.error) {
        return Result.error(readiness.error);
      }

      return Result.okay({
        readiness: readiness.content,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async publish(
    input: ProductStatusMutationServiceInput
  ): Promise<AppResult<ProductStatusMutationResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    try {
      const existing = await this.loadProductOrError(input.productId);
      if (existing.error) {
        return Result.error(existing.error);
      }

      const membership = await this.requireBrandMutationPermission({
        actorId: actor.content.actorId,
        role: actor.content.role,
        brandId: existing.content.brandId,
      });
      if (membership.error) {
        return Result.error(membership.error);
      }

      const transition = validateProductStatusTransition({
        currentStatus: existing.content.status,
        nextStatus: "PUBLISHED",
      });
      if (transition.error) {
        return Result.error(transition.error);
      }

      const readiness = await this.resolveReadiness(input.productId);
      if (readiness.error) {
        return Result.error(readiness.error);
      }

      if (!readiness.content.isReady) {
        return Result.error(
          serviceError("CONFLICT_STATE", {
            reason: "PRODUCT_NOT_READY_FOR_PUBLISH",
            missingItems: readiness.content.missingItems,
          })
        );
      }

      const timestamp = this.now().toISOString();
      const product = await this.repository.publishProduct(
        input.productId,
        timestamp
      );
      if (!product) {
        return Result.error(
          await this.statusMutationConflict({
            productId: input.productId,
            nextStatus: "PUBLISHED",
          })
        );
      }

      await this.publishStatusAudit({
        requestId: input.requestId,
        actorId: actor.content.actorId,
        safeActorId: actor.content.safeActorId,
        actorRole: actor.content.role,
        productId: input.productId,
        oldStatus: existing.content.status,
        newStatus: product.status,
        action: "catalog.product_published",
        operation: "publish_product",
        timestamp,
      });

      return Result.okay({
        product,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async unpublish(
    input: ProductStatusMutationServiceInput
  ): Promise<AppResult<ProductStatusMutationResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    try {
      const existing = await this.loadProductOrError(input.productId);
      if (existing.error) {
        return Result.error(existing.error);
      }

      const membership = await this.requireBrandMutationPermission({
        actorId: actor.content.actorId,
        role: actor.content.role,
        brandId: existing.content.brandId,
      });
      if (membership.error) {
        return Result.error(membership.error);
      }

      const transition = validateProductStatusTransition({
        currentStatus: existing.content.status,
        nextStatus: "DRAFT",
      });
      if (transition.error) {
        return Result.error(transition.error);
      }

      const timestamp = this.now().toISOString();
      const product = await this.repository.draftProduct(input.productId, timestamp);
      if (!product) {
        return Result.error(
          await this.statusMutationConflict({
            productId: input.productId,
            nextStatus: "DRAFT",
          })
        );
      }

      await this.publishStatusAudit({
        requestId: input.requestId,
        actorId: actor.content.actorId,
        safeActorId: actor.content.safeActorId,
        actorRole: actor.content.role,
        productId: input.productId,
        oldStatus: existing.content.status,
        newStatus: product.status,
        action: "catalog.product_updated",
        operation: "unpublish_product",
        timestamp,
      });

      return Result.okay({
        product,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async archive(
    input: ProductStatusMutationServiceInput
  ): Promise<AppResult<ProductStatusMutationResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    try {
      const existing = await this.loadProductOrError(input.productId);
      if (existing.error) {
        return Result.error(existing.error);
      }

      const membership = await this.requireBrandMutationPermission({
        actorId: actor.content.actorId,
        role: actor.content.role,
        brandId: existing.content.brandId,
      });
      if (membership.error) {
        return Result.error(membership.error);
      }

      const transition = validateProductStatusTransition({
        currentStatus: existing.content.status,
        nextStatus: "ARCHIVED",
      });
      if (transition.error) {
        return Result.error(transition.error);
      }

      const timestamp = this.now().toISOString();
      const product = await this.repository.archiveProduct(
        input.productId,
        timestamp
      );
      if (!product) {
        return Result.error(
          await this.statusMutationConflict({
            productId: input.productId,
            nextStatus: "ARCHIVED",
          })
        );
      }

      await this.publishStatusAudit({
        requestId: input.requestId,
        actorId: actor.content.actorId,
        safeActorId: actor.content.safeActorId,
        actorRole: actor.content.role,
        productId: input.productId,
        oldStatus: existing.content.status,
        newStatus: product.status,
        action: "catalog.product_archived",
        operation: "archive_product",
        timestamp,
      });

      return Result.okay({
        product,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async getProductOrganization(
    input: ProductOrganizationServiceInput
  ): Promise<AppResult<ProductOrganizationResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    try {
      const product = await this.loadProductOrError(input.productId);
      if (product.error) {
        return Result.error(product.error);
      }

      const membership = await this.requireBrandMutationPermission({
        actorId: actor.content.actorId,
        role: actor.content.role,
        brandId: product.content.brandId,
      });
      if (membership.error) {
        return Result.error(membership.error);
      }

      const organization = await this.loadOrganizationOrError(input.productId);
      if (organization.error) {
        return Result.error(organization.error);
      }

      return Result.okay({
        organization: organization.content,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }
}
