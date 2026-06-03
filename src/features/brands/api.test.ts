import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createBrand,
  fetchBrandDetail,
  fetchBrandList,
  uploadBrandImage,
} from "./api";

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    json: async () => payload,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
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
      })
    );

    const result = await fetchBrandList();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/brands/me?page=1&pageSize=100",
      {
        headers: { accept: "application/json" },
      }
    );
    expect(result.pageSize).toBe(100);
  });

  it("loads brand detail from brand detail route", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        data: {
          brand: {
            id: "brand_1",
            name: "JRW Studio",
            slug: "jrw-studio",
            description: null,
            status: "ACTIVE",
            archivedAt: null,
            createdAt: "2026-05-18T06:30:00.000Z",
            updatedAt: "2026-05-18T06:30:00.000Z",
          },
        },
      })
    );

    const result = await fetchBrandDetail("brand_1");

    expect(fetchMock).toHaveBeenCalledWith("/api/brands/brand_1", {
      headers: { accept: "application/json" },
    });
    expect(result).toMatchObject({
      id: "brand_1",
      name: "JRW Studio",
    });
  });

  it("creates brand through brand mutation route", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        {
          data: {
            brand: {
              id: "brand_1",
              name: "JRW Studio",
              slug: "jrw-studio",
              description: null,
              status: "ACTIVE",
              archivedAt: null,
              createdAt: "2026-05-18T06:30:00.000Z",
              updatedAt: "2026-05-18T06:30:00.000Z",
            },
          },
        },
        201
      )
    );

    const result = await createBrand({
      name: "JRW Studio",
      slug: "jrw-studio",
      description: null,
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/brands", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "JRW Studio",
        slug: "jrw-studio",
        description: null,
      }),
    });
    expect(result).toMatchObject({
      id: "brand_1",
      slug: "jrw-studio",
    });
  });

  it("uploads brand image through multipart brand image route", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        data: {
          brand: {
            id: "brand_1",
            name: "JRW Studio",
            slug: "jrw-studio",
            description: null,
            imageSrc: "/assets/brands/brand_1/image.jpg",
            imageAlt: "JRW Studio mark",
            status: "ACTIVE",
            archivedAt: null,
            createdAt: "2026-05-18T06:30:00.000Z",
            updatedAt: "2026-05-18T06:30:00.000Z",
          },
        },
      })
    );
    const image = new File(["brand"], "brand.jpg", { type: "image/jpeg" });

    const result = await uploadBrandImage("brand_1", {
      image,
      name: "JRW Studio mark",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/brands/brand_1/image");
    expect(init).toMatchObject({
      method: "POST",
      headers: { accept: "application/json" },
    });
    expect(init?.body).toBeInstanceOf(FormData);
    expect(result).toMatchObject({
      imageSrc: "/assets/brands/brand_1/image.jpg",
      imageAlt: "JRW Studio mark",
    });
  });
});
