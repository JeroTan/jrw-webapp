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
  "grid grid-cols-[auto_minmax(0,1fr)_minmax(160px,220px)] items-end gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm max-md:grid-cols-1 max-md:items-stretch";
const summaryClass =
  "m-0 font-system text-xs font-bold uppercase text-brand-muted";
const controlsClass = "inline-flex flex-wrap gap-grid-xs";
const pageButtonClass =
  "min-h-control-sm min-w-11 rounded-none border border-brand-border-strong bg-brand-surface px-grid-xs font-system text-xs font-bold text-brand-content hover:enabled:border-brand-accent";
const pageButtonActiveClass = "bg-brand-content text-brand-surface";
const pageSizeClass = "min-w-0";

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
  const currentPage = clampPage(page, safeTotalPages);
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < safeTotalPages;

  return (
    <nav
      aria-label="Pagination"
      className={paginationClass}
    >
      <p className={summaryClass} role="status">
        Page {currentPage} of {safeTotalPages} - {totalItems} items
      </p>

      <div className={controlsClass}>
        <button
          className={pageButtonClass}
          disabled={disabled || !canGoPrevious}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          Previous
        </button>

        {visiblePages(currentPage, safeTotalPages).map((targetPage) => {
          const selected = targetPage === currentPage;
          return (
            <button
              aria-current={selected ? "page" : undefined}
              className={mergeClassNames(
                pageButtonClass,
                selected && pageButtonActiveClass,
              )}
              disabled={disabled}
              key={targetPage}
              onClick={() => onPageChange(targetPage)}
              type="button"
            >
              {targetPage}
            </button>
          );
        })}

        <button
          className={pageButtonClass}
          disabled={disabled || !canGoNext}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Next
        </button>
      </div>

      <Select
        className={pageSizeClass}
        disabled={disabled}
        label="Rows per page"
        onChange={(event) => onPageSizeChange(Number(event.currentTarget.value))}
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
