export function formatCatalogPrice(value: number): string {
  return `PHP ${(value / 100).toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}
