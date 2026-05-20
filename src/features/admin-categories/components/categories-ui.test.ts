import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CategoryEditor } from "./CategoryEditor";
import {
  categoryArchiveMessage,
  CategoryList,
  filterCategoriesByQuery,
} from "./CategoryList";
import type { CategoryRecord } from "../types";

const now = "2026-05-20T07:00:00.000Z";

function category(overrides: Partial<CategoryRecord> = {}): CategoryRecord {
  return {
    id: "cat_1",
    name: "Home Decor",
    slug: "home-decor",
    description: "Lifestyle picks",
    sortOrder: 10,
    isVisible: true,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    linkedProductCount: 3,
    ...overrides,
  };
}

describe("categories UI surfaces", () => {
  it("filters categories by name or slug", () => {
    const rows = [
      category(),
      category({
        id: "cat_2",
        name: "Kitchen",
        slug: "kitchen-gear",
      }),
    ];

    expect(filterCategoriesByQuery(rows, "decor")).toHaveLength(1);
    expect(filterCategoriesByQuery(rows, "kitchen-gear")).toHaveLength(1);
    expect(filterCategoriesByQuery(rows, "missing")).toHaveLength(0);
    expect(filterCategoriesByQuery(rows, "")).toHaveLength(2);
  });

  it("renders loading state copy for category list", () => {
    const markup = renderToStaticMarkup(
      createElement(CategoryList, {
        autoLoad: false,
        initialLoadState: "loading",
      })
    );

    expect(markup).toContain("Product categories");
    expect(markup).toContain("You can manage your list of categories here.");
    expect(markup).toContain("Search categories");
    expect(markup).toContain("Loading category table");
  });

  it("renders empty and ready list states", () => {
    const emptyMarkup = renderToStaticMarkup(
      createElement(CategoryList, {
        autoLoad: false,
        initialLoadState: "ready",
        initialCategories: [],
      })
    );

    expect(emptyMarkup).toContain("No categories exist");
    expect(emptyMarkup).toContain("Create first category");

    const readyMarkup = renderToStaticMarkup(
      createElement(CategoryList, {
        autoLoad: false,
        initialLoadState: "ready",
        initialCategories: [category()],
      })
    );

    expect(readyMarkup).toContain("Home Decor");
    expect(readyMarkup).toContain("home-decor");
    expect(readyMarkup).toContain("Edit");
    expect(readyMarkup).toContain("Archive");
  });

  it("renders category editor for create and edit flows", () => {
    const createMarkup = renderToStaticMarkup(
      createElement(CategoryEditor, {
        mode: "create",
        open: true,
        onClose: () => undefined,
        onSave: async () => undefined,
      })
    );

    expect(createMarkup).toContain("Create category");
    expect(createMarkup).toContain("Visible in catalog");
    expect(createMarkup).toContain("Sort order");

    const editMarkup = renderToStaticMarkup(
      createElement(CategoryEditor, {
        mode: "edit",
        open: true,
        category: category({
          id: "cat_2",
          name: "Kitchen",
          slug: "kitchen-gear",
        }),
        onClose: () => undefined,
        onSave: async () => undefined,
      })
    );

    expect(editMarkup).toContain("Edit category");
    expect(editMarkup).toContain("kitchen-gear");
    expect(editMarkup).toContain("Save changes");
  });

  it("builds archive confirmation message", () => {
    expect(categoryArchiveMessage("Kitchen")).toBe(
      'Archive category "Kitchen"? Historical references remain readable.'
    );
  });
});

