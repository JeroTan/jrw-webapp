import { createAuditEvent, NoopAuditEventPublisher, type AuditEventPublisher } from "@/domain/audit/events";
import { evaluateRouteAccess } from "@/domain/auth/rbac";
import {
  zodArchiveProductVariantInput,
  zodCreateProductVariantInput,
  zodUpdateProductVariantInput,
} from "@/domain/products/schemas";
import type {
  ProductRecord,
  ProductVariantRecord,
  VariantListResult,
} from "@/domain/products/types";
import type { RequestActorContext } from "@/server/context/request-context";
import type {
  ProductBrandMembershipRecord,
  ProductBrandRecord,
} from "@/server/repositories/ProductRepository";
import type { VariantRepository } from "@/server/repositories/VariantRepository";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

type VariantAuth = {
  mode: "required";
  roles: readonly ["ADMIN", "SUPER_ADMIN"];
};

const variantAuth: VariantAuth = {
  mode: "required",
  roles: ["ADMIN", "SUPER_ADMIN"],
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type VariantProductScopeRepository = {
  findById(productId: string): Promise<ProductRecord | null>;
  findBrandById(brandId: string): Promise<ProductBrandRecord | null>;
  findBrandMembership(
    brandId: string,
    adminId: string
  ): Promise<ProductBrandMembershipRecord | null>;
};

export type VariantActorInput = Pick<
  RequestActorContext,
  | "authenticated"
  | "role"
  | "actorId"
  | "safeActorId"
  | "accountStatus"
  | "eligibility"
>;

export type ListProductVariantsServiceInput = {
  actor: VariantActorInput | undefined;
  requestId: string;
  productId: string;
  query: {
    page?: number;
    pageSize?: number;
  };
};

export type CreateVariantServiceInput = {
  actor: VariantActorInput | undefined;
  requestId: string;
  productId: string;
  body: Record<string, unknown>;
};

export type UpdateVariantServiceInput = {
  actor: VariantActorInput | undefined;
  requestId: string;
  productId: string;
  variantId: string;
  body: Record<string, unknown>;
};

export type ArchiveVariantServiceInput = {
  actor: VariantActorInput | undefined;
  requestId: string;
  productId: string;
  variantId: string;
  body: Record<string, unknown>;
};

export type VariantDetailServiceInput = {
  actor: VariantActorInput | undefined;
  requestId: string;
  productId: string;
  variantId: string;
};

export type VariantDetailResult = {
  variant: ProductVariantRecord;
};

export type VariantServiceOptions = {
  variantRepository: VariantRepository;
  productRepository: VariantProductScopeRepository;
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

function normalizePagination(query: {
  page?: number;
  pageSize?: number;
}): { page: number; pageSize: number } {
  const page =
    typeof query.page === "number" &&
    Number.isFinite(query.page) &&
    Number.isInteger(query.page) &&
    query.page > 0
      ? query.page
      : DEFAULT_PAGE;
  const requestedPageSize =
    typeof query.pageSize === "number" &&
    Number.isFinite(query.pageSize) &&
    Number.isInteger(query.pageSize) &&
    query.pageSize > 0
      ? query.pageSize
      : DEFAULT_PAGE_SIZE;

  return {
    page,
    pageSize: Math.min(requestedPageSize, MAX_PAGE_SIZE),
  };
}

export class VariantService {
  private readonly variantRepository: VariantRepository;
  private readonly productRepository: VariantProductScopeRepository;
  private readonly auditPublisher: AuditEventPublisher;
  private readonly now: () => Date;

  constructor(options: VariantServiceOptions) {
    this.variantRepository = options.variantRepository;
    this.productRepository = options.productRepository;
    this.auditPublisher =
      options.auditPublisher ?? new NoopAuditEventPublisher();
    this.now = options.now ?? (() => new Date());
  }

  private requireAdminActor(
    actor: VariantActorInput | undefined
  ): AppResult<{
    actorId: string;
    safeActorId: string;
    role: "ADMIN" | "SUPER_ADMIN";
  }> {
    const decision = evaluateRouteAccess({
      auth: variantAuth,
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
      sku: body.sku,
      priceCentavos: body.priceCentavos,
      stock: this.hasOwnField(body, "stock") ? body.stock : undefined,
      isPreorder: this.hasOwnField(body, "isPreorder")
        ? body.isPreorder
        : undefined,
      expectedRelease: this.hasOwnField(body, "expectedRelease")
        ? body.expectedRelease
        : undefined,
      variationChain: this.hasOwnField(body, "variationChain")
        ? body.variationChain
        : undefined,
    };
  }

  private normalizeUpdateBody(body: Record<string, unknown>) {
    const patch: Record<string, unknown> = {};

    if (this.hasOwnField(body, "name")) {
      patch.name = body.name;
    }
    if (this.hasOwnField(body, "sku")) {
      patch.sku = body.sku;
    }
    if (this.hasOwnField(body, "priceCentavos")) {
      patch.priceCentavos = body.priceCentavos;
    }
    if (this.hasOwnField(body, "stock")) {
      patch.stock = body.stock;
    }
    if (this.hasOwnField(body, "isPreorder")) {
      patch.isPreorder = body.isPreorder;
    }
    if (this.hasOwnField(body, "expectedRelease")) {
      patch.expectedRelease = body.expectedRelease;
    }
    if (this.hasOwnField(body, "variationChain")) {
      patch.variationChain = body.variationChain;
    }

    return patch;
  }

  private async loadProductOrError(
    productId: string
  ): Promise<AppResult<ProductRecord>> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      return Result.error(
        serviceError("RESOURCE_NOT_FOUND", { reason: "PRODUCT_NOT_FOUND" })
      );
    }

    return Result.okay(product);
  }

  private async requireBrandMutationPermission(input: {
    actorId: string;
    role: "ADMIN" | "SUPER_ADMIN";
    brandId: string | null;
  }): Promise<AppResult<null>> {
    if (!input.brandId) {
      return Result.okay(null);
    }

    const brand = await this.productRepository.findBrandById(input.brandId);
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

    const membership = await this.productRepository.findBrandMembership(
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

  private async loadVariantOrError(
    variantId: string,
    productId: string
  ): Promise<AppResult<ProductVariantRecord>> {
    const variant = await this.variantRepository.findById(variantId);
    if (!variant || variant.productId !== productId) {
      return Result.error(
        serviceError("RESOURCE_NOT_FOUND", { reason: "VARIANT_NOT_FOUND" })
      );
    }

    return Result.okay(variant);
  }

  private async ensureSkuAvailable(input: {
    sku: string;
    excludeVariantId?: string;
  }): Promise<AppResult<null>> {
    const existing = await this.variantRepository.findBySku(input.sku);
    if (existing && existing.id !== input.excludeVariantId) {
      return Result.error(
        serviceError("CONFLICT_STATE", { reason: "DUPLICATE_SKU" })
      );
    }

    return Result.okay(null);
  }

  private async ensureOptionCombinationAvailable(input: {
    productId: string;
    variationChain: ProductVariantRecord["variationChain"];
    excludeVariantId?: string;
  }): Promise<AppResult<null>> {
    const duplicate = await this.variantRepository.findDuplicateOptionCombination({
      productId: input.productId,
      variationChain: input.variationChain,
      excludeVariantId: input.excludeVariantId,
    });
    if (duplicate) {
      return Result.error(
        serviceError("CONFLICT_STATE", {
          reason: "DUPLICATE_OPTION_COMBINATION",
        })
      );
    }

    return Result.okay(null);
  }

  private async publishAudit(input: {
    requestId: string;
    actorId: string;
    safeActorId: string;
    actorRole: "ADMIN" | "SUPER_ADMIN";
    productId: string;
    variantId: string;
    operation:
      | "create_variant"
      | "update_variant"
      | "archive_variant";
    oldVariant?: ProductVariantRecord;
    newVariant: ProductVariantRecord;
    reason?: string;
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
        operation: input.operation,
        productId: input.productId,
        variantId: input.variantId,
        reason: input.reason ?? null,
        oldVariant: input.oldVariant,
        newVariant: input.newVariant,
      },
      occurredAt: this.now().toISOString(),
    });

    await this.auditPublisher.publish(event);
  }

  private async publishInventoryAudit(input: {
    requestId: string;
    actorId: string;
    safeActorId: string;
    actorRole: "ADMIN" | "SUPER_ADMIN";
    productId: string;
    variantId: string;
    oldVariant: ProductVariantRecord;
    newVariant: ProductVariantRecord;
  }): Promise<void> {
    const stockChanged = input.oldVariant.stock !== input.newVariant.stock;
    const stateChanged =
      input.oldVariant.inventoryState !== input.newVariant.inventoryState;

    if (!stockChanged && !stateChanged) {
      return;
    }

    const event = createAuditEvent({
      requestId: input.requestId,
      action: "inventory.stock_adjusted",
      actor: {
        type: "user",
        id: input.actorId,
        role: input.actorRole,
        safeIdentifier: input.safeActorId,
      },
      target: {
        entity: "inventory",
        entityId: input.variantId,
      },
      safeDetails: {
        operation: stockChanged
          ? "stock.quantity_updated"
          : "inventory.state_changed",
        productId: input.productId,
        variantId: input.variantId,
        oldQuantity: input.oldVariant.stock,
        newQuantity: input.newVariant.stock,
        oldState: input.oldVariant.inventoryState,
        newState: input.newVariant.inventoryState,
      },
      occurredAt: this.now().toISOString(),
    });

    await this.auditPublisher.publish(event);
  }

  async listProductVariants(
    input: ListProductVariantsServiceInput
  ): Promise<AppResult<VariantListResult>> {
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

      const pagination = normalizePagination(input.query);
      return Result.okay(
        await this.variantRepository.listByProductId(input.productId, pagination)
      );
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async createVariant(
    input: CreateVariantServiceInput
  ): Promise<AppResult<VariantDetailResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    const parsed = zodCreateProductVariantInput.safeParse(
      this.normalizeCreateBody(input.body)
    );
    if (!parsed.success) {
      return Result.error(
        serviceError("VALIDATION_FAILED", { reasons: zodReasons(parsed.error) })
      );
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

      const skuAvailable = await this.ensureSkuAvailable({
        sku: parsed.data.sku,
      });
      if (skuAvailable.error) {
        return Result.error(skuAvailable.error);
      }

      const optionAvailable = await this.ensureOptionCombinationAvailable({
        productId: input.productId,
        variationChain: parsed.data.variationChain,
      });
      if (optionAvailable.error) {
        return Result.error(optionAvailable.error);
      }

      const variant = await this.variantRepository.create({
        productId: input.productId,
        name: parsed.data.name,
        sku: parsed.data.sku,
        priceCentavos: parsed.data.priceCentavos,
        stock: parsed.data.stock,
        isPreorder: parsed.data.isPreorder,
        expectedRelease: parsed.data.expectedRelease ?? null,
        variationChain: parsed.data.variationChain,
      });

      await this.publishAudit({
        requestId: input.requestId,
        actorId: actor.content.actorId,
        safeActorId: actor.content.safeActorId,
        actorRole: actor.content.role,
        productId: input.productId,
        variantId: variant.id,
        operation: "create_variant",
        newVariant: variant,
      });

      return Result.okay({ variant });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return Result.error(
          serviceError("CONFLICT_STATE", { reason: "DUPLICATE_SKU" })
        );
      }
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async getVariant(
    input: VariantDetailServiceInput
  ): Promise<AppResult<VariantDetailResult>> {
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

      const variant = await this.loadVariantOrError(
        input.variantId,
        input.productId
      );
      if (variant.error) {
        return Result.error(variant.error);
      }

      return Result.okay({
        variant: variant.content,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }
      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async updateVariant(
    input: UpdateVariantServiceInput
  ): Promise<AppResult<VariantDetailResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    const parsed = zodUpdateProductVariantInput.safeParse(
      this.normalizeUpdateBody(input.body)
    );
    if (!parsed.success) {
      return Result.error(
        serviceError("VALIDATION_FAILED", { reasons: zodReasons(parsed.error) })
      );
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

      const existing = await this.loadVariantOrError(
        input.variantId,
        input.productId
      );
      if (existing.error) {
        return Result.error(existing.error);
      }

      if (existing.content.status === "ARCHIVED") {
        return Result.error(
          serviceError("CONFLICT_STATE", { reason: "VARIANT_ARCHIVED" })
        );
      }

      if (parsed.data.sku !== undefined) {
        const skuAvailable = await this.ensureSkuAvailable({
          sku: parsed.data.sku,
          excludeVariantId: input.variantId,
        });
        if (skuAvailable.error) {
          return Result.error(skuAvailable.error);
        }
      }

      if (parsed.data.variationChain !== undefined) {
        const optionAvailable = await this.ensureOptionCombinationAvailable({
          productId: input.productId,
          variationChain: parsed.data.variationChain,
          excludeVariantId: input.variantId,
        });
        if (optionAvailable.error) {
          return Result.error(optionAvailable.error);
        }
      }

      const updated = await this.variantRepository.update(input.variantId, {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.sku !== undefined ? { sku: parsed.data.sku } : {}),
        ...(parsed.data.priceCentavos !== undefined
          ? { priceCentavos: parsed.data.priceCentavos }
          : {}),
        ...(parsed.data.stock !== undefined ? { stock: parsed.data.stock } : {}),
        ...(parsed.data.isPreorder !== undefined
          ? { isPreorder: parsed.data.isPreorder }
          : {}),
        ...(parsed.data.expectedRelease !== undefined
          ? { expectedRelease: parsed.data.expectedRelease ?? null }
          : {}),
        ...(parsed.data.variationChain !== undefined
          ? { variationChain: parsed.data.variationChain }
          : {}),
      });

      if (!updated) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", { reason: "VARIANT_NOT_FOUND" })
        );
      }

      await this.publishAudit({
        requestId: input.requestId,
        actorId: actor.content.actorId,
        safeActorId: actor.content.safeActorId,
        actorRole: actor.content.role,
        productId: input.productId,
        variantId: updated.id,
        operation: "update_variant",
        oldVariant: existing.content,
        newVariant: updated,
      });
      await this.publishInventoryAudit({
        requestId: input.requestId,
        actorId: actor.content.actorId,
        safeActorId: actor.content.safeActorId,
        actorRole: actor.content.role,
        productId: input.productId,
        variantId: updated.id,
        oldVariant: existing.content,
        newVariant: updated,
      });

      return Result.okay({
        variant: updated,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return Result.error(
          serviceError("CONFLICT_STATE", { reason: "DUPLICATE_SKU" })
        );
      }
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }
      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async archiveVariant(
    input: ArchiveVariantServiceInput
  ): Promise<AppResult<VariantDetailResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    const parsed = zodArchiveProductVariantInput.safeParse(input.body ?? {});
    if (!parsed.success) {
      return Result.error(
        serviceError("VALIDATION_FAILED", { reasons: zodReasons(parsed.error) })
      );
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

      const existing = await this.loadVariantOrError(
        input.variantId,
        input.productId
      );
      if (existing.error) {
        return Result.error(existing.error);
      }

      if (existing.content.status === "ARCHIVED") {
        return Result.error(
          serviceError("CONFLICT_STATE", { reason: "VARIANT_ARCHIVED" })
        );
      }

      const archived = await this.variantRepository.archive(input.variantId);
      if (!archived) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", { reason: "VARIANT_NOT_FOUND" })
        );
      }

      await this.publishAudit({
        requestId: input.requestId,
        actorId: actor.content.actorId,
        safeActorId: actor.content.safeActorId,
        actorRole: actor.content.role,
        productId: input.productId,
        variantId: archived.id,
        operation: "archive_variant",
        oldVariant: existing.content,
        newVariant: archived,
        reason: parsed.data.reason,
      });

      return Result.okay({
        variant: archived,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }
      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }
}
