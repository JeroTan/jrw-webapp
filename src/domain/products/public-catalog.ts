import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";
import { normalizeProductListQuery } from "./product";
import type { ProductVariantOption } from "./types";
import type { InventoryState } from "./types";
import type {
  PublicCatalogAvailability,
  PublicCatalogQuery,
  PublicCatalogQueryInput,
} from "./public-types";

export const PUBLIC_CATALOG_DEFAULT_SORT = "new" as const;
const PUBLIC_CATALOG_DEFAULT_PAGE = 1;
const PUBLIC_CATALOG_DEFAULT_PAGE_SIZE = 20;
const PUBLIC_CATALOG_MAX_PAGE_SIZE = 100;

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

function strictPositiveInteger(
  value: number | string | undefined,
  field: "page" | "pageSize",
  reasons: string[]
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed =
    typeof value === "string" && value.trim().length > 0
      ? Number(value.trim())
      : value;

  if (
    typeof parsed !== "number" ||
    !Number.isFinite(parsed) ||
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    reasons.push(`${field}:invalid_value`);
    return undefined;
  }

  if (field === "pageSize" && parsed > PUBLIC_CATALOG_MAX_PAGE_SIZE) {
    reasons.push("pageSize:invalid_value");
    return undefined;
  }

  return parsed;
}

export function normalizePublicCatalogQuery(
  query: PublicCatalogQueryInput
): AppResult<PublicCatalogQuery, { reasons: string[] }> {
  const reasons: string[] = [];
  const page = strictPositiveInteger(query.page, "page", reasons);
  const pageSize = strictPositiveInteger(query.pageSize, "pageSize", reasons);
  const normalizedQuery = normalizeProductListQuery({
    page: page ?? PUBLIC_CATALOG_DEFAULT_PAGE,
    pageSize: pageSize ?? PUBLIC_CATALOG_DEFAULT_PAGE_SIZE,
    search: query.q,
  });

  if (normalizedQuery.error) {
    return normalizedQuery;
  }

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

export function formatCatalogPriceLabel(input: {
  lowestPrice: number | null;
  priceRangeMax: number | null;
  priceRangeMin: number | null;
}): string {
  if (
    typeof input.priceRangeMin === "number" &&
    typeof input.priceRangeMax === "number"
  ) {
    if (input.priceRangeMin === input.priceRangeMax) {
      return formatCatalogPrice(input.priceRangeMin);
    }

    return `${formatCatalogPrice(input.priceRangeMin)} - ${formatCatalogPrice(input.priceRangeMax)}`;
  }

  if (typeof input.lowestPrice === "number") {
    return `Starts at ${formatCatalogPrice(input.lowestPrice)}`;
  }

  return "Price unavailable";
}

export function formatPublicVariantLabel(input: {
  name: string;
  optionValues: ProductVariantOption[];
}): string {
  const optionLabel = input.optionValues
    .map((option) => `${option.group}: ${option.name}`)
    .join(" / ");

  if (optionLabel.length > 0) {
    return optionLabel;
  }

  return input.name.trim() || "Option";
}

export function publicCatalogUnavailableReason(input: {
  availability: PublicCatalogAvailability;
  variantCount: number;
}): string | undefined {
  if (input.availability.inStock) {
    return undefined;
  }

  if (input.variantCount <= 0) {
    return "Product options are unavailable right now.";
  }

  return "Selected option is unavailable right now.";
}
