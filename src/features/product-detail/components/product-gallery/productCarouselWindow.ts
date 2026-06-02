export type ProductCarouselWindowInput = {
  selectedIndex: number;
  selectedOffset?: number;
  totalItems: number;
  visibleCount?: number;
};

export function productCarouselWindow({
  selectedIndex,
  selectedOffset = 3,
  totalItems,
  visibleCount = 5,
}: ProductCarouselWindowInput) {
  const safeTotal = Math.max(0, Math.trunc(totalItems));
  const safeVisibleCount = Math.max(1, Math.trunc(visibleCount));
  const visibleItems = Math.min(safeTotal, safeVisibleCount);

  if (safeTotal <= visibleItems) {
    return { endIndex: safeTotal, startIndex: 0 };
  }

  const safeSelectedIndex = Math.min(
    Math.max(0, Math.trunc(selectedIndex)),
    safeTotal - 1
  );
  const safeSelectedOffset = Math.min(
    Math.max(0, Math.trunc(selectedOffset)),
    visibleItems - 1
  );
  const maxStartIndex = safeTotal - visibleItems;
  const startIndex = Math.min(
    Math.max(0, safeSelectedIndex - safeSelectedOffset),
    maxStartIndex
  );

  return {
    endIndex: startIndex + visibleItems,
    startIndex,
  };
}
