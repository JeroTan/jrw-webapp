export const REQUEST_ID_HEADER = "x-request-id";

export function createRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `req_${crypto.randomUUID()}`;
  }

  return `req_${Date.now().toString(36)}`;
}

export function getOrCreateRequestId(headers: Headers): string {
  const existing = headers.get(REQUEST_ID_HEADER);
  return existing && existing.trim().length > 0 ? existing : createRequestId();
}
