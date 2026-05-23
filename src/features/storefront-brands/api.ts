import type { StorefrontBrandRow } from "./types";

type ApiEnvelope<T> = {
  data?: T;
};

type StorefrontBrandListData = {
  items: StorefrontBrandRow[];
};

type StorefrontBrandDetailData = {
  brand: StorefrontBrandRow;
};

function apiUrl(baseUrl: URL, path: string): string {
  return new URL(path, baseUrl).toString();
}

export async function fetchStorefrontBrandRows(
  baseUrl: URL
): Promise<StorefrontBrandRow[]> {
  const response = await fetch(apiUrl(baseUrl, "/api/storefront/brands"), {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as ApiEnvelope<StorefrontBrandListData>;

  return payload.data?.items ?? [];
}

export async function fetchStorefrontBrandRow(
  baseUrl: URL,
  slugOrId: string
): Promise<StorefrontBrandRow | null> {
  const response = await fetch(
    apiUrl(baseUrl, `/api/storefront/brands/${encodeURIComponent(slugOrId)}`),
    { headers: { accept: "application/json" } }
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as ApiEnvelope<StorefrontBrandDetailData>;

  return payload.data?.brand ?? null;
}
