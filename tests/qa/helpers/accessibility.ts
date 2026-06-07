import { expect, type Page, test } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

export async function expectNoAccessibilityViolations(
  page: Page,
  name: string
) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  await test.info().attach(`${name}-axe.json`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });

  expect(results.violations).toEqual([]);
}

