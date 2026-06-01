import { afterEach, describe, expect, it, vi } from "vitest";

import { adminProductFetch } from "./adminProductFetch";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("admin product fetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends admin cookies and accepts JSON by default", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ data: {} }));

    await adminProductFetch("/api/admin/products");

    const [, init] = fetchMock.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit,
    ];

    expect(init.credentials).toBe("include");
    expect(new Headers(init.headers).get("accept")).toBe("application/json");
  });

  it("preserves explicit request headers", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ data: {} }));

    await adminProductFetch("/api/admin/products", {
      headers: {
        accept: "application/vnd.jrw+json",
        "content-type": "application/json",
      },
      method: "POST",
    });

    const [, init] = fetchMock.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit,
    ];
    const headers = new Headers(init.headers);

    expect(init.credentials).toBe("include");
    expect(headers.get("accept")).toBe("application/vnd.jrw+json");
    expect(headers.get("content-type")).toBe("application/json");
  });
});
