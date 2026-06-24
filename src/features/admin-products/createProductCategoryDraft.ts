import type { ProductCategoryDraft } from "./types";

function slugifyCategoryDraftName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.length > 0 ? normalized : "category";
}

export function createProductCategoryDraft(
  name: string,
  sequence: number
): ProductCategoryDraft {
  const normalizedName = name.trim();
  const slug = slugifyCategoryDraftName(normalizedName);

  return {
    id: `draft-category-${sequence}-${slug}`,
    name: normalizedName,
    slug,
  };
}
