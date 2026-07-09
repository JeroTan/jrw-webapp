import type {
  AdminOrderDetail,
  AdminFulfillmentStatus,
  AdminFulfillmentUpdateResult,
  AdminOrderList,
  AdminOrderListQuery,
  AdminRefundRecordRequest,
  AdminRefundRecordResult,
  AdminReturnRecordRequest,
  AdminReturnRecordResult,
} from "./types";

export type AdminOrderApiFailure = {
  code: string;
  details?: unknown;
  message: string;
  status?: number;
};

type ApiEnvelope<T> =
  | {
      data: T;
      meta?: Record<string, unknown>;
    }
  | {
      error: {
        code: string;
        details?: unknown;
        message: string;
      };
    };

function adminOrderFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);

  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  return fetch(input, {
    ...init,
    credentials: "include",
    headers,
  });
}

function toFailure(input: AdminOrderApiFailure): AdminOrderApiFailure {
  return input;
}

async function readApiEnvelope<T>(response: Response): Promise<T> {
  let payload: unknown;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw toFailure({
      code: "INVALID_RESPONSE",
      message: `Unexpected API response (${response.status})`,
      status: response.status,
    });
  }

  if (typeof payload !== "object" || payload === null) {
    throw toFailure({
      code: "INVALID_RESPONSE",
      message: `Unexpected API payload (${response.status})`,
      status: response.status,
    });
  }

  const envelope = payload as Partial<ApiEnvelope<T>>;

  if ("error" in envelope && envelope.error) {
    throw toFailure({
      code: envelope.error.code,
      details: envelope.error.details,
      message: envelope.error.message,
      status: response.status,
    });
  }

  if (!response.ok) {
    throw toFailure({
      code: "HTTP_ERROR",
      message: `Request failed (${response.status})`,
      status: response.status,
    });
  }

  if (!("data" in envelope)) {
    throw toFailure({
      code: "INVALID_RESPONSE",
      message: `Unexpected API payload (${response.status})`,
      status: response.status,
    });
  }

  return envelope.data as T;
}

function buildOrderListUrl(query: AdminOrderListQuery): string {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 20));

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }
  if (query.paymentStatus) {
    params.set("paymentStatus", query.paymentStatus);
  }
  if (query.fulfillmentStatus) {
    params.set("fulfillmentStatus", query.fulfillmentStatus);
  }
  if (query.createdFrom) {
    params.set("createdFrom", query.createdFrom);
  }
  if (query.createdTo) {
    params.set("createdTo", query.createdTo);
  }

  return `/api/admin/orders?${params.toString()}`;
}

export async function fetchAdminOrders(
  query: AdminOrderListQuery = {}
): Promise<AdminOrderList> {
  const response = await adminOrderFetch(buildOrderListUrl(query));

  return readApiEnvelope<AdminOrderList>(response);
}

export async function fetchAdminOrderDetail(
  orderIdOrNumber: string
): Promise<AdminOrderDetail> {
  const response = await adminOrderFetch(
    `/api/admin/orders/${encodeURIComponent(orderIdOrNumber)}`
  );

  return readApiEnvelope<AdminOrderDetail>(response);
}

export async function updateAdminOrderFulfillment(
  orderIdOrNumber: string,
  targetStatus: AdminFulfillmentStatus
): Promise<AdminFulfillmentUpdateResult> {
  const response = await adminOrderFetch(
    `/api/admin/orders/${encodeURIComponent(orderIdOrNumber)}/fulfillment`,
    {
      body: JSON.stringify({ targetStatus }),
      headers: {
        "content-type": "application/json",
      },
      method: "PATCH",
    }
  );

  return readApiEnvelope<AdminFulfillmentUpdateResult>(response);
}

export async function recordAdminOrderReturn(
  orderIdOrNumber: string,
  body: AdminReturnRecordRequest
): Promise<AdminReturnRecordResult> {
  const response = await adminOrderFetch(
    `/api/admin/orders/${encodeURIComponent(orderIdOrNumber)}/returns`,
    {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    }
  );

  return readApiEnvelope<AdminReturnRecordResult>(response);
}

export async function recordAdminOrderRefund(
  orderIdOrNumber: string,
  body: AdminRefundRecordRequest
): Promise<AdminRefundRecordResult> {
  const response = await adminOrderFetch(
    `/api/admin/orders/${encodeURIComponent(orderIdOrNumber)}/refunds`,
    {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    }
  );

  return readApiEnvelope<AdminRefundRecordResult>(response);
}
