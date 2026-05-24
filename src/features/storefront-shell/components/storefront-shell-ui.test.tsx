import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StorefrontHeader } from "./StorefrontHeader";

describe("storefront shell UI", () => {
  it("renders hydrated cart trigger label and badge shell", () => {
    const markup = renderToStaticMarkup(createElement(StorefrontHeader));

    expect(markup).toContain("Open cart, 0 items");
    expect(markup).toContain("absolute -right-1.5 -top-1.5");
    expect(markup).toContain("Search products");
    expect(markup).not.toContain("action=\"/cart\"");
  });
});
