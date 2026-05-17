import { describe, expect, it } from "vitest";
import {
  buildRequiredTransferPhrase,
  candidateEligibilityLabel,
  validateTransferForm,
} from "./ownership-transfer";

describe("owner governance UI helpers", () => {
  it("builds exact transfer phrase from normalized email", () => {
    expect(buildRequiredTransferPhrase(" Target.Admin@Example.TEST ")).toBe(
      "TRANSFER OWNERSHIP TO target.admin@example.test"
    );
  });

  it("labels eligible and blocked candidates with text status", () => {
    expect(
      candidateEligibilityLabel({
        dashboardEligible: true,
        status: "ACTIVE",
        emailVerified: true,
        approved: true,
      })
    ).toEqual({ label: "Eligible", tone: "success" });

    expect(
      candidateEligibilityLabel({
        dashboardEligible: false,
        status: "SUSPENDED",
        emailVerified: true,
        approved: true,
      })
    ).toEqual({ label: "Suspended", tone: "error" });

    expect(
      candidateEligibilityLabel({
        dashboardEligible: false,
        status: "ACTIVE",
        emailVerified: false,
        approved: false,
      })
    ).toEqual({ label: "Unverified", tone: "warning" });
  });

  it("validates phrase and password without exposing password text", () => {
    const valid = validateTransferForm({
      expectedPhrase: "TRANSFER OWNERSHIP TO target@example.test",
      confirmationPhrase: " TRANSFER OWNERSHIP TO target@example.test ",
      password: "correct horse battery staple",
    });

    expect(valid).toEqual({ ok: true, errors: {} });

    const invalid = validateTransferForm({
      expectedPhrase: "TRANSFER OWNERSHIP TO target@example.test",
      confirmationPhrase: "transfer ownership to target@example.test",
      password: "",
    });

    expect(invalid).toEqual({
      ok: false,
      errors: {
        confirmationPhrase: "Confirmation phrase does not match.",
        password: "Password is required.",
      },
    });
    expect(JSON.stringify(invalid)).not.toContain(
      "correct horse battery staple"
    );
  });
});
