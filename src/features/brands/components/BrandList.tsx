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
import { PageToolbar } from "@/components/layout";
import { Button, SearchInput, ViewToggle } from "@/components/ui";
import {
  fetchBrandInvites,
  fetchBrandJoinRequests,
  fetchBrandList,
  fetchBrandMembers,
  fetchBrandProducts,
} from "../api";
import { validateBrandCopy } from "../language";
import type { BrandRecord } from "../types";

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

  const visibleBrands = useMemo(
    () => filterBrandsByQuery(brands, searchQuery),
    [brands, searchQuery]
  );

  const hasSearchQuery = searchQuery.trim().length > 0;

  function handleViewModeChange(nextViewMode: BrandResourceViewMode) {
    setViewMode(nextViewMode);
    writeBrandResourceViewMode(nextViewMode);
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
          <div className="grid gap-0.5">
            <strong>{brand.name}</strong>
            <span className="text-xs text-brand-muted">{brand.slug}</span>
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
          <a
            className="inline-flex min-h-control-sm items-center border border-brand-border-strong px-grid-xs no-underline hover:border-brand-accent focus-visible:border-brand-accent"
            href={`/admin/brands/${brand.id}`}
          >
            Open detail
          </a>
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
          <a
            className="inline-flex min-h-control-sm items-center border border-brand-border-strong px-grid-xs no-underline hover:border-brand-accent focus-visible:border-brand-accent"
            href={`/admin/brands/${brand.id}`}
          >
            Open detail
          </a>
        }
        key={brand.id}
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
    <main className="mx-auto w-full max-w-[1240px] p-grid-md max-md:p-grid-sm">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-grid-md border-b border-brand-border-strong py-grid-md pt-grid-lg max-md:grid-cols-1 max-md:items-stretch max-md:pt-grid-md">
        <div>
          <p className="font-system text-xs font-bold uppercase text-brand-muted">Catalog collaboration</p>
          <h1 className="text-[clamp(1.8rem,6vw,3.8rem)]">Brand catalog groups</h1>
          <p className="max-w-[72ch] text-[0.9375rem] text-brand-muted">{brandListIntroCopy}</p>
        </div>
        <dl className="m-0 grid grid-cols-2 border border-brand-border-strong bg-brand-surface max-md:grid-cols-1 [&>div]:grid [&>div]:gap-grid-xs [&>div]:border-r [&>div]:border-brand-border [&>div]:p-grid-sm [&>div:last-child]:border-r-0 max-md:[&>div]:border-r-0 max-md:[&>div]:border-b max-md:[&>div:last-child]:border-b-0 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:text-brand-muted [&_dd]:m-0 [&_dd]:font-heading [&_dd]:text-xl [&_dd]:font-bold" aria-label="Brand status summary">
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
          <ViewToggle
            label="Brand view"
            onChange={handleViewModeChange}
            options={brandResourceViewOptions}
            value={viewMode}
          />
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
              ) : undefined
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
          <ResourceList className="grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))]" label="Brand cards">
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
    </main>
  );
}
