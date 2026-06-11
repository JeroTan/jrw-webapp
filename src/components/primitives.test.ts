import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  Button,
  ButtonLink,
  Checkbox,
  CleanButton,
  CleanLinkButton,
  DataTable,
  Drawer,
  Modal,
  Pagination,
  PageToolbar,
  ResourceCard,
  ResourceList,
  SearchInput,
  SegmentedControl,
  Skeleton,
  SidePanel,
  StatusBadge,
  ViewToggle,
} from "./index";
import type { DataTableProps } from "./index";
import { InputBox } from "./ui/InputBox";

describe("shared UI primitives", () => {
  it("renders status labels as text", () => {
    const markup = renderToStaticMarkup(
      createElement(StatusBadge, { label: "Published", tone: "success" })
    );

    expect(markup).toContain("Published");
    expect(markup).toContain("size-2");
  });

  it("renders button hover and focus outline contract", () => {
    const markup = renderToStaticMarkup(createElement(Button, null, "Save"));

    for (const token of [
      "hover:outline-2",
      "hover:outline-offset-2",
      "hover:outline-brand-accent",
      "focus:outline-2",
      "focus:outline-offset-2",
      "focus:outline-brand-accent",
      "focus-visible:outline-2",
      "focus-visible:outline-offset-2",
      "focus-visible:outline-brand-accent",
    ]) {
      expect(markup).toContain(token);
    }
  });

  it("renders square button accessible label and tooltip metadata", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Button,
        { "aria-label": "Open menu", square: true, title: "Open menu" },
        "+"
      )
    );

    expect(markup).toContain('aria-label="Open menu"');
    expect(markup).toContain('title="Open menu"');
    expect(markup).toContain("size-control-md");
    expect(markup).toContain("px-0");
  });

  it("renders square button hover and focus outline contract", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Button,
        { "aria-label": "Open menu", square: true, title: "Open menu" },
        "+"
      )
    );

    for (const token of [
      "hover:outline-2",
      "hover:outline-offset-2",
      "hover:outline-brand-accent",
      "focus:outline-2",
      "focus:outline-offset-2",
      "focus:outline-brand-accent",
      "focus-visible:outline-2",
      "focus-visible:outline-offset-2",
      "focus-visible:outline-brand-accent",
    ]) {
      expect(markup).toContain(token);
    }
  });

  it("renders primary button with accent fill and surface text", () => {
    const markup = renderToStaticMarkup(
      createElement(Button, { variant: "primary" }, "Save")
    );

    expect(markup).toContain("border-brand-accent");
    expect(markup).toContain("bg-brand-accent");
    expect(markup).toContain("text-brand-surface");
  });

  it("renders button link hover and focus outline contract", () => {
    const markup = renderToStaticMarkup(
      createElement(ButtonLink, { href: "/products" }, "Products")
    );

    for (const token of [
      "hover:outline-2",
      "hover:outline-offset-2",
      "hover:outline-brand-accent",
      "focus:outline-2",
      "focus:outline-offset-2",
      "focus:outline-brand-accent",
      "focus-visible:outline-2",
      "focus-visible:outline-offset-2",
      "focus-visible:outline-brand-accent",
    ]) {
      expect(markup).toContain(token);
    }
  });

  it("renders clean button and link button with low-border visual contract", () => {
    const buttonMarkup = renderToStaticMarkup(
      createElement(CleanButton, { variant: "primary" }, "New product")
    );
    const linkMarkup = renderToStaticMarkup(
      createElement(
        CleanLinkButton,
        { active: true, href: "/admin/products" },
        "Products"
      )
    );

    expect(buttonMarkup).toContain("border-transparent");
    expect(buttonMarkup).toContain("bg-brand-accent");
    expect(buttonMarkup).toContain("text-brand-surface");
    expect(linkMarkup).toContain("bg-brand-content");
    expect(linkMarkup).toContain("!text-brand-surface");
    expect(linkMarkup).toContain("focus-visible:outline-brand-accent");
  });

  it("associates input errors with fields", () => {
    const markup = renderToStaticMarkup(
      createElement(InputBox, {
        error: "Email is required.",
        id: "email",
        label: "Email",
      })
    );

    expect(markup).toContain('for="email"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain("email-error");
  });

  it("renders checkbox size variants", () => {
    const extraSmallMarkup = renderToStaticMarkup(
      createElement(Checkbox, {
        id: "extra-small-checkbox",
        label: "Extra small",
        size: "xs",
      })
    );
    const smallMarkup = renderToStaticMarkup(
      createElement(Checkbox, {
        id: "small-checkbox",
        label: "Small",
        size: "sm",
      })
    );
    const mediumMarkup = renderToStaticMarkup(
      createElement(Checkbox, {
        id: "medium-checkbox",
        label: "Medium",
      })
    );

    expect(extraSmallMarkup).toContain("size-[14px]");
    expect(extraSmallMarkup).toContain("gap-1");
    expect(smallMarkup).toContain("size-4");
    expect(smallMarkup).toContain("text-[0.625rem]");
    expect(mediumMarkup).toContain("size-5");
    expect(mediumMarkup).toContain("text-xs");
  });

  it("renders loading button state without changing control role", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Button,
        { loading: true, loadingLabel: "Saving", variant: "primary" },
        "Save"
      )
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("disabled");
    expect(markup).toContain("shadow-none");
    expect(markup).toContain("filter-none");
    expect(markup).not.toContain("shadow-sm");
    expect(markup).not.toContain("shadow-md");
    expect(markup).not.toContain("blur");
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
      createElement(DataTable<ProductRow>, tableProps)
    );

    expect(markup).toContain("<caption");
    expect(markup).toContain("Products</caption>");
    expect(markup).toContain("No products.");
  });

  it("renders compact pagination with visible selected page", () => {
    const markup = renderToStaticMarkup(
      createElement(Pagination, {
        onPageChange: () => undefined,
        onPageSizeChange: () => undefined,
        page: 1,
        pageSize: 20,
        totalItems: 2,
        totalPages: 1,
      })
    );

    expect(markup).toContain("flex flex-wrap items-center justify-between");
    expect(markup).toContain("Page 1 of 1 - 2 items");
    expect(markup).toContain("sr-only");
    expect(markup).toContain("Rows per page");
    expect(markup).toContain("enabled:hover:outline-2");
    expect(markup).toContain("enabled:hover:outline-offset-2");
    expect(markup).toContain("enabled:hover:outline-brand-accent");
    expect(markup).toContain("focus-visible:outline-2");
    expect(markup).toContain("focus-visible:outline-offset-2");
    expect(markup).toContain("focus-visible:outline-brand-accent");
    expect(markup).toContain("!bg-brand-content");
    expect(markup).toContain("!text-brand-surface");
    expect(markup).toContain("[overflow-wrap:anywhere]");
    expect(markup).toContain("disabled");
  });

  it("renders pagination long totals without overflow-prone summary", () => {
    const markup = renderToStaticMarkup(
      createElement(Pagination, {
        onPageChange: () => undefined,
        onPageSizeChange: () => undefined,
        page: 9999,
        pageSize: 20,
        totalItems: 123456789012345,
        totalPages: 9999,
      })
    );

    expect(markup).toContain("Page 9999 of 9999 - 123456789012345 items");
    expect(markup).toContain("max-w-full");
    expect(markup).toContain("[overflow-wrap:anywhere]");
    expect(markup).toContain("enabled:hover:outline-2");
    expect(markup).toContain("disabled");
  });

  it("renders segmented control with pressed state, disabled option, and outline contract", () => {
    const markup = renderToStaticMarkup(
      createElement(SegmentedControl, {
        label: "Catalog density",
        onChange: () => undefined,
        options: [
          { label: "Compact", value: "compact" },
          { disabled: true, label: "Comfortable", value: "comfortable" },
        ],
        value: "compact",
      })
    );

    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-label="Catalog density"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain("disabled");
    expect(markup).toContain("Compact");
    expect(markup).toContain("Comfortable");
    expect(markup).toContain("enabled:hover:outline-2");
    expect(markup).toContain("enabled:hover:outline-offset-2");
    expect(markup).toContain("enabled:hover:outline-brand-accent");
    expect(markup).toContain("focus-visible:outline-2");
    expect(markup).toContain("focus-visible:outline-offset-2");
    expect(markup).toContain("focus-visible:outline-brand-accent");
    expect(markup).toContain("max-w-full");
    expect(markup).toContain("[overflow-wrap:anywhere]");
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
        "Review before continuing."
      )
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("Confirm change");
  });

  it("renders drawer dialog semantics when open", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Drawer,
        {
          onClose: () => undefined,
          open: true,
          title: "Cart",
        },
        "Cart line items"
      )
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("grid-cols-[minmax(0,1fr)_minmax(320px,440px)]");
    expect(markup).toContain("Close drawer");
  });

  it("renders side panel dialog semantics with responsive full-screen shell", () => {
    const markup = renderToStaticMarkup(
      createElement(
        SidePanel,
        {
          description: "Edit selected record.",
          footer: createElement(Button, { variant: "primary" }, "Save"),
          onClose: () => undefined,
          open: true,
          title: "Edit product",
        },
        "Panel content"
      )
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("Edit product");
    expect(markup).toContain("Edit selected record.");
    expect(markup).toContain("Panel content");
    expect(markup).toContain("Save");
    expect(markup).toContain("Close panel");
    expect(markup).toContain("max-md:grid-cols-1");
    expect(markup).toContain("shadow-none");
    expect(markup).toContain("filter-none");
  });

  it("keeps dialog focus trap from leaking when active element leaves overlay", () => {
    const focusTrapSource = readFileSync(
      join(process.cwd(), "src/components/ui/dialog-focus.ts"),
      "utf8"
    );

    expect(focusTrapSource).toContain("dialog.contains(activeElement)");
    expect(focusTrapSource).toContain(
      "(event.shiftKey ? last : first).focus()"
    );
    expect(focusTrapSource).toContain("element.tabIndex >= 0");
    expect(focusTrapSource).toContain("[hidden],[inert],[aria-hidden='true']");
    expect(focusTrapSource).toContain("activeDialog.contains(previousFocus)");
  });

  it("renders search input with search semantics", () => {
    const markup = renderToStaticMarkup(
      createElement(SearchInput, {
        id: "resource-search",
        label: "Search brands",
        onChange: () => undefined,
        placeholder: "Search by name or slug",
        value: "studio",
      })
    );

    expect(markup).toContain('type="search"');
    expect(markup).toContain('for="resource-search"');
    expect(markup).toContain("Search by name or slug");
  });

  it("renders view toggle selected state and labels", () => {
    const markup = renderToStaticMarkup(
      createElement(ViewToggle, {
        label: "Brand view",
        onChange: () => undefined,
        options: [
          { label: "Cards", value: "cards" },
          { label: "List", value: "list" },
        ],
        value: "cards",
      })
    );

    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-label="Brand view"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("bg-brand-content");
    expect(markup).toContain("text-brand-surface");
    expect(markup).toContain("bg-brand-surface");
    expect(markup).toContain("text-brand-content");
    expect(markup).toContain("hover:outline-2");
    expect(markup).toContain("hover:outline-offset-2");
    expect(markup).toContain("focus-visible:outline-2");
    expect(markup).toContain("focus-visible:outline-offset-2");
    expect(markup).toContain("Cards");
    expect(markup).toContain("List");
  });

  it("renders resource card/list and toolbar primitives", () => {
    const card = createElement(ResourceCard, {
      action: createElement(
        "a",
        { href: "/admin/brands/brand_1" },
        "Open detail"
      ),
      media: createElement("span", { role: "img" }, "JS"),
      meta: "jrw-studio",
      stats: [
        { label: "Brand members", value: "2" },
        { label: "Linked products", value: "5" },
      ],
      status: createElement(StatusBadge, { label: "ACTIVE", tone: "success" }),
      title: "JRW Studio",
    });

    const markup = renderToStaticMarkup(
      createElement(
        PageToolbar,
        {
          actions: createElement("button", { type: "button" }, "Cards"),
          main: createElement(SearchInput, {
            label: "Search resources",
            onChange: () => undefined,
            value: "",
          }),
        },
        createElement(ResourceList, { label: "Brand cards" }, card)
      )
    );

    expect(markup).toContain("border-b");
    expect(markup).toContain('role="list"');
    expect(markup).toContain('role="listitem"');
    expect(markup).toContain('role="img"');
    expect(markup).toContain("JRW Studio");
    expect(markup).toContain("Linked products");
    expect(markup).toContain("Open detail");
  });

  it("renders skeleton lines with Tailwind motion-safe pulse", () => {
    const markup = renderToStaticMarkup(
      createElement(Skeleton, { label: "Loading cards", lines: 2 })
    );

    expect(markup).toContain("motion-safe:animate-pulse");
    expect(markup).toContain('aria-label="Loading cards"');
  });

  it("does not use stepped custom skeleton animation", () => {
    const globalCss = readFileSync(
      join(process.cwd(), "src/styles/global.css"),
      "utf8"
    );

    expect(globalCss).not.toContain("steps(6)");
    expect(globalCss).not.toContain("jrw-skeleton-pulse");
  });

  it("uses Tailwind theme control height tokens for component sizing", () => {
    const tokenCss = readFileSync(
      join(process.cwd(), "src/styles/_tokens.css"),
      "utf8"
    );

    expect(tokenCss).toContain("--spacing-control-md: 44px");
    expect(tokenCss).not.toContain("--jrw-control-height");
  });

  it("keeps global focus-visible outline independent from generated utilities", () => {
    const baseCss = readFileSync(
      join(process.cwd(), "src/styles/_base.css"),
      "utf8"
    );

    expect(baseCss).toContain("outline: 2px solid var(--color-brand-accent);");
    expect(baseCss).toContain("outline-offset: 2px;");
  });

  it("documents storefront and overlay primitive boundaries", () => {
    const readme = readFileSync(
      join(process.cwd(), "src/components/_readme.md"),
      "utf8"
    );

    expect(readme).toContain("ui/SegmentedControl");
    expect(readme).toContain("ui/Drawer");
    expect(readme).toContain("ui/SidePanel");
    expect(readme).toContain("ui/Pagination");
  });
});
