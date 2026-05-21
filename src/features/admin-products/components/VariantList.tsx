import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-display";
import { EmptyState, Skeleton, StatusBadge, Toast } from "@/components/feedback";
import { PageToolbar } from "@/components/layout";
import { Button, SearchInput } from "@/components/ui";
import {
  archiveProductVariant,
  createProductVariant,
  fetchProductVariants,
  type ApiFailure,
  updateProductVariant,
} from "../api";
import type { ProductVariantRecord } from "../types";
import {
  formatPriceCentavos,
  VariantEditor,
  type VariantEditorSaveInput,
} from "./VariantEditor";

type LoadState = "loading" | "ready" | "failed";

type ToastState = {
  title: string;
  message: string;
  tone: "error" | "success" | "warning";
};

type EditorState = {
  mode: "create" | "edit";
  variant: ProductVariantRecord | null;
};

export type VariantListProps = {
  productId: string;
  autoLoad?: boolean;
  initialVariants?: ProductVariantRecord[];
  initialLoadState?: LoadState;
};

function sortVariants(rows: ProductVariantRecord[]): ProductVariantRecord[] {
  return [...rows].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "ACTIVE" ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });
}

function statusTone(status: ProductVariantRecord["status"]) {
  return status === "ARCHIVED" ? ("warning" as const) : ("success" as const);
}

function statusLabel(status: ProductVariantRecord["status"]) {
  return status === "ARCHIVED" ? "Archived" : "Active";
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
    if (reason === "DUPLICATE_SKU") {
      return "SKU is already in use.";
    }
    if (reason === "DUPLICATE_OPTION_COMBINATION") {
      return "Variant option combination already exists.";
    }
    if (reason === "VARIANT_ARCHIVED") {
      return "Variant is archived and cannot be edited.";
    }

    return "Variant state conflicts with current data.";
  }

  if (failure.code === "VALIDATION_FAILED") {
    return "Variant data is invalid. Check required fields and try again.";
  }

  if (failure.code === "AUTH_FORBIDDEN") {
    if (reason === "BRAND_MEMBERSHIP_REQUIRED") {
      return "You need active membership for this product brand.";
    }

    return "You do not have access to manage variants for this product.";
  }

  return typeof failure.message === "string" && failure.message.trim().length > 0
    ? failure.message
    : fallback;
}

function filterVariants(
  variants: ProductVariantRecord[],
  query: string
): ProductVariantRecord[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return variants;
  }

  return variants.filter((variant) =>
    `${variant.name} ${variant.sku}`.toLowerCase().includes(normalizedQuery)
  );
}

export function VariantList({
  productId,
  autoLoad = true,
  initialVariants = [],
  initialLoadState = "loading",
}: VariantListProps) {
  const [loadState, setLoadState] = useState<LoadState>(initialLoadState);
  const [variants, setVariants] = useState<ProductVariantRecord[]>(
    sortVariants(initialVariants)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    let active = true;
    setLoadState("loading");

    fetchProductVariants(productId)
      .then((result) => {
        if (!active) {
          return;
        }

        setVariants(sortVariants(result.items));
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
  }, [autoLoad, productId, refreshToken]);

  const visibleVariants = useMemo(
    () => filterVariants(variants, searchQuery),
    [variants, searchQuery]
  );

  const activeCount = variants.filter((variant) => variant.status === "ACTIVE").length;

  const columns = useMemo<Array<DataTableColumn<ProductVariantRecord>>>(
    () => [
      {
        key: "name",
        header: "Name",
        cell: (variant) => (
          <div className="jrw-variants__cell-stack">
            <strong>{variant.name}</strong>
            <span className="jrw-variants__cell-meta">{variant.sku}</span>
          </div>
        ),
      },
      {
        key: "price",
        header: "Price",
        align: "right",
        cell: (variant) => formatPriceCentavos(variant.priceCentavos),
      },
      {
        key: "status",
        header: "Status",
        cell: (variant) => (
          <StatusBadge
            label={statusLabel(variant.status)}
            tone={statusTone(variant.status)}
          />
        ),
      },
      {
        key: "availability",
        header: "Availability",
        cell: (variant) => (variant.hasAvailableStock ? "Available" : "Unavailable"),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        cell: (variant) => (
          <div className="jrw-variants__table-actions">
            <Button
              onClick={() =>
                setEditorState({
                  mode: "edit",
                  variant,
                })
              }
              size="sm"
              variant="secondary"
            >
              Edit
            </Button>
            <Button
              disabled={variant.status === "ARCHIVED"}
              onClick={async () => {
                if (
                  typeof window !== "undefined" &&
                  !window.confirm("Archive this variant?")
                ) {
                  return;
                }

                try {
                  const archived = await archiveProductVariant(
                    productId,
                    variant.id,
                    {}
                  );
                  setVariants((previous) =>
                    sortVariants(
                      previous.map((row) =>
                        row.id === archived.id ? archived : row
                      )
                    )
                  );
                  setToast({
                    tone: "success",
                    title: "Variant archived",
                    message: "Variant remains readable for historical records.",
                  });
                } catch (error) {
                  setToast({
                    tone: "error",
                    title: "Archive failed",
                    message: productActionErrorMessage(
                      error,
                      "Variant archive failed. Try again."
                    ),
                  });
                }
              }}
              size="sm"
              variant="danger"
            >
              Archive
            </Button>
          </div>
        ),
      },
    ],
    [productId]
  );

  async function handleSaveVariant(input: VariantEditorSaveInput) {
    setSaving(true);
    try {
      if (editorState?.mode === "create") {
        const created = await createProductVariant(productId, input);
        setVariants((previous) => sortVariants([...previous, created]));
        setToast({
          tone: "success",
          title: "Variant created",
          message: "Variant is ready for pricing and stock updates.",
        });
      } else if (editorState?.variant) {
        const updated = await updateProductVariant(
          productId,
          editorState.variant.id,
          input
        );
        setVariants((previous) =>
          sortVariants(
            previous.map((variant) =>
              variant.id === updated.id ? updated : variant
            )
          )
        );
        setToast({
          tone: "success",
          title: "Variant updated",
          message: "Variant changes are saved.",
        });
      }

      setEditorState(null);
      setRefreshToken((value) => value + 1);
    } catch (error) {
      const message = productActionErrorMessage(
        error,
        "Variant save failed. Try again."
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
    <main className="jrw-variants">
      <header className="jrw-variants__header">
        <div>
          <p className="jrw-page-kicker">Product variants</p>
          <h1 className="jrw-variants__title">Variants</h1>
          <p className="jrw-page-copy">
            You can manage variant options, SKU, and centavos pricing here.
          </p>
        </div>
        <dl className="jrw-variants__metrics" aria-label="Variant summary">
          <div>
            <dt>Total variants</dt>
            <dd>{loadState === "ready" ? variants.length : "-"}</dd>
          </div>
          <div>
            <dt>Active variants</dt>
            <dd>{loadState === "ready" ? activeCount : "-"}</dd>
          </div>
        </dl>
      </header>

      <PageToolbar
        actions={
          <Button
            onClick={() =>
              setEditorState({
                mode: "create",
                variant: null,
              })
            }
            variant="primary"
          >
            Create variant
          </Button>
        }
        main={
          <SearchInput
            label="Search variants"
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            placeholder="Search by name or SKU"
            value={searchQuery}
          />
        }
      />

      <section className="jrw-variants__section">
        {loadState === "loading" ? (
          <div className="jrw-variants__table-skeleton" role="status">
            <Skeleton label="Loading variant table" lines={6} />
          </div>
        ) : null}

        {loadState === "failed" ? (
          <EmptyState
            action={
              <Button onClick={() => setRefreshToken((value) => value + 1)} size="sm">
                Retry
              </Button>
            }
            message="Could not load variants. Retry with an active admin session."
            title="Variant list unavailable"
          />
        ) : null}

        {loadState === "ready" && variants.length === 0 ? (
          <EmptyState
            action={
              <Button
                onClick={() =>
                  setEditorState({
                    mode: "create",
                    variant: null,
                  })
                }
                size="sm"
                variant="primary"
              >
                Create first variant
              </Button>
            }
            message="No variants exist."
            title="No variants exist"
          />
        ) : null}

        {loadState === "ready" && visibleVariants.length > 0 ? (
          <DataTable
            caption="Variant list"
            columns={columns}
            emptyMessage="No variants exist."
            getRowId={(row) => row.id}
            rows={visibleVariants}
          />
        ) : null}
      </section>

      {editorState ? (
        <VariantEditor
          mode={editorState.mode}
          onClose={() => setEditorState(null)}
          onSave={handleSaveVariant}
          open={true}
          saving={saving}
          variant={editorState.variant}
        />
      ) : null}

      {toast ? (
        <aside className="jrw-variants__toast">
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
