import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  DataTable,
  ResourceCard,
  ResourceList,
  type DataTableColumn,
} from "@/components/data-display";
import {
  EmptyState,
  Skeleton,
  StatusBadge,
  Toast,
} from "@/components/feedback";
import { Button, ButtonLink, ConfirmDialog, Pagination } from "@/components/ui";
import {
  archiveProduct,
  assignProductBrand,
  assignProductCategories,
  createProduct,
  fetchAssignableBrands,
  fetchAssignableCategories,
  fetchProductListWithQuery,
} from "../api";
import { productActionErrorMessage } from "../productActionErrorMessage";
import { productCanMutate } from "../productCanMutate";
import { ProductEditor, type ProductEditorSaveInput } from "./ProductEditor";
import { ProductListToolbar } from "./ProductListToolbar";
import { formatPriceCentavos } from "./VariantEditor";
import type {
  ProductAssignableBrand,
  ProductAssignableCategory,
  ProductRecord,
} from "../types";

type LoadState = "loading" | "ready" | "failed";

type ToastState = {
  title: string;
  message: string;
  tone: "error" | "success" | "warning";
};

type EditorState = {
  mode: "create";
};

type DashboardView = "table" | "list";

const BRANDLESS_FILTER_VALUE = "__brandless__";
const DEFAULT_PAGE_SIZE = 20;

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

function categoryLabel(product: ProductRecord): string {
  const count = product.linkedCategoryCount;
  return count === 1 ? "1 category" : `${count} categories`;
}

function availabilityTone(product: ProductRecord) {
  if (product.variantCount === 0) {
    return "info" as const;
  }

  return product.hasAvailableVariants
    ? ("success" as const)
    : ("warning" as const);
}

function availabilityLabel(product: ProductRecord): string {
  if (product.variantCount === 0) {
    return "No variants";
  }

  return product.hasAvailableVariants
    ? "Available variants"
    : "No available variants";
}

function priceSummaryLabel(product: ProductRecord): string {
  if (
    typeof product.priceRangeMin === "number" &&
    typeof product.priceRangeMax === "number"
  ) {
    if (product.priceRangeMin === product.priceRangeMax) {
      return formatPriceCentavos(product.priceRangeMin);
    }

    return `${formatPriceCentavos(product.priceRangeMin)} - ${formatPriceCentavos(product.priceRangeMax)}`;
  }

  if (typeof product.lowestPrice === "number") {
    return `Starts at ${formatPriceCentavos(product.lowestPrice)}`;
  }

  return "No priced variants";
}

function formatUpdatedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type ProductListDashboardProps = {
  autoLoad?: boolean;
  initialProducts?: ProductRecord[];
  initialLoadState?: LoadState;
};

export function ProductListDashboard(props: ProductListDashboardProps) {
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
  const [availableBrands, setAvailableBrands] = useState<
    ProductAssignableBrand[]
  >([]);
  const [availableCategories, setAvailableCategories] = useState<
    ProductAssignableCategory[]
  >([]);
  const [brandScopeKnown, setBrandScopeKnown] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [archiveCandidate, setArchiveCandidate] =
    useState<ProductRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalItems, setTotalItems] = useState(initialProducts.length);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<DashboardView>("table");

  const availableBrandIds = useMemo(
    () => new Set(availableBrands.map((brand) => brand.id)),
    [availableBrands]
  );

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    let active = true;

    Promise.allSettled([fetchAssignableBrands(), fetchAssignableCategories()])
      .then(([brandsResult, categoriesResult]) => {
        if (!active) {
          return;
        }

        if (brandsResult.status === "fulfilled") {
          setAvailableBrands(
            brandsResult.value.filter((brand) => brand.status === "ACTIVE")
          );
          setBrandScopeKnown(true);
        } else {
          setAvailableBrands([]);
          setBrandScopeKnown(false);
        }

        if (categoriesResult.status === "fulfilled") {
          setAvailableCategories(
            categoriesResult.value.filter(
              (category) => category.status === "ACTIVE"
            )
          );
        } else {
          setAvailableCategories([]);
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setAvailableBrands([]);
        setAvailableCategories([]);
        setBrandScopeKnown(false);
      });

    return () => {
      active = false;
    };
  }, [autoLoad, refreshToken]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, brandFilter, categoryFilter, pageSize]);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    let active = true;
    setLoadState("loading");

    fetchProductListWithQuery({
      page,
      pageSize,
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
        setTotalItems(result.totalItems);
        setTotalPages(Math.max(1, result.totalPages));
        setPage(result.page);
        setPageSize(result.pageSize);
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
  }, [
    autoLoad,
    refreshToken,
    searchQuery,
    brandFilter,
    categoryFilter,
    page,
    pageSize,
  ]);

  const visibleProducts = useMemo(() => products, [products]);
  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasActiveFilters =
    hasSearchQuery || brandFilter.length > 0 || categoryFilter.length > 0;
  const draftCount = products.filter((row) => row.status === "DRAFT").length;

  function openCreateEditor() {
    setEditorState({ mode: "create" });
  }

  const columns = useMemo<Array<DataTableColumn<ProductRecord>>>(
    () => [
      {
        key: "name",
        header: "Product",
        cell: (product) => (
          <div className="grid gap-0.5">
            <strong>{product.name}</strong>
            <span className="text-xs text-brand-muted">{product.slug}</span>
          </div>
        ),
      },
      {
        key: "brandCategory",
        header: "Brand / Category",
        cell: (product) => (
          <div className="grid gap-0.5">
            <span>{brandLabel(product)}</span>
            <span className="text-xs text-brand-muted">
              {categoryLabel(product)}
            </span>
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
        key: "stock",
        header: "Stock / Availability",
        cell: (product) => (
          <div className="grid gap-0.5">
            <StatusBadge
              label={availabilityLabel(product)}
              tone={availabilityTone(product)}
            />
            <span className="text-xs text-brand-muted">
              {product.variantCount} variants
            </span>
          </div>
        ),
      },
      {
        key: "priceSummary",
        header: "Price summary",
        cell: (product) => priceSummaryLabel(product),
      },
      {
        key: "updatedAt",
        header: "Updated",
        cell: (product) => formatUpdatedAt(product.updatedAt),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        cell: (product) => {
          const canMutate = productCanMutate(
            product,
            availableBrandIds,
            brandScopeKnown
          );
          const archiveBlocked = product.status === "ARCHIVED";
          const archiveTitle = !canMutate.allowed
            ? (canMutate.reason ?? undefined)
            : archiveBlocked
              ? "Archived products are read-only."
              : undefined;
          return (
            <div
              aria-label={`Actions for ${product.name}`}
              className="inline-flex flex-wrap gap-grid-xs"
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) {
                  return;
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  window.location.assign(`/admin/products/${product.id}`);
                }
              }}
              role="group"
              tabIndex={canMutate.allowed ? 0 : undefined}
            >
              <ButtonLink
                aria-label={`Edit ${product.name}`}
                disabled={!canMutate.allowed}
                href={`/admin/products/${product.id}`}
                size="sm"
                title={canMutate.reason ?? undefined}
                variant="secondary"
              >
                Edit
              </ButtonLink>
              <Button
                aria-label={`Archive ${product.name}`}
                disabled={!canMutate.allowed || archiveBlocked || saving}
                onClick={() => setArchiveCandidate(product)}
                size="sm"
                title={archiveTitle}
                variant="danger"
              >
                Archive
              </Button>
            </div>
          );
        },
      },
    ],
    [availableBrandIds, brandScopeKnown, saving]
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
          const categoryMutation = await assignProductCategories(
            nextProduct.id,
            {
              categoryIds: input.organization.categoryIds,
            }
          );
          nextProduct = categoryMutation.product;
        }

        setProducts((previous) => sortProducts([...previous, nextProduct]));
        setToast({
          tone: "success",
          title: "Product created",
          message: "Add category and variant next. Image upload is optional.",
        });
        setRefreshToken((value) => value + 1);
        if (typeof window !== "undefined") {
          window.location.assign(`/admin/products/${nextProduct.id}`);
        }
        return;
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

  async function handleArchiveProduct() {
    if (!archiveCandidate) {
      return;
    }

    setSaving(true);
    try {
      const archived = await archiveProduct(archiveCandidate.id);
      setProducts((previous) =>
        sortProducts(
          previous.map((product) =>
            product.id === archived.id ? archived : product
          )
        )
      );
      setRefreshToken((value) => value + 1);
      setToast({
        tone: "success",
        title: "Product archived",
        message: "Product remains available for historical order references.",
      });
    } catch (error) {
      setToast({
        tone: "error",
        title: "Archive failed",
        message: productActionErrorMessage(
          error,
          "Product archive failed. Try again."
        ),
      });
    } finally {
      setSaving(false);
      setArchiveCandidate(null);
    }
  }

  return (
    <section className="grid gap-grid-sm">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-grid-md border-b border-brand-border-strong py-grid-md pt-grid-lg max-md:grid-cols-1 max-md:items-stretch max-md:pt-grid-md">
        <div>
          <p className="font-system text-xs font-bold uppercase text-brand-muted">
            Catalog management
          </p>
          <h1 className="text-[clamp(1.8rem,6vw,3.8rem)]">Products</h1>
          <p className="max-w-[72ch] text-[0.9375rem] text-brand-muted">
            Manage product identity, variants, pricing, inventory, and publish
            status.
          </p>
        </div>
        <dl
          className="m-0 grid grid-cols-2 border border-brand-border-strong bg-brand-surface max-md:grid-cols-1 [&>div]:grid [&>div]:gap-grid-xs [&>div]:border-r [&>div]:border-brand-border [&>div]:p-grid-sm [&>div:last-child]:border-r-0 max-md:[&>div]:border-r-0 max-md:[&>div]:border-b max-md:[&>div:last-child]:border-b-0 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:text-brand-muted [&_dd]:m-0 [&_dd]:font-heading [&_dd]:text-xl [&_dd]:font-bold"
          aria-label="Product summary"
        >
          <div>
            <dt>Total items</dt>
            <dd>{loadState === "ready" ? totalItems : "-"}</dd>
          </div>
          <div>
            <dt>Draft products</dt>
            <dd>{loadState === "ready" ? draftCount : "-"}</dd>
          </div>
        </dl>
      </header>

      <ProductListToolbar
        availableBrands={availableBrands}
        availableCategories={availableCategories}
        brandFilter={brandFilter}
        brandlessFilterValue={BRANDLESS_FILTER_VALUE}
        categoryFilter={categoryFilter}
        onBrandFilterChange={setBrandFilter}
        onCategoryFilterChange={setCategoryFilter}
        onCreateProduct={openCreateEditor}
        onSearchQueryChange={setSearchQuery}
        onViewModeChange={(nextView) => setViewMode(nextView)}
        searchQuery={searchQuery}
        viewMode={viewMode}
      />

      <section className="grid gap-grid-sm py-grid-md">
        {loadState === "loading" ? (
          <div
            className="border border-brand-border-strong bg-brand-surface p-grid-sm"
            role="status"
          >
            <Skeleton label="Loading product table" lines={6} />
          </div>
        ) : null}

        {loadState === "failed" ? (
          <EmptyState
            action={
              <Button
                onClick={() => setRefreshToken((value) => value + 1)}
                size="sm"
              >
                Retry
              </Button>
            }
            message="Could not load products. Retry with an active admin session."
            title="Product list unavailable"
          />
        ) : null}

        {loadState === "ready" && totalItems === 0 ? (
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

                  openCreateEditor();
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
              hasActiveFilters ? "No matching products" : "No products exist"
            }
          />
        ) : null}

        {loadState === "ready" && totalItems > 0 && viewMode === "table" ? (
          <DataTable
            caption="Product list"
            columns={columns}
            emptyMessage="No products exist."
            getRowId={(row) => row.id}
            rows={visibleProducts}
          />
        ) : null}

        {loadState === "ready" && totalItems > 0 && viewMode === "list" ? (
          <ResourceList label="Product list cards">
            {visibleProducts.map((product) => {
              const canMutate = productCanMutate(
                product,
                availableBrandIds,
                brandScopeKnown
              );
              const archiveBlocked = product.status === "ARCHIVED";
              const archiveTitle = !canMutate.allowed
                ? (canMutate.reason ?? undefined)
                : archiveBlocked
                  ? "Archived products are read-only."
                  : undefined;
              return (
                <ResourceCard
                  action={
                    <div className="inline-flex flex-wrap gap-grid-xs">
                      <ButtonLink
                        disabled={!canMutate.allowed}
                        href={`/admin/products/${product.id}`}
                        size="sm"
                        title={canMutate.reason ?? undefined}
                        variant="secondary"
                      >
                        Edit
                      </ButtonLink>
                      <Button
                        disabled={
                          !canMutate.allowed || archiveBlocked || saving
                        }
                        onClick={() => setArchiveCandidate(product)}
                        size="sm"
                        title={archiveTitle}
                        variant="danger"
                      >
                        Archive
                      </Button>
                    </div>
                  }
                  key={product.id}
                  meta={`${product.slug} - ${brandLabel(product)} - ${categoryLabel(product)}`}
                  stats={[
                    { label: "Price", value: priceSummaryLabel(product) },
                    {
                      label: "Availability",
                      value: availabilityLabel(product),
                    },
                    {
                      label: "Variants",
                      value: String(product.variantCount),
                    },
                    {
                      label: "Updated",
                      value: formatUpdatedAt(product.updatedAt),
                    },
                  ]}
                  status={
                    <StatusBadge
                      label={statusLabel(product.status)}
                      tone={statusTone(product.status)}
                    />
                  }
                  title={product.name}
                />
              );
            })}
          </ResourceList>
        ) : null}

        {loadState === "ready" && totalItems > 0 ? (
          <Pagination
            disabled={saving}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
            }}
            page={page}
            pageSize={pageSize}
            totalItems={totalItems}
            totalPages={totalPages}
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
          saving={saving}
        />
      ) : null}

      <ConfirmDialog
        confirmLabel="Archive product"
        message="Archive keeps historical references and removes this product from active catalog management."
        onCancel={() => {
          if (saving) {
            return;
          }
          setArchiveCandidate(null);
        }}
        onConfirm={handleArchiveProduct}
        open={archiveCandidate !== null}
        title="Archive product"
        tone="danger"
      />

      {toast ? (
        <aside className="fixed bottom-grid-md right-grid-md z-[60] max-md:bottom-grid-sm max-md:left-grid-sm max-md:right-grid-sm">
          <Toast
            message={toast.message}
            onDismiss={() => setToast(null)}
            title={toast.title}
            tone={toast.tone}
          />
        </aside>
      ) : null}
    </section>
  );
}
