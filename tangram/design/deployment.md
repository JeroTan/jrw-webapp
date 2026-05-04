# Deployment & Infrastructure Strategy: Free-Tier Optimized

## 1. Hosting Ecosystem

- **Application (Astro + Elysia)**: **Cloudflare Workers**.
  - _Rationale_: Extreme performance at the edge with a generous free tier (100k requests/day).
- **Inventory Engine**: **Cloudflare Durable Objects**.
  - _Rationale_: Low-latency state management integrated directly into the compute layer.
- **Asset Storage**: **Cloudflare R2**.
  - _Rationale_: S3-compatible, zero-egress fee storage for product images.
- **Database**: **Cloudflare D1**.
  - _Rationale_: Native edge SQLite database with zero egress fees and tight integration with Workers.

## 2. CI/CD Pipeline

- **Current State**: No GitHub Actions workflow is present yet.
- **Manual Workflow**:
  1. **Validate**: Run `npm run check`.
  2. **Database Generation**: Run `npm run db:generate` when Drizzle schemas change.
  3. **Remote Development Migration**: Run `npm run db:migrate:remote` to apply D1 migrations to the Cloudflare development environment.
  4. **Build**: Run `npm run build`.
  5. **Deploy**: Run `npm run deploy-development` or `npm run deploy-production`.
- **Planned Workflow**: Add GitHub Actions once the core API behavior and test suite are stable.

## 3. Environment Management

- **Local (`development`)**: Astro development uses Cloudflare platform proxy. D1 development is remote-first per the constitution; local D1 should only be used for isolated tests when explicitly requested.
- **Production (`main`)**: Automated deployment to the live URL upon merging to the `main` branch.

## 4. Monitoring & Logging

- **Tools**:
  - **Cloudflare Observability**: Real-time request logging and error tracking.
- **Database Observability**: Utilize Cloudflare D1 dashboard and SQL logging.

## 5. Portability Verification

- **Drizzle-Driven Schema**: All tables, indexes, and relations MUST be defined in Drizzle schemas. Migrations are managed via `drizzle-kit` to ensure reproducible environments.
