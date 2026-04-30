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
