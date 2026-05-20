import type {
  CategoryListResult,
  CategoryMutationInput,
  CategoryRecord,
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

const DEFAULT_PAGE_SIZE = 100;

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

export function isConflictFailure(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as ApiFailure).code === "CONFLICT_STATE"
  );
}

export async function fetchCategoryList(): Promise<CategoryListResult> {
  const response = await fetch(
    `/api/admin/categories?page=1&pageSize=${DEFAULT_PAGE_SIZE}`,
    {
      headers: { accept: "application/json" },
    }
  );

  return readApiEnvelope<CategoryListResult>(response);
}

export async function fetchCategoryDetail(
  categoryId: string
): Promise<CategoryRecord> {
  const response = await fetch(`/api/admin/categories/${categoryId}`, {
    headers: { accept: "application/json" },
  });
  const payload = await readApiEnvelope<{ category: CategoryRecord }>(response);
  return payload.category;
}

export async function createCategory(
  input: CategoryMutationInput
): Promise<CategoryRecord> {
  const response = await fetch("/api/admin/categories", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await readApiEnvelope<{ category: CategoryRecord }>(response);
  return payload.category;
}

export async function updateCategory(
  categoryId: string,
  input: Partial<CategoryMutationInput>
): Promise<CategoryRecord> {
  const response = await fetch(`/api/admin/categories/${categoryId}`, {
    method: "PATCH",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await readApiEnvelope<{ category: CategoryRecord }>(response);
  return payload.category;
}

export async function archiveCategory(categoryId: string): Promise<CategoryRecord> {
  const response = await fetch(`/api/admin/categories/${categoryId}`, {
    method: "DELETE",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
  });
  const payload = await readApiEnvelope<{ category: CategoryRecord }>(response);
  return payload.category;
}

