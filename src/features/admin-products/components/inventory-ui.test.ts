import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "@/components/feedback";
import { InventoryAdjuster } from "./InventoryAdjuster";
import { InventoryStateSelector } from "./InventoryStateSelector";

describe("inventory UI surfaces", () => {
  it("renders stock adjuster controls and helper copy", () => {
    const markup = renderToStaticMarkup(
      createElement(InventoryAdjuster, {
        quantity: "12",
        disabled: false,
        onChange: () => undefined,
      })
    );

    expect(markup).toContain("Stock quantity");
    expect(markup).toContain("Non-negative integer");
    expect(markup).toContain("type=\"number\"");
  });

  it("renders validation and conflict errors", () => {
    const markup = renderToStaticMarkup(
      createElement(InventoryAdjuster, {
        quantity: "-1",
        disabled: false,
        error: "Quantity cannot be negative.",
        conflictMessage: "Inventory state conflicts with stock quantity.",
        onChange: () => undefined,
      })
    );

    expect(markup).toContain("Quantity cannot be negative.");
    expect(markup).toContain("Inventory state conflicts with stock quantity.");
  });

  it("renders inventory state selector with text labels", () => {
    const markup = renderToStaticMarkup(
      createElement(InventoryStateSelector, {
        state: "LOW_STOCK",
        disabled: false,
        onChange: () => undefined,
      })
    );

    expect(markup).toContain("Inventory state");
    expect(markup).toContain("In stock");
    expect(markup).toContain("Low stock");
    expect(markup).toContain("Out of stock");
    expect(markup).toContain("Preorder");
  });

  it("renders empty availability state copy", () => {
    const markup = renderToStaticMarkup(
      createElement(InventoryStateSelector, {
        state: "OUT_OF_STOCK",
        disabled: false,
        helpText: "No availability data yet.",
        onChange: () => undefined,
      })
    );

    expect(markup).toContain("No availability data yet.");
  });

  it("status badge labels stay text-visible", () => {
    const available = renderToStaticMarkup(
      createElement(StatusBadge, { label: "Available", tone: "success" })
    );
    const lowStock = renderToStaticMarkup(
      createElement(StatusBadge, { label: "Low Stock", tone: "warning" })
    );
    const unavailable = renderToStaticMarkup(
      createElement(StatusBadge, { label: "Unavailable", tone: "error" })
    );
    const preorder = renderToStaticMarkup(
      createElement(StatusBadge, { label: "Preorder", tone: "info" })
    );

    expect(available).toContain("Available");
    expect(lowStock).toContain("Low Stock");
    expect(unavailable).toContain("Unavailable");
    expect(preorder).toContain("Preorder");
  });
});
