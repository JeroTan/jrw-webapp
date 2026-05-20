import { describe, expect, it } from "vitest";
import {
  archiveCategoryTransition,
  createCategoryDraft,
  normalizeCategoryListQuery,
  resolveUniqueCategorySlug,
} from "./category";

describe("category domain helpers", () => {
  it("creates a valid draft with normalized defaults", () => {
    const draft = createCategoryDraft({
      name: "  Home Decor  ",
      description: "  Lifestyle picks  ",
    });

    expect(draft.error).toBeNull();
    if (draft.error) {
      throw draft.error;
    }

    expect(draft.content).toMatchObject({
      name: "Home Decor",
      slug: "home-decor",
      description: "Lifestyle picks",
      sortOrder: 0,
      isVisible: true,
      status: "ACTIVE",
    });
  });

  it("resolves unique slug conflicts with numeric suffixes", () => {
    const slug = resolveUniqueCategorySlug("shirts", [
      "shirts",
      "shirts-1",
      "shirts-2",
    ]);

    expect(slug).toBe("shirts-3");
  });

  it("archives active category state", () => {
    const archived = archiveCategoryTransition({
      currentStatus: "ACTIVE",
      updatedAt: "2026-05-20T12:00:00.000Z",
    });

    expect(archived.error).toBeNull();
    if (archived.error) {
      throw archived.error;
    }

    expect(archived.content).toEqual({
      status: "ARCHIVED",
      updatedAt: "2026-05-20T12:00:00.000Z",
    });
  });

  it("rejects invalid archive status transitions", () => {
    const invalid = archiveCategoryTransition({
      currentStatus: "DRAFT",
      updatedAt: "2026-05-20T12:00:00.000Z",
    });

    expect(invalid.error?.code).toBe("VALIDATION_FAILED");
    expect(invalid.error?.data).toMatchObject({ reason: "INVALID_STATUS" });
  });

  it("normalizes pagination defaults and max page size", () => {
    const normalized = normalizeCategoryListQuery({
      page: undefined,
      pageSize: 999,
      status: "ACTIVE",
      isVisible: "true",
    });

    expect(normalized.error).toBeNull();
    if (normalized.error) {
      throw normalized.error;
    }

    expect(normalized.content).toMatchObject({
      page: 1,
      pageSize: 100,
      status: "ACTIVE",
      isVisible: true,
    });
  });
});

