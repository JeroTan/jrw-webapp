import type {
  ProductAssignableBrand,
  ProductAssignableCategory,
  ProductVariantRecord,
  ProductBrandAssignmentInput,
  ProductCategoryAssignmentInput,
  CreateVariantInput,
  UpdateVariantInput,
  ArchiveVariantInput,
  ProductListResult,
  ProductListQueryInput,
  ProductMutationInput,
  ProductReadinessResult,
  ProductOrganizationMutationResult,
  ProductOrganizationRecord,
  ProductRecord,
  ProductPhotoRecord,
  ProductImageListResult,
  AvailabilityRecord,
  VariantListResult,
  UploadProductImageInput,
  UpdateProductImageOrderInput,
  UpdateInventoryStateInput,
  UpdateStockInput,
} from "./types";

export type ApiFailure = {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
};

type ApiEnvelope<T> =
  | {
      data: T;
      meta?: Record<string, unknown>;
    }
  | {
      error: {
        code: string;
        message: string;
        details?: unknown;
      };
    };

const DEFAULT_PRODUCT_PAGE_SIZE = 20;
const DEFAULT_ASSIGNABLE_PAGE_SIZE = 100;

type BrandListPayload = {
  items: Array<{
    id: string;
    name: string;
    status: "ACTIVE" | "ARCHIVED";
  }>;
};

type CategoryListPayload = {
  items: Array<{
    id: string;
    name: string;
    slug: string;
    status: "ACTIVE" | "ARCHIVED";
  }>;
};

function toApiFailure(input: {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
}): ApiFailure {
  return {
    code: input.code,
    message: input.message,
    status: input.status,
    details: input.details,
  };
}

async function readApiEnvelope<T>(response: Response): Promise<T> {
  let payload: unknown;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw toApiFailure({
      code: "INVALID_RESPONSE",
      message: `Unexpected API response (${response.status})`,
      status: response.status,
    });
  }

  if (typeof payload !== "object" || payload === null) {
    throw toApiFailure({
      code: "INVALID_RESPONSE",
      message: `Unexpected API payload (${response.status})`,
      status: response.status,
    });
  }

  const envelope = payload as Partial<ApiEnvelope<T>>;

  if ("error" in envelope && envelope.error) {
    const errorPayload = envelope.error as {
      code: string;
      message: string;
      details?: unknown;
    };

    throw toApiFailure({
      code: errorPayload.code,
      message: errorPayload.message,
      status: response.status,
      details: errorPayload.details,
    });
  }

  if (!response.ok) {
    throw toApiFailure({
      code: "HTTP_ERROR",
      message: `Request failed (${response.status})`,
      status: response.status,
    });
  }

  if (!("data" in envelope)) {
    throw toApiFailure({
      code: "INVALID_RESPONSE",
      message: `Unexpected API payload (${response.status})`,
      status: response.status,
    });
  }

  return envelope.data as T;
}

export async function fetchProductList(): Promise<ProductListResult> {
  const response = await fetch(buildProductListUrl(), {
    headers: { accept: "application/json" },
  });

  return readApiEnvelope<ProductListResult>(response);
}

function buildProductListUrl(query: ProductListQueryInput = {}): string {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? DEFAULT_PRODUCT_PAGE_SIZE));
  params.set("includeArchived", String(query.includeArchived ?? true));

  if (query.status) {
    params.set("status", query.status);
  }
  if (query.search && query.search.trim().length > 0) {
    params.set("search", query.search.trim());
  }
  if (query.brandId && query.brandId.trim().length > 0) {
    params.set("brandId", query.brandId.trim());
  }
  if (query.brandless) {
    params.set("brandless", "true");
  }
  if (query.categoryId && query.categoryId.trim().length > 0) {
    params.set("categoryId", query.categoryId.trim());
  }

  return `/api/admin/products?${params.toString()}`;
}

export async function fetchProductListWithQuery(
  query: ProductListQueryInput
): Promise<ProductListResult> {
  const response = await fetch(buildProductListUrl(query), {
    headers: { accept: "application/json" },
  });

  return readApiEnvelope<ProductListResult>(response);
}

export async function fetchProductDetail(productId: string): Promise<ProductRecord> {
  const response = await fetch(`/api/admin/products/${productId}`, {
    headers: { accept: "application/json" },
  });
  const payload = await readApiEnvelope<{ product: ProductRecord }>(response);
  return payload.product;
}

export async function fetchProductOrganization(
  productId: string
): Promise<ProductOrganizationRecord> {
  const response = await fetch(`/api/admin/products/${productId}/organization`, {
    headers: { accept: "application/json" },
  });
  const payload = await readApiEnvelope<{ organization: ProductOrganizationRecord }>(
    response
  );
  return payload.organization;
}

export async function fetchProductReadiness(
  productId: string
): Promise<ProductReadinessResult> {
  const response = await fetch(`/api/admin/products/${productId}/readiness`, {
    headers: { accept: "application/json" },
  });
  const payload = await readApiEnvelope<{ readiness: ProductReadinessResult }>(
    response
  );
  return payload.readiness;
}

export async function publishProduct(productId: string): Promise<ProductRecord> {
  const response = await fetch(`/api/admin/products/${productId}/publish`, {
    method: "POST",
    headers: { accept: "application/json" },
  });
  const payload = await readApiEnvelope<{ product: ProductRecord }>(response);
  return payload.product;
}

export async function unpublishProduct(
  productId: string
): Promise<ProductRecord> {
  const response = await fetch(`/api/admin/products/${productId}/unpublish`, {
    method: "POST",
    headers: { accept: "application/json" },
  });
  const payload = await readApiEnvelope<{ product: ProductRecord }>(response);
  return payload.product;
}

export async function archiveProduct(productId: string): Promise<ProductRecord> {
  const response = await fetch(`/api/admin/products/${productId}/archive`, {
    method: "POST",
    headers: { accept: "application/json" },
  });
  const payload = await readApiEnvelope<{ product: ProductRecord }>(response);
  return payload.product;
}

export async function createProduct(
  input: ProductMutationInput
): Promise<ProductRecord> {
  const response = await fetch("/api/admin/products", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await readApiEnvelope<{ product: ProductRecord }>(response);
  return payload.product;
}

export async function updateProduct(
  productId: string,
  input: Partial<ProductMutationInput>
): Promise<ProductRecord> {
  const response = await fetch(`/api/admin/products/${productId}`, {
    method: "PATCH",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await readApiEnvelope<{ product: ProductRecord }>(response);
  return payload.product;
}

export async function assignProductBrand(
  productId: string,
  input: ProductBrandAssignmentInput
): Promise<ProductOrganizationMutationResult> {
  const response = await fetch(`/api/admin/products/${productId}/brand`, {
    method: "PATCH",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return readApiEnvelope<ProductOrganizationMutationResult>(response);
}

export async function assignProductCategories(
  productId: string,
  input: ProductCategoryAssignmentInput
): Promise<ProductOrganizationMutationResult> {
  const response = await fetch(`/api/admin/products/${productId}/categories`, {
    method: "PATCH",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return readApiEnvelope<ProductOrganizationMutationResult>(response);
}

export async function fetchAssignableBrands(): Promise<ProductAssignableBrand[]> {
  const response = await fetch(
    `/api/brands/me?page=1&pageSize=${DEFAULT_ASSIGNABLE_PAGE_SIZE}`,
    {
      headers: { accept: "application/json" },
    }
  );
  const payload = await readApiEnvelope<BrandListPayload>(response);
  return payload.items.map((brand) => ({
    id: brand.id,
    name: brand.name,
    status: brand.status,
  }));
}

export async function fetchAssignableCategories(): Promise<
  ProductAssignableCategory[]
> {
  const response = await fetch(
    `/api/admin/categories?page=1&pageSize=${DEFAULT_ASSIGNABLE_PAGE_SIZE}&status=ACTIVE`,
    {
      headers: { accept: "application/json" },
    }
  );
  const payload = await readApiEnvelope<CategoryListPayload>(response);
  return payload.items.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    status: category.status,
  }));
}

export async function fetchProductVariants(
  productId: string,
  query: { page?: number; pageSize?: number } = {}
): Promise<VariantListResult> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? DEFAULT_PRODUCT_PAGE_SIZE));

  const response = await fetch(
    `/api/admin/products/${productId}/variants?${params.toString()}`,
    {
      headers: { accept: "application/json" },
    }
  );
  return readApiEnvelope<VariantListResult>(response);
}

export async function fetchProductVariantDetail(
  productId: string,
  variantId: string
): Promise<ProductVariantRecord> {
  const response = await fetch(
    `/api/admin/products/${productId}/variants/${variantId}`,
    {
      headers: { accept: "application/json" },
    }
  );
  const payload = await readApiEnvelope<{ variant: ProductVariantRecord }>(response);
  return payload.variant;
}

export async function createProductVariant(
  productId: string,
  input: CreateVariantInput
): Promise<ProductVariantRecord> {
  const response = await fetch(`/api/admin/products/${productId}/variants`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await readApiEnvelope<{ variant: ProductVariantRecord }>(response);
  return payload.variant;
}

export async function updateProductVariant(
  productId: string,
  variantId: string,
  input: UpdateVariantInput
): Promise<ProductVariantRecord> {
  const response = await fetch(
    `/api/admin/products/${productId}/variants/${variantId}`,
    {
      method: "PATCH",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );
  const payload = await readApiEnvelope<{ variant: ProductVariantRecord }>(response);
  return payload.variant;
}

export async function archiveProductVariant(
  productId: string,
  variantId: string,
  input: ArchiveVariantInput = {}
): Promise<ProductVariantRecord> {
  const response = await fetch(
    `/api/admin/products/${productId}/variants/${variantId}/archive`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );
  const payload = await readApiEnvelope<{ variant: ProductVariantRecord }>(response);
  return payload.variant;
}

export async function updateVariantStockQuantity(
  productId: string,
  variantId: string,
  input: UpdateStockInput
): Promise<ProductVariantRecord> {
  const response = await fetch(
    `/api/admin/products/${productId}/variants/${variantId}/stock`,
    {
      method: "PATCH",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  const payload = await readApiEnvelope<{ variant: ProductVariantRecord }>(response);
  return payload.variant;
}

export async function updateVariantInventoryState(
  productId: string,
  variantId: string,
  input: UpdateInventoryStateInput
): Promise<ProductVariantRecord> {
  const response = await fetch(
    `/api/admin/products/${productId}/variants/${variantId}/inventory-state`,
    {
      method: "PATCH",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  const payload = await readApiEnvelope<{ variant: ProductVariantRecord }>(response);
  return payload.variant;
}

export async function fetchVariantAvailability(
  productId: string,
  variantId: string
): Promise<AvailabilityRecord> {
  const response = await fetch(
    `/api/products/${productId}/variants/${variantId}/availability`,
    {
      headers: { accept: "application/json" },
    }
  );

  const payload = await readApiEnvelope<{ availability: AvailabilityRecord }>(
    response
  );
  return payload.availability;
}

export async function fetchProductImages(
  productId: string
): Promise<ProductImageListResult> {
  const response = await fetch(`/api/admin/products/${productId}/images`, {
    headers: { accept: "application/json" },
  });

  return readApiEnvelope<ProductImageListResult>(response);
}

export async function uploadProductImage(
  productId: string,
  input: UploadProductImageInput
): Promise<ProductPhotoRecord> {
  const formData = new FormData();
  formData.set("image", input.image);
  if (input.name !== undefined) {
    formData.set("name", input.name ?? "");
  }

  const response = await fetch(`/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: {
      accept: "application/json",
    },
    body: formData,
  });

  const payload = await readApiEnvelope<{ image: ProductPhotoRecord }>(response);
  return payload.image;
}

export async function updateProductImageOrder(
  productId: string,
  photoId: string,
  input: UpdateProductImageOrderInput
): Promise<ProductPhotoRecord> {
  const response = await fetch(
    `/api/admin/products/${productId}/images/${photoId}/order`,
    {
      method: "PATCH",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  const payload = await readApiEnvelope<{ image: ProductPhotoRecord }>(response);
  return payload.image;
}

export async function setPrimaryProductImage(
  productId: string,
  photoId: string
): Promise<ProductPhotoRecord> {
  const response = await fetch(
    `/api/admin/products/${productId}/images/${photoId}/primary`,
    {
      method: "PATCH",
      headers: {
        accept: "application/json",
      },
    }
  );

  const payload = await readApiEnvelope<{ image: ProductPhotoRecord }>(response);
  return payload.image;
}

export async function removeProductImage(
  productId: string,
  photoId: string
): Promise<ProductPhotoRecord> {
  const response = await fetch(
    `/api/admin/products/${productId}/images/${photoId}`,
    {
      method: "DELETE",
      headers: {
        accept: "application/json",
      },
    }
  );

  const payload = await readApiEnvelope<{ image: ProductPhotoRecord }>(response);
  return payload.image;
}
