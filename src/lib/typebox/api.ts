import { t } from "elysia";
import type { TSchema } from "@sinclair/typebox";
export const tboxErrorCode = t.String();
export const tboxSuccessCode = t.String();

export const tboxApiMeta = t.Object(
  {
    code: t.Optional(tboxSuccessCode),
    requestId: t.Optional(t.String()),
  },
  { additionalProperties: true },
);

export function tboxApiSuccess<TDataSchema extends TSchema>(dataSchema: TDataSchema) {
  return t.Object({
    data: dataSchema,
    meta: tboxApiMeta,
  });
}

export function tboxApiError<TDetailsSchema extends TSchema = ReturnType<typeof t.Unknown>>(
  detailsSchema: TDetailsSchema = t.Unknown() as TDetailsSchema,
) {
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

export type OpenApiErrorStatus = 400 | 401 | 403 | 404 | 409 | 413 | 415 | 429 | 500;

export function openApiErrorResponses(statuses: readonly OpenApiErrorStatus[]) {
  return Object.fromEntries(statuses.map((status) => [status, tboxApiError()])) as Record<
    OpenApiErrorStatus,
    ReturnType<typeof tboxApiError>
  >;
}
