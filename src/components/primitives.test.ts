import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  Button,
  DataTable,
  IconButton,
  Input,
  Modal,
  StatusBadge,
} from "./index";
import type { DataTableProps } from "./index";

describe("shared UI primitives", () => {
  it("renders status labels as text", () => {
    const markup = renderToStaticMarkup(
      createElement(StatusBadge, { label: "Published", tone: "success" }),
    );

    expect(markup).toContain("Published");
    expect(markup).toContain("jrw-status-badge__mark");
  });

  it("requires icon button accessible label and tooltip metadata", () => {
    const markup = renderToStaticMarkup(
      createElement(IconButton, { label: "Open menu" }, "+"),
    );

    expect(markup).toContain('aria-label="Open menu"');
    expect(markup).toContain('title="Open menu"');
  });

  it("associates input errors with fields", () => {
    const markup = renderToStaticMarkup(
      createElement(Input, {
        error: "Email is required.",
        id: "email",
        label: "Email",
      }),
    );

    expect(markup).toContain('for="email"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain("email-error");
  });

  it("renders loading button state without changing control role", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Button,
        { loading: true, loadingLabel: "Saving", variant: "primary" },
        "Save",
      ),
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("Saving");
  });

  it("renders data table empty state with caption", () => {
    type ProductRow = { id: string; name: string };
    const tableProps: DataTableProps<ProductRow> = {
      caption: "Products",
      columns: [
        {
          cell: (row) => row.name,
          header: "Name",
          key: "name",
        },
      ],
      emptyMessage: "No products.",
      getRowId: (row) => row.id,
      rows: [],
    };

    const markup = renderToStaticMarkup(
      createElement(DataTable<ProductRow>, tableProps),
    );

    expect(markup).toContain("<caption>Products</caption>");
    expect(markup).toContain("No products.");
  });

  it("renders modal dialog semantics when open", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Modal,
        {
          onClose: () => undefined,
          open: true,
          title: "Confirm change",
        },
        "Review before continuing.",
      ),
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("Confirm change");
  });
});
