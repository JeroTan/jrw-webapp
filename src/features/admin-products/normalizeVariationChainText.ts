import type { ProductVariantOption } from "./types";
import { normalizeVariationOptionPart } from "./normalizeVariationOptionPart";

export function normalizeVariationChainText(
  value: string
): ProductVariantOption[] {
  const deduped = new Map<string, ProductVariantOption>();

  value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .forEach((line) => {
      const [groupPart, ...nameParts] = line.split(":");
      if (!groupPart || nameParts.length === 0) {
        return;
      }

      const group = normalizeVariationOptionPart(groupPart);
      const name = normalizeVariationOptionPart(nameParts.join(":"));
      if (!group || !name) {
        return;
      }

      deduped.set(`${group.toLowerCase()}::${name.toLowerCase()}`, {
        group,
        name,
      });
    });

  return Array.from(deduped.values()).sort((left, right) =>
    `${left.group.toLowerCase()}:${left.name.toLowerCase()}`.localeCompare(
      `${right.group.toLowerCase()}:${right.name.toLowerCase()}`
    )
  );
}
