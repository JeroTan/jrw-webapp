import { describe, expect, it } from "vitest";
import type {
  PublicCatalogCategoryOption,
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
});
