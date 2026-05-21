import * as React from "react";
import { Select } from "./Select";

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
      className="jrw-pagination"
    >
      <p className="jrw-pagination__summary" role="status">
        Page {currentPage} of {safeTotalPages} · {totalItems} items
      </p>

      <div className="jrw-pagination__controls">
        <button
          className="jrw-pagination__button"
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
              className={`jrw-pagination__button${selected ? " jrw-pagination__button--active" : ""}`}
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
          className="jrw-pagination__button"
          disabled={disabled || !canGoNext}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Next
        </button>
      </div>

      <Select
        className="jrw-pagination__page-size"
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

