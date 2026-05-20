import {
  archiveCategoryTransition,
  createCategoryDraft,
  normalizeCategoryListQuery,
  normalizeCategorySlug,
  updateCategoryDraft,
} from "@/domain/categories/category";
import {
  CATEGORY_SLUG_MAX_LENGTH,
  zodCreateCategoryInput,
  zodUpdateCategoryInput,
} from "@/domain/categories/schemas";
import type {
  CategoryListQueryInput,
  CategoryListResult,
  CategoryRecord,
} from "@/domain/categories/types";
import { evaluateRouteAccess } from "@/domain/auth/rbac";
import type { RequestActorContext } from "@/server/context/request-context";
import type {
  CategoryRepository,
  UpdateCategoryRecordInput,
} from "@/server/repositories/CategoryRepository";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

type CategoryAuth = {
  mode: "required";
  roles: readonly ["ADMIN", "SUPER_ADMIN"];
};

const categoryAuth: CategoryAuth = {
  mode: "required",
  roles: ["ADMIN", "SUPER_ADMIN"],
};

const MAX_SLUG_SUFFIX_ATTEMPTS = 10_000;

export type CategoryActorInput = Pick<
  RequestActorContext,
  "authenticated" | "role" | "actorId" | "accountStatus" | "eligibility"
>;

export type CreateCategoryServiceInput = {
  actor: CategoryActorInput | undefined;
  requestId: string;
  body: Record<string, unknown>;
};

export type ListCategoriesServiceInput = {
  actor: CategoryActorInput | undefined;
  requestId: string;
  query: CategoryListQueryInput;
};

export type CategoryDetailServiceInput = {
  actor: CategoryActorInput | undefined;
  requestId: string;
  categoryId: string;
};

export type UpdateCategoryServiceInput = {
  actor: CategoryActorInput | undefined;
  requestId: string;
  categoryId: string;
  body: Record<string, unknown>;
};

export type ArchiveCategoryServiceInput = {
  actor: CategoryActorInput | undefined;
  requestId: string;
  categoryId: string;
};

export type CategoryCreateResult = {
  category: CategoryRecord;
};

export type CategoryDetailResult = CategoryCreateResult;
export type CategoryUpdateResult = CategoryCreateResult;
export type CategoryArchiveResult = CategoryCreateResult;
export type CategoryListCategoriesResult = CategoryListResult;

export type CategoryServiceOptions = {
  repository: CategoryRepository;
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

export class CategoryService {
  private readonly repository: CategoryRepository;
  private readonly now: () => Date;

  constructor(options: CategoryServiceOptions) {
    this.repository = options.repository;
    this.now = options.now ?? (() => new Date());
  }

  private requireAdminActor(
    actor: CategoryActorInput | undefined
  ): AppResult<{ actorId: string; role: "ADMIN" | "SUPER_ADMIN" }> {
    const decision = evaluateRouteAccess({
      auth: categoryAuth,
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
      description: this.hasOwnField(body, "description")
        ? body.description
        : undefined,
      sortOrder: this.hasOwnField(body, "sortOrder")
        ? Number(body.sortOrder)
        : undefined,
      isVisible: this.hasOwnField(body, "isVisible")
        ? body.isVisible
        : undefined,
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
    if (this.hasOwnField(body, "description")) {
      patch.description = body.description;
    }
    if (this.hasOwnField(body, "sortOrder")) {
      patch.sortOrder = Number(body.sortOrder);
    }
    if (this.hasOwnField(body, "isVisible")) {
      patch.isVisible = body.isVisible;
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
    excludeCategoryId?: string
  ): Promise<string> {
    const normalizedBase = normalizeCategorySlug(requestedSlug);
    let candidate = normalizedBase.slice(0, CATEGORY_SLUG_MAX_LENGTH);

    for (let suffix = 0; suffix < MAX_SLUG_SUFFIX_ATTEMPTS; suffix += 1) {
      const existing = await this.repository.findBySlug(candidate);
      if (!existing || existing.id === excludeCategoryId) {
        return candidate;
      }

      const suffixToken = `-${suffix + 1}`;
      const maxBaseLength = CATEGORY_SLUG_MAX_LENGTH - suffixToken.length;
      candidate = `${normalizedBase.slice(0, maxBaseLength)}${suffixToken}`;
    }

    throw new Error("D1_ERROR: could not resolve unique slug");
  }

  private async resolveAvailableSlug(
    requestedSlug: string,
    excludeCategoryId?: string
  ): Promise<AppResult<string>> {
    const candidate = normalizeCategorySlug(requestedSlug).slice(
      0,
      CATEGORY_SLUG_MAX_LENGTH
    );
    const existing = await this.repository.findBySlug(candidate);

    if (existing && existing.id !== excludeCategoryId) {
      return Result.error(
        serviceError("CONFLICT_STATE", { reason: "DUPLICATE_SLUG" })
      );
    }

    return Result.okay(candidate);
  }

  async createCategory(
    input: CreateCategoryServiceInput
  ): Promise<AppResult<CategoryCreateResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    const parsed = zodCreateCategoryInput.safeParse(
      this.normalizeCreateBody(input.body)
    );
    if (!parsed.success) {
      return Result.error(
        serviceError("VALIDATION_FAILED", { reasons: zodReasons(parsed.error) })
      );
    }

    const draft = createCategoryDraft(parsed.data);
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

      const slug = slugResult.content;
      const timestamp = this.now().toISOString();
      const category = await this.repository.create({
        name: draft.content.name,
        slug,
        description: draft.content.description,
        sortOrder: draft.content.sortOrder,
        isVisible: draft.content.isVisible,
        status: "ACTIVE",
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      return Result.okay({ category });
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

  async getCategory(
    input: CategoryDetailServiceInput
  ): Promise<AppResult<CategoryDetailResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    try {
      const category = await this.repository.findById(input.categoryId);
      if (!category) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", { reason: "CATEGORY_NOT_FOUND" })
        );
      }

      return Result.okay({ category });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async listCategories(
    input: ListCategoriesServiceInput
  ): Promise<AppResult<CategoryListCategoriesResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    const query = normalizeCategoryListQuery(input.query);
    if (query.error) {
      return Result.error(serviceError("VALIDATION_FAILED", query.error.data));
    }

    try {
      return Result.okay(await this.repository.list(query.content));
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async updateCategory(
    input: UpdateCategoryServiceInput
  ): Promise<AppResult<CategoryUpdateResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    const parsed = zodUpdateCategoryInput.safeParse(
      this.normalizeUpdateBody(input.body)
    );
    if (!parsed.success) {
      return Result.error(
        serviceError("VALIDATION_FAILED", { reasons: zodReasons(parsed.error) })
      );
    }

    const patchDraft = updateCategoryDraft(parsed.data);
    if (patchDraft.error) {
      return Result.error(
        serviceError("VALIDATION_FAILED", patchDraft.error.data)
      );
    }

    try {
      const existing = await this.repository.findById(input.categoryId);
      if (!existing) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", { reason: "CATEGORY_NOT_FOUND" })
        );
      }

      const updatePatch: UpdateCategoryRecordInput = {
        ...(patchDraft.content.name !== undefined
          ? { name: patchDraft.content.name }
          : {}),
        ...(patchDraft.content.description !== undefined
          ? { description: patchDraft.content.description }
          : {}),
        ...(patchDraft.content.sortOrder !== undefined
          ? { sortOrder: patchDraft.content.sortOrder }
          : {}),
        ...(patchDraft.content.isVisible !== undefined
          ? { isVisible: patchDraft.content.isVisible }
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

      const category = await this.repository.update(
        input.categoryId,
        updatePatch
      );
      return Result.okay({ category });
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

  async archiveCategory(
    input: ArchiveCategoryServiceInput
  ): Promise<AppResult<CategoryArchiveResult>> {
    const actor = this.requireAdminActor(input.actor);
    if (actor.error) {
      return actor;
    }

    try {
      const category = await this.repository.findById(input.categoryId);
      if (!category) {
        return Result.error(
          serviceError("RESOURCE_NOT_FOUND", { reason: "CATEGORY_NOT_FOUND" })
        );
      }

      const transition = archiveCategoryTransition({
        currentStatus: category.status,
        updatedAt: this.now().toISOString(),
      });
      if (transition.error) {
        const errorCode =
          transition.error.code === "CONFLICT_STATE"
            ? "CONFLICT_STATE"
            : "VALIDATION_FAILED";
        return Result.error(
          serviceError(errorCode, transition.error.data ?? {})
        );
      }

      const archived = await this.repository.archive(
        input.categoryId,
        transition.content.updatedAt
      );
      return Result.okay({ category: archived });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }
}
