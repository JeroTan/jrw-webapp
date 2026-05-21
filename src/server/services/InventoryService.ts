import { createAuditEvent, NoopAuditEventPublisher, type AuditEventPublisher } from "@/domain/audit/events";
import { evaluateRouteAccess } from "@/domain/auth/rbac";
import {
  deriveInventoryStateFromQuantity,
  inventoryStateConsistent,
  zodUpdateInventoryStateInput,
  zodUpdateStockInput,
} from "@/domain/products/schemas";
import type {
  InventoryAvailabilityRecord,
  InventoryState,
  ProductRecord,
  ProductVariantRecord,
} from "@/domain/products/types";
import type { RequestActorContext } from "@/server/context/request-context";
import type {
  ProductBrandMembershipRecord,
  ProductBrandRecord,
} from "@/server/repositories/ProductRepository";
import type { VariantRepository } from "@/server/repositories/VariantRepository";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

type InventoryAuth = {
  mode: "required";
  roles: readonly ["ADMIN", "SUPER_ADMIN"];
};

const inventoryAuth: InventoryAuth = {
  mode: "required",
  roles: ["ADMIN", "SUPER_ADMIN"],
};

type InventoryProductScopeRepository = {
  findById(productId: string): Promise<ProductRecord | null>;
  findBrandById(brandId: string): Promise<ProductBrandRecord | null>;
  findBrandMembership(
    brandId: string,
    adminId: string
  ): Promise<ProductBrandMembershipRecord | null>;
};

export type InventoryActorInput = Pick<
  RequestActorContext,
  | "authenticated"
  | "role"
  | "actorId"
  | "safeActorId"
  | "accountStatus"
  | "eligibility"
>;

export type UpdateStockQuantityServiceInput = {
  actor: InventoryActorInput | undefined;
  requestId: string;
  productId: string;
  variantId: string;
  body: Record<string, unknown>;
};

export type UpdateInventoryStateServiceInput = {
  actor: InventoryActorInput | undefined;
  requestId: string;
  productId: string;
  variantId: string;
  body: Record<string, unknown>;
};

export type GetAvailabilityServiceInput = {
  requestId: string;
  productId: string;
  variantId: string;
};

export type InventoryDetailResult = {
  variant: ProductVariantRecord;
};

export type InventoryAvailabilityResult = {
  availability: InventoryAvailabilityRecord;
};

export type InventoryServiceOptions = {
  variantRepository: VariantRepository;
  productRepository: InventoryProductScopeRepository;
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

export class InventoryService {
  private readonly variantRepository: VariantRepository;
  private readonly productRepository: InventoryProductScopeRepository;
  private readonly auditPublisher: AuditEventPublisher;
  private readonly now: () => Date;

  constructor(options: InventoryServiceOptions) {
    this.variantRepository = options.variantRepository;
    this.productRepository = options.productRepository;
    this.auditPublisher = options.auditPublisher ?? new NoopAuditEventPublisher();
    this.now = options.now ?? (() => new Date());
  }

  private requireAdminActor(
    actor: InventoryActorInput | undefined
  ): AppResult<{
    actorId: string;
    safeActorId: string;
    role: "ADMIN" | "SUPER_ADMIN";
  }> {
    const decision = evaluateRouteAccess({
      auth: inventoryAuth,
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

  private async loadVariantOrError(input: {
    productId: string;
    variantId: string;
  }): Promise<AppResult<ProductVariantRecord>> {
    const variant = await this.variantRepository.findById(input.variantId);
    if (!variant || variant.productId !== input.productId) {
      return Result.error(
        serviceError("RESOURCE_NOT_FOUND", { reason: "VARIANT_NOT_FOUND" })
      );
    }

    return Result.okay(variant);
  }

  private async inventoryMutationFailureError(input: {
    productId: string;
    variantId: string;
  }): Promise<GeneralError> {
    const current = await this.variantRepository.findById(input.variantId);
    if (!current || current.productId !== input.productId) {
      return serviceError("RESOURCE_NOT_FOUND", { reason: "VARIANT_NOT_FOUND" });
    }

    if (current.status === "ARCHIVED") {
      return serviceError("CONFLICT_STATE", { reason: "VARIANT_ARCHIVED" });
    }

    return serviceError("CONFLICT_STATE", {
      reason: "INVENTORY_VERSION_CONFLICT",
    });
  }

  validateStateTransition(input: {
    quantity: number;
    state: InventoryState;
  }): AppResult<null> {
    if (!inventoryStateConsistent(input)) {
      return Result.error(
        serviceError("CONFLICT_STATE", {
          reason: "INVENTORY_STATE_CONFLICT",
          quantity: input.quantity,
          state: input.state,
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
    oldQuantity: number;
    newQuantity: number;
    oldState: InventoryState;
    newState: InventoryState;
    operation: "stock.quantity_updated" | "inventory.state_changed";
  }): Promise<void> {
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
        operation: input.operation,
        productId: input.productId,
        variantId: input.variantId,
        oldQuantity: input.oldQuantity,
        newQuantity: input.newQuantity,
        oldState: input.oldState,
        newState: input.newState,
      },
      occurredAt: this.now().toISOString(),
    });

    await this.auditPublisher.publish(event);
  }

  async updateStockQuantity(
    input: UpdateStockQuantityServiceInput
  ): Promise<AppResult<InventoryDetailResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    const parsed = zodUpdateStockInput.safeParse(input.body ?? {});
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

      const existing = await this.loadVariantOrError({
        productId: input.productId,
        variantId: input.variantId,
      });
      if (existing.error) {
        return Result.error(existing.error);
      }

      if (existing.content.status === "ARCHIVED") {
        return Result.error(
          serviceError("CONFLICT_STATE", { reason: "VARIANT_ARCHIVED" })
        );
      }

      const nextState = deriveInventoryStateFromQuantity({
        quantity: parsed.data.quantity,
        isPreorder: existing.content.inventoryState === "PREORDER",
      });

      const updated = await this.variantRepository.updateStockQuantity({
        variantId: input.variantId,
        quantity: parsed.data.quantity,
        inventoryState: nextState,
        expectedStockVersion: existing.content.stockVersion,
      });

      if (!updated) {
        return Result.error(await this.inventoryMutationFailureError(input));
      }

      await this.publishAudit({
        requestId: input.requestId,
        actorId: actor.content.actorId,
        safeActorId: actor.content.safeActorId,
        actorRole: actor.content.role,
        productId: input.productId,
        variantId: input.variantId,
        oldQuantity: existing.content.stock,
        newQuantity: updated.stock,
        oldState: existing.content.inventoryState,
        newState: updated.inventoryState,
        operation: "stock.quantity_updated",
      });

      return Result.okay({
        variant: updated,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async updateInventoryState(
    input: UpdateInventoryStateServiceInput
  ): Promise<AppResult<InventoryDetailResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    const parsed = zodUpdateInventoryStateInput.safeParse(input.body ?? {});
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

      const existing = await this.loadVariantOrError({
        productId: input.productId,
        variantId: input.variantId,
      });
      if (existing.error) {
        return Result.error(existing.error);
      }

      if (existing.content.status === "ARCHIVED") {
        return Result.error(
          serviceError("CONFLICT_STATE", { reason: "VARIANT_ARCHIVED" })
        );
      }

      const transition = this.validateStateTransition({
        quantity: existing.content.stock,
        state: parsed.data.state,
      });
      if (transition.error) {
        return transition;
      }

      const updated = await this.variantRepository.updateInventoryState({
        variantId: input.variantId,
        inventoryState: parsed.data.state,
        expectedStockVersion: existing.content.stockVersion,
      });

      if (!updated) {
        return Result.error(await this.inventoryMutationFailureError(input));
      }

      await this.publishAudit({
        requestId: input.requestId,
        actorId: actor.content.actorId,
        safeActorId: actor.content.safeActorId,
        actorRole: actor.content.role,
        productId: input.productId,
        variantId: input.variantId,
        oldQuantity: existing.content.stock,
        newQuantity: updated.stock,
        oldState: existing.content.inventoryState,
        newState: updated.inventoryState,
        operation: "inventory.state_changed",
      });

      return Result.okay({
        variant: updated,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async getAvailability(
    input: GetAvailabilityServiceInput
  ): Promise<AppResult<InventoryAvailabilityResult>> {
    try {
      const availability = await this.variantRepository.getStockAvailability({
        productId: input.productId,
        variantId: input.variantId,
      });

      if (!availability) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", { reason: "VARIANT_NOT_FOUND" })
        );
      }

      return Result.okay({
        availability,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }
}
