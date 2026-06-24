import { createAssignableCategory } from "./api";
import type { ProductAssignableCategory } from "./types";

export async function persistProductCategoryDrafts(
  drafts: Array<{ name: string; slug: string }>
): Promise<ProductAssignableCategory[]> {
  const created: ProductAssignableCategory[] = [];

  for (const draft of drafts) {
    created.push(
      await createAssignableCategory({
        name: draft.name,
        slug: draft.slug,
      })
    );
  }

  return created;
}
