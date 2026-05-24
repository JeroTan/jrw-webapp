import { describe, expect, it } from "vitest";
import type {
  PublicCatalogCategoryOption,
  PublicCatalogDetailResult,
  PublicCatalogProductCard,
} from "@/domain/products/public-types";
import type {
  PublicCatalogBrowseResult,
  PublicCatalogRepository,
} from "@/server/repositories/PublicCatalogRepository";
import { PublicCatalogService } from "@/server/services/PublicCatalogService";

const category: PublicCatalogCategoryOption = {
  href: "/categories/apparel",
  id: "cat_apparel",
  name: "Apparel",
  slug: "apparel",
};

const product: PublicCatalogProductCard = {
  availability: {
    inStock: true,
    label: "Available",
    tone: "success",
  },
  brandName: null,
  categoryName: "Apparel",
  href: "/products/linen-shirt",
  id: "prod_linen",
  imageAlt: "Linen Shirt",
  name: "Linen Shirt",
  priceLabel: "PHP 19.99",
  quickAction: {
    disabled: false,
    href: "/products/linen-shirt",
    label: "View product",
  },
};

const detail: PublicCatalogDetailResult = {
  action: {
    disabled: true,
    label: "Add to cart",
    reason: "Selected option is available. Cart actions are not active on this page yet.",
  },
  gallery: [
    {
      alt: "Linen Shirt front",
      height: 1200,
      id: "photo_linen_front",
      isPrimary: true,
      name: "Linen Shirt front",
      src: "/assets/products/linen-shirt/front.jpg",
      width: 1200,
    },
    {
      alt: "Linen Shirt back",
      height: 1200,
      id: "photo_linen_back",
      isPrimary: false,
      name: "Linen Shirt back",
      src: "/assets/products/linen-shirt/back.jpg",
      width: 1200,
    },
  ],
  metadata: {
    availabilityText: "Available",
    canonicalPath: "/products/linen-shirt",
    description: "Lightweight linen shirt • PHP 19.99 • Available • JRW Studio",
    imageAlt: "Linen Shirt front",
    imageSrc: "/assets/products/linen-shirt/front.jpg",
    robots: "index,follow",
    title: "Linen Shirt | JRW",
  },
  product: {
    availability: {
      inStock: true,
      label: "Available",
      tone: "success",
    },
    brandName: "JRW Studio",
    categories: [category],
    description: "Lightweight linen shirt for warm days.",
    id: "prod_linen",
    name: "Linen Shirt",
    priceLabel: "PHP 19.99",
    primaryImage: {
      alt: "Linen Shirt front",
      height: 1200,
      id: "photo_linen_front",
      isPrimary: true,
      name: "Linen Shirt front",
      src: "/assets/products/linen-shirt/front.jpg",
      width: 1200,
    },
    slug: "linen-shirt",
    summary: "Lightweight linen shirt",
  },
  recoveryLinks: [
    { href: "/products", label: "Browse all products" },
    { href: "/products?view=categories", label: "Browse categories" },
  ],
  selectedVariantId: "variant_linen_small",
  variants: [
    {
      availability: {
        inStock: true,
        label: "Available",
        tone: "success",
      },
      disabled: false,
      id: "variant_linen_small",
      imageSrc: "/assets/products/linen-shirt/front.jpg",
      label: "Size: Small",
      optionValues: [{ group: "Size", name: "Small" }],
      priceLabel: "PHP 19.99",
      productId: "prod_linen",
      selected: true,
    },
    {
      availability: {
        inStock: false,
        label: "Unavailable",
        tone: "error",
      },
      disabled: true,
      id: "variant_linen_large",
      label: "Size: Large",
      optionValues: [{ group: "Size", name: "Large" }],
      priceLabel: "PHP 24.99",
      productId: "prod_linen",
      selected: false,
      unavailableReason: "Selected option is unavailable right now.",
    },
  ],
};

function browseResult(
  overrides: Partial<PublicCatalogBrowseResult> = {}
): PublicCatalogBrowseResult {
  return {
    items: [],
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
    },
    ...overrides,
  };
}

function repositoryDouble(
  overrides: Partial<PublicCatalogRepository> = {}
): PublicCatalogRepository {
  return {
    findActiveVisibleCategoryBySlug: async () => category,
    findPublishedProductDetailBySlug: async () => detail,
    findPublishedProductExistsBySlug: async () => true,
    listActiveVisibleCategoryOptions: async () => [category],
    listPublishedProductCards: async () => browseResult({ items: [product] }),
    ...overrides,
  };
}

describe("PublicCatalogService", () => {
  it("rejects malformed public pagination before repository reads", async () => {
    let repositoryCalled = false;
    const service = new PublicCatalogService({
      repository: repositoryDouble({
        listPublishedProductCards: async () => {
          repositoryCalled = true;
          return browseResult();
        },
      }),
    });

    const result = await service.listCatalog({
      query: {
        page: "1.5",
        pageSize: "101",
        sort: "new",
      },
      requestId: "req_invalid_catalog_query",
    });

    expect(repositoryCalled).toBe(false);
    expect(result.error?.code).toBe("VALIDATION_FAILED");
    expect(result.error?.data).toMatchObject({
      reasons: expect.arrayContaining([
        "page:invalid_value",
        "pageSize:invalid_value",
      ]),
    });
  });

  it("prioritizes page overflow and category search empty states", async () => {
    const pageOverflow = new PublicCatalogService({
      repository: repositoryDouble({
        listPublishedProductCards: async () =>
          browseResult({
            pagination: {
              page: 3,
              pageSize: 20,
              totalItems: 24,
              totalPages: 2,
            },
          }),
      }),
    });
    const categorySearch = new PublicCatalogService({
      repository: repositoryDouble({
        listPublishedProductCards: async () => browseResult(),
      }),
    });

    const overflowResult = await pageOverflow.listCatalog({
      query: {
        category: "apparel",
        page: 3,
        pageSize: 20,
        sort: "new",
      },
      requestId: "req_page_overflow",
    });
    const categorySearchResult = await categorySearch.listCatalog({
      query: {
        category: "apparel",
        q: "linen",
        sort: "new",
      },
      requestId: "req_category_search",
    });

    expect(overflowResult.content?.emptyState?.title).toBe(
      "No products on this page"
    );
    expect(categorySearchResult.content?.emptyState?.title).toBe(
      "No products match this category search"
    );
  });

  it("passes selected category name into category-scoped product cards", async () => {
    let receivedCategoryName: string | undefined;
    const service = new PublicCatalogService({
      repository: repositoryDouble({
        listPublishedProductCards: async (input) => {
          receivedCategoryName = input.categoryName;
          return browseResult({ items: [product] });
        },
      }),
    });

    const result = await service.listCatalog({
      query: {
        category: "apparel",
        sort: "new",
      },
      requestId: "req_category_label",
    });

    expect(result.error).toBeNull();
    expect(receivedCategoryName).toBe("Apparel");
  });

  it("returns customer-safe product detail and rejects blank slugs", async () => {
    const service = new PublicCatalogService({
      repository: repositoryDouble(),
    });

    const detailResult = await service.getProductDetail({
      requestId: "req_product_detail",
      slug: "linen-shirt",
    });
    const blankSlugResult = await service.getProductDetail({
      requestId: "req_blank_product_detail",
      slug: "   ",
    });

    expect(detailResult.error).toBeNull();
    expect(detailResult.content).toMatchObject({
      metadata: {
        canonicalPath: "/products/linen-shirt",
      },
      product: {
        categories: [{ name: "Apparel" }],
        name: "Linen Shirt",
      },
      selectedVariantId: "variant_linen_small",
      variants: [
        {
          label: "Size: Small",
          selected: true,
        },
        {
          label: "Size: Large",
          unavailableReason: "Selected option is unavailable right now.",
        },
      ],
    });
    expect(blankSlugResult.error?.code).toBe("VALIDATION_FAILED");
    expect(blankSlugResult.error?.data).toMatchObject({
      reasons: ["slug:invalid_value"],
    });
  });

  it("maps missing product detail and provider failures to safe errors", async () => {
    const missingService = new PublicCatalogService({
      repository: repositoryDouble({
        findPublishedProductDetailBySlug: async () => null,
      }),
    });
    const failingService = new PublicCatalogService({
      repository: repositoryDouble({
        findPublishedProductDetailBySlug: async () => {
          throw new Error("SQLITE_BUSY: detail read failed");
        },
      }),
    });

    const missingResult = await missingService.getProductDetail({
      requestId: "req_missing_detail",
      slug: "missing-shirt",
    });
    const failingResult = await failingService.getProductDetail({
      requestId: "req_provider_detail",
      slug: "linen-shirt",
    });

    expect(missingResult.error?.code).toBe("RESOURCE_NOT_FOUND");
    expect(failingResult.error?.code).toBe("PROVIDER_UNAVAILABLE");
  });
});
