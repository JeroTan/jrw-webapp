# JRW Simple E-commerce Site

Astro + Elysia + Cloudflare Workers ecommerce foundation for JRW.

## Current Status

The project is in construction at Feature `00007_admin_login`.

Implemented:

- Cloudflare D1 schema with Drizzle migrations.
- Dual validation layer using Zod and TypeBox.
- Elysia API route contracts for identity, catalog, transactions, audit, and sample endpoints.
- Cloudflare R2 helper utilities and image-reference schema direction.
- Functional admin login using D1, WebCrypto password verification, and `jose` JWT generation.

Intentional current gaps:

- Most non-admin-login API handlers still return mock data.
- Authorization middleware and protected route guards are not implemented yet.
- Durable Object inventory locking is scaffolded only.
- Storefront and admin UI are future tasks; the Astro starter home page is still present.

## Commands

| Command                     | Action                                                         |
| :-------------------------- | :------------------------------------------------------------- |
| `npm run dev`               | Start Astro dev server.                                        |
| `npm run check`             | Run Astro/TypeScript checks.                                   |
| `npm run build`             | Run checks and build for Cloudflare.                           |
| `npm run test`              | Run Vitest tests once test files exist.                        |
| `npm run db:generate`       | Generate Drizzle migrations.                                   |
| `npm run db:migrate:remote` | Apply D1 migrations to the Cloudflare development environment. |
| `npm run wrangler-types`    | Regenerate Cloudflare worker types after binding changes.      |

## Project Memory

Tangram project memory lives in `tangram/`. Treat the actual code as source of truth, then align `tangram/design/**`, `tangram/studies/**`, and `tangram/archive/**` when implementation changes.
