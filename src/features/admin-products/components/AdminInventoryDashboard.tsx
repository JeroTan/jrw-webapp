import * as React from "react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState, Skeleton } from "@/components/feedback";
import { Button, Pagination } from "@/components/ui";
import { fetchProductListWithQuery, fetchProductVariants } from "../api";
import { AdminInventorySummary } from "./AdminInventorySummary";
import { AdminInventoryTable } from "./AdminInventoryTable";
import { AdminInventoryToolbar } from "./AdminInventoryToolbar";
import type {
  AdminInventoryLoadState,
  AdminInventoryRow,
  AdminInventorySource,
} from "./admin-inventory-types";
import { inventoryRowsFromProducts } from "./inventoryRowsFromProducts";
import { isAdminInventoryRiskRow } from "./isAdminInventoryRiskRow";

const DEFAULT_PAGE_SIZE = 20;
const VARIANT_PAGE_SIZE = 100;

export type AdminInventoryDashboardProps = {
  autoLoad?: boolean;
  initialLoadState?: AdminInventoryLoadState;
  initialRows?: AdminInventoryRow[];
  initialTotalProducts?: number;
};

export function AdminInventoryDashboard({
  autoLoad = true,
  initialLoadState = "loading",
  initialRows = [],
  initialTotalProducts = 0,
}: AdminInventoryDashboardProps) {
  const [loadState, setLoadState] =
    useState<AdminInventoryLoadState>(initialLoadState);
  const [rows, setRows] = useState<AdminInventoryRow[]>(initialRows);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalProducts, setTotalProducts] = useState(initialTotalProducts);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    let active = true;
    setLoadState("loading");

    fetchProductListWithQuery({
      includeArchived: true,
      page,
      pageSize,
      search: searchQuery.trim().length > 0 ? searchQuery : undefined,
    })
      .then(async (result) => {
        const sources = await Promise.all(
          result.items.map(async (product): Promise<AdminInventorySource> => {
            const variants = await fetchProductVariants(product.id, {
              page: 1,
              pageSize: VARIANT_PAGE_SIZE,
            });

            return { product, variants: variants.items };
          })
        );

        if (!active) {
          return;
        }

        setRows(inventoryRowsFromProducts(sources));
        setTotalProducts(result.totalItems);
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
  }, [autoLoad, page, pageSize, refreshToken, searchQuery]);

  const needsActionCount = useMemo(
    () => rows.filter(isAdminInventoryRiskRow).length,
    [rows]
  );

  return (
    <section className="grid gap-grid-sm">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-grid-md border-b border-brand-border-strong py-grid-md pt-grid-lg max-md:grid-cols-1 max-md:items-stretch max-md:pt-grid-md">
        <div>
          <p className="font-system text-xs font-bold uppercase text-brand-muted">
            Stock operations
          </p>
          <h1 className="text-[clamp(1.8rem,6vw,3.8rem)]">Inventory</h1>
          <p className="max-w-[72ch] text-[0.9375rem] text-brand-muted">
            Review variant stock, availability state, and product inventory
            work.
          </p>
        </div>
        <AdminInventorySummary
          loadState={loadState}
          needsActionCount={needsActionCount}
          totalProducts={totalProducts}
          totalVariants={rows.length}
        />
      </header>

      <AdminInventoryToolbar
        onSearchQueryChange={setSearchQuery}
        searchQuery={searchQuery}
      />

      <section className="grid gap-grid-sm py-grid-md">
        {loadState === "loading" ? (
          <div
            className="border border-brand-border-strong bg-brand-surface p-grid-sm"
            role="status"
          >
            <Skeleton label="Loading inventory table" lines={6} />
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
            message="Could not load inventory. Retry with an active admin session."
            title="Inventory unavailable"
          />
        ) : null}

        {loadState === "ready" ? <AdminInventoryTable rows={rows} /> : null}

        {loadState === "ready" ? (
          <Pagination
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            page={page}
            pageSize={pageSize}
            totalItems={totalProducts}
            totalPages={totalPages}
          />
        ) : null}
      </section>
    </section>
  );
}
