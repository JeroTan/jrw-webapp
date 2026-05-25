import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StorefrontHeader } from "./StorefrontHeader";
import { StorefrontHome } from "./StorefrontHome";

describe("storefront shell UI", () => {
  it("renders hydrated cart trigger label and badge shell", () => {
    const markup = renderToStaticMarkup(createElement(StorefrontHeader));

    expect(markup).toContain("Open cart, 0 items");
    expect(markup).toContain("absolute -right-1.5 -top-1.5");
    expect(markup).toContain("hover:!outline-0");
    expect(markup).toContain("hover:border-brand-accent");
    expect(markup).toContain("[&amp;:hover]:border-brand-accent");
    expect(markup).toContain("hover:text-brand-accent");
    expect(markup).toContain("Search products");
    expect(markup).not.toContain("action=\"/cart\"");
  });

  it("uses accent text hover for the JRW home mark without hover border", () => {
    const markup = renderToStaticMarkup(createElement(StorefrontHeader));
    const homeMarkClasses = Array.from(
      markup.matchAll(
        /<a aria-label="JRW\. lifestyle products home" class="([^"]+)"/g,
      ),
      ([, className]) => className,
    );

    expect(homeMarkClasses).toHaveLength(2);
    for (const rawClassName of homeMarkClasses) {
      const className = rawClassName.replaceAll("&amp;", "&");
      expect(className).toContain("text-brand-content");
      expect(className).toContain("hover:!text-brand-accent");
      expect(className).toContain("[&:hover]:!text-brand-accent");
      expect(className).not.toContain("hover:border-brand-accent");
      expect(className).not.toContain("hover:outline");
    }
  });
  it("keeps the homepage primary browse link readable on accent fill", () => {
    const markup = renderToStaticMarkup(createElement(StorefrontHome));
    const match = markup.match(/class="([^"]+)" href="\/products"/);

    expect(match?.[1]).toContain("bg-brand-accent");
    expect(match?.[1]).toContain("text-brand-surface");
    expect(match?.[1]).toContain("hover:text-brand-surface");
    expect(match?.[1]).not.toContain("text-brand-content");
  });

});
