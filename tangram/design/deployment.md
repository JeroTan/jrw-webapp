# Deployment & Infrastructure Strategy: Free-Tier Optimized

## 1. Hosting Ecosystem
- **Application (Astro + Elysia)**: **Cloudflare Workers**.
    - *Rationale*: Extreme performance at the edge with a generous free tier (100k requests/day).
- **Inventory Engine**: **Cloudflare Durable Objects**.
    - *Rationale*: Low-latency state management integrated directly into the compute layer.
- **Asset Storage**: **Cloudflare R2**.
    - *Rationale*: S3-compatible, zero-egress fee storage for product images.
- **Database**: **Cloudflare D1**.
    - *Rationale*: Native edge SQLite database with zero egress fees and tight integration with Workers.

## 2. CI/CD Pipeline (GitHub Actions)
- **Workflow**:
    1. **Validate**: Run `tsc` for type checking and `vitest` for unit tests.
    2. **Database Migration**: Run **Drizzle Kit** (`npx drizzle-kit migrate`) to keep the D1 schema in sync.
    3. **Build**: Generate the worker-compatible bundle via `npm run build`.
    4. **Deploy**: Push to Cloudflare via `wrangler deploy`.

## 3. Environment Management
- **Local (`development`)**: Local development using `wrangler dev` and the Cloudflare `platformProxy` for Durable Objects and D1.
- **Production (`main`)**: Automated deployment to the live URL upon merging to the `main` branch.

## 4. Monitoring & Logging
- **Tools**: 
    - **Cloudflare Observability**: Real-time request logging and error tracking.
- **Database Observability**: Utilize Cloudflare D1 dashboard and SQL logging.

## 5. Portability Verification
- **Drizzle-Driven Schema**: All tables, indexes, and relations MUST be defined in Drizzle schemas. Migrations are managed via `drizzle-kit` to ensure reproducible environments.
