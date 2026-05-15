import {
  generateSessionToken,
  hashSessionToken,
} from "@/lib/crypto/session-token";
import type { ErrorCodeType } from "@/utils/general/error";

export const GOOGLE_OAUTH_PROVIDER = "GOOGLE" as const;
export const GOOGLE_OAUTH_TOKEN_BYTES = 32;
export const MAX_GOOGLE_OAUTH_STATE_TTL_SECONDS = 60 * 10;

export type GoogleOAuthProvider = typeof GOOGLE_OAUTH_PROVIDER;
export type GoogleOAuthAccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type GoogleOAuthCredential = {
  state: string;
  stateHash: string;
  nonce: string;
  nonceHash: string;
  expiresAt: string;
};

export type GoogleOAuthCredentialInput = {
  now?: Date;
  ttlSeconds?: number;
  byteLength?: number;
};

export type GoogleOAuthStateRecord = {
  id: string;
  provider: GoogleOAuthProvider;
  stateHash: string;
  nonceHash: string;
  redirectPath: string;
  expiresAt: string;
  usedAt: string | null;
};

export type GoogleOAuthIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
};

export type GoogleOAuthCustomerRecord = {
  id: string;
  email: string;
  status: GoogleOAuthAccountStatus;
  emailVerifiedAt: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
};

export type GoogleOAuthProviderLinkRecord = {
  customerId: string;
  customer: GoogleOAuthCustomerRecord | null;
};

export type OAuthStateDecision =
  | {
      ok: true;
      record: GoogleOAuthStateRecord;
    }
  | {
      ok: false;
      code: Extract<ErrorCodeType, "RESOURCE_NOT_FOUND" | "CONFLICT_STATE">;
      reason: "MISSING" | "EXPIRED" | "USED";
    };

export type GoogleOAuthLinkDecision =
  | {
      ok: true;
      action: "sign-in-linked";
      customerId: string;
      customer: GoogleOAuthCustomerRecord;
    }
  | {
      ok: true;
      action: "link-existing-customer";
      customerId: string;
      customer: GoogleOAuthCustomerRecord;
    }
  | {
      ok: true;
      action: "create-customer";
    }
  | {
      ok: false;
      code: Extract<
        ErrorCodeType,
        "AUTHENTICATION" | "AUTH_FORBIDDEN" | "ACCOUNT_SUSPENDED" | "CONFLICT_STATE"
      >;
      reason:
        | "MISSING_SUB"
        | "MISSING_EMAIL"
        | "EMAIL_UNVERIFIED"
        | "ADMIN_EMAIL_COLLISION"
        | "PROVIDER_LINK_CUSTOMER_MISSING"
        | "PROVIDER_LINK_EMAIL_MISMATCH"
        | "CUSTOMER_INACTIVE"
        | "CUSTOMER_SUSPENDED";
    };

export type GoogleOAuthProfileUpdates = {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  emailVerifiedAt?: string;
};

function clampTtlSeconds(ttlSeconds: number): number {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    return MAX_GOOGLE_OAUTH_STATE_TTL_SECONDS;
  }

  return Math.min(Math.floor(ttlSeconds), MAX_GOOGLE_OAUTH_STATE_TTL_SECONDS);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

function customerStatusFailure(customer: GoogleOAuthCustomerRecord):
  | Extract<GoogleOAuthLinkDecision, { ok: false }>
  | undefined {
  if (customer.status === "SUSPENDED") {
    return {
      ok: false,
      code: "ACCOUNT_SUSPENDED",
      reason: "CUSTOMER_SUSPENDED",
    };
  }

  if (customer.status === "INACTIVE") {
    return {
      ok: false,
      code: "AUTH_FORBIDDEN",
      reason: "CUSTOMER_INACTIVE",
    };
  }

  return undefined;
}

export function normalizeOAuthReturnPath(value: unknown): string {
  if (typeof value !== "string") return "/";

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/";
  }

  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return "/";
  }

  try {
    const url = new URL(trimmed, "https://jrw.local");
    if (url.origin !== "https://jrw.local") return "/";

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function hashGoogleOAuthMaterial(value: string): Promise<string> {
  return hashSessionToken(value);
}

export async function createGoogleOAuthCredential(
  input: GoogleOAuthCredentialInput = {}
): Promise<GoogleOAuthCredential> {
  const now = input.now ?? new Date();
  const ttlSeconds = clampTtlSeconds(
    input.ttlSeconds ?? MAX_GOOGLE_OAUTH_STATE_TTL_SECONDS
  );
  const state = generateSessionToken(input.byteLength ?? GOOGLE_OAUTH_TOKEN_BYTES);
  const nonce = generateSessionToken(input.byteLength ?? GOOGLE_OAUTH_TOKEN_BYTES);

  return {
    state,
    stateHash: await hashGoogleOAuthMaterial(state),
    nonce,
    nonceHash: await hashGoogleOAuthMaterial(nonce),
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
  };
}

export function evaluateOAuthStateRecord(input: {
  record: GoogleOAuthStateRecord | null;
  now: Date;
}): OAuthStateDecision {
  if (!input.record) {
    return {
      ok: false,
      code: "RESOURCE_NOT_FOUND",
      reason: "MISSING",
    };
  }

  if (input.record.usedAt) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "USED",
    };
  }

  if (new Date(input.record.expiresAt).getTime() <= input.now.getTime()) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "EXPIRED",
    };
  }

  return {
    ok: true,
    record: input.record,
  };
}

export function evaluateGoogleOAuthLinkDecision(input: {
  identity: Partial<GoogleOAuthIdentity>;
  providerLink: GoogleOAuthProviderLinkRecord | null;
  customerByEmail: GoogleOAuthCustomerRecord | null;
  adminEmailExists: boolean;
}): GoogleOAuthLinkDecision {
  const { identity, providerLink, customerByEmail } = input;

  if (!identity.sub) {
    return { ok: false, code: "AUTHENTICATION", reason: "MISSING_SUB" };
  }

  if (!identity.email) {
    return { ok: false, code: "AUTHENTICATION", reason: "MISSING_EMAIL" };
  }

  if (identity.emailVerified !== true) {
    return { ok: false, code: "AUTHENTICATION", reason: "EMAIL_UNVERIFIED" };
  }

  if (input.adminEmailExists) {
    return {
      ok: false,
      code: "AUTH_FORBIDDEN",
      reason: "ADMIN_EMAIL_COLLISION",
    };
  }

  if (providerLink) {
    if (!providerLink.customer) {
      return {
        ok: false,
        code: "CONFLICT_STATE",
        reason: "PROVIDER_LINK_CUSTOMER_MISSING",
      };
    }

    if (customerByEmail && customerByEmail.id !== providerLink.customer.id) {
      return {
        ok: false,
        code: "CONFLICT_STATE",
        reason: "PROVIDER_LINK_EMAIL_MISMATCH",
      };
    }

    const statusFailure = customerStatusFailure(providerLink.customer);
    if (statusFailure) return statusFailure;

    return {
      ok: true,
      action: "sign-in-linked",
      customerId: providerLink.customer.id,
      customer: providerLink.customer,
    };
  }

  if (!customerByEmail) {
    return {
      ok: true,
      action: "create-customer",
    };
  }

  if (normalizeEmail(customerByEmail.email) !== normalizeEmail(identity.email)) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "PROVIDER_LINK_EMAIL_MISMATCH",
    };
  }

  const statusFailure = customerStatusFailure(customerByEmail);
  if (statusFailure) return statusFailure;

  return {
    ok: true,
    action: "link-existing-customer",
    customerId: customerByEmail.id,
    customer: customerByEmail,
  };
}

export function googleProfileUpdatesForEmptyFields(input: {
  customer: GoogleOAuthCustomerRecord;
  identity: GoogleOAuthIdentity;
  now?: Date;
}): GoogleOAuthProfileUpdates {
  const updates: GoogleOAuthProfileUpdates = {};

  if (isBlank(input.customer.displayName) && input.identity.name) {
    updates.displayName = input.identity.name;
  }

  if (isBlank(input.customer.firstName) && input.identity.givenName) {
    updates.firstName = input.identity.givenName;
  }

  if (isBlank(input.customer.lastName) && input.identity.familyName) {
    updates.lastName = input.identity.familyName;
  }

  if (isBlank(input.customer.avatarUrl) && input.identity.picture) {
    updates.avatarUrl = input.identity.picture;
  }

  if (!input.customer.emailVerifiedAt && input.identity.emailVerified) {
    updates.emailVerifiedAt = (input.now ?? new Date()).toISOString();
  }

  return updates;
}
