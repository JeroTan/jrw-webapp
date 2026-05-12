import { Elysia } from "elysia";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "@/utils/request-id";

export type RequestActorContext = {
  role?: "SUPER_ADMIN" | "ADMIN" | "CUSTOMER" | "PROSPECT" | "SYSTEM" | "UNKNOWN";
  safeActorId?: string;
};

export type ServerRequestContext = {
  requestId: string;
  actor?: RequestActorContext;
};

export type RequestContextDecorations = {
  requestContext: ServerRequestContext;
  requestId: string;
};

export function buildRequestContext(headers: Headers): ServerRequestContext {
  return {
    requestId: getOrCreateRequestId(headers),
  };
}

export function setRequestIdResponseHeader(
  set: { headers: Record<string, string | number> },
  requestId: string,
): void {
  set.headers[REQUEST_ID_HEADER] = requestId;
}

export const requestContextPlugin = new Elysia({ name: "request-context" }).derive(
  { as: "scoped" },
  ({ request, set }) => {
    const requestContext = buildRequestContext(request.headers);
    setRequestIdResponseHeader(set, requestContext.requestId);

    return {
      requestContext,
      requestId: requestContext.requestId,
    };
  },
);
