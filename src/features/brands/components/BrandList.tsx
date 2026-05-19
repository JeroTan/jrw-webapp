import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-display/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import {
  fetchBrandInvites,
  fetchBrandJoinRequests,
  fetchBrandList,
  fetchBrandMembers,
  isNotFoundFailure,
} from "../api";
import { validateBrandCopy } from "../language";
import type { BrandRecord } from "../types";

type LoadState = "loading" | "ready" | "failed";

type BrandCounts = {
  brandMembers: number | null;
  pendingInvites: number | null;
  pendingJoinRequests: number | null;
};

const brandListIntroCopy =
  "You can manage your list of brands here.";

function statusTone(status: BrandRecord["status"]) {
  return status === "ACTIVE" ? ("success" as const) : ("warning" as const);
}

function countLabel(value: number | null): string {
  return value === null ? "Unavailable" : String(value);
}

async function loadBrandCounts(brandId: string): Promise<BrandCounts> {
  const defaultCounts: BrandCounts = {
    brandMembers: null,
    pendingInvites: null,
    pendingJoinRequests: null,
  };

  const [members, invites, joinRequests] = await Promise.all([
    fetchBrandMembers(brandId),
    fetchBrandInvites(brandId),
    fetchBrandJoinRequests(brandId),
  ]).catch((error: unknown) => {
    if (isNotFoundFailure(error)) {
      return [null, null, null] as const;
    }

    return [null, null, null] as const;
  });

  if (!members || !invites || !joinRequests) {
    return defaultCounts;
  }

  return {
    brandMembers: members.length,
    pendingInvites: invites.filter((row) => row.status === "PENDING").length,
    pendingJoinRequests: joinRequests.filter((row) => row.status === "PENDING")
      .length,
  };
}

export function BrandList() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [countsByBrandId, setCountsByBrandId] = useState<
    Record<string, BrandCounts>
  >({});
  const [copyViolations, setCopyViolations] = useState<string[]>([]);

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
        ].join(" ");

        const violations = validateBrandCopy(staticCopy, "BrandList");
        setCopyViolations(violations);

        const countEntries = await Promise.all(
          result.items.map(async (brand) => [
            brand.id,
            await loadBrandCounts(brand.id),
          ] as const),
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
          <div className="jrw-brands__cell-stack">
            <strong>{brand.name}</strong>
            <span className="jrw-brands__cell-meta">{brand.slug}</span>
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
        cell: (brand) =>
          countLabel(countsByBrandId[brand.id]?.brandMembers ?? null),
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
        key: "action",
        header: "Action",
        align: "right",
        cell: (brand) => (
          <a className="jrw-brands__table-link" href={`/admin/brands/${brand.id}`}>
            Open detail
          </a>
        ),
      },
    ],
    [countsByBrandId],
  );

  return (
    <main className="jrw-brands">
      <header className="jrw-brands__header">
        <div>
          <p className="jrw-page-kicker">Catalog collaboration</p>
          <h1 className="jrw-brands__title">Brand catalog groups</h1>
          <p className="jrw-page-copy">{brandListIntroCopy}</p>
        </div>
        <dl className="jrw-brands__metrics" aria-label="Brand status summary">
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

      <section className="jrw-brands__section">
        {loadState === "loading" ? (
          <Skeleton lines={4} label="Loading brand catalog groups" />
        ) : null}

        {loadState === "failed" ? (
          <EmptyState
            title="Brand catalog groups unavailable"
            message="Could not load brand list. Retry with an active admin session."
          />
        ) : null}

        {loadState === "ready" ? (
          <DataTable
            caption="Brand list"
            columns={columns}
            emptyMessage="No catalog groups available for this account."
            getRowId={(row) => row.id}
            rows={brands}
          />
        ) : null}

        {copyViolations.length > 0 ? (
          <EmptyState
            title="Language guardrails flagged"
            message={
              <ul className="jrw-brands__violations">
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
