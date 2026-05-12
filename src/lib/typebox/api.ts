import { t } from "elysia";
import type { TSchema } from "@sinclair/typebox";
export const tboxErrorCode = t.String();
export const tboxSuccessCode = t.String();

export const tboxPaginationQuery = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
});

export const tboxSearchQuery = t.Object({
  search: t.Optional(t.String({ minLength: 1 })),
});

export const tboxApiMeta = t.Object(
  {
    code: t.Optional(tboxSuccessCode),
    requestId: t.Optional(t.String()),
  },
  { additionalProperties: true }
);

export const tboxApiErrorDetails = t.Object(
  {
    requestId: t.Optional(t.String()),
  },
  { additionalProperties: true }
);

export function tboxApiSuccess<TDataSchema extends TSchema>(
  dataSchema: TDataSchema
) {
  return t.Object({
    data: dataSchema,
    meta: tboxApiMeta,
  });
}

export function tboxApiError<
  TDetailsSchema extends TSchema = typeof tboxApiErrorDetails,
>(detailsSchema: TDetailsSchema = tboxApiErrorDetails as unknown as TDetailsSchema) {
  return t.Object({
    error: t.Object({
      code: tboxErrorCode,
      message: t.String(),
      details: t.Optional(detailsSchema),
    }),
  });
}

export function tboxApiResponse<
  TDataSchema extends TSchema,
  TDetailsSchema extends TSchema = ReturnType<typeof t.Unknown>,
>(dataSchema: TDataSchema, detailsSchema?: TDetailsSchema) {
  return t.Union([tboxApiSuccess(dataSchema), tboxApiError(detailsSchema)]);
}

export function tboxPaginatedResponse<TItemSchema extends TSchema>(
  itemSchema: TItemSchema
) {
  return t.Union([
    t.Object({
      data: t.Array(itemSchema),
      meta: t.Intersect([
        tboxApiMeta,
        t.Object({
          page: t.Number(),
          limit: t.Number(),
          total: t.Number(),
        }),
      ]),
    }),
    tboxApiError(),
  ]);
}

export function tboxLegacyApiResponse<TDataSchema extends TSchema>(
  dataSchema: TDataSchema
) {
  return t.Object({
    data: dataSchema,
    message: t.Optional(t.Unknown()),
    code: t.Optional(t.String()),
    meta: t.Optional(tboxApiMeta),
  });
}

export function tboxLegacyPaginatedResponse<TItemSchema extends TSchema>(
  itemSchema: TItemSchema
) {
  return t.Object({
    data: t.Array(itemSchema),
    meta: t.Object(
      {
        page: t.Number(),
        limit: t.Number(),
        total: t.Number(),
      },
      { additionalProperties: true }
    ),
    message: t.Optional(t.Unknown()),
    code: t.Optional(t.String()),
  });
}

export type OpenApiErrorStatus =
  | 400
  | 401
  | 402
  | 403
  | 404
  | 409
  | 413
  | 415
  | 429
  | 500
  | 503;

export function openApiErrorResponses(
  statuses: readonly OpenApiErrorStatus[]
) {
  return Object.fromEntries(
    statuses.map((status) => [status, tboxApiError()])
  ) as Record<number, ReturnType<typeof tboxApiError>>;
}
