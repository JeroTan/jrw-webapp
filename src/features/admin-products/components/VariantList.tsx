import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-display";
import { EmptyState, Skeleton, StatusBadge, Toast } from "@/components/feedback";
import { PageToolbar } from "@/components/layout";
import { Button, ConfirmDialog, SearchInput } from "@/components/ui";
import {
  archiveProductVariant,
  createProductVariant,
  fetchProductVariants,
  type ApiFailure,
  updateProductVariant,
} from "../api";
import type { ProductVariantOption, ProductVariantRecord } from "../types";
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
  embedded?: boolean;
  allowMutations?: boolean;
  mutationDisabledReason?: string | null;
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

function inventoryTone(variant: ProductVariantRecord) {
  switch (variant.inventoryState) {
    case "LOW_STOCK":
      return "warning" as const;
    case "OUT_OF_STOCK":
      return "error" as const;
    case "PREORDER":
      return "info" as const;
    default:
      return "success" as const;
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

function variationKey(options: ProductVariantOption[]): string {
  if (options.length === 0) {
    return "";
  }

  return [...options]
    .map((option) => `${option.group.trim().toLowerCase()}::${option.name.trim().toLowerCase()}`)
    .sort((left, right) => left.localeCompare(right))
    .join("|");
}

function duplicateSummary(variants: ProductVariantRecord[]): string[] {
  const byKey = new Map<string, ProductVariantRecord[]>();
  variants.forEach((variant) => {
    if (variant.status === "ARCHIVED") {
      return;
    }

    const key = variationKey(variant.variationChain);
    if (!key) {
      return;
    }
    const existing = byKey.get(key);
    if (existing) {
      existing.push(variant);
      return;
    }
    byKey.set(key, [variant]);
  });

  const duplicates: string[] = [];
  byKey.forEach((sameKeyVariants) => {
    if (sameKeyVariants.length <= 1) {
      return;
    }

    duplicates.push(
      sameKeyVariants.map((variant) => `${variant.name} (${variant.sku})`).join(", ")
    );
  });

  return duplicates;
}

function hasDuplicateVariation(
  variants: ProductVariantRecord[],
  input: VariantEditorSaveInput,
  editingVariantId: string | null
): boolean {
  const key = variationKey(input.variationChain);
  if (!key) {
    return false;
  }

  return variants.some(
    (variant) =>
      variant.status !== "ARCHIVED" &&
      variant.id !== editingVariantId &&
      variationKey(variant.variationChain) === key
  );
}

export function VariantList({
  productId,
  autoLoad = true,
  initialVariants = [],
  initialLoadState = "loading",
  embedded = false,
  allowMutations = true,
  mutationDisabledReason = null,
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
  const [archiveCandidate, setArchiveCandidate] = useState<ProductVariantRecord | null>(
    null
  );

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
  const duplicateWarnings = useMemo(() => duplicateSummary(variants), [variants]);

  const columns = useMemo<Array<DataTableColumn<ProductVariantRecord>>>(
    () => [
      {
        key: "name",
        header: "Variant",
        cell: (variant) => (
          <div className="jrw-variants__cell-stack">
            <strong>{variant.name}</strong>
            <span className="jrw-variants__cell-meta">{variant.sku}</span>
          </div>
        ),
      },
      {
        key: "options",
        header: "Options",
        cell: (variant) =>
          variant.variationChain.length > 0 ? (
            <span className="jrw-variants__cell-meta">
              {variant.variationChain
                .map((option) => `${option.group}: ${option.name}`)
                .join(" - ")}
            </span>
          ) : (
            "-"
          ),
      },
      {
        key: "price",
        header: "Price",
        align: "right",
        cell: (variant) => formatPriceCentavos(variant.priceCentavos),
      },
      {
        key: "inventory",
        header: "Stock / State",
        cell: (variant) => (
          <div className="jrw-variants__cell-stack">
            <span>{variant.stock}</span>
            <StatusBadge
              label={variant.inventoryState.replaceAll("_", " ")}
              tone={inventoryTone(variant)}
            />
          </div>
        ),
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
        key: "actions",
        header: "Actions",
        align: "right",
        cell: (variant) => {
          const isArchived = variant.status === "ARCHIVED";
          const blocked = !allowMutations || isArchived;
          const title = !allowMutations
            ? mutationDisabledReason ?? undefined
            : isArchived
              ? "Archived variants are read-only."
              : undefined;
          return (
            <div
              aria-label={`Actions for ${variant.name}`}
              className="jrw-variants__table-actions"
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) {
                  return;
                }
                if (event.key === "Enter" && !blocked) {
                  event.preventDefault();
                  setEditorState({
                    mode: "edit",
                    variant,
                  });
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setEditorState(null);
                }
              }}
              role="group"
              tabIndex={blocked ? undefined : 0}
            >
              <Button
                disabled={blocked}
                onClick={() =>
                  setEditorState({
                    mode: "edit",
                    variant,
                  })
                }
                size="sm"
                title={title}
                variant="secondary"
              >
                Edit
              </Button>
              <Button
                disabled={blocked}
                onClick={() => setArchiveCandidate(variant)}
                size="sm"
                title={title}
                variant="danger"
              >
                Archive
              </Button>
            </div>
          );
        },
      },
    ],
    [allowMutations, mutationDisabledReason]
  );

  async function handleArchiveVariant() {
    if (!archiveCandidate) {
      return;
    }

    try {
      const archived = await archiveProductVariant(productId, archiveCandidate.id, {});
      setVariants((previous) =>
        sortVariants(
          previous.map((row) => (row.id === archived.id ? archived : row))
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
        message: productActionErrorMessage(error, "Variant archive failed. Try again."),
      });
    } finally {
      setArchiveCandidate(null);
    }
  }

  async function handleSaveVariant(input: VariantEditorSaveInput) {
    const editingId = editorState?.mode === "edit" ? editorState.variant?.id ?? null : null;
    if (hasDuplicateVariation(variants, input, editingId)) {
      const message = "Variant option combination already exists.";
      setToast({
        tone: "warning",
        title: "Duplicate option combination",
        message,
      });
      throw new Error(message);
    }

    setSaving(true);
    try {
      if (editorState?.mode === "create") {
        const created = await createProductVariant(productId, {
          name: input.name,
          sku: input.sku,
          priceCentavos: input.priceCentavos,
          stock: input.stock,
          isPreorder: input.isPreorder,
          expectedRelease: input.expectedRelease,
          variationChain: input.variationChain,
        });

        setVariants((previous) => sortVariants([...previous, created]));
        setToast({
          tone: "success",
          title: "Variant created",
          message: "Variant is ready for pricing and stock updates.",
        });
      } else if (editorState?.variant) {
        const baseUpdated = await updateProductVariant(
          productId,
          editorState.variant.id,
          {
            name: input.name,
            sku: input.sku,
            priceCentavos: input.priceCentavos,
            stock: input.stock,
            expectedRelease: input.expectedRelease,
            variationChain: input.variationChain,
            isPreorder: input.isPreorder,
          }
        );

        setVariants((previous) =>
          sortVariants(
            previous.map((variant) =>
              variant.id === baseUpdated.id ? baseUpdated : variant
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
    <section className={embedded ? "jrw-variants jrw-variants--embedded" : "jrw-variants"}>
      {!embedded ? (
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
      ) : (
        <header className="jrw-variants__embedded-header">
          <div>
            <p className="jrw-products__publish-title">Variant matrix</p>
            <p className="jrw-field__description">
              SKU, options, centavos price, and stock states per variant.
            </p>
          </div>
          <dl className="jrw-variants__metrics jrw-variants__metrics--embedded">
            <div>
              <dt>Total</dt>
              <dd>{loadState === "ready" ? variants.length : "-"}</dd>
            </div>
            <div>
              <dt>Active</dt>
              <dd>{loadState === "ready" ? activeCount : "-"}</dd>
            </div>
          </dl>
        </header>
      )}

      <PageToolbar
        actions={
          <Button
            disabled={!allowMutations}
            onClick={() =>
              setEditorState({
                mode: "create",
                variant: null,
              })
            }
            title={!allowMutations ? mutationDisabledReason ?? undefined : undefined}
            variant="primary"
          >
            Create variant
          </Button>
        }
        main={
          <SearchInput
            label="Search variants"
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (embedded && event.key === "Enter") {
                event.preventDefault();
              }
            }}
            placeholder="Search by name or SKU"
            value={searchQuery}
          />
        }
      />

      {!allowMutations && mutationDisabledReason ? (
        <p className="jrw-field__description">{mutationDisabledReason}</p>
      ) : null}

      {duplicateWarnings.length > 0 ? (
        <section className="jrw-variants__duplicate-warning" role="status">
          <p>Duplicate option combinations detected:</p>
          <ul>
            {duplicateWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

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
                disabled={!allowMutations}
                onClick={() =>
                  setEditorState({
                    mode: "create",
                    variant: null,
                  })
                }
                size="sm"
                title={!allowMutations ? mutationDisabledReason ?? undefined : undefined}
                variant="primary"
              >
                Create first variant
              </Button>
            }
            message="No variants exist."
            title="No variants exist"
          />
        ) : null}

        {loadState === "ready" && variants.length > 0 ? (
          <DataTable
            caption="Variant matrix"
            columns={columns}
            emptyMessage={
              searchQuery.trim().length > 0
                ? "No variants match this search."
                : "No variants exist."
            }
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

      <ConfirmDialog
        confirmLabel="Archive variant"
        message="Archive keeps this variant for historical records and blocks future edits."
        onCancel={() => {
          if (saving) {
            return;
          }
          setArchiveCandidate(null);
        }}
        onConfirm={handleArchiveVariant}
        open={archiveCandidate !== null}
        title="Archive variant"
        tone="danger"
      />

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
    </section>
  );
}
