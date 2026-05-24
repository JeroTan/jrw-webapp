import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-display";
import { EmptyState, Skeleton, StatusBadge, Toast } from "@/components/feedback";
import { PageToolbar } from "@/components/layout";
import { Button, ConfirmDialog, SearchInput } from "@/components/ui";
import {
  archiveCategory,
  createCategory,
  fetchCategoryList,
  updateCategory,
  type ApiFailure,
} from "../api";
import { CategoryEditor } from "./CategoryEditor";
import type { CategoryMutationInput, CategoryRecord } from "../types";

type LoadState = "loading" | "ready" | "failed";

type ToastState = {
  title: string;
  message: string;
  tone: "error" | "success" | "warning";
};

type EditorState = {
  mode: "create" | "edit";
  category: CategoryRecord | null;
};

function statusTone(status: CategoryRecord["status"]) {
  return status === "ACTIVE" ? ("success" as const) : ("warning" as const);
}

function statusLabel(status: CategoryRecord["status"]) {
  return status === "ACTIVE" ? "Active" : "Archived";
}

function linkedProductCountLabel(value: number | null): string {
  return value === null ? "N/A" : String(value);
}

export function categoryArchiveMessage(categoryName: string): string {
  return `Archive category "${categoryName}"? Historical references remain readable.`;
}

function categoryActionErrorMessage(error: unknown, fallback: string): string {
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
    if (reason === "ALREADY_ARCHIVED") {
      return "This category is already archived.";
    }

    if (reason === "DUPLICATE_SLUG") {
      return "Slug is already in use.";
    }

    return "Category state conflicts with current data.";
  }

  if (failure.code === "VALIDATION_FAILED") {
    return "Category data is invalid. Check field values and try again.";
  }

  if (failure.code === "AUTH_FORBIDDEN") {
    return "You do not have access to manage categories.";
  }

  return typeof failure.message === "string" && failure.message.trim().length > 0
    ? failure.message
    : fallback;
}

export function filterCategoriesByQuery(
  categories: CategoryRecord[],
  query: string
): CategoryRecord[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return categories;
  }

  return categories.filter((category) =>
    `${category.name} ${category.slug}`.toLowerCase().includes(normalizedQuery)
  );
}

function sortCategories(rows: CategoryRecord[]): CategoryRecord[] {
  return [...rows].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.name.localeCompare(right.name, undefined, {
      sensitivity: "base",
    });
  });
}

export type CategoryListProps = {
  autoLoad?: boolean;
  initialCategories?: CategoryRecord[];
  initialLoadState?: LoadState;
};

export function CategoryList(props: CategoryListProps) {
  const {
    autoLoad = true,
    initialCategories = [],
    initialLoadState = "loading",
  } = props;
  const [loadState, setLoadState] = useState<LoadState>(initialLoadState);
  const [categories, setCategories] = useState<CategoryRecord[]>(
    sortCategories(initialCategories)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<CategoryRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    let active = true;
    setLoadState("loading");

    fetchCategoryList()
      .then((result) => {
        if (!active) {
          return;
        }

        setCategories(sortCategories(result.items));
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

  const visibleCategories = useMemo(
    () => filterCategoriesByQuery(categories, searchQuery),
    [categories, searchQuery]
  );
  const hasSearchQuery = searchQuery.trim().length > 0;
  const activeCount = categories.filter((row) => row.status === "ACTIVE").length;

  const columns = useMemo<Array<DataTableColumn<CategoryRecord>>>(
    () => [
      {
        key: "name",
        header: "Name",
        cell: (category) => (
          <div className="grid gap-0.5">
            <strong>{category.name}</strong>
            <span className="text-xs text-brand-muted">{category.slug}</span>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (category) => (
          <StatusBadge
            label={statusLabel(category.status)}
            tone={statusTone(category.status)}
          />
        ),
      },
      {
        key: "sort-order",
        header: "Sort order",
        align: "right",
        cell: (category) => String(category.sortOrder),
      },
      {
        key: "visibility",
        header: "Visibility",
        cell: (category) => (category.isVisible ? "Visible" : "Hidden"),
      },
      {
        key: "linked-products",
        header: "Linked products",
        align: "right",
        cell: (category) => linkedProductCountLabel(category.linkedProductCount),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        cell: (category) => (
          <div className="inline-flex flex-wrap gap-grid-xs">
            <Button
              onClick={() =>
                setEditorState({
                  mode: "edit",
                  category,
                })
              }
              size="sm"
              variant="secondary"
            >
              Edit
            </Button>
            <Button
              disabled={category.status === "ARCHIVED"}
              onClick={() => setArchiveTarget(category)}
              size="sm"
              variant="danger"
            >
              Archive
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  async function handleSaveCategory(input: CategoryMutationInput) {
    setSaving(true);
    try {
      if (editorState?.mode === "create") {
        const created = await createCategory(input);
        setCategories((previous) => sortCategories([...previous, created]));
        setToast({
          tone: "success",
          title: "Category created",
          message: "Category is ready for product assignment.",
        });
      } else if (editorState?.category) {
        const updated = await updateCategory(editorState.category.id, input);
        setCategories((previous) =>
          sortCategories(
            previous.map((category) =>
              category.id === updated.id ? updated : category
            )
          )
        );
        setToast({
          tone: "success",
          title: "Category updated",
          message: "Category changes are saved.",
        });
      }

      setEditorState(null);
    } catch (error) {
      const message = categoryActionErrorMessage(
        error,
        "Category save failed. Try again."
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

  async function handleArchiveConfirm() {
    if (!archiveTarget || archiving) {
      return;
    }

    setArchiving(true);
    try {
      const archived = await archiveCategory(archiveTarget.id);
      setCategories((previous) =>
        sortCategories(
          previous.map((category) =>
            category.id === archived.id ? archived : category
          )
        )
      );
      setArchiveTarget(null);
      setToast({
        tone: "warning",
        title: "Category archived",
        message: "Category is now archived and kept for historical references.",
      });
    } catch (error) {
      setToast({
        tone: "error",
        title: "Archive failed",
        message: categoryActionErrorMessage(
          error,
          "Category archive failed. Try again."
        ),
      });
    } finally {
      setArchiving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1240px] p-grid-md max-md:p-grid-sm">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-grid-md border-b border-brand-border-strong py-grid-md pt-grid-lg max-md:grid-cols-1 max-md:items-stretch max-md:pt-grid-md">
        <div>
          <p className="font-system text-xs font-bold uppercase text-brand-muted">Catalog management</p>
          <h1 className="text-[clamp(1.8rem,6vw,3.8rem)]">Product categories</h1>
          <p className="max-w-[72ch] text-[0.9375rem] text-brand-muted">
            You can manage your list of categories here.
          </p>
        </div>
        <dl className="m-0 grid grid-cols-2 border border-brand-border-strong bg-brand-surface max-md:grid-cols-1 [&>div]:grid [&>div]:gap-grid-xs [&>div]:border-r [&>div]:border-brand-border [&>div]:p-grid-sm [&>div:last-child]:border-r-0 max-md:[&>div]:border-r-0 max-md:[&>div]:border-b max-md:[&>div:last-child]:border-b-0 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:text-brand-muted [&_dd]:m-0 [&_dd]:font-heading [&_dd]:text-xl [&_dd]:font-bold" aria-label="Category summary">
          <div>
            <dt>Total categories</dt>
            <dd>{loadState === "ready" ? categories.length : "-"}</dd>
          </div>
          <div>
            <dt>Active categories</dt>
            <dd>{loadState === "ready" ? activeCount : "-"}</dd>
          </div>
        </dl>
      </header>

      <PageToolbar
        actions={
          <Button
            onClick={() => setEditorState({ mode: "create", category: null })}
            variant="primary"
          >
            Create category
          </Button>
        }
        main={
          <SearchInput
            label="Search categories"
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            placeholder="Search by name or slug"
            value={searchQuery}
          />
        }
      />

      <section className="grid gap-grid-sm py-grid-md">
        {loadState === "loading" ? (
          <div className="border border-brand-border-strong bg-brand-surface p-grid-sm" role="status">
            <Skeleton label="Loading category table" lines={6} />
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
            message="Could not load categories. Retry with an active admin session."
            title="Category list unavailable"
          />
        ) : null}

        {loadState === "ready" && categories.length === 0 ? (
          <EmptyState
            action={
              <Button
                onClick={() =>
                  setEditorState({ mode: "create", category: null })
                }
                size="sm"
                variant="primary"
              >
                Create first category
              </Button>
            }
            message="No categories exist."
            title="No categories exist"
          />
        ) : null}

        {loadState === "ready" &&
        categories.length > 0 &&
        visibleCategories.length === 0 ? (
          <EmptyState
            action={
              <Button onClick={() => setSearchQuery("")} size="sm">
                Reset search
              </Button>
            }
            message={
              hasSearchQuery
                ? "Try another category name or slug."
                : "No categories exist."
            }
            title={
              hasSearchQuery
                ? "No categories match this search"
                : "No categories exist"
            }
          />
        ) : null}

        {loadState === "ready" && visibleCategories.length > 0 ? (
          <DataTable
            caption="Category list"
            columns={columns}
            emptyMessage="No categories exist."
            getRowId={(row) => row.id}
            rows={visibleCategories}
          />
        ) : null}
      </section>

      {editorState ? (
        <CategoryEditor
          category={editorState.category}
          mode={editorState.mode}
          onClose={() => setEditorState(null)}
          onSave={handleSaveCategory}
          open={true}
          saving={saving}
        />
      ) : null}

      <ConfirmDialog
        message={
          archiveTarget
            ? categoryArchiveMessage(archiveTarget.name)
            : "Archive this category?"
        }
        onCancel={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        open={archiveTarget !== null}
        title="Archive category"
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
    </main>
  );
}
