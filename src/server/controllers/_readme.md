# Server Controllers

Controllers translate Elysia transport data into service calls and map service/domain results to public API envelopes.

Keep business rules out of controllers. Use `src/lib/api/response.ts` for success/error envelopes.
