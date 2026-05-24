import { describe, expect, it } from "vitest";
import { loadStorefrontProductDetailPageData } from "@/server/loaders/PublicCatalogPageDataLoader";

describe("loadStorefrontProductDetailPageData", () => {
  it("returns safe not-found state for blank slugs", async () => {
    const result = await loadStorefrontProductDetailPageData({
      slug: "   ",
    });

    expect(result).toEqual({
      detail: null,
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "Product not found. Browse current products instead.",
        title: "Product not found",
      },
      status: 404,
    });
  });

  it("returns provider-unavailable state when DB binding is missing", async () => {
    const result = await loadStorefrontProductDetailPageData({
      runtimeEnv: {},
      slug: "linen-shirt",
    });

    expect(result).toEqual({
      detail: null,
      error: {
        code: "PROVIDER_UNAVAILABLE",
        message: "Product page is unavailable right now. Try again soon.",
        title: "Product unavailable",
      },
      status: 503,
    });
  });
});
