import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";
import { formatCatalogPrice } from "./price-format";
import { normalizeProductListQuery } from "./product";
import type { ProductVariantOption } from "./types";
import type { InventoryState } from "./types";
import type {
  PublicCatalogAvailability,
  PublicCatalogQuery,
  PublicCatalogQueryInput,
  PublicCatalogStockFilter,
} from "./public-types";

export const PUBLIC_CATALOG_DEFAULT_SORT = "new" as const;
const PUBLIC_CATALOG_DEFAULT_PAGE = 1;
const PUBLIC_CATALOG_DEFAULT_PAGE_SIZE = 20;
const PUBLIC_CATALOG_MAX_PAGE_SIZE = 100;

function validationError(reasons: string[]) {
  return Result.error(new GeneralError({ reasons }, "VALIDATION_FAILED"));
}

const PUBLIC_CATALOG_STOCK_FILTERS = [
  "available",
  "low-stock",
  "preorder",
  "unavailable",
] as const satisfies readonly PublicCatalogStockFilter[];

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeTextList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  const normalized = values
    .map(normalizeText)
    .filter((item): item is string => Boolean(item));

  return Array.from(new Set(normalized));
}

function normalizeStockFilters(
  value: unknown,
  reasons: string[]
): PublicCatalogStockFilter[] {
  const filters = normalizeTextList(value);
  const validFilters = new Set<string>(PUBLIC_CATALOG_STOCK_FILTERS);
  const accepted: PublicCatalogStockFilter[] = [];

  for (const filter of filters) {
    if (!validFilters.has(filter)) {
      reasons.push("stock:invalid_value");
      continue;
    }

    accepted.push(filter as PublicCatalogStockFilter);
  }

  return Array.from(new Set(accepted));
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

function strictPriceCentavos(
  value: number | string | undefined,
  field: "minPrice" | "maxPrice",
  reasons: string[]
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const raw = typeof value === "string" ? value.trim() : value;

  if (raw === "") {
    return undefined;
  }

  const parsed = typeof raw === "string" ? Number(raw) : raw;

  if (typeof parsed !== "number" || !Number.isFinite(parsed) || parsed < 0) {
    reasons.push(`${field}:invalid_value`);
    return undefined;
  }

  return Math.round(parsed * 100);
}

export function normalizePublicCatalogQuery(
  query: PublicCatalogQueryInput
): AppResult<PublicCatalogQuery, { reasons: string[] }> {
  const reasons: string[] = [];
  const page = strictPositiveInteger(query.page, "page", reasons);
  const pageSize = strictPositiveInteger(query.pageSize, "pageSize", reasons);
  const minPriceCentavos = strictPriceCentavos(
    query.minPrice,
    "minPrice",
    reasons
  );
  const maxPriceCentavos = strictPriceCentavos(
    query.maxPrice,
    "maxPrice",
    reasons
  );
  const brands = normalizeTextList(query.brand);
  const categories = normalizeTextList(query.category);
  const stock = normalizeStockFilters(query.stock, reasons);
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

  if (
    minPriceCentavos !== undefined &&
    maxPriceCentavos !== undefined &&
    minPriceCentavos > maxPriceCentavos
  ) {
    reasons.push("price:invalid_range");
  }

  if (reasons.length > 0) {
    return validationError(reasons);
  }

  const category = categories[0];

  return Result.okay({
    brands,
    categories,
    ...(category ? { category } : {}),
    ...(maxPriceCentavos !== undefined ? { maxPriceCentavos } : {}),
    ...(minPriceCentavos !== undefined ? { minPriceCentavos } : {}),
    page: normalizedQuery.content.page,
    pageSize: normalizedQuery.content.pageSize,
    q: normalizedQuery.content.search ?? "",
    sort: PUBLIC_CATALOG_DEFAULT_SORT,
    stock,
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

export { formatCatalogPrice };

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
