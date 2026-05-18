import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_BRAND_TERMS,
  safeBrandLabel,
  validateBrandCopy,
} from "./language";

describe("brand language guardrails", () => {
  it("keeps expected forbidden term list", () => {
    expect(FORBIDDEN_BRAND_TERMS).toEqual([
      "seller",
      "merchant",
      "tenant",
      "store owner",
      "payout owner",
      "paymongo owner",
    ]);
  });

  it("detects forbidden terms across UI copy", () => {
    const violations = validateBrandCopy(
      "Invite merchant users. This store owner can approve joins.",
      "BrandDetail",
    );

    expect(violations).toEqual(
      expect.arrayContaining([
        'BrandDetail: forbidden term "merchant"',
        'BrandDetail: forbidden term "store owner"',
      ]),
    );
  });

  it("maps forbidden terms into safe brand labels", () => {
    expect(safeBrandLabel("merchant")).toBe("brand");
    expect(safeBrandLabel("store owner")).toBe("brand member");
    expect(safeBrandLabel("PayMongo owner")).toBe("JRW seller of record");
  });

  it("returns trimmed original term when no forbidden match exists", () => {
    expect(safeBrandLabel("catalog group")).toBe("catalog group");
    expect(safeBrandLabel("  brand members  ")).toBe("brand members");
  });
});

