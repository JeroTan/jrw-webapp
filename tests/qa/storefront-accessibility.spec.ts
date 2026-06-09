import { expect, test, type Page } from "@playwright/test";
import { expectNoAccessibilityViolations } from "./helpers/accessibility";
import { waitForAstroIslands } from "./helpers/astro";
import {
  mockQaCheckoutValidation,
  mockQaProductDetail,
  seedQaCart,
} from "./helpers/storefront-fixtures";

async function gotoReady(page: Page, path: string) {
  await page.setViewportSize({ height: 1000, width: 1440 });
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await waitForAstroIslands(page);
}

for (const route of ["/", "/products", "/categories", "/brands"]) {
  const routeName =
    route === "/" ? "home" : route.replaceAll("/", "-").slice(1);

  test(`${routeName} has no automated accessibility violations`, async ({
    page,
  }) => {
    await gotoReady(page, route);
    await expectNoAccessibilityViolations(page, routeName);
  });
}

test("cart drawer and cart page have no automated accessibility violations", async ({
  page,
}) => {
  await seedQaCart(page);
  await mockQaProductDetail(page);

  await gotoReady(page, "/");
  await page.getByRole("button", { name: /Open cart/ }).click();
  await expect(page.getByRole("dialog", { name: "Cart" })).toBeVisible();
  await expectNoAccessibilityViolations(page, "cart-drawer");

  await gotoReady(page, "/cart");
  await expect(page.getByRole("button", { name: "Check cart" })).toBeVisible();
  await expectNoAccessibilityViolations(page, "cart-page");
});

test("checkout blocked and details states have no automated accessibility violations", async ({
  page,
}) => {
  await seedQaCart(page);
  await mockQaCheckoutValidation(page, "blocked");
  await gotoReady(page, "/checkout");
  await expect(
    page.getByRole("heading", { name: "Review cart" })
  ).toBeVisible();
  await expectNoAccessibilityViolations(page, "checkout-blocked");

  await seedQaCart(page);
  await mockQaCheckoutValidation(page, "valid");
  await gotoReady(page, "/checkout");
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expectNoAccessibilityViolations(page, "checkout-details");
});

test("product detail has no automated accessibility violations when live data exists", async ({
  page,
}) => {
  await gotoReady(page, "/products");
  const href = await page
    .locator('main a[href^="/products/"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href"))
        .find((value) => Boolean(value && value !== "/products"))
    );

  test.skip(!href, "Live public catalog has no product detail link.");

  await gotoReady(page, href!);
  await expect(
    page.locator("[data-product-detail-module=product-details]")
  ).toBeVisible();
  await expectNoAccessibilityViolations(page, "product-detail");
});
