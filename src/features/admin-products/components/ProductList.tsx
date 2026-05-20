import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-display";
import { EmptyState, Skeleton, StatusBadge, Toast } from "@/components/feedback";
import { PageToolbar } from "@/components/layout";
import { Button, SearchInput } from "@/components/ui";
import {
  createProduct,
  fetchProductList,
  updateProduct,
  type ApiFailure,
} from "../api";
import { ProductEditor } from "./ProductEditor";
import type { ProductMutationInput, ProductRecord } from "../types";

type LoadState = "loading" | "ready" | "failed";

type ToastState = {
  title: string;
  message: string;
  tone: "error" | "success" | "warning";
};

type EditorState = {
  mode: "create" | "edit";
  product: ProductRecord | null;
};

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
      return "You need active membership in this product brand.";
    }

    return "Product state conflicts with current data.";
  }

  if (failure.code === "VALIDATION_FAILED") {
    return "Product data is invalid. Check required fields and try again.";
  }

  if (failure.code === "AUTH_FORBIDDEN") {
    if (reason === "BRAND_MEMBERSHIP_REQUIRED") {
      return "You need active membership in this product brand.";
    }

    return "You do not have access to manage products.";
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
  const [toast, setToast] = useState<ToastState | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    let active = true;
    setLoadState("loading");

    fetchProductList()
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
  }, [autoLoad, refreshToken]);

  const visibleProducts = useMemo(
    () => filterProductsByQuery(products, searchQuery),
    [products, searchQuery]
  );
  const hasSearchQuery = searchQuery.trim().length > 0;
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
              onClick={() =>
                setEditorState({
                  mode: "edit",
                  product,
                })
              }
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

  async function handleSaveProduct(input: ProductMutationInput) {
    setSaving(true);
    try {
      if (editorState?.mode === "create") {
        const created = await createProduct(input);
        setProducts((previous) => sortProducts([...previous, created]));
        setToast({
          tone: "success",
          title: "Product created",
          message: "Product draft is ready for next catalog steps.",
        });
      } else if (editorState?.product) {
        const updated = await updateProduct(editorState.product.id, input);
        setProducts((previous) =>
          sortProducts(
            previous.map((product) =>
              product.id === updated.id ? updated : product
            )
          )
        );
        setToast({
          tone: "success",
          title: "Product updated",
          message: "Product identity changes are saved.",
        });
      }

      setEditorState(null);
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
            onClick={() => setEditorState({ mode: "create", product: null })}
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

        {loadState === "ready" && products.length === 0 ? (
          <EmptyState
            action={
              <Button
                onClick={() => setEditorState({ mode: "create", product: null })}
                size="sm"
                variant="primary"
              >
                Create first product
              </Button>
            }
            message="No products exist."
            title="No products exist"
          />
        ) : null}

        {loadState === "ready" &&
        products.length > 0 &&
        visibleProducts.length === 0 ? (
          <EmptyState
            action={
              <Button onClick={() => setSearchQuery("")} size="sm">
                Reset search
              </Button>
            }
            message={
              hasSearchQuery
                ? "Try another product name or slug."
                : "No products exist."
            }
            title={
              hasSearchQuery ? "No products match this search" : "No products exist"
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
          mode={editorState.mode}
          onClose={() => setEditorState(null)}
          onSave={handleSaveProduct}
          open={true}
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
