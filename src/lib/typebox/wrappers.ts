import { t, type TSchema } from "elysia";

// API Wrappers
export function tboxApiResponse<T extends TSchema>(dataSchema: T) {
  return t.Object({
    data: dataSchema,
    message: t.String(),
  });
}

export function tboxPaginatedResponse<T extends TSchema>(dataSchema: T) {
  return t.Object({
    data: t.Array(dataSchema),
    meta: t.Object({
      page: t.Number(),
      total: t.Number(),
      limit: t.Number(),
    }),
    message: t.String(),
  });
}

// Utility to convert string arrays to TypeBox Unions
export function tboxEnum(values: readonly string[]) {
  return t.Union(values.map((v) => t.Literal(v)));
}

// --- Query Utilities ---

export const tboxPaginationQuery = t.Object({
  page: t.Optional(
    t.Numeric({
      default: 1,
      minimum: 1,
      description: "The page number to retrieve.",
    })
  ),
  limit: t.Optional(
    t.Numeric({
      default: 10,
      minimum: 1,
      maximum: 100,
      description: "Number of items per page. Maximum 100.",
    })
  ),
});

export const tboxSearchQuery = t.Object({
  q: t.Optional(t.String({ description: "Full-text search query." })),
});
