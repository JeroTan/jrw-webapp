# Deployment & Infrastructure Strategy: Free-Tier Optimized

## 1. Hosting Ecosystem
- **Application (Astro + Elysia)**: **Cloudflare Workers**.
    - *Rationale*: Extreme performance at the edge with a generous free tier (100k requests/day).
- **Inventory Engine**: **Cloudflare Durable Objects**.
    - *Rationale*: Low-latency state management integrated directly into the compute layer.
- **Database**: **Supabase (PostgreSQL)**.
    - *Constraint*: Used strictly as a standard PostgreSQL provider. No reliance on Supabase-specific edge functions or proprietary extensions to maintain 100% portability.

## 2. CI/CD Pipeline (GitHub Actions)
- **Workflow**:
    1. **Validate**: Run `tsc` for type checking and `vitest` for unit tests.
    2. **Build**: Generate the worker-compatible bundle via `npm run build`.
    3. **Deploy**: Push to Cloudflare via `wrangler deploy`.
- **Migrations**: Database schema updates will be applied via standard SQL migration scripts. This ensures that if we migrate from Supabase to another provider (e.g., Neon or Railway), the deployment pipeline remains unchanged.

## 3. Environment Management
- **Local (`development`)**: Local development using `wrangler dev` and the Cloudflare `platformProxy` for Durable Objects.
- **Production (`main`)**: Automated deployment to the live URL upon merging to the `main` branch.

## 4. Monitoring & Logging
- **Tools**: 
    - **Cloudflare Observability**: Real-time request logging and error tracking.
    - **Sentry (Optional)**: For deep frontend error monitoring if needed in Phase 2.

## 5. Portability Verification
- **SQL-Only Migrations**: We will not use Supabase's "Auto-API" or "Dashboard-only" table creation. All tables, RLS policies, and indexes MUST be defined in `.sql` files within the repository.
