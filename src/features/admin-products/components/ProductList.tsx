import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-display";
import { EmptyState, Skeleton, StatusBadge, Toast } from "@/components/feedback";
import { PageToolbar } from "@/components/layout";
import { Button, SearchInput, Select } from "@/components/ui";
import {
  assignProductBrand,
  assignProductCategories,
  createProduct,
  fetchAssignableBrands,
  fetchAssignableCategories,
  fetchProductListWithQuery,
  fetchProductOrganization,
  updateProduct,
  type ApiFailure,
} from "../api";
import { ProductEditor, type ProductEditorSaveInput } from "./ProductEditor";
import type {
  ProductAssignableBrand,
  ProductAssignableCategory,
  ProductOrganizationRecord,
  ProductRecord,
} from "../types";

type LoadState = "loading" | "ready" | "failed";

type ToastState = {
  title: string;
  message: string;
  tone: "error" | "success" | "warning";
};

type EditorState = {
  mode: "create" | "edit";
  product: ProductRecord | null;
  organization: ProductOrganizationRecord | null;
  organizationReady: boolean;
  organizationUnavailable: boolean;
};

const BRANDLESS_FILTER_VALUE = "__brandless__";

function statusTone(status: ProductRecord["status"]) {
  switch (status) {
    case "PUBLISHED":
      return "success" as const;
    case "ARCHIVED":
      return "warning" as const;
    default:
      return "info" as const;
  }
}

function statusLabel(status: ProductRecord["status"]) {
  switch (status) {
    case "PUBLISHED":
      return "Published";
    case "ARCHIVED":
      return "Archived";
    default:
      return "Draft";
  }
}

function productActionErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof (error as ApiFailure).code !== "string"
  ) {
    return fallback;
  }

  const failure = error as ApiFailure;
  const reason =
    typeof failure.details === "object" &&
    failure.details !== null &&
    "reason" in failure.details &&
    typeof (failure.details as { reason?: unknown }).reason === "string"
      ? String((failure.details as { reason: string }).reason)
      : null;

  if (failure.code === "CONFLICT_STATE") {
    if (reason === "DUPLICATE_SLUG") {
      return "Slug is already in use.";
    }

    if (reason === "BRAND_MEMBERSHIP_REQUIRED") {
      return "You need active membership in selected brand.";
    }

    return "Product state conflicts with current data.";
  }

  if (failure.code === "VALIDATION_FAILED") {
    if (reason === "CATEGORY_NOT_ACTIVE") {
      return "Archived categories cannot be assigned to this product.";
    }
    if (reason === "INVALID_CATEGORY_IDS") {
      return "Selected categories are invalid. Refresh and try again.";
    }

    return "Product data is invalid. Check required fields and try again.";
  }

  if (failure.code === "AUTH_FORBIDDEN") {
    if (reason === "BRAND_MEMBERSHIP_REQUIRED") {
      return "You need active membership in selected brand.";
    }

    return "You do not have access to manage this product.";
  }

  return typeof failure.message === "string" && failure.message.trim().length > 0
    ? failure.message
    : fallback;
}

export function filterProductsByQuery(
  products: ProductRecord[],
  query: string
): ProductRecord[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return products;
  }

  return products.filter((product) =>
    `${product.name} ${product.slug}`.toLowerCase().includes(normalizedQuery)
  );
}

function sortProducts(rows: ProductRecord[]): ProductRecord[] {
  return [...rows].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}

function brandLabel(product: ProductRecord): string {
  if (product.brandName && product.brandName.trim().length > 0) {
    return product.brandName;
  }

  return "No brand";
}

export type ProductListProps = {
  autoLoad?: boolean;
  initialProducts?: ProductRecord[];
  initialLoadState?: LoadState;
};

export function ProductList(props: ProductListProps) {
  const {
    autoLoad = true,
    initialProducts = [],
    initialLoadState = "loading",
  } = props;
  const [loadState, setLoadState] = useState<LoadState>(initialLoadState);
  const [products, setProducts] = useState<ProductRecord[]>(
    sortProducts(initialProducts)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [availableBrands, setAvailableBrands] = useState<ProductAssignableBrand[]>([]);
  const [availableCategories, setAvailableCategories] = useState<
    ProductAssignableCategory[]
  >([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    let active = true;
    Promise.all([fetchAssignableBrands(), fetchAssignableCategories()])
      .then(([brands, categories]) => {
        if (!active) {
          return;
        }

        setAvailableBrands(brands.filter((brand) => brand.status === "ACTIVE"));
        setAvailableCategories(
          categories.filter((category) => category.status === "ACTIVE")
        );
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setAvailableBrands([]);
        setAvailableCategories([]);
      });

    return () => {
      active = false;
    };
  }, [autoLoad, refreshToken]);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    let active = true;
    setLoadState("loading");

    fetchProductListWithQuery({
      search: searchQuery.trim().length > 0 ? searchQuery : undefined,
      brandId:
        brandFilter && brandFilter !== BRANDLESS_FILTER_VALUE
          ? brandFilter
          : undefined,
      brandless: brandFilter === BRANDLESS_FILTER_VALUE,
      categoryId: categoryFilter || undefined,
      includeArchived: true,
    })
      .then((result) => {
        if (!active) {
          return;
        }

        setProducts(sortProducts(result.items));
        setLoadState("ready");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setLoadState("failed");
      });

    return () => {
      active = false;
    };
  }, [autoLoad, refreshToken, searchQuery, brandFilter, categoryFilter]);

  const visibleProducts = useMemo(() => products, [products]);
  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasActiveFilters =
    hasSearchQuery || brandFilter.length > 0 || categoryFilter.length > 0;
  const draftCount = products.filter((row) => row.status === "DRAFT").length;

  const columns = useMemo<Array<DataTableColumn<ProductRecord>>>(
    () => [
      {
        key: "name",
        header: "Name",
        cell: (product) => (
          <div className="jrw-products__cell-stack">
            <strong>{product.name}</strong>
            <span className="jrw-products__cell-meta">{product.slug}</span>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (product) => (
          <StatusBadge
            label={statusLabel(product.status)}
            tone={statusTone(product.status)}
          />
        ),
      },
      {
        key: "brand",
        header: "Brand",
        cell: (product) => brandLabel(product),
      },
      {
        key: "categories",
        header: "Categories",
        align: "right",
        cell: (product) => String(product.linkedCategoryCount),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        cell: (product) => (
          <div className="jrw-products__table-actions">
            <Button
              onClick={() => {
                setEditorState({
                  mode: "edit",
                  product,
                  organization: null,
                  organizationReady: false,
                  organizationUnavailable: false,
                });

                fetchProductOrganization(product.id)
                  .then((organization) => {
                    setEditorState((previous) => {
                      if (
                        !previous ||
                        previous.mode !== "edit" ||
                        previous.product?.id !== product.id
                      ) {
                        return previous;
                      }

                      return {
                        ...previous,
                        organization,
                        organizationReady: true,
                        organizationUnavailable: false,
                      };
                    });
                  })
                  .catch(() => {
                    setEditorState((previous) => {
                      if (
                        !previous ||
                        previous.mode !== "edit" ||
                        previous.product?.id !== product.id
                      ) {
                        return previous;
                      }

                      return {
                        ...previous,
                        organization: null,
                        organizationReady: false,
                        organizationUnavailable: true,
                      };
                    });
                  });
              }}
              size="sm"
              variant="secondary"
            >
              Edit
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  async function handleSaveProduct(input: ProductEditorSaveInput) {
    setSaving(true);
    try {
      if (editorState?.mode === "create") {
        let nextProduct = await createProduct(input.identity);

        if (input.organization.brandId !== null) {
          const brandMutation = await assignProductBrand(nextProduct.id, {
            brandId: input.organization.brandId,
          });
          nextProduct = brandMutation.product;
        }

        if (input.organization.categoryIds.length > 0) {
          const categoryMutation = await assignProductCategories(nextProduct.id, {
            categoryIds: input.organization.categoryIds,
          });
          nextProduct = categoryMutation.product;
        }

        setProducts((previous) => sortProducts([...previous, nextProduct]));
        setToast({
          tone: "success",
          title: "Product created",
          message: "Product draft is ready for next catalog steps.",
        });
      } else if (editorState?.product) {
        let nextProduct = await updateProduct(editorState.product.id, input.identity);

        if (input.organization.persist) {
          const brandMutation = await assignProductBrand(editorState.product.id, {
            brandId: input.organization.brandId,
          });
          nextProduct = brandMutation.product;

          const categoryMutation = await assignProductCategories(
            editorState.product.id,
            {
              categoryIds: input.organization.categoryIds,
            }
          );
          nextProduct = categoryMutation.product;
        }

        setProducts((previous) =>
          sortProducts(
            previous.map((product) =>
              product.id === nextProduct.id ? nextProduct : product
            )
          )
        );
        setToast({
          tone: "success",
          title: "Product updated",
          message: "Product identity and organization changes are saved.",
        });
      }

      setEditorState(null);
      setRefreshToken((value) => value + 1);
    } catch (error) {
      const message = productActionErrorMessage(
        error,
        "Product save failed. Try again."
      );
      setToast({
        tone: "error",
        title: "Save failed",
        message,
      });
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="jrw-products">
      <header className="jrw-products__header">
        <div>
          <p className="jrw-page-kicker">Catalog management</p>
          <h1 className="jrw-products__title">Products</h1>
          <p className="jrw-page-copy">You can manage your list of products here.</p>
        </div>
        <dl className="jrw-products__metrics" aria-label="Product summary">
          <div>
            <dt>Total products</dt>
            <dd>{loadState === "ready" ? products.length : "-"}</dd>
          </div>
          <div>
            <dt>Draft products</dt>
            <dd>{loadState === "ready" ? draftCount : "-"}</dd>
          </div>
        </dl>
      </header>

      <PageToolbar
        actions={
          <Button
            onClick={() =>
              setEditorState({
                mode: "create",
                product: null,
                organization: null,
                organizationReady: false,
                organizationUnavailable: false,
              })
            }
            variant="primary"
          >
            Create product
          </Button>
        }
        main={
          <SearchInput
            label="Search products"
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            placeholder="Search by name or slug"
            value={searchQuery}
          />
        }
      >
        <div className="jrw-control-grid">
          <Select
            label="Brand filter"
            onChange={(event) => setBrandFilter(event.currentTarget.value)}
            value={brandFilter}
          >
            <option value="">All brands</option>
            <option value={BRANDLESS_FILTER_VALUE}>No brand (brandless)</option>
            {availableBrands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </Select>

          <Select
            label="Category filter"
            onChange={(event) => setCategoryFilter(event.currentTarget.value)}
            value={categoryFilter}
          >
            <option value="">All categories</option>
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
      </PageToolbar>

      <section className="jrw-products__section">
        {loadState === "loading" ? (
          <div className="jrw-products__table-skeleton" role="status">
            <Skeleton label="Loading product table" lines={6} />
          </div>
        ) : null}

        {loadState === "failed" ? (
          <EmptyState
            action={
              <Button onClick={() => setRefreshToken((value) => value + 1)} size="sm">
                Retry
              </Button>
            }
            message="Could not load products. Retry with an active admin session."
            title="Product list unavailable"
          />
        ) : null}

        {loadState === "ready" && products.length === 0 ? (
          <EmptyState
            action={
              <Button
                onClick={() => {
                  if (hasActiveFilters) {
                    setSearchQuery("");
                    setBrandFilter("");
                    setCategoryFilter("");
                    return;
                  }

                  setEditorState({
                    mode: "create",
                    product: null,
                    organization: null,
                    organizationReady: false,
                    organizationUnavailable: false,
                  });
                }}
                size="sm"
                variant={hasActiveFilters ? "secondary" : "primary"}
              >
                {hasActiveFilters ? "Reset filters" : "Create first product"}
              </Button>
            }
            message={
              hasActiveFilters
                ? "No products match current filters."
                : "No products exist."
            }
            title={
              hasActiveFilters
                ? "No matching products"
                : "No products exist"
            }
          />
        ) : null}

        {loadState === "ready" && visibleProducts.length > 0 ? (
          <DataTable
            caption="Product list"
            columns={columns}
            emptyMessage="No products exist."
            getRowId={(row) => row.id}
            rows={visibleProducts}
          />
        ) : null}
      </section>

      {editorState ? (
        <ProductEditor
          availableBrands={availableBrands}
          availableCategories={availableCategories}
          mode={editorState.mode}
          onClose={() => setEditorState(null)}
          onSave={handleSaveProduct}
          open={true}
          organization={editorState.organization}
          organizationReady={editorState.organizationReady}
          organizationUnavailable={editorState.organizationUnavailable}
          product={editorState.product}
          saving={saving}
        />
      ) : null}

      {toast ? (
        <aside className="jrw-products__toast">
          <Toast
            message={toast.message}
            onDismiss={() => setToast(null)}
            title={toast.title}
            tone={toast.tone}
          />
        </aside>
      ) : null}
    </main>
  );
}
