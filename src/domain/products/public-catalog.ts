import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";
import { normalizeProductListQuery } from "./product";
import type { InventoryState } from "./types";
import type {
  PublicCatalogAvailability,
  PublicCatalogQuery,
  PublicCatalogQueryInput,
} from "./public-types";

export const PUBLIC_CATALOG_DEFAULT_SORT = "new" as const;

function validationError(reasons: string[]) {
  return Result.error(new GeneralError({ reasons }, "VALIDATION_FAILED"));
}

function normalizeCategory(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizePublicCatalogQuery(
  query: PublicCatalogQueryInput
): AppResult<PublicCatalogQuery, { reasons: string[] }> {
  const normalizedQuery = normalizeProductListQuery({
    page: query.page,
    pageSize: query.pageSize,
    search: query.q,
  });

  if (normalizedQuery.error) {
    return normalizedQuery;
  }

  const reasons: string[] = [];
  if (
    query.sort !== undefined &&
    query.sort.trim().toLowerCase() !== PUBLIC_CATALOG_DEFAULT_SORT
  ) {
    reasons.push("sort:invalid_value");
  }

  if (reasons.length > 0) {
    return validationError(reasons);
  }

  const category = normalizeCategory(query.category);

  return Result.okay({
    ...(category ? { category } : {}),
    page: normalizedQuery.content.page,
    pageSize: normalizedQuery.content.pageSize,
    q: normalizedQuery.content.search ?? "",
    sort: PUBLIC_CATALOG_DEFAULT_SORT,
  });
}

export function publicCatalogAvailabilityFromStates(
  states: InventoryState[]
): PublicCatalogAvailability {
  if (states.includes("IN_STOCK")) {
    return {
      inStock: true,
      label: "Available",
      tone: "success",
    };
  }

  if (states.includes("LOW_STOCK")) {
    return {
      inStock: true,
      label: "Low Stock",
      tone: "warning",
    };
  }

  if (states.includes("PREORDER")) {
    return {
      inStock: true,
      label: "Preorder",
      tone: "info",
    };
  }

  return {
    inStock: false,
    label: "Unavailable",
    tone: "error",
  };
}

export function formatCatalogPrice(value: number): string {
  return `PHP ${(value / 100).toFixed(2)}`;
}
