import * as React from "react";
import type { ReactNode } from "react";

import { mergeClassNames } from "../utils";

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
    <div className={mergeClassNames("jrw-data-table__wrap", className)}>
      <table
        aria-busy={loading || undefined}
        className="jrw-data-table"
        data-loading={loading ? "true" : undefined}
      >
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
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
              <td className="jrw-data-table__empty" colSpan={columns.length}>
                {loadingLabel}
              </td>
            </tr>
          ) : null}
          {!loading && !hasRows ? (
            <tr>
              <td className="jrw-data-table__empty" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : null}
          {!loading && hasRows
            ? rows.map((row) => (
                <tr key={getRowId(row)}>
                  {columns.map((column) => (
                    <td
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
