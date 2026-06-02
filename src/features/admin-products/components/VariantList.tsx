import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-display";
import {
  EmptyState,
  Skeleton,
  StatusBadge,
  Toast,
} from "@/components/feedback";
import { PageToolbar } from "@/components/layout";
import { Button, ConfirmDialog, SearchInput } from "@/components/ui";
import {
  archiveProductVariant,
  createProductVariant,
  fetchProductVariants,
  type ApiFailure,
  updateProductVariant,
} from "../api";
import type { ProductPhotoRecord, ProductVariantRecord } from "../types";
import {
  formatPriceCentavos,
  VariantEditor,
  type VariantEditorSaveInput,
} from "./VariantEditor";
import { variantHasDuplicateVariation } from "../variantHasDuplicateVariation";
import { variationDuplicateSummary } from "../variationDuplicateSummary";

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
  availableImages?: ProductPhotoRecord[];
  autoLoad?: boolean;
  initialVariants?: ProductVariantRecord[];
  initialLoadState?: LoadState;
  embedded?: boolean;
  allowMutations?: boolean;
  mutationDisabledReason?: string | null;
  onEditorOpenChange?: (open: boolean) => void;
  onVariantsChange?: () => Promise<void> | void;
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

  return typeof failure.message === "string" &&
    failure.message.trim().length > 0
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
  availableImages = [],
  autoLoad = true,
  initialVariants = [],
  initialLoadState = "loading",
  embedded = false,
  allowMutations = true,
  mutationDisabledReason = null,
  onEditorOpenChange,
  onVariantsChange,
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
  const [archiveCandidate, setArchiveCandidate] =
    useState<ProductVariantRecord | null>(null);

  useEffect(() => {
    onEditorOpenChange?.(editorState !== null);
  }, [editorState, onEditorOpenChange]);

  useEffect(() => {
    return () => {
      onEditorOpenChange?.(false);
    };
  }, [onEditorOpenChange]);

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

  const activeCount = variants.filter(
    (variant) => variant.status === "ACTIVE"
  ).length;
  const duplicateWarnings = useMemo(
    () => variationDuplicateSummary(variants),
    [variants]
  );

  const columns = useMemo<Array<DataTableColumn<ProductVariantRecord>>>(
    () => [
      {
        key: "name",
        header: "Variant",
        cell: (variant) => (
          <div className="grid gap-0.5">
            <strong>{variant.name}</strong>
            <span className="text-xs text-brand-muted">{variant.sku}</span>
          </div>
        ),
      },
      {
        key: "options",
        header: "Options",
        cell: (variant) =>
          variant.variationChain.length > 0 ? (
            <span className="text-xs text-brand-muted">
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
        key: "image",
        header: "Image",
        cell: (variant) => {
          if (!variant.imageReferenceId) {
            return "Product primary";
          }

          const image = availableImages.find(
            (row) => row.id === variant.imageReferenceId
          );
          return image?.name || "Assigned image";
        },
      },
      {
        key: "inventory",
        header: "Stock / State",
        cell: (variant) => (
          <div className="grid justify-items-start gap-0.5">
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
            ? (mutationDisabledReason ?? undefined)
            : isArchived
              ? "Archived variants are read-only."
              : undefined;
          return (
            <div
              aria-label={`Actions for ${variant.name}`}
              className="inline-flex flex-wrap gap-grid-xs"
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
    [allowMutations, availableImages, mutationDisabledReason]
  );

  async function handleArchiveVariant() {
    if (!archiveCandidate) {
      return;
    }

    try {
      const archived = await archiveProductVariant(
        productId,
        archiveCandidate.id,
        {}
      );
      setVariants((previous) =>
        sortVariants(
          previous.map((row) => (row.id === archived.id ? archived : row))
        )
      );
      try {
        await onVariantsChange?.();
      } catch {
        // Parent refresh failure should not hide successful archive.
      }
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
    } finally {
      setArchiveCandidate(null);
    }
  }

  async function handleSaveVariant(input: VariantEditorSaveInput) {
    const editingId =
      editorState?.mode === "edit" ? (editorState.variant?.id ?? null) : null;
    if (
      variantHasDuplicateVariation({
        editingVariantId: editingId,
        options: input.variationChain,
        variants,
      })
    ) {
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
          imageReferenceId: input.imageReferenceId,
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
            imageReferenceId: input.imageReferenceId,
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
      try {
        await onVariantsChange?.();
      } catch {
        // Parent refresh failure should not hide successful save.
      }
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
    <section
      className={
        embedded
          ? "m-0 w-full p-0"
          : "mx-auto w-full max-w-[1240px] p-grid-md max-md:p-grid-sm"
      }
    >
      {!embedded ? (
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-grid-md border-b border-brand-border-strong py-grid-md pt-grid-lg max-md:grid-cols-1 max-md:items-stretch max-md:pt-grid-md">
          <div>
            <p className="font-system text-xs font-bold uppercase text-brand-muted">
              Product variants
            </p>
            <h1 className="text-[clamp(1.8rem,6vw,3.8rem)]">Variants</h1>
            <p className="max-w-[72ch] text-[0.9375rem] text-brand-muted">
              You can manage variant options, SKU, and centavos pricing here.
            </p>
          </div>
          <dl
            className="m-0 grid grid-cols-2 border border-brand-border-strong bg-brand-surface max-md:grid-cols-1 [&>div]:grid [&>div]:gap-grid-xs [&>div]:border-r [&>div]:border-brand-border [&>div]:p-grid-sm [&>div:last-child]:border-r-0 max-md:[&>div]:border-r-0 max-md:[&>div]:border-b max-md:[&>div:last-child]:border-b-0 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:text-brand-muted [&_dd]:m-0 [&_dd]:font-heading [&_dd]:text-xl [&_dd]:font-bold"
            aria-label="Variant summary"
          >
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
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-grid-sm max-md:grid-cols-1 max-md:items-stretch">
          <div>
            <p className="m-0 text-sm font-bold">Variant matrix</p>
            <p className="font-system text-xs text-brand-muted">
              SKU, options, centavos price, and stock states per variant.
            </p>
          </div>
          <dl className="m-0 grid grid-cols-2 border border-brand-border-strong bg-brand-surface max-md:grid-cols-1 [&>div]:grid [&>div]:gap-grid-xs [&>div]:border-r [&>div]:border-brand-border [&>div]:p-grid-sm [&>div:last-child]:border-r-0 max-md:[&>div]:border-r-0 max-md:[&>div]:border-b max-md:[&>div:last-child]:border-b-0 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:text-brand-muted [&_dd]:m-0 [&_dd]:font-heading [&_dd]:text-xl [&_dd]:font-bold min-w-[220px] max-md:min-w-0">
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
            title={
              !allowMutations
                ? (mutationDisabledReason ?? undefined)
                : undefined
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
        <p className="font-system text-xs text-brand-muted">
          {mutationDisabledReason}
        </p>
      ) : null}

      {duplicateWarnings.length > 0 ? (
        <section
          className="grid gap-grid-xs border border-brand-warning bg-brand-warning/6 p-grid-sm text-[0.8125rem] font-bold text-brand-warning [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-grid-sm"
          role="status"
        >
          <p>Duplicate option combinations detected:</p>
          <ul>
            {duplicateWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-grid-sm py-grid-md">
        {loadState === "loading" ? (
          <div
            className="border border-brand-border-strong bg-brand-surface p-grid-sm"
            role="status"
          >
            <Skeleton label="Loading variant table" lines={6} />
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
                title={
                  !allowMutations
                    ? (mutationDisabledReason ?? undefined)
                    : undefined
                }
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
          availableImages={availableImages}
          referenceVariants={variants}
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
