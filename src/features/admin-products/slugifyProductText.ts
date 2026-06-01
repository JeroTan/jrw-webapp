import { PRODUCT_SLUG_MAX_LENGTH } from "./productValidationLimits";

export function slugifyProductText(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, PRODUCT_SLUG_MAX_LENGTH);

  return normalized.length > 0 ? normalized : "product";
}
