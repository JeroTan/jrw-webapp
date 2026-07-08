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

export type CustomerRegistrationPrefill = {
  email: string;
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

export type CustomerOrderStatusLane = {
  kind: "fulfillment" | "payment" | "refund" | "return";
  label: string;
  updatedAt: string | null;
  value: string;
};

export type CustomerOrderSummary = {
  createdAt: string;
  currency: "PHP";
  fulfillment: CustomerOrderStatusLane;
  itemCount: number;
  orderId: string;
  orderNumber: string;
  payment: CustomerOrderStatusLane;
  refund: CustomerOrderStatusLane;
  return: CustomerOrderStatusLane;
  subtotalCentavos: number;
  totalCentavos: number;
  totalQuantity: number;
  updatedAt: string;
};

export type CustomerOrderSnapshotItem = {
  imageR2Key: string | null;
  lineTotalCentavos: number;
  productName: string;
  productSlug: string | null;
  quantity: number;
  unitPriceCentavos: number;
  variantLabel: string;
  variantOptions: Array<{
    group: string;
    name: string;
  }>;
};

export type CustomerOrderDetail = CustomerOrderSummary & {
  items: CustomerOrderSnapshotItem[];
};

export type CustomerOrderPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type CustomerOrderList = {
  items: CustomerOrderSummary[];
  pagination: CustomerOrderPagination;
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isOrderLane(value: unknown): value is CustomerOrderStatusLane {
  return (
    isRecord(value) &&
    (value.kind === "fulfillment" ||
      value.kind === "payment" ||
      value.kind === "refund" ||
      value.kind === "return") &&
    typeof value.label === "string" &&
    typeof value.value === "string" &&
    (typeof value.updatedAt === "string" || value.updatedAt === null)
  );
}

function isOrderSummary(value: unknown): value is CustomerOrderSummary {
  return (
    isRecord(value) &&
    typeof value.createdAt === "string" &&
    value.currency === "PHP" &&
    isOrderLane(value.fulfillment) &&
    isSafeInteger(value.itemCount) &&
    typeof value.orderId === "string" &&
    typeof value.orderNumber === "string" &&
    isOrderLane(value.payment) &&
    isOrderLane(value.refund) &&
    isOrderLane(value.return) &&
    isSafeInteger(value.subtotalCentavos) &&
    isSafeInteger(value.totalCentavos) &&
    isSafeInteger(value.totalQuantity) &&
    typeof value.updatedAt === "string"
  );
}

function isOrderItem(value: unknown): value is CustomerOrderSnapshotItem {
  return (
    isRecord(value) &&
    (typeof value.imageR2Key === "string" || value.imageR2Key === null) &&
    isSafeInteger(value.lineTotalCentavos) &&
    typeof value.productName === "string" &&
    (typeof value.productSlug === "string" || value.productSlug === null) &&
    isSafeInteger(value.quantity) &&
    isSafeInteger(value.unitPriceCentavos) &&
    typeof value.variantLabel === "string" &&
    Array.isArray(value.variantOptions) &&
    value.variantOptions.every(
      (option) =>
        isRecord(option) &&
        typeof option.group === "string" &&
        typeof option.name === "string"
    )
  );
}

function assertCustomerOrderList(value: unknown): CustomerOrderList {
  if (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isOrderSummary) &&
    isRecord(value.pagination) &&
    isSafeInteger(value.pagination.page) &&
    isSafeInteger(value.pagination.pageSize) &&
    isSafeInteger(value.pagination.totalItems) &&
    isSafeInteger(value.pagination.totalPages)
  ) {
    return value as CustomerOrderList;
  }

  throw new CustomerAccountApiError(
    "We could not load your orders.",
    "INVALID_RESPONSE",
    200
  );
}

function assertCustomerOrderDetail(value: unknown): CustomerOrderDetail {
  const candidate = value as Partial<CustomerOrderDetail>;

  if (
    isRecord(value) &&
    isOrderSummary(value) &&
    Array.isArray(candidate.items) &&
    candidate.items.every(isOrderItem)
  ) {
    return value as CustomerOrderDetail;
  }

  throw new CustomerAccountApiError(
    "We could not load this order.",
    "INVALID_RESPONSE",
    200
  );
}

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

export async function getCustomerRegistrationPrefill(
  receiptContext: string,
  fetcher: typeof fetch = fetch
) {
  const response = await fetcher(
    `/api/customers/registration-prefill?receiptContext=${encodeURIComponent(
      receiptContext
    )}`,
    {
      credentials: "same-origin",
      headers: { accept: "application/json" },
    }
  );

  return parseApiResponse<CustomerRegistrationPrefill>(
    response,
    "We could not load your checkout email."
  );
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

export async function getCustomerOrders(
  input: { page?: number; pageSize?: number } = {},
  fetcher: typeof fetch = fetch
) {
  const params = new URLSearchParams();

  if (input.page) {
    params.set("page", String(input.page));
  }

  if (input.pageSize) {
    params.set("pageSize", String(input.pageSize));
  }

  const response = await fetcher(
    `/api/customer/orders${params.toString() ? `?${params.toString()}` : ""}`,
    {
      credentials: "same-origin",
      headers: { accept: "application/json" },
    }
  );

  return assertCustomerOrderList(
    await parseApiResponse<unknown>(response, "We could not load your orders.")
  );
}

export async function getCustomerOrder(
  orderId: string,
  fetcher: typeof fetch = fetch
) {
  const response = await fetcher(
    `/api/customer/orders/${encodeURIComponent(orderId)}`,
    {
      credentials: "same-origin",
      headers: { accept: "application/json" },
    }
  );

  return assertCustomerOrderDetail(
    await parseApiResponse<unknown>(response, "We could not load this order.")
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
