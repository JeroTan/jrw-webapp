import * as React from "react";
import type { ReactNode } from "react";

import { mergeClassNames } from "../utils";

const tableWrapClass =
  "w-full overflow-x-auto border border-brand-border-strong bg-brand-surface";
const tableClass =
  "w-full min-w-[560px] border-collapse font-system text-[0.8125rem] text-brand-content";
const captionClass =
  "border-b border-brand-border-strong p-grid-xs text-left font-bold";
const headerCellClass =
  "max-w-[280px] border-b border-brand-border-strong p-grid-xs text-left align-top font-bold uppercase text-brand-muted [overflow-wrap:anywhere]";
const cellClass =
  "max-w-[280px] border-b border-brand-border p-grid-xs text-left align-top [overflow-wrap:anywhere]";
const emptyCellClass = "text-brand-muted";

export type DataTableColumn<Row> = {
  align?: "left" | "right";
  cell: (row: Row) => ReactNode;
  header: ReactNode;
  key: string;
  width?: string;
};

export type DataTableProps<Row> = {
  caption: string;
  className?: string;
  columns: Array<DataTableColumn<Row>>;
  emptyMessage?: string;
  getRowId: (row: Row) => string;
  loading?: boolean;
  loadingLabel?: string;
  rows: Row[];
};

export function DataTable<Row,>({
  caption,
  className,
  columns,
  emptyMessage = "No rows found.",
  getRowId,
  loading = false,
  loadingLabel = "Loading table rows.",
  rows,
}: DataTableProps<Row>) {
  const hasRows = rows.length > 0;

  return (
    <div className={mergeClassNames(tableWrapClass, className)}>
      <table
        aria-busy={loading || undefined}
        className={tableClass}
        data-loading={loading ? "true" : undefined}
      >
        <caption className={captionClass}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                className={headerCellClass}
                key={column.key}
                scope="col"
                style={{
                  textAlign: column.align ?? "left",
                  width: column.width,
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                className={mergeClassNames(cellClass, emptyCellClass)}
                colSpan={columns.length}
              >
                {loadingLabel}
              </td>
            </tr>
          ) : null}
          {!loading && !hasRows ? (
            <tr>
              <td
                className={mergeClassNames(cellClass, emptyCellClass)}
                colSpan={columns.length}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : null}
          {!loading && hasRows
            ? rows.map((row) => (
                <tr key={getRowId(row)}>
                  {columns.map((column) => (
                    <td
                      className={cellClass}
                      key={column.key}
                      style={{ textAlign: column.align ?? "left" }}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            : null}
        </tbody>
      </table>
    </div>
  );
}
