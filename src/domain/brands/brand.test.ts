import { describe, expect, it } from "vitest";
import {
  createBrand,
  detectBrandCreateConflict,
  generateSlug,
  validateBrandName,
  validateBrandSlug,
} from "./brand";

describe("brand domain rules", () => {
  it("generates slug from brand name and accepts valid payload", () => {
    expect(generateSlug("  JRW Lifestyle + Co.  ")).toBe("jrw-lifestyle-co");

    const result = createBrand({
      name: "  JRW Lifestyle + Co.  ",
      description: "Catalog collaboration group",
    });

    expect(result).toEqual({
      content: {
        name: "JRW Lifestyle + Co.",
        slug: "jrw-lifestyle-co",
        description: "Catalog collaboration group",
      },
      error: null,
    });
  });

  it("rejects empty or too-long brand names with stable error code", () => {
    const empty = validateBrandName("   ");
    const tooLong = validateBrandName("x".repeat(121));

    expect(empty).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      reasons: ["name:required"],
    });
    expect(tooLong).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      reasons: ["name:length"],
    });
  });

  it("rejects invalid slug format and leading or trailing hyphen", () => {
    expect(validateBrandSlug("JRW-Lifestyle")).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      reasons: ["slug:format"],
    });

    expect(validateBrandSlug("-jrw-lifestyle")).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      reasons: ["slug:format"],
    });

    expect(validateBrandSlug("jrw-lifestyle-")).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      reasons: ["slug:format"],
    });
  });

  it("detects duplicate slug conflict", () => {
    expect(
      detectBrandCreateConflict({
        existingByName: null,
        existingBySlug: { id: "brand_2", slug: "jrw-lifestyle" },
        existingArchivedByName: null,
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "DUPLICATE_SLUG",
    });
  });

  it("detects archived-name conflict before create", () => {
    expect(
      detectBrandCreateConflict({
        existingByName: null,
        existingBySlug: null,
        existingArchivedByName: { id: "brand_9", name: "JRW Lifestyle" },
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "ARCHIVED_NAME_CONFLICT",
    });
  });
});
