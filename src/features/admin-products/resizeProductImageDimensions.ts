export function resizeProductImageDimensions(input: {
  height: number;
  maxDimension: number;
  width: number;
}): { height: number; width: number } {
  const width = Math.max(1, Math.round(input.width));
  const height = Math.max(1, Math.round(input.height));
  const maxDimension = Math.max(1, Math.round(input.maxDimension));
  const longestSide = Math.max(width, height);

  if (longestSide <= maxDimension) {
    return { height, width };
  }

  const scale = maxDimension / longestSide;

  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  };
}
