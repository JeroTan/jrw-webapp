import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  DataTable,
  ResourceCard,
  ResourceList,
  type DataTableColumn,
} from "@/components/data-display";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { Toast } from "@/components/feedback/Toast";
import { PageToolbar } from "@/components/layout";
import { Button, ButtonLink, SearchInput, ViewToggle } from "@/components/ui";
import {
  createBrand,
  fetchBrandInvites,
  fetchBrandJoinRequests,
  fetchBrandList,
  fetchBrandMembers,
  fetchBrandProducts,
  uploadBrandImage,
} from "../api";
import { validateBrandCopy } from "../language";
import type { BrandEditorSaveInput, BrandRecord } from "../types";
import { BrandEditor } from "./BrandEditor";
import { BrandImageMark } from "./BrandImageMark";

type LoadState = "loading" | "ready" | "failed";
export type BrandResourceViewMode = "cards" | "list";

type BrandViewStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

type BrandCounts = {
  brandMembers: number | null;
  linkedProducts: number | null;
  pendingInvites: number | null;
  pendingJoinRequests: number | null;
};

type ToastState = {
  message: string;
  title: string;
  tone: "error" | "success" | "warning";
};

const brandResourceViewStorageKey = "jrw.brandResourceViewMode";
const brandListIntroCopy = "You can manage your list of brands here.";
const brandResourceViewOptions = [
  { label: "Cards", value: "cards" },
  { label: "List", value: "list" },
] satisfies Array<{ label: string; value: BrandResourceViewMode }>;

function getSessionStorage(): BrandViewStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readBrandResourceViewMode(
  storage: BrandViewStorage | null = getSessionStorage()
): BrandResourceViewMode {
  try {
    const storedValue = storage?.getItem(brandResourceViewStorageKey);
    return storedValue === "list" ? "list" : "cards";
  } catch {
    return "cards";
  }
}

export function writeBrandResourceViewMode(
  value: BrandResourceViewMode,
  storage: BrandViewStorage | null = getSessionStorage()
) {
  try {
    storage?.setItem(brandResourceViewStorageKey, value);
  } catch {
    // Session persistence is convenience only.
  }
}

export function filterBrandsByQuery(
  brands: BrandRecord[],
  query: string
): BrandRecord[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return brands;
  }

  return brands.filter((brand) =>
    `${brand.name} ${brand.slug}`.toLowerCase().includes(normalizedQuery)
  );
}

function statusTone(status: BrandRecord["status"]) {
  return status === "ACTIVE" ? ("success" as const) : ("warning" as const);
}

function countLabel(value: number | null): string {
  return value === null ? "Unavailable" : String(value);
}

function countValue(
  counts: BrandCounts | undefined,
  key: keyof BrandCounts
): string {
  return counts ? countLabel(counts[key]) : "Loading";
}

function createdBrandCounts(): BrandCounts {
  return {
    brandMembers: 1,
    linkedProducts: 0,
    pendingInvites: 0,
    pendingJoinRequests: 0,
  };
}

function brandActionErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof (error as { code?: unknown }).code !== "string"
  ) {
    return fallback;
  }

  const failure = error as {
    code: string;
    details?: unknown;
    message?: unknown;
  };
  const reason =
    typeof failure.details === "object" &&
    failure.details !== null &&
    "reason" in failure.details &&
    typeof (failure.details as { reason?: unknown }).reason === "string"
      ? String((failure.details as { reason: string }).reason)
      : null;

  if (failure.code === "CONFLICT_STATE") {
    if (reason === "DUPLICATE_NAME") {
      return "Brand name is already in use.";
    }

    if (reason === "DUPLICATE_SLUG") {
      return "Slug is already in use.";
    }

    if (reason === "ARCHIVED_NAME_CONFLICT") {
      return "An archived brand already uses this name.";
    }

    return "Brand state conflicts with current data.";
  }

  if (failure.code === "VALIDATION_FAILED") {
    return "Brand data is invalid. Check field values and try again.";
  }

  if (failure.code === "AUTH_FORBIDDEN") {
    return "You do not have access to create brands.";
  }

  if (failure.code === "PROVIDER_UNAVAILABLE") {
    return "We couldn't complete that right now. Try again soon.";
  }

  return typeof failure.message === "string" &&
    failure.message.trim().length > 0
    ? failure.message
    : fallback;
}

async function loadBrandCounts(brandId: string): Promise<BrandCounts> {
  const defaultCounts: BrandCounts = {
    brandMembers: null,
    linkedProducts: null,
    pendingInvites: null,
    pendingJoinRequests: null,
  };

  const [members, invites, joinRequests, products] = await Promise.allSettled([
    fetchBrandMembers(brandId),
    fetchBrandInvites(brandId),
    fetchBrandJoinRequests(brandId),
    fetchBrandProducts(brandId),
  ]);

  return {
    brandMembers:
      members.status === "fulfilled"
        ? members.value.filter((row) => row.status === "ACTIVE").length
        : defaultCounts.brandMembers,
    linkedProducts:
      products.status === "fulfilled"
        ? products.value.totalItems
        : defaultCounts.linkedProducts,
    pendingInvites:
      invites.status === "fulfilled"
        ? invites.value.filter((row) => row.status === "PENDING").length
        : defaultCounts.pendingInvites,
    pendingJoinRequests:
      joinRequests.status === "fulfilled"
        ? joinRequests.value.filter((row) => row.status === "PENDING").length
        : defaultCounts.pendingJoinRequests,
  };
}

export function BrandList() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [countsByBrandId, setCountsByBrandId] = useState<
    Record<string, BrandCounts>
  >({});
  const [copyViolations, setCopyViolations] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<BrandResourceViewMode>(() =>
    readBrandResourceViewMode()
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const visibleBrands = useMemo(
    () => filterBrandsByQuery(brands, searchQuery),
    [brands, searchQuery]
  );

  const hasSearchQuery = searchQuery.trim().length > 0;

  function handleViewModeChange(nextViewMode: BrandResourceViewMode) {
    setViewMode(nextViewMode);
    writeBrandResourceViewMode(nextViewMode);
  }

  async function handleCreateBrand(input: BrandEditorSaveInput) {
    setSaving(true);
    try {
      const created = await createBrand({
        name: input.name,
        slug: input.slug,
        description: input.description,
      });
      let nextBrand = created;
      let imageUploadFailed = false;

      if (typeof File !== "undefined" && input.image instanceof File) {
        try {
          nextBrand = await uploadBrandImage(created.id, {
            image: input.image,
            name: input.imageAlt ?? created.name,
          });
        } catch {
          imageUploadFailed = true;
        }
      }

      setBrands((previous) => [...previous, nextBrand]);
      setCountsByBrandId((previous) => ({
        ...previous,
        [nextBrand.id]: createdBrandCounts(),
      }));
      setEditorOpen(false);
      setToast(
        imageUploadFailed
          ? {
              tone: "warning",
              title: "Brand created",
              message:
                "Brand is ready, but image upload failed. Upload it from brand detail.",
            }
          : {
              tone: "success",
              title: "Brand created",
              message: "Brand is ready for product assignment.",
            }
      );
      if (typeof window !== "undefined") {
        window.location.assign(`/admin/brands/${nextBrand.id}`);
      }
    } catch (error) {
      const message = brandActionErrorMessage(
        error,
        "Brand save failed. Try again."
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

  useEffect(() => {
    let active = true;

    fetchBrandList()
      .then(async (result) => {
        if (!active) return;

        setBrands(result.items);
        setLoadState("ready");

        const staticCopy = [
          "Brand catalog groups",
          brandListIntroCopy,
          "Brand members",
          "Pending invites and join requests",
          "Linked products",
        ].join(" ");

        const violations = validateBrandCopy(staticCopy, "BrandList");
        setCopyViolations(violations);

        const countEntries = await Promise.all(
          result.items.map(
            async (brand) =>
              [brand.id, await loadBrandCounts(brand.id)] as const
          )
        );

        if (!active) return;
        setCountsByBrandId(Object.fromEntries(countEntries));
      })
      .catch(() => {
        if (!active) return;
        setLoadState("failed");
      });

    return () => {
      active = false;
    };
  }, []);

  const columns = useMemo<Array<DataTableColumn<BrandRecord>>>(
    () => [
      {
        key: "brand",
        header: "Brand",
        cell: (brand) => (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-grid-xs">
            <BrandImageMark
              imageAlt={brand.imageAlt}
              imageSrc={brand.imageSrc}
              name={brand.name}
              size="sm"
            />
            <div className="grid min-w-0 gap-0.5">
              <strong>{brand.name}</strong>
              <span className="text-xs text-brand-muted">{brand.slug}</span>
            </div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (brand) => (
          <StatusBadge label={brand.status} tone={statusTone(brand.status)} />
        ),
      },
      {
        key: "members",
        header: "Brand members",
        align: "right",
        cell: (brand) => countValue(countsByBrandId[brand.id], "brandMembers"),
      },
      {
        key: "pending",
        header: "Pending invites / requests",
        align: "right",
        cell: (brand) => {
          const counts = countsByBrandId[brand.id];
          if (!counts) return "Loading";
          if (
            counts.pendingInvites === null ||
            counts.pendingJoinRequests === null
          ) {
            return "Unavailable";
          }

          return `${counts.pendingInvites} / ${counts.pendingJoinRequests}`;
        },
      },
      {
        key: "linked-products",
        header: "Linked products",
        align: "right",
        cell: (brand) =>
          countValue(countsByBrandId[brand.id], "linkedProducts"),
      },
      {
        key: "action",
        header: "Action",
        align: "right",
        cell: (brand) => (
          <ButtonLink href={`/admin/brands/${brand.id}`} size="sm">
            Open detail
          </ButtonLink>
        ),
      },
    ],
    [countsByBrandId]
  );

  function renderBrandCard(brand: BrandRecord) {
    const counts = countsByBrandId[brand.id];

    return (
      <ResourceCard
        action={
          <ButtonLink href={`/admin/brands/${brand.id}`} size="sm">
            Open detail
          </ButtonLink>
        }
        key={brand.id}
        media={
          <BrandImageMark
            imageAlt={brand.imageAlt}
            imageSrc={brand.imageSrc}
            name={brand.name}
            size="md"
          />
        }
        meta={brand.slug}
        stats={[
          {
            label: "Brand members",
            value: countValue(counts, "brandMembers"),
          },
          {
            label: "Pending invites",
            value: countValue(counts, "pendingInvites"),
          },
          {
            label: "Join requests",
            value: countValue(counts, "pendingJoinRequests"),
          },
          {
            label: "Linked products",
            value: countValue(counts, "linkedProducts"),
          },
        ]}
        status={
          <StatusBadge label={brand.status} tone={statusTone(brand.status)} />
        }
        title={brand.name}
      />
    );
  }

  return (
    <section className="grid gap-grid-sm">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-grid-md border-b border-brand-border-strong py-grid-md pt-grid-lg max-md:grid-cols-1 max-md:items-stretch max-md:pt-grid-md">
        <div>
          <p className="font-system text-xs font-bold uppercase text-brand-muted">
            Catalog collaboration
          </p>
          <h1 className="text-[clamp(1.8rem,6vw,3.8rem)]">
            Brand catalog groups
          </h1>
          <p className="max-w-[72ch] text-[0.9375rem] text-brand-muted">
            {brandListIntroCopy}
          </p>
        </div>
        <dl
          className="m-0 grid grid-cols-2 border border-brand-border-strong bg-brand-surface max-md:grid-cols-1 [&>div]:grid [&>div]:gap-grid-xs [&>div]:border-r [&>div]:border-brand-border [&>div]:p-grid-sm [&>div:last-child]:border-r-0 max-md:[&>div]:border-r-0 max-md:[&>div]:border-b max-md:[&>div:last-child]:border-b-0 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:text-brand-muted [&_dd]:m-0 [&_dd]:font-heading [&_dd]:text-xl [&_dd]:font-bold"
          aria-label="Brand status summary"
        >
          <div>
            <dt>Visible brands</dt>
            <dd>{loadState === "ready" ? brands.length : "-"}</dd>
          </div>
          <div>
            <dt>Language guard</dt>
            <dd>{copyViolations.length === 0 ? "Clean" : "Review"}</dd>
          </div>
        </dl>
      </header>

      <PageToolbar
        actions={
          <div className="flex flex-wrap items-center justify-end gap-grid-xs max-md:justify-start">
            <ViewToggle
              label="Brand view"
              onChange={handleViewModeChange}
              options={brandResourceViewOptions}
              value={viewMode}
            />
            <Button onClick={() => setEditorOpen(true)} variant="primary">
              Create brand
            </Button>
          </div>
        }
        main={
          <SearchInput
            label="Search brands"
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            placeholder="Search by name or slug"
            value={searchQuery}
          />
        }
      />

      <section className="grid gap-grid-sm py-grid-md">
        {loadState === "loading" ? (
          <ResourceList
            className="grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))]"
            label="Loading brand cards"
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                className="grid min-h-[236px] rounded-none border border-brand-border-strong bg-brand-surface p-grid-sm"
                key={index}
                role="listitem"
              >
                <Skeleton
                  className="min-h-full content-start"
                  label={`Loading brand card ${index + 1}`}
                  lines={5}
                />
              </div>
            ))}
          </ResourceList>
        ) : null}

        {loadState === "failed" ? (
          <EmptyState
            title="Brand catalog groups unavailable"
            message="Could not load brand list. Retry with an active admin session."
          />
        ) : null}

        {loadState === "ready" && visibleBrands.length === 0 ? (
          <EmptyState
            action={
              hasSearchQuery ? (
                <Button onClick={() => setSearchQuery("")} size="sm">
                  Reset search
                </Button>
              ) : (
                <Button
                  onClick={() => setEditorOpen(true)}
                  size="sm"
                  variant="primary"
                >
                  Create first brand
                </Button>
              )
            }
            title={hasSearchQuery ? "No matching brands." : "No brands yet."}
            message={
              hasSearchQuery
                ? "Try another brand name or slug."
                : "Create a brand to group related products."
            }
          />
        ) : null}

        {loadState === "ready" &&
        visibleBrands.length > 0 &&
        viewMode === "cards" ? (
          <ResourceList
            className="grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))]"
            label="Brand cards"
          >
            {visibleBrands.map((brand) => renderBrandCard(brand))}
          </ResourceList>
        ) : null}

        {loadState === "ready" &&
        visibleBrands.length > 0 &&
        viewMode === "list" ? (
          <DataTable
            caption="Brand list"
            columns={columns}
            emptyMessage="No catalog groups available for this account."
            getRowId={(row) => row.id}
            rows={visibleBrands}
          />
        ) : null}

        {copyViolations.length > 0 ? (
          <EmptyState
            title="Language guardrails flagged"
            message={
              <ul className="m-0 pl-grid-sm">
                {copyViolations.map((violation) => (
                  <li key={violation}>{violation}</li>
                ))}
              </ul>
            }
          />
        ) : null}
      </section>

      {editorOpen ? (
        <BrandEditor
          onClose={() => setEditorOpen(false)}
          onSave={handleCreateBrand}
          open={true}
          saving={saving}
        />
      ) : null}

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
