import type { ProductAssignableCategory } from "./types";

export function mergeAssignableCategories(
  categories: ProductAssignableCategory[],
  additions: ProductAssignableCategory[]
): ProductAssignableCategory[] {
  const merged = new Map<string, ProductAssignableCategory>();

  for (const category of categories) {
    merged.set(category.id, category);
  }

  for (const category of additions) {
    merged.set(category.id, category);
  }

  return Array.from(merged.values()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}
