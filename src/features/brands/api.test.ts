import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBrandDetail, fetchBrandList } from "./api";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("brand API client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests brand list with backend-supported page size", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        data: {
          items: [],
          page: 1,
          pageSize: 100,
          totalItems: 0,
          totalPages: 0,
        },
      }),
    );

    const result = await fetchBrandList();

    expect(fetchMock).toHaveBeenCalledWith("/api/brands/me?page=1&pageSize=100", {
      headers: { accept: "application/json" },
    });
    expect(result.pageSize).toBe(100);
  });

  it("falls back to brand list when detail route is unavailable", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: "NOT_FOUND",
              message: "Missing brand detail route.",
            },
          },
          404,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            items: [
              {
                id: "brand_1",
                name: "JRW Studio",
                slug: "jrw-studio",
                description: null,
                status: "ACTIVE",
                archivedAt: null,
                createdAt: "2026-05-18T06:30:00.000Z",
                updatedAt: "2026-05-18T06:30:00.000Z",
              },
            ],
            page: 1,
            pageSize: 100,
            totalItems: 1,
            totalPages: 1,
          },
        }),
      );

    const result = await fetchBrandDetail("brand_1");

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/brands/brand_1", {
      headers: { accept: "application/json" },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/brands/me?page=1&pageSize=100", {
      headers: { accept: "application/json" },
    });
    expect(result).toMatchObject({
      id: "brand_1",
      name: "JRW Studio",
    });
  });
});
