# Server OpenAPI

OpenAPI documentation configuration and shared route metadata live here.

Routes still own endpoint-specific schemas, tags, summaries, descriptions, auth metadata, rate-limit class, and error codes.

Use `routeDetail(...)` from `src/server/openapi/route-metadata.ts` for operation summaries, descriptions, tags, `x-auth`, `x-rate-limit-class`, `x-error-codes`, and `deprecated` flags. Do not create duplicate metadata helpers.

Use response schema helpers from `src/lib/typebox/api.ts`, especially `tboxApiSuccess(...)`, `tboxApiResponse(...)`, `tboxPaginatedResponse(...)`, and `openApiErrorResponses(...)`, so generated docs match public API envelopes.

Completed routes must declare params, query, body, and response schemas where applicable. Public API JSON stays camelCase; map database snake_case rows to DTOs before returning responses.
