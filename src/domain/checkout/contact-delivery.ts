import type { ErrorCodeType } from "@/utils/general/error";

export type CheckoutContactSnapshot = {
  email: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  streetAddress: string;
  barangay: string;
  cityProvince: string;
  postalCode: string;
  privacyAcknowledged: true;
};

export type CheckoutContactValidationError = {
  ok: false;
  code: Extract<ErrorCodeType, "VALIDATION_FAILED">;
  reasons: string[];
};

export type CheckoutContactValidation =
  | {
      ok: true;
      value: CheckoutContactSnapshot;
    }
  | CheckoutContactValidationError;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+().\-\s]{7,32}$/;

const checkoutFieldLimits = {
  email: 254,
  fullName: 160,
  phone: 32,
  streetAddress: 240,
  barangay: 120,
  cityProvince: 120,
  postalCode: 24,
} as const;

type CheckoutTextField = keyof typeof checkoutFieldLimits;

const allowedFields = new Set([
  ...Object.keys(checkoutFieldLimits),
  "privacyAcknowledged",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationError(reasons: string[]): CheckoutContactValidationError {
  return {
    ok: false,
    code: "VALIDATION_FAILED",
    reasons,
  };
}

function readRequiredString(
  input: Record<string, unknown>,
  field: CheckoutTextField,
  reasons: string[],
  options: {
    pattern?: RegExp;
  } = {}
): string {
  const rawValue = input[field];

  if (typeof rawValue !== "string") {
    reasons.push(`${field}:required`);
    return "";
  }

  const value = rawValue.trim().replace(/\s+/g, " ");

  if (value.length === 0) {
    reasons.push(`${field}:required`);
    return "";
  }

  if (value.length > checkoutFieldLimits[field]) {
    reasons.push(`${field}:too_long`);
    return "";
  }

  if (options.pattern && !options.pattern.test(value)) {
    reasons.push(`${field}:format`);
    return "";
  }

  return value;
}

function splitFullName(fullName: string): {
  firstName: string | null;
  lastName: string | null;
} {
  const parts = fullName.split(/\s+/).filter(Boolean);

  if (parts.length < 2) {
    return {
      firstName: null,
      lastName: null,
    };
  }

  const [firstName, ...lastNameParts] = parts;

  return {
    firstName: firstName ?? null,
    lastName: lastNameParts.join(" "),
  };
}

export function validateCheckoutContactDetails(
  input: unknown
): CheckoutContactValidation {
  if (!isRecord(input)) {
    return validationError(["details:required"]);
  }

  const reasons: string[] = [];

  for (const field of Object.keys(input)) {
    if (!allowedFields.has(field)) {
      reasons.push(`${field}:unknown`);
    }
  }

  const email = readRequiredString(input, "email", reasons, {
    pattern: EMAIL_PATTERN,
  }).toLowerCase();
  const fullName = readRequiredString(input, "fullName", reasons);
  const phone = readRequiredString(input, "phone", reasons, {
    pattern: PHONE_PATTERN,
  });
  const streetAddress = readRequiredString(input, "streetAddress", reasons);
  const barangay = readRequiredString(input, "barangay", reasons);
  const cityProvince = readRequiredString(input, "cityProvince", reasons);
  const postalCode = readRequiredString(input, "postalCode", reasons);

  if (input.privacyAcknowledged !== true) {
    reasons.push("privacyAcknowledged:required");
  }

  if (reasons.length > 0) {
    return validationError(reasons);
  }

  const nameParts = splitFullName(fullName);

  return {
    ok: true,
    value: {
      barangay,
      cityProvince,
      email,
      firstName: nameParts.firstName,
      fullName,
      lastName: nameParts.lastName,
      phone,
      postalCode,
      privacyAcknowledged: true,
      streetAddress,
    },
  };
}
