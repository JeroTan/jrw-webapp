import * as React from "react";
import { Select } from "./Select";
import { mergeClassNames } from "../utils";

export type PaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  disabled?: boolean;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const paginationClass =
  "flex flex-wrap items-center justify-between gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-xs";
const paginationMainClass = "flex flex-wrap items-center gap-grid-xs";
export const paginationSummaryClass =
  "m-0 inline-flex min-h-control-sm max-w-full items-center font-system text-xs font-bold uppercase text-brand-muted [overflow-wrap:anywhere]";
export const paginationControlsClass = "inline-flex flex-wrap gap-grid-xs";
export const paginationPageControlClass =
  "min-h-control-sm min-w-11 rounded-none border border-brand-border-strong bg-brand-surface px-grid-xs font-system text-xs font-bold text-brand-content enabled:hover:outline-2 enabled:hover:outline-offset-2 enabled:hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent disabled:cursor-not-allowed disabled:opacity-50";
export const paginationPageActiveClass =
  "!border-brand-content !bg-brand-content !text-brand-surface";
const pageSizeClass = "w-[min(100%,140px)]";

export function clampPaginationPage(page: number, totalPages: number): number {
  if (totalPages <= 0) {
    return 1;
  }

  return Math.min(Math.max(1, page), totalPages);
}

export function getVisiblePaginationPages(
  page: number,
  totalPages: number
): number[] {
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

export function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  disabled = false,
  pageSizeOptions = [20, 50, 100],
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const currentPage = clampPaginationPage(page, safeTotalPages);
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < safeTotalPages;

  return (
    <nav aria-label="Pagination" className={paginationClass}>
      <div className={paginationMainClass}>
        <p className={paginationSummaryClass} role="status">
          Page {currentPage} of {safeTotalPages} - {totalItems} items
        </p>

        <div className={paginationControlsClass}>
          <button
            className={paginationPageControlClass}
            disabled={disabled || !canGoPrevious}
            onClick={() => onPageChange(currentPage - 1)}
            type="button"
          >
            Previous
          </button>

          {getVisiblePaginationPages(currentPage, safeTotalPages).map(
            (targetPage) => {
              const selected = targetPage === currentPage;
              return (
                <button
                  aria-current={selected ? "page" : undefined}
                  className={mergeClassNames(
                    paginationPageControlClass,
                    selected && paginationPageActiveClass
                  )}
                  disabled={disabled}
                  key={targetPage}
                  onClick={() => onPageChange(targetPage)}
                  type="button"
                >
                  {targetPage}
                </button>
              );
            }
          )}

          <button
            className={paginationPageControlClass}
            disabled={disabled || !canGoNext}
            onClick={() => onPageChange(currentPage + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>

      <Select
        className={pageSizeClass}
        disabled={disabled}
        hideLabel
        label="Rows per page"
        onChange={(event) =>
          onPageSizeChange(Number(event.currentTarget.value))
        }
        value={String(pageSize)}
      >
        {pageSizeOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </nav>
  );
}
