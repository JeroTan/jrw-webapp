import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchProductListWithQuery } from "./api";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("admin product API client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads product list with admin credentials", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        data: {
          items: [],
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 1,
        },
      })
    );

    const result = await fetchProductListWithQuery({ search: " lamp " });
    const [url, init] = fetchMock.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit,
    ];

    expect(url).toBe(
      "/api/admin/products?page=1&pageSize=20&includeArchived=true&search=lamp"
    );
    expect(init.credentials).toBe("include");
    expect(new Headers(init.headers).get("accept")).toBe("application/json");
    expect(result.totalItems).toBe(0);
  });
});
