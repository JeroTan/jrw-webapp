import * as React from "react";
import {
  ButtonLink,
  clampPaginationPage,
  getVisiblePaginationPages,
  paginationControlsClass,
  paginationPageActiveClass,
  paginationPageControlClass,
  paginationSummaryClass,
} from "@/components";
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
const pageLinkClass = mergeClassNames(
  paginationPageControlClass.replaceAll("enabled:hover:", "hover:"),
  "inline-flex items-center justify-center no-underline"
);

export function CatalogPagination({
  basePath,
  page,
  query,
  totalItems,
  totalPages,
  view,
}: CatalogPaginationProps) {
  const currentPage = clampPaginationPage(page, totalPages);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav aria-label="Pagination" className={paginationClass}>
      <p className={paginationSummaryClass}>
        Page {currentPage} of {totalPages} - {totalItems} items
      </p>

      <div className={paginationControlsClass}>
        <ButtonLink
          aria-disabled={currentPage <= 1 ? "true" : undefined}
          className={pageLinkClass}
          disabled={currentPage <= 1}
          href={
            currentPage > 1
              ? buildCatalogHref(basePath, query, view, {
                  page: currentPage - 1,
                })
              : undefined
          }
          size="sm"
          textSize="xs"
        >
          Previous
        </ButtonLink>

        {getVisiblePaginationPages(currentPage, totalPages).map(
          (targetPage) => {
            const selected = targetPage === currentPage;
            return (
              <ButtonLink
                aria-current={selected ? "page" : undefined}
                className={mergeClassNames(
                  pageLinkClass,
                  selected && paginationPageActiveClass
                )}
                href={buildCatalogHref(basePath, query, view, {
                  page: targetPage,
                })}
                key={targetPage}
                size="sm"
                textSize="xs"
              >
                {targetPage}
              </ButtonLink>
            );
          }
        )}

        <ButtonLink
          aria-disabled={currentPage >= totalPages ? "true" : undefined}
          className={pageLinkClass}
          disabled={currentPage >= totalPages}
          href={
            currentPage < totalPages
              ? buildCatalogHref(basePath, query, view, {
                  page: currentPage + 1,
                })
              : undefined
          }
          size="sm"
          textSize="xs"
        >
          Next
        </ButtonLink>
      </div>
    </nav>
  );
}

export default CatalogPagination;
