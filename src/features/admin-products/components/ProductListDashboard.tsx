import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  DataTable,
  ResourceCard,
  ResourceList,
  type DataTableColumn,
} from "@/components/data-display";
import { EmptyState, Skeleton, StatusBadge, Toast } from "@/components/feedback";
import { PageToolbar } from "@/components/layout";
import {
  Button,
  ConfirmDialog,
  Pagination,
  SearchInput,
  Select,
  ViewToggle,
} from "@/components/ui";
import {
  archiveProduct,
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
import { formatPriceCentavos } from "./VariantEditor";
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
  mutationsBlocked: boolean;
  mutationBlockReason: string | null;
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

function categoryLabel(product: ProductRecord): string {
  const count = product.linkedCategoryCount;
  return count === 1 ? "1 category" : `${count} categories`;
}

function availabilityTone(product: ProductRecord) {
  if (product.variantCount === 0) {
    return "info" as const;
  }

  return product.hasAvailableVariants ? ("success" as const) : ("warning" as const);
}

function availabilityLabel(product: ProductRecord): string {
  if (product.variantCount === 0) {
    return "No variants";
  }

  return product.hasAvailableVariants ? "Available variants" : "No available variants";
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

function productCanMutate(
  product: ProductRecord,
  availableBrandIds: Set<string>,
  brandScopeKnown: boolean
): { allowed: boolean; reason: string | null } {
  if (!brandScopeKnown || !product.brandId) {
    return { allowed: true, reason: null };
  }

  if (availableBrandIds.has(product.brandId)) {
    return { allowed: true, reason: null };
  }

  return {
    allowed: false,
    reason: "You need active membership in this product brand.",
  };
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
  const [availableBrands, setAvailableBrands] = useState<ProductAssignableBrand[]>([]);
  const [availableCategories, setAvailableCategories] = useState<
    ProductAssignableCategory[]
  >([]);
  const [brandScopeKnown, setBrandScopeKnown] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [archiveCandidate, setArchiveCandidate] = useState<ProductRecord | null>(
    null
  );
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

  function openEditor(input: {
    mode: "create" | "edit";
    product: ProductRecord | null;
  }) {
    if (input.mode === "create") {
      setEditorState({
        mode: "create",
        product: null,
        organization: null,
        organizationReady: false,
        organizationUnavailable: false,
        mutationsBlocked: false,
        mutationBlockReason: null,
      });
      return;
    }

    if (!input.product) {
      return;
    }

    const mutationState = productCanMutate(
      input.product,
      availableBrandIds,
      brandScopeKnown
    );

    setEditorState({
      mode: "edit",
      product: input.product,
      organization: null,
      organizationReady: false,
      organizationUnavailable: false,
      mutationsBlocked: !mutationState.allowed,
      mutationBlockReason: mutationState.reason,
    });

    fetchProductOrganization(input.product.id)
      .then((organization) => {
        setEditorState((previous) => {
          if (
            !previous ||
            previous.mode !== "edit" ||
            previous.product?.id !== input.product?.id
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
            previous.product?.id !== input.product?.id
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
  }

  const columns = useMemo<Array<DataTableColumn<ProductRecord>>>(
    () => [
      {
        key: "name",
        header: "Product",
        cell: (product) => (
          <div className="jrw-products__cell-stack">
            <strong>{product.name}</strong>
            <span className="jrw-products__cell-meta">{product.slug}</span>
          </div>
        ),
      },
      {
        key: "brandCategory",
        header: "Brand / Category",
        cell: (product) => (
          <div className="jrw-products__cell-stack">
            <span>{brandLabel(product)}</span>
            <span className="jrw-products__cell-meta">{categoryLabel(product)}</span>
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
          <div className="jrw-products__cell-stack">
            <StatusBadge
              label={availabilityLabel(product)}
              tone={availabilityTone(product)}
            />
            <span className="jrw-products__cell-meta">
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
            ? canMutate.reason ?? undefined
            : archiveBlocked
              ? "Archived products are read-only."
              : undefined;
          return (
            <div
              aria-label={`Actions for ${product.name}`}
              className="jrw-products__table-actions"
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) {
                  return;
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  openEditor({ mode: "edit", product });
                }
              }}
              role="group"
              tabIndex={canMutate.allowed ? 0 : undefined}
            >
              <Button
                aria-label={`Edit ${product.name}`}
                disabled={!canMutate.allowed}
                onClick={() => openEditor({ mode: "edit", product })}
                size="sm"
                title={canMutate.reason ?? undefined}
                variant="secondary"
              >
                Edit
              </Button>
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
      setEditorState((previous) => {
        if (
          !previous ||
          previous.mode !== "edit" ||
          previous.product?.id !== archived.id
        ) {
          return previous;
        }

        return {
          ...previous,
          product: archived,
        };
      });
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
    <main className="jrw-products">
      <header className="jrw-products__header">
        <div>
          <p className="jrw-page-kicker">Catalog management</p>
          <h1 className="jrw-products__title">Products</h1>
          <p className="jrw-page-copy">
            Manage product identity, variants, pricing, inventory, and publish status.
          </p>
        </div>
        <dl className="jrw-products__metrics" aria-label="Product summary">
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

      <PageToolbar
        actions={
          <Button onClick={() => openEditor({ mode: "create", product: null })} variant="primary">
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
      />
      <PageToolbar
        main={
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
        }
        actions={
          <ViewToggle
            label="Product dashboard view"
            onChange={(nextView) => setViewMode(nextView)}
            options={[
              { label: "Table", value: "table" },
              { label: "List", value: "list" },
            ]}
            value={viewMode}
          />
        }
      />

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

                  openEditor({ mode: "create", product: null });
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
            title={hasActiveFilters ? "No matching products" : "No products exist"}
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
                ? canMutate.reason ?? undefined
                : archiveBlocked
                  ? "Archived products are read-only."
                  : undefined;
              return (
                <ResourceCard
                  action={
                    <div className="jrw-products__table-actions">
                      <Button
                        disabled={!canMutate.allowed}
                        onClick={() => openEditor({ mode: "edit", product })}
                        size="sm"
                        title={canMutate.reason ?? undefined}
                        variant="secondary"
                      >
                        Edit
                      </Button>
                      <Button
                        disabled={!canMutate.allowed || archiveBlocked || saving}
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
          mutationBlockReason={editorState.mutationBlockReason}
          mutationsBlocked={editorState.mutationsBlocked}
          onClose={() => setEditorState(null)}
          onProductStatusChange={(nextProduct, operation) => {
            setProducts((previous) =>
              sortProducts(
                previous.map((row) =>
                  row.id === nextProduct.id ? nextProduct : row
                )
              )
            );
            setEditorState((previous) => {
              if (
                !previous ||
                previous.mode !== "edit" ||
                previous.product?.id !== nextProduct.id
              ) {
                return previous;
              }

              return {
                ...previous,
                product: nextProduct,
              };
            });
            setRefreshToken((value) => value + 1);
            setToast({
              tone: "success",
              title: "Status updated",
              message:
                operation === "publish"
                  ? "Product published and visible to storefront queries."
                  : operation === "unpublish"
                    ? "Product moved to draft and hidden from storefront queries."
                    : "Product archived with historical references preserved.",
            });
          }}
          onSave={handleSaveProduct}
          open={true}
          organization={editorState.organization}
          organizationReady={editorState.organizationReady}
          organizationUnavailable={editorState.organizationUnavailable}
          product={editorState.product}
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
