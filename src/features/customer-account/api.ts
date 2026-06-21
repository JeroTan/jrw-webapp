export type ApiErrorPayload = {
  code?: string;
  message?: string;
  details?: unknown;
};

export type ApiEnvelope<TData> = {
  data?: TData;
  error?: ApiErrorPayload;
};

export type CustomerSessionActor = {
  id: string;
  role: "CUSTOMER" | "PROSPECT";
  accountStatus: {
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    emailVerified: boolean;
    approved: boolean;
  };
};

export type CustomerSessionInspection = {
  authenticated: boolean;
  actor: CustomerSessionActor | null;
  session: { expiresAt: string } | null;
};

export type CustomerProfile = {
  id: string;
  email: string;
  role: "CUSTOMER";
  emailVerified: boolean;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  streetAddress: string | null;
  barangay: string | null;
  cityProvince: string | null;
  postalCode: string | null;
  avatarUrl: string | null;
  emailMarketingOptIn: boolean;
};

export type CustomerRegistrationInput = {
  email: string;
  password: string;
  emailMarketingOptIn?: boolean;
};

export type CustomerProfilePatch = Partial<
  Pick<
    CustomerProfile,
    | "displayName"
    | "firstName"
    | "lastName"
    | "phone"
    | "streetAddress"
    | "barangay"
    | "cityProvince"
    | "postalCode"
    | "emailMarketingOptIn"
  >
>;

export class CustomerAccountApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "CustomerAccountApiError";
    this.code = code;
    this.status = status;
  }
}

export { sanitizeCustomerReturnTo };

function compactPayload<TPayload extends Record<string, unknown>>(
  payload: TPayload
) {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== undefined && value !== ""
    )
  );
}

async function parseApiResponse<TData>(
  response: Response,
  fallbackMessage: string
): Promise<TData> {
  const envelope = (await response
    .json()
    .catch(() => ({}))) as ApiEnvelope<TData>;

  if (!response.ok || envelope.error) {
    throw new CustomerAccountApiError(
      envelope.error?.message ?? fallbackMessage,
      envelope.error?.code ?? "REQUEST_FAILED",
      response.status
    );
  }

  if (envelope.data === undefined) {
    throw new CustomerAccountApiError(
      fallbackMessage,
      "EMPTY_RESPONSE",
      response.status
    );
  }

  return envelope.data;
}

export async function getCustomerSession(fetcher: typeof fetch = fetch) {
  const response = await fetcher("/api/customer/auth/session", {
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });

  return parseApiResponse<CustomerSessionInspection>(
    response,
    "We could not check your account session."
  );
}

export async function signInCustomer(
  input: { email: string; password: string },
  fetcher: typeof fetch = fetch
) {
  const response = await fetcher("/api/customer/auth/sessions", {
    body: JSON.stringify(input),
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "POST",
  });

  return parseApiResponse<{
    actor: CustomerSessionActor;
    session: { expiresAt: string };
  }>(response, "We could not sign you in.");
}

export async function signOutCustomer(fetcher: typeof fetch = fetch) {
  const response = await fetcher("/api/customer/auth/sessions/current", {
    credentials: "same-origin",
    headers: { accept: "application/json" },
    method: "DELETE",
  });

  return parseApiResponse<{ cleared: boolean; revoked: boolean }>(
    response,
    "We could not sign you out."
  );
}

export async function registerCustomer(
  input: CustomerRegistrationInput,
  fetcher: typeof fetch = fetch
) {
  const response = await fetcher("/api/customers", {
    body: JSON.stringify(compactPayload({ ...input })),
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "POST",
  });

  return parseApiResponse<{
    customer: CustomerProfile;
    verificationEmail: { sent: boolean };
  }>(response, "We could not create your account.");
}

export async function getCustomerProfile(fetcher: typeof fetch = fetch) {
  const response = await fetcher("/api/customers/me", {
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });

  return parseApiResponse<CustomerProfile>(
    response,
    "We could not load your profile."
  );
}

export async function updateCustomerProfile(
  input: CustomerProfilePatch,
  fetcher: typeof fetch = fetch
) {
  const response = await fetcher("/api/customers/me", {
    body: JSON.stringify(compactPayload(input as Record<string, unknown>)),
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "PATCH",
  });

  return parseApiResponse<CustomerProfile>(
    response,
    "We could not update your profile."
  );
}

export function getGoogleOAuthStartHref(returnTo?: string) {
  const safeReturnTo = sanitizeCustomerReturnTo(returnTo) ?? "/";
  return `/api/oauth/google/sessions?returnTo=${encodeURIComponent(safeReturnTo)}`;
}
import { sanitizeCustomerReturnTo } from "@/domain/auth/customer-account-navigation";
