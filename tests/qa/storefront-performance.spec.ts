import { expect, test, type Page } from "@playwright/test";
import { waitForAstroIslands } from "./helpers/astro";

type QaPerformanceMetrics = {
  domContentLoadedMs: number;
  imageResources: Array<{
    decodedBodySize: number;
    name: string;
    transferSize: number;
  }>;
  lcpMs: number;
  loadMs: number;
  route: string;
};

async function observePerformance(page: Page, route: string) {
  await page.addInitScript(() => {
    window.__jrwQaLcp = 0;
    try {
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const latest = entries[entries.length - 1];
        if (latest) {
          window.__jrwQaLcp = latest.startTime;
        }
      }).observe({ buffered: true, type: "largest-contentful-paint" });
    } catch {
      window.__jrwQaLcp = 0;
    }
  });

  await page.goto(route, { waitUntil: "networkidle" });
  await waitForAstroIslands(page);
  await page.waitForTimeout(250);

  const metrics = await page.evaluate<QaPerformanceMetrics, string>((path) => {
    const navigation = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming | undefined;
    const imageResources = performance
      .getEntriesByType("resource")
      .filter(
        (entry): entry is PerformanceResourceTiming =>
          entry instanceof PerformanceResourceTiming &&
          entry.initiatorType === "img"
      )
      .map((entry) => ({
        decodedBodySize: entry.decodedBodySize,
        name: entry.name,
        transferSize: entry.transferSize,
      }));

    return {
      domContentLoadedMs:
        navigation?.domContentLoadedEventEnd &&
        navigation.domContentLoadedEventEnd > 0
          ? Math.round(
              navigation.domContentLoadedEventEnd - navigation.startTime
            )
          : 0,
      imageResources,
      lcpMs: Math.round(window.__jrwQaLcp ?? 0),
      loadMs:
        navigation?.loadEventEnd && navigation.loadEventEnd > 0
          ? Math.round(navigation.loadEventEnd - navigation.startTime)
          : 0,
      route: path,
    };
  }, route);

  const attachmentName =
    route === "/"
      ? "home"
      : route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");

  await test.info().attach(`${attachmentName}-perf.json`, {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });

  return metrics;
}

declare global {
  interface Window {
    __jrwQaLcp?: number;
  }
}

test("records storefront home performance evidence", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 390 });
  const metrics = await observePerformance(page, "/");

  expect(metrics.domContentLoadedMs).toBeGreaterThan(0);
  expect(metrics.loadMs).toBeGreaterThan(0);
});

test("records product detail performance evidence when live data exists", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 390 });
  await page.goto("/products");
  await waitForAstroIslands(page);
  const href = await page
    .locator('main a[href^="/products/"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href"))
        .find((value) => Boolean(value && value !== "/products"))
    );

  test.skip(!href, "Live public catalog has no product detail link.");

  const metrics = await observePerformance(page, href!);

  expect(metrics.domContentLoadedMs).toBeGreaterThan(0);
  expect(metrics.loadMs).toBeGreaterThan(0);
});
