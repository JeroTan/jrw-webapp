export const storefrontViewports = [320, 375, 390, 430, 768, 1024, 1440] as const;

export type StorefrontViewport = (typeof storefrontViewports)[number];

export function viewportHeightForWidth(width: StorefrontViewport): number {
  return width < 768 ? 900 : 1000;
}

