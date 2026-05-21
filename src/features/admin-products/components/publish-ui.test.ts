import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublishControl } from "./PublishControl";
import { ReadinessPanel } from "./ReadinessPanel";

describe("publish UI surfaces", () => {
  it("renders readiness panel with missing requirements", () => {
    const markup = renderToStaticMarkup(
      createElement(ReadinessPanel, {
        readiness: {
          isReady: false,
          missingItems: [
            "At least one product image is required.",
            "Every active variant must have price greater than zero.",
          ],
        },
        onRefresh: async () => undefined,
      })
    );

    expect(markup).toContain("Publish readiness");
    expect(markup).toContain("Missing requirements");
    expect(markup).toContain("At least one product image is required.");
    expect(markup).toContain(
      "Every active variant must have price greater than zero."
    );
  });

  it("renders readiness panel ready state", () => {
    const markup = renderToStaticMarkup(
      createElement(ReadinessPanel, {
        readiness: {
          isReady: true,
          missingItems: [],
        },
        onRefresh: async () => undefined,
      })
    );

    expect(markup).toContain("Ready to publish");
    expect(markup).toContain("All publish-required product fields are valid.");
  });

  it("renders publish controls and status labels", () => {
    const draftMarkup = renderToStaticMarkup(
      createElement(PublishControl, {
        status: "DRAFT",
        readiness: {
          isReady: false,
          missingItems: ["At least one product image is required."],
        },
        onPublish: async () => undefined,
        onUnpublish: async () => undefined,
        onArchive: async () => undefined,
      })
    );

    expect(draftMarkup).toContain("Catalog status");
    expect(draftMarkup).toContain("Draft");
    expect(draftMarkup).toContain("Publish");
    expect(draftMarkup).toContain("Move to draft");
    expect(draftMarkup).toContain("Archive");
    expect(draftMarkup).toContain("disabled");
    expect(draftMarkup).toContain(
      "Complete missing readiness items before publishing."
    );

    const publishedMarkup = renderToStaticMarkup(
      createElement(PublishControl, {
        status: "PUBLISHED",
        readiness: {
          isReady: true,
          missingItems: [],
        },
        onPublish: async () => undefined,
        onUnpublish: async () => undefined,
        onArchive: async () => undefined,
      })
    );

    expect(publishedMarkup).toContain("Published");
  });

  it("renders mutation guard reason when publish controls blocked", () => {
    const markup = renderToStaticMarkup(
      createElement(PublishControl, {
        status: "DRAFT",
        readiness: {
          isReady: true,
          missingItems: [],
        },
        mutationsBlocked: true,
        publishBlockedReason: "You need active membership in this product brand.",
        onPublish: async () => undefined,
        onUnpublish: async () => undefined,
        onArchive: async () => undefined,
      })
    );

    expect(markup).toContain("You need active membership in this product brand.");
    expect(markup).toContain("disabled");
  });

  it("renders archive confirmation dialog when armed", () => {
    const markup = renderToStaticMarkup(
      createElement(PublishControl, {
        status: "PUBLISHED",
        readiness: {
          isReady: true,
          missingItems: [],
        },
        initialArchiveConfirmOpen: true,
        onPublish: async () => undefined,
        onUnpublish: async () => undefined,
        onArchive: async () => undefined,
      })
    );

    expect(markup).toContain("Archive product");
    expect(markup).toContain(
      "Archive keeps historical references and removes this product from active catalog."
    );
  });
});
