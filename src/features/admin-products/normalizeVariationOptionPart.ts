export function normalizeVariationOptionPart(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
