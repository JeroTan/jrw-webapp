import type {
  AuthenticatedActor,
  BrandInviteRecord,
  BrandJoinRequestRecord,
  BrandListResult,
  BrandMembershipListResult,
  BrandMembershipRecord,
  BrandMutationInput,
  BrandProductListResult,
  BrandRecord,
  UploadBrandImageInput,
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

type SessionInspectionPayload = {
  authenticated: boolean;
  actor: AuthenticatedActor | null;
  session: {
    expiresAt: string;
  } | null;
};

const BRAND_LIST_PAGE_SIZE = 100;

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

function normalizeMembershipRows(
  rows: BrandMembershipRecord[]
): BrandMembershipRecord[] {
  return rows.map((row) => ({
    ...row,
    adminEmail: row.adminEmail ?? row.adminId,
    invitedByLabel: row.invitedByLabel ?? row.invitedByAdminId ?? "JRW",
  }));
}

export function isNotFoundFailure(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as ApiFailure).status === 404
  );
}

export async function fetchBrandList(): Promise<BrandListResult> {
  const response = await fetch(
    `/api/brands/me?page=1&pageSize=${BRAND_LIST_PAGE_SIZE}`,
    {
      headers: { accept: "application/json" },
    }
  );

  return readApiEnvelope<BrandListResult>(response);
}

export async function fetchBrandDetail(brandId: string): Promise<BrandRecord> {
  const response = await fetch(`/api/brands/${brandId}`, {
    headers: { accept: "application/json" },
  });
  const payload = await readApiEnvelope<{ brand: BrandRecord }>(response);
  return payload.brand;
}

export async function createBrand(
  input: BrandMutationInput
): Promise<BrandRecord> {
  const response = await fetch("/api/brands", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await readApiEnvelope<{ brand: BrandRecord }>(response);
  return payload.brand;
}

export async function uploadBrandImage(
  brandId: string,
  input: UploadBrandImageInput
): Promise<BrandRecord> {
  const formData = new FormData();
  formData.set("image", input.image);
  if (input.name !== undefined) {
    formData.set("name", input.name ?? "");
  }

  const response = await fetch(`/api/brands/${brandId}/image`, {
    method: "POST",
    headers: {
      accept: "application/json",
    },
    body: formData,
  });

  const payload = await readApiEnvelope<{ brand: BrandRecord }>(response);
  return payload.brand;
}

export async function fetchBrandMembers(
  brandId: string
): Promise<BrandMembershipRecord[]> {
  const response = await fetch(`/api/brands/${brandId}/members`, {
    headers: { accept: "application/json" },
  });
  const data = await readApiEnvelope<BrandMembershipListResult>(response);
  return normalizeMembershipRows(data.items);
}

export async function fetchBrandInvites(
  brandId: string
): Promise<BrandInviteRecord[]> {
  const response = await fetch(`/api/brands/${brandId}/invites`, {
    headers: { accept: "application/json" },
  });
  const data = await readApiEnvelope<BrandMembershipListResult>(response);
  return normalizeMembershipRows(data.items);
}

export async function fetchBrandJoinRequests(
  brandId: string
): Promise<BrandJoinRequestRecord[]> {
  const response = await fetch(`/api/brands/${brandId}/join-requests`, {
    headers: { accept: "application/json" },
  });
  const data = await readApiEnvelope<BrandMembershipListResult>(response);
  return normalizeMembershipRows(data.items);
}

export async function fetchBrandProducts(
  brandId: string
): Promise<BrandProductListResult> {
  const response = await fetch(
    `/api/brands/${brandId}/products?page=1&pageSize=100`,
    {
      headers: { accept: "application/json" },
    }
  );
  return readApiEnvelope<BrandProductListResult>(response);
}

export async function fetchSessionActor(): Promise<AuthenticatedActor | null> {
  const response = await fetch("/api/admin/auth/session", {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await readApiEnvelope<SessionInspectionPayload>(response);
  return payload.authenticated ? payload.actor : null;
}

export async function approveJoinRequest(
  brandId: string,
  adminId: string
): Promise<void> {
  const response = await fetch(
    `/api/brands/${brandId}/join/${adminId}/approve`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
    }
  );

  await readApiEnvelope<{ membership: BrandMembershipRecord }>(response);
}

export async function rejectJoinRequest(
  brandId: string,
  adminId: string
): Promise<void> {
  const response = await fetch(
    `/api/brands/${brandId}/join/${adminId}/reject`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
    }
  );

  await readApiEnvelope<{ membership: BrandMembershipRecord }>(response);
}

export async function archiveBrand(brandId: string): Promise<BrandRecord> {
  const response = await fetch(`/api/brands/${brandId}/archive`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
  });

  const payload = await readApiEnvelope<{ brand: BrandRecord }>(response);
  return payload.brand;
}

export async function inviteBrandMember(input: {
  brandId: string;
  email?: string;
  adminId?: string;
}): Promise<BrandMembershipRecord> {
  const response = await fetch(`/api/brands/${input.brandId}/invite`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      ...(input.email ? { email: input.email } : {}),
      ...(input.adminId ? { adminId: input.adminId } : {}),
    }),
  });

  const payload = await readApiEnvelope<{ invitation: BrandMembershipRecord }>(
    response
  );
  return payload.invitation;
}
