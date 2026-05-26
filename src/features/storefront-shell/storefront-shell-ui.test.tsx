import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StorefrontHeader } from "./StorefrontHeader";
import StorefrontHomeHero from "./StorefrontHomeHero";

function activeNavHrefs(markup: string) {
  return Array.from(
    markup.matchAll(/<a aria-current="page"[^>]*href="([^"]+)"/g),
    ([, href]) => href
  );
}

describe("storefront shell UI", () => {
  it("renders hydrated cart trigger label and badge shell", () => {
    const markup = renderToStaticMarkup(createElement(StorefrontHeader));

    expect(markup).toContain("Open cart, 0 items");
    expect(markup).toContain("-right-1.5 -top-1.5");
    expect(markup).toContain("size-4.5");
    expect(markup).toContain("hover:outline-2");
    expect(markup).toContain("Search products");
    expect(markup).not.toContain('action="/cart"');
  });

  it("uses accent text hover for the JRW home mark without hover border", () => {
    const markup = renderToStaticMarkup(createElement(StorefrontHeader));
    const homeMarkClasses = Array.from(
      markup.matchAll(
        /<a aria-label="JRW\. lifestyle products home" class="([^"]+)"/g
      ),
      ([, className]) => className
    );

    expect(homeMarkClasses).toHaveLength(1);
    for (const rawClassName of homeMarkClasses) {
      const className = rawClassName.replaceAll("&amp;", "&");
      expect(className).toContain("text-brand-content");
      expect(className).toContain("hover:text-brand-accent");
      expect(className).not.toContain("hover:border-brand-accent");
      expect(className).not.toContain("hover:outline");
    }
  });

  it("marks the brand section nav link active on brand pages", () => {
    const markup = renderToStaticMarkup(
      createElement(StorefrontHeader, { currentUrl: "/brands/outdoor" })
    );

    expect(activeNavHrefs(markup)).toEqual(["/brands", "/brands"]);
    expect(markup).toContain("bg-brand-accent text-brand-surface");
  });

  it("marks the category section nav link active for category browsing", () => {
    const markup = renderToStaticMarkup(
      createElement(StorefrontHeader, { currentUrl: "/categories/chairs" })
    );

    expect(activeNavHrefs(markup)).toEqual(["/categories", "/categories"]);
  });

  it("marks new arrivals active without also marking all products active", () => {
    const markup = renderToStaticMarkup(
      createElement(StorefrontHeader, { currentUrl: "/products?sort=new" })
    );

    expect(activeNavHrefs(markup)).toEqual([
      "/products?sort=new",
      "/products?sort=new",
    ]);
  });

  it("marks all products nav link active on product detail pages", () => {
    const markup = renderToStaticMarkup(
      createElement(StorefrontHeader, { currentUrl: "/products/lounge-chair" })
    );

    expect(activeNavHrefs(markup)).toEqual(["/products", "/products"]);
  });

  it("keeps the homepage primary browse link readable on accent fill", () => {
    const markup = renderToStaticMarkup(createElement(StorefrontHomeHero));
    const match = markup.match(/class="([^"]+)" href="\/products"/);

    expect(match?.[1]).toContain("bg-brand-accent");
    expect(match?.[1]).toContain("text-brand-surface");
    expect(match?.[1]).toContain("hover:outline-brand-accent");
    expect(match?.[1]).not.toContain("text-brand-content");
  });
});
