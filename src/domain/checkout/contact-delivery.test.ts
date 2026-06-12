import { describe, expect, it } from "vitest";
import { validateCheckoutContactDetails } from "./contact-delivery";

const validDetails = {
  email: "Nina@Example.COM ",
  fullName: " Nina Reyes ",
  phone: "+63 917 555 1212",
  streetAddress: "12 Sampaguita Street",
  barangay: "Barangay 456",
  cityProvince: "Quezon City",
  postalCode: "1100",
  privacyAcknowledged: true,
};

describe("checkout contact and delivery validation", () => {
  it("normalizes valid guest checkout details without requiring account data", () => {
    const result = validateCheckoutContactDetails(validDetails);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toEqual({
      email: "nina@example.com",
      fullName: "Nina Reyes",
      firstName: "Nina",
      lastName: "Reyes",
      phone: "+63 917 555 1212",
      streetAddress: "12 Sampaguita Street",
      barangay: "Barangay 456",
      cityProvince: "Quezon City",
      postalCode: "1100",
      privacyAcknowledged: true,
    });
  });

  it("keeps single-part full names safe instead of inventing a last name", () => {
    const result = validateCheckoutContactDetails({
      ...validDetails,
      fullName: "Nina",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fullName).toBe("Nina");
    expect(result.value.firstName).toBeNull();
    expect(result.value.lastName).toBeNull();
  });

  it("rejects missing required details, invalid formats, and privacy omission", () => {
    const result = validateCheckoutContactDetails({
      email: "not-email",
      fullName: "",
      phone: "abc",
      streetAddress: "",
      barangay: "",
      cityProvince: "",
      postalCode: "",
      privacyAcknowledged: false,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "email:format",
        "fullName:required",
        "phone:format",
        "streetAddress:required",
        "barangay:required",
        "cityProvince:required",
        "postalCode:required",
        "privacyAcknowledged:required",
      ])
    );
  });

  it("rejects unknown browser-supplied privilege and provider fields", () => {
    const result = validateCheckoutContactDetails({
      ...validDetails,
      customerId: "customer_from_browser",
      emailVerified: true,
      role: "CUSTOMER",
      providerMetadata: { token: "raw" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "customerId:unknown",
        "emailVerified:unknown",
        "role:unknown",
        "providerMetadata:unknown",
      ])
    );
  });

  it("rejects overlong checkout details before transport or provider work", () => {
    const result = validateCheckoutContactDetails({
      ...validDetails,
      streetAddress: "x".repeat(241),
      postalCode: "x".repeat(25),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasons).toEqual(
      expect.arrayContaining(["streetAddress:too_long", "postalCode:too_long"])
    );
  });
});
