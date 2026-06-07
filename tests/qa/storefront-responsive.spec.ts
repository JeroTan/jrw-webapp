import { expect, test, type Page } from "@playwright/test";
import { waitForAstroIslands } from "./helpers/astro";
import {
  expectActiveElementHasFocusOutline,
  expectLocatorWithinViewport,
  expectNoHorizontalOverflow,
  expectNoVisibleTextOverflow,
} from "./helpers/overflow";
import {
  mockQaCheckoutValidation,
  mockQaProductDetail,
  seedQaCart,
} from "./helpers/storefront-fixtures";
import {
  storefrontViewports,
  viewportHeightForWidth,
} from "./helpers/viewports";

const storefrontRoutes = [
  { name: "home", path: "/" },
  { name: "products", path: "/products" },
  { name: "categories", path: "/categories" },
  { name: "brands", path: "/brands" },
] as const;

async function openAtWidth(page: Page, path: string, width: number) {
  await page.setViewportSize({
    height: width < 768 ? 900 : 1000,
    width,
  });
  await page.goto(path);
  await waitForAstroIslands(page);
}

async function findFirstProductHref(page: Page): Promise<string | null> {
  await openAtWidth(page, "/products", 1024);
  const href = await page
    .locator('main a[href^="/products/"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href"))
        .find((value) => Boolean(value && value !== "/products"))
    );

  return href ?? null;
}

for (const width of storefrontViewports) {
  for (const route of storefrontRoutes) {
    test(`${route.name} route fits viewport ${width}px`, async ({ page }) => {
      await openAtWidth(page, route.path, width);

      await expectNoHorizontalOverflow(page);
      await expectNoVisibleTextOverflow(page);
      await expect(page.getByRole("banner")).toBeVisible();
      await expectLocatorWithinViewport(page.getByRole("main"));
    });
  }

  test(`cart route long text fits viewport ${width}px`, async ({ page }) => {
    await page.setViewportSize({
      height: viewportHeightForWidth(width),
      width,
    });
    await seedQaCart(page);
    await mockQaProductDetail(page);
    await mockQaCheckoutValidation(page, "blocked");

    await page.goto("/cart");
    await waitForAstroIslands(page);

    await expect(page.getByText("JRW Modular Weatherproof")).toBeVisible();
    await expect(page.getByRole("button", { name: "Check cart" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoVisibleTextOverflow(page);
  });

  test(`checkout blocked state fits viewport ${width}px`, async ({ page }) => {
    await page.setViewportSize({
      height: viewportHeightForWidth(width),
      width,
    });
    await seedQaCart(page);
    await mockQaCheckoutValidation(page, "blocked");

    const validationResponse = page.waitForResponse(
      "**/api/checkout/cart-validations"
    );
    await page.goto("/checkout");
    await validationResponse;
    await waitForAstroIslands(page);

    await expect(page.getByRole("heading", { name: "Review cart" })).toBeVisible();
    await expect(page.getByText("Resolve unavailable items before checkout.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoVisibleTextOverflow(page);
  });
}

test("product detail route fits when a live product is available", async ({
  page,
}) => {
  const href = await findFirstProductHref(page);
  test.skip(!href, "Live public catalog has no product detail link.");

  await openAtWidth(page, href!, 390);
  await expect(page.locator("[data-product-detail-module=product-details]")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoVisibleTextOverflow(page);
});

test("header, filter, drawer, and checkout keyboard path stays focus-visible", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 390 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedQaCart(page);
  await mockQaProductDetail(page);
  await mockQaCheckoutValidation(page, "valid");

  await page.goto("/products");
  await waitForAstroIslands(page);

  await page.keyboard.press("Tab");
  await expectActiveElementHasFocusOutline(page);

  const menu = page.getByText("Menu").first();
  await menu.click();
  await expect(page.getByRole("searchbox", { name: "Search products" })).toBeVisible();

  const cartButton = page.getByRole("button", { name: /Open cart/ });
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(cartButton).toBeFocused();
  await expectActiveElementHasFocusOutline(page);
  await page.keyboard.press("Enter");

  const drawer = page.getByRole("dialog", { name: "Cart" });
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(drawer.locator(":focus")).toHaveCount(1);

  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(cartButton).toBeFocused();

  await page.goto("/cart");
  await waitForAstroIslands(page);
  const checkCart = page.getByRole("button", { name: "Check cart" });
  await checkCart.focus();
  await expectActiveElementHasFocusOutline(page);
});
