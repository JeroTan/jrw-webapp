import * as React from "react";
import { mergeClassNames } from "@/components/utils";
import { buildCatalogHref } from "../api";
import type { StorefrontCatalogQuery, StorefrontCatalogView } from "../types";

type CatalogPaginationProps = {
  basePath: string;
  page: number;
  query: StorefrontCatalogQuery;
  totalItems: number;
  totalPages: number;
  view: StorefrontCatalogView;
};

const paginationClass =
  "grid grid-cols-[auto_minmax(0,1fr)] items-end gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm max-md:grid-cols-1 max-md:items-stretch";
const summaryClass =
  "m-0 font-system text-xs font-bold uppercase text-brand-muted";
const controlsClass = "inline-flex flex-wrap gap-grid-xs";
const pageLinkClass =
  "inline-flex min-h-control-sm min-w-11 items-center justify-center border border-brand-border-strong bg-brand-surface px-grid-xs font-system text-xs font-bold text-brand-content no-underline hover:border-brand-accent focus-visible:border-brand-accent";
const pageLinkActiveClass = "bg-brand-content text-brand-surface";

function clampPage(page: number, totalPages: number): number {
  if (totalPages <= 0) {
    return 1;
  }

  return Math.min(Math.max(1, page), totalPages);
}

function visiblePages(page: number, totalPages: number): number[] {
  if (totalPages <= 1) {
    return [1];
  }

  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  const adjustedStart = Math.max(1, end - 4);
  const pages: number[] = [];

  for (let cursor = adjustedStart; cursor <= end; cursor += 1) {
    pages.push(cursor);
  }

  return pages;
}

export function CatalogPagination({
  basePath,
  page,
  query,
  totalItems,
  totalPages,
  view,
}: CatalogPaginationProps) {
  const currentPage = clampPage(page, totalPages);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav aria-label="Pagination" className={paginationClass}>
      <p className={summaryClass}>
        Page {currentPage} of {totalPages} - {totalItems} items
      </p>

      <div className={controlsClass}>
        {currentPage > 1 ? (
          <a
            className={pageLinkClass}
            href={buildCatalogHref(basePath, query, view, {
              page: currentPage - 1,
            })}
          >
            Previous
          </a>
        ) : (
          <span
            aria-disabled="true"
            className={mergeClassNames(pageLinkClass, "opacity-50")}
          >
            Previous
          </span>
        )}

        {visiblePages(currentPage, totalPages).map((targetPage) => {
          const selected = targetPage === currentPage;
          return (
            <a
              aria-current={selected ? "page" : undefined}
              className={mergeClassNames(
                pageLinkClass,
                selected && pageLinkActiveClass
              )}
              href={buildCatalogHref(basePath, query, view, {
                page: targetPage,
              })}
              key={targetPage}
            >
              {targetPage}
            </a>
          );
        })}

        {currentPage < totalPages ? (
          <a
            className={pageLinkClass}
            href={buildCatalogHref(basePath, query, view, {
              page: currentPage + 1,
            })}
          >
            Next
          </a>
        ) : (
          <span
            aria-disabled="true"
            className={mergeClassNames(pageLinkClass, "opacity-50")}
          >
            Next
          </span>
        )}
      </div>
    </nav>
  );
}

export default CatalogPagination;
