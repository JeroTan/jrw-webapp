import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImageList } from "./ImageList";
import { ImageUpload } from "./ImageUpload";
import type { ProductPhotoRecord } from "../types";

const now = "2026-05-21T11:00:00.000Z";

function photo(overrides: Partial<ProductPhotoRecord> = {}): ProductPhotoRecord {
  return {
    id: "photo_1",
    productId: "prod_1",
    imageId: "https://pub.r2.dev/products/prod_1/photo_1.png",
    name: "Front view",
    sortOrder: 0,
    isPrimary: true,
    r2Key: "products/prod_1/photo_1.png",
    fileSize: 1024,
    contentType: "image/png",
    width: 1000,
    height: 1000,
    createdAt: now,
    updatedAt: now,
    uploadedAt: now,
    url: "https://pub.r2.dev/products/prod_1/photo_1.png",
    ...overrides,
  };
}

describe("image UI surfaces", () => {
  it("renders upload area with file constraints and progress copy", () => {
    const markup = renderToStaticMarkup(
      createElement(ImageUpload, {
        uploading: true,
        onUpload: async () => undefined,
      })
    );

    expect(markup).toContain("Upload image");
    expect(markup).toContain("JPEG, PNG, or WEBP");
    expect(markup).toContain("Drop image here");
    expect(markup).toContain("Choose image");
    expect(markup).toContain("Upload in progress");
  });

  it("renders image list loading and empty states", () => {
    const loadingMarkup = renderToStaticMarkup(
      createElement(ImageList, {
        images: [],
        loading: true,
        onRemove: async () => undefined,
        onReorder: async () => undefined,
        onSetPrimary: async () => undefined,
      })
    );

    expect(loadingMarkup).toContain("Loading product images");

    const emptyMarkup = renderToStaticMarkup(
      createElement(ImageList, {
        images: [],
        loading: false,
        onRemove: async () => undefined,
        onReorder: async () => undefined,
        onSetPrimary: async () => undefined,
      })
    );

    expect(emptyMarkup).toContain("No product images");
  });

  it("renders image cards with primary indicator and action controls", () => {
    const markup = renderToStaticMarkup(
      createElement(ImageList, {
        images: [
          photo(),
          photo({
            id: "photo_2",
            imageId: "https://pub.r2.dev/products/prod_1/photo_2.png",
            sortOrder: 1,
            isPrimary: false,
            name: "Side view",
            url: "https://pub.r2.dev/products/prod_1/photo_2.png",
          }),
        ],
        loading: false,
        onRemove: async () => undefined,
        onReorder: async () => undefined,
        onSetPrimary: async () => undefined,
        productName: "Desk Lamp",
      })
    );

    expect(markup).toContain("Primary image");
    expect(markup).toContain("Set primary");
    expect(markup).toContain("Move up");
    expect(markup).toContain("Move down");
    expect(markup).toContain("Remove");
  });

  it("renders remove confirmation dialog when remove action is armed", () => {
    const markup = renderToStaticMarkup(
      createElement(ImageList, {
        images: [photo()],
        initialRemoveTargetId: "photo_1",
        loading: false,
        onRemove: async () => undefined,
        onReorder: async () => undefined,
        onSetPrimary: async () => undefined,
      })
    );

    expect(markup).toContain("Remove image");
    expect(markup).toContain("historical references intact");
  });
});
