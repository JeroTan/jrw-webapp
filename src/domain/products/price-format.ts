export function formatCatalogPrice(value: number): string {
  return `PHP ${(value / 100).toFixed(2)}`;
}
