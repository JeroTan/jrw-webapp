import { expect, type Locator, type Page } from "@playwright/test";

type TextOverflowOffender = {
  className: string;
  clientWidth: number;
  scrollWidth: number;
  tagName: string;
  text: string;
};

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

export async function expectNoVisibleTextOverflow(page: Page) {
  const offenders = await page.evaluate<TextOverflowOffender[]>(() => {
    const selectors = [
      "a",
      "button",
      "dd",
      "dt",
      "h1",
      "h2",
      "h3",
      "label",
      "li",
      "p",
      "span",
      "strong",
      "td",
      "th",
    ].join(",");

    return Array.from(document.querySelectorAll<HTMLElement>(selectors))
      .filter((element) => {
        if (element.closest("[aria-hidden='true'],[hidden],.sr-only")) {
          return false;
        }

        const text = element.innerText?.trim() ?? "";
        if (!text) {
          return false;
        }

        const style = window.getComputedStyle(element);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.overflowX === "auto" ||
          style.overflowX === "scroll"
        ) {
          return false;
        }

        return element.scrollWidth > element.clientWidth + 1;
      })
      .slice(0, 12)
      .map((element) => ({
        className: element.className,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        tagName: element.tagName,
        text: (element.innerText ?? "").trim().slice(0, 120),
      }));
  });

  expect(offenders).toEqual([]);
}

export async function expectLocatorWithinViewport(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    return;
  }

  const viewport = locator.page().viewportSize();
  expect(viewport).not.toBeNull();
  if (!viewport) {
    return;
  }

  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
}

export async function expectActiveElementHasFocusOutline(page: Page) {
  const outline = await page.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement)) {
      return null;
    }

    const style = window.getComputedStyle(element);
    return {
      outlineColor: style.outlineColor,
      outlineOffset: style.outlineOffset,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      tagName: element.tagName,
      text: element.innerText,
    };
  });

  expect(outline).not.toBeNull();
  expect(outline?.outlineStyle).not.toBe("none");
  expect(
    Number.parseFloat(outline?.outlineWidth ?? "0")
  ).toBeGreaterThanOrEqual(2);
  expect(outline?.outlineColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(
    Number.parseFloat(outline?.outlineOffset ?? "0")
  ).toBeGreaterThanOrEqual(2);
}
