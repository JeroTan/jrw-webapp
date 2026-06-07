import type { Page } from "@playwright/test";

export async function waitForAstroIslands(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(
    () => !document.querySelector("astro-island[ssr]")
  );
}

