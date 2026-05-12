# Server Routes

Canonical Elysia route modules live here. Route modules own HTTP method/path, TypeBox params/query/body/response contracts, OpenAPI `detail`, auth metadata, rate-limit class, and documented error codes.

Keep route handlers transport-only. Call controllers for orchestration and never add new backend routes under `src/api/**`.
