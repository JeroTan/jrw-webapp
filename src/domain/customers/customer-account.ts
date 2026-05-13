import { hashPassword, type PasswordHashOptions } from "@/lib/crypto/password";
import type { ErrorCodeType } from "@/utils/general/error";

export type CustomerProfilePatch = {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  streetAddress?: string;
  barangay?: string;
  cityProvince?: string;
  postalCode?: string;
  emailMarketingOptIn?: boolean;
};

export type CustomerRegistrationValue = {
  email: string;
  password: string;
  profile: CustomerProfilePatch & {
    emailMarketingOptIn: boolean;
  };
};

export type CustomerValidationError = {
  ok: false;
  code: Extract<ErrorCodeType, "VALIDATION_FAILED">;
  reasons: string[];
};

export type CustomerRegistrationValidation =
  | {
      ok: true;
      value: CustomerRegistrationValue;
    }
  | CustomerValidationError;

export type CustomerProfileUpdateValidation =
  | {
      ok: true;
      value: CustomerProfilePatch;
    }
  | CustomerValidationError;

export type RegistrationAccountDecision =
  | {
      ok: true;
    }
  | {
      ok: false;
      code: Extract<ErrorCodeType, "CONFLICT_STATE">;
      reason: "DUPLICATE_EMAIL";
    };

export type EmailVerificationTokenRecord = {
  customerId: string;
  expiresAt: string;
  usedAt?: string | null;
};

export type EmailVerificationTokenDecision =
  | {
      ok: true;
      customerId: string;
    }
  | {
      ok: false;
      code: Extract<ErrorCodeType, "RESOURCE_NOT_FOUND" | "CONFLICT_STATE">;
      reason: "INVALID" | "USED" | "EXPIRED";
    };

export type CreateCustomerPasswordCredentialInput = {
  password: string;
  pepper: string;
  hashOptions?: PasswordHashOptions;
};

export type CustomerPasswordCredential = {
  passwordHash: string;
  passwordSalt: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+().\-\s]{7,32}$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 1024;

const fieldLimits = {
  displayName: 120,
  firstName: 80,
  lastName: 80,
  phone: 32,
  streetAddress: 240,
  barangay: 120,
  cityProvince: 120,
  postalCode: 24,
} as const;

type TextFieldName = keyof typeof fieldLimits;

const textFields = Object.keys(fieldLimits) as TextFieldName[];

export function normalizeCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validationError(reasons: string[]): CustomerValidationError {
  return {
    ok: false,
    code: "VALIDATION_FAILED",
    reasons,
  };
}

function readOptionalString(
  input: Record<string, unknown>,
  field: TextFieldName,
  reasons: string[],
  options: {
    requiredWhenPresent?: boolean;
    pattern?: RegExp;
  } = {}
): string | undefined {
  const rawValue = input[field];

  if (rawValue === undefined || rawValue === null) {
    return undefined;
  }

  if (typeof rawValue !== "string") {
    reasons.push(`${field}:type`);
    return undefined;
  }

  const value = rawValue.trim();

  if (value.length === 0) {
    if (options.requiredWhenPresent) {
      reasons.push(`${field}:empty`);
    }
    return undefined;
  }

  if (value.length > fieldLimits[field]) {
    reasons.push(`${field}:too_long`);
    return undefined;
  }

  if (options.pattern && !options.pattern.test(value)) {
    reasons.push(`${field}:format`);
    return undefined;
  }

  return value;
}

function readProfilePatch(
  input: Record<string, unknown>,
  options: {
    requireAtLeastOne: boolean;
    defaultMarketingOptIn?: boolean;
  }
): CustomerProfileUpdateValidation {
  const reasons: string[] = [];
  const profile: CustomerProfilePatch = {};

  for (const field of textFields) {
    const value = readOptionalString(input, field, reasons, {
      requiredWhenPresent: options.requireAtLeastOne || field === "displayName",
      pattern: field === "phone" ? PHONE_PATTERN : undefined,
    });

    if (value !== undefined) {
      profile[field] = value;
    }
  }

  const marketingValue = input.emailMarketingOptIn;
  if (marketingValue === undefined || marketingValue === null) {
    if (options.defaultMarketingOptIn !== undefined) {
      profile.emailMarketingOptIn = options.defaultMarketingOptIn;
    }
  } else if (typeof marketingValue === "boolean") {
    profile.emailMarketingOptIn = marketingValue;
  } else {
    reasons.push("emailMarketingOptIn:type");
  }

  if (reasons.length > 0) {
    return validationError(reasons);
  }

  if (options.requireAtLeastOne && Object.keys(profile).length === 0) {
    return validationError(["profile:empty"]);
  }

  return {
    ok: true,
    value: profile,
  };
}

export function validateCustomerRegistration(
  input: Record<string, unknown>
): CustomerRegistrationValidation {
  const reasons: string[] = [];
  const email =
    typeof input.email === "string" ? normalizeCustomerEmail(input.email) : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    reasons.push("email:format");
  }

  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    reasons.push("password:length");
  }

  const profileResult = readProfilePatch(input, {
    requireAtLeastOne: false,
    defaultMarketingOptIn: false,
  });

  if (!profileResult.ok) {
    reasons.push(...profileResult.reasons);
  }

  if (reasons.length > 0 || !profileResult.ok) {
    return validationError(reasons);
  }

  return {
    ok: true,
    value: {
      email,
      password,
      profile: {
        ...profileResult.value,
        emailMarketingOptIn: profileResult.value.emailMarketingOptIn ?? false,
      },
    },
  };
}

export function validateCustomerProfileUpdate(
  input: Record<string, unknown>
): CustomerProfileUpdateValidation {
  return readProfilePatch(input, {
    requireAtLeastOne: true,
  });
}

export function evaluateRegistrationAccountState(input: {
  existingCustomerId?: string | null;
}): RegistrationAccountDecision {
  return input.existingCustomerId
    ? {
        ok: false,
        code: "CONFLICT_STATE",
        reason: "DUPLICATE_EMAIL",
      }
    : { ok: true };
}

export function evaluateEmailVerificationTokenState(input: {
  record: EmailVerificationTokenRecord | null;
  now?: Date;
}): EmailVerificationTokenDecision {
  const now = input.now ?? new Date();

  if (!input.record) {
    return {
      ok: false,
      code: "RESOURCE_NOT_FOUND",
      reason: "INVALID",
    };
  }

  if (input.record.usedAt) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "USED",
    };
  }

  const expiryTime = new Date(input.record.expiresAt).getTime();
  if (!Number.isFinite(expiryTime) || expiryTime <= now.getTime()) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "EXPIRED",
    };
  }

  return {
    ok: true,
    customerId: input.record.customerId,
  };
}

export async function createCustomerPasswordCredential(
  input: CreateCustomerPasswordCredentialInput
): Promise<CustomerPasswordCredential> {
  return hashPassword(input.password, input.pepper, input.hashOptions);
}
