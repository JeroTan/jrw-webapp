import { describe, expect, it } from "vitest";
import { createApp } from "@/server/app";
import { ImageController } from "@/server/controllers/ImageController";
import { GeneralError } from "@/utils/general/error";
import { Result } from "@/utils/general/result";
import type { ProductPhotoRecord } from "@/domain/products/types";
import type { RequestActorContext } from "@/server/context/request-context";
import type { ImageService } from "@/server/services/ImageService";

const now = "2026-05-21T10:00:00.000Z";

function createController(service: Partial<ImageService>) {
  return new ImageController(service as ImageService);
}

const adminContext = {
  authenticated: true,
  role: "ADMIN",
  actorId: "admin_1",
  safeActorId: "admin_1",
  accountStatus: {
    status: "ACTIVE" as const,
    emailVerified: true,
    approved: true,
  },
  eligibility: {
    active: true,
    emailVerified: true,
    approved: true,
  },
} satisfies RequestActorContext;

const customerContext = {
  authenticated: true,
  role: "CUSTOMER",
  actorId: "customer_1",
  safeActorId: "customer_1",
  accountStatus: {
    status: "ACTIVE" as const,
    emailVerified: true,
    approved: true,
  },
  eligibility: {
    active: true,
    emailVerified: true,
    approved: true,
  },
} satisfies RequestActorContext;

function imageRecord(
  overrides: Partial<ProductPhotoRecord> = {}
): ProductPhotoRecord {
  return {
    id: "photo_1",
    productId: "prod_1",
    imageId: "https://pub.r2.dev/products/prod_1/photo_1.png",
    name: "Front",
    sortOrder: 0,
    isPrimary: true,
    r2Key: "products/prod_1/photo_1.png",
    fileSize: 1234,
    contentType: "image/png",
    width: 1000,
    height: 1000,
    createdAt: now,
    updatedAt: now,
    uploadedAt: now,
    url: "https://pub.r2.dev/products/prod_1/photo_1.png",
    ...overrides,
  };
}

function uploadForm(file: File, name = "Front") {
  const form = new FormData();
  form.set("image", file);
  form.set("name", name);
  return form;
}

describe("images routes", () => {
  it("documents image endpoints with auth metadata and constraints", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("https://jrw.test/api/openapi/json")
    );
    const body = (await response.json()) as {
      paths?: Record<
        string,
        Record<
          string,
          {
            summary?: string;
            tags?: string[];
            "x-auth"?: { mode?: string; roles?: string[] };
            "x-rate-limit-class"?: string;
            "x-error-codes"?: string[];
            responses?: Record<string, unknown>;
          }
        >
      >;
    };

    const list = body.paths?.["/api/admin/products/{productId}/images"]?.get;
    const upload = body.paths?.["/api/admin/products/{productId}/images"]?.post;
    const reorder =
      body.paths?.["/api/admin/products/{productId}/images/{photoId}/order"]
        ?.patch;
    const primary =
      body.paths?.["/api/admin/products/{productId}/images/{photoId}/primary"]
        ?.patch;
    const remove =
      body.paths?.["/api/admin/products/{productId}/images/{photoId}"]?.delete;

    expect(list?.summary).toBe("List product images");
    expect(list?.tags).toContain("Products");
    expect(list?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["ADMIN"],
    });
    expect(list?.["x-rate-limit-class"]).toBe("admin-read");
    expect(list?.responses).toHaveProperty("200");

    expect(upload?.summary).toBe("Upload product image");
    expect(upload?.["x-rate-limit-class"]).toBe("admin-write");
    expect(upload?.["x-error-codes"]).toEqual(
      expect.arrayContaining([
        "VALIDATION_FAILED",
        "PAYLOAD_TOO_LARGE",
        "UNSUPPORTED_MEDIA_TYPE",
      ])
    );
    expect(upload?.responses).toHaveProperty("201");

    expect(reorder?.summary).toBe("Update product image order");
    expect(primary?.summary).toBe("Set primary product image");
    expect(remove?.summary).toBe("Remove product image from catalog");
  });

  it("lists images with standard envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        images: {
          controllerFactory: () =>
            createController({
              listProductImages: async () =>
                Result.okay({
                  items: [imageRecord()],
                  performanceTargets: {
                    listMaxBytes: 250 * 1024,
                    detailMaxBytes: 1024 * 1024,
                  },
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/images", {
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_images_list",
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        items: [{ id: "photo_1", isPrimary: true }],
      },
      meta: {
        requestId: "req_images_list",
      },
    });
  });

  it("uploads, reorders, sets primary, and removes image", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        images: {
          controllerFactory: () =>
            createController({
              uploadImage: async () =>
                Result.okay({
                  image: imageRecord(),
                }),
              updateImageOrder: async () =>
                Result.okay({
                  image: imageRecord({
                    sortOrder: 1,
                    isPrimary: false,
                  }),
                }),
              setPrimaryImage: async () =>
                Result.okay({
                  image: imageRecord({
                    id: "photo_2",
                    imageId: "https://pub.r2.dev/products/prod_1/photo_2.png",
                    sortOrder: 1,
                    isPrimary: true,
                  }),
                }),
              removeImage: async () =>
                Result.okay({
                  image: imageRecord({
                    productId: null,
                    isPrimary: false,
                  }),
                }),
            }),
        },
      },
    });

    const created = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/images", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_images_upload",
        },
        body: uploadForm(
          new File([new Uint8Array([1, 2, 3, 4])], "lamp.png", {
            type: "image/png",
          })
        ),
      })
    );

    expect(created.status).toBe(201);
    await expect(created.json()).resolves.toMatchObject({
      data: { image: { id: "photo_1" } },
      meta: { requestId: "req_images_upload" },
    });

    const reordered = await app.handle(
      new Request(
        "https://jrw.test/api/admin/products/prod_1/images/photo_1/order",
        {
          method: "PATCH",
          headers: {
            cookie: "jrw_admin_session=admin-token",
            "content-type": "application/json",
            "x-request-id": "req_images_reorder",
          },
          body: JSON.stringify({ sortOrder: 1 }),
        }
      )
    );

    expect(reordered.status).toBe(200);
    await expect(reordered.json()).resolves.toMatchObject({
      data: { image: { sortOrder: 1 } },
      meta: { requestId: "req_images_reorder" },
    });

    const primary = await app.handle(
      new Request(
        "https://jrw.test/api/admin/products/prod_1/images/photo_2/primary",
        {
          method: "PATCH",
          headers: {
            cookie: "jrw_admin_session=admin-token",
            "x-request-id": "req_images_primary",
          },
        }
      )
    );

    expect(primary.status).toBe(200);
    await expect(primary.json()).resolves.toMatchObject({
      data: { image: { id: "photo_2", isPrimary: true } },
      meta: { requestId: "req_images_primary" },
    });

    const removed = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/images/photo_1", {
        method: "DELETE",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_images_remove",
        },
      })
    );

    expect(removed.status).toBe(200);
    await expect(removed.json()).resolves.toMatchObject({
      data: {
        image: {
          productId: null,
        },
      },
      meta: { requestId: "req_images_remove" },
    });
  });

  it("returns storage failure envelope", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
      routes: {
        images: {
          controllerFactory: () =>
            createController({
              uploadImage: async () =>
                Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE")),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/images", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_images_storage_failure",
        },
        body: uploadForm(
          new File([new Uint8Array([1, 2, 3, 4])], "lamp.png", {
            type: "image/png",
          })
        ),
      })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "PROVIDER_UNAVAILABLE",
        details: {
          requestId: "req_images_storage_failure",
        },
      },
    });
  });

  it("rejects non-admin actor before controller execution", async () => {
    let controllerCalls = 0;
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => customerContext,
      },
      routes: {
        images: {
          controllerFactory: () => {
            controllerCalls += 1;
            return createController({
              listProductImages: async () =>
                Result.okay({
                  items: [imageRecord()],
                  performanceTargets: {
                    listMaxBytes: 250 * 1024,
                    detailMaxBytes: 1024 * 1024,
                  },
                }),
            });
          },
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/images", {
        headers: {
          cookie: "jrw_customer_session=customer-token",
          "x-request-id": "req_images_non_admin",
        },
      })
    );

    expect(response.status).toBe(403);
    expect(controllerCalls).toBe(0);
  });

  it("rejects invalid image upload payload", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => adminContext,
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/admin/products/prod_1/images", {
        method: "POST",
        headers: {
          cookie: "jrw_admin_session=admin-token",
          "x-request-id": "req_images_invalid_payload",
        },
        body: uploadForm(
          new File(["not image"], "note.txt", {
            type: "text/plain",
          })
        ),
      })
    );

    expect([400, 415]).toContain(response.status);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        details: {
          requestId: "req_images_invalid_payload",
        },
      },
    });
  });
});
