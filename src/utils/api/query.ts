import type { PageProps, QueryProps, PageAndQueryProps } from "@/utils/api/types";

/**
 * Safely parses the raw Elysia query object into the structured `PageAndQueryProps` format.
 * This modern parser handles standard flat query properties without relying on bracket syntax.
 * 
 * - `q`: Full-text search string.
 * - `page` / `limit`: Pagination (defaults to 1 and 10).
 * - `sort`: Comma-separated sort fields (e.g., `-price,created_at`).
 * - Everything else is treated as a filter and split by commas (e.g., `category_id=cat1,cat2`).
 */
export function parseApiQuery(query: Record<string, any>): PageAndQueryProps {
  const parsed: PageAndQueryProps = {
    q: query.q || null,
    filter: [],
    sort: [],
    page: query.page ? Number(query.page) : 1,
    limit: query.limit ? Number(query.limit) : 10,
  };

  // Extract known keys to separate them from dynamic filters
  const knownKeys = ["q", "page", "limit", "sort"];

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;

    // Handle Sort parsing
    if (key === "sort" && typeof value === "string") {
      const sortFields = value.split(",").map((s) => s.trim()).filter(Boolean);
      for (const field of sortFields) {
        const direction = field.startsWith("-") ? "desc" : "asc";
        const fieldName = field.replace(/^-/, "");
        parsed.sort.push({ field: fieldName, direction });
      }
      continue;
    }

    // Handle dynamic Filters (everything else)
    if (!knownKeys.includes(key)) {
      // Coerce to string to safely split (Elysia usually guarantees string or undefined here)
      const stringValue = String(value);
      const values = stringValue.split(",").map((s) => s.trim()).filter(Boolean);
      
      if (values.length > 0) {
        parsed.filter.push({ field: key, values });
      }
    }
  }

  return parsed;
}

/**
 * Helper to convert structured props back into a flat URL query object.
 * Useful for frontend clients or internal redirects.
 */
export function fromPropsToQueryParams(
  props: QueryProps & PageProps
): Record<string, string> {
  const queryParams: Record<string, string> = {};

  if (props.q) {
    queryParams["q"] = props.q;
  }

  for (const filter of props.filter) {
    queryParams[filter.field] = filter.values.join(",");
  }

  if (props.sort.length > 0) {
    const sortParams = props.sort.map((s) =>
      s.direction === "desc" ? `-${s.field}` : s.field
    );
    queryParams["sort"] = sortParams.join(",");
  }

  if (props.page) {
    queryParams["page"] = props.page.toString();
  }

  if (props.limit) {
    queryParams["limit"] = props.limit.toString();
  }

  return queryParams;
}

