# Tech-Stack Blueprint: JRW Simple E-commerce

## 1. Core Languages & Frameworks

- **Framework**: AstroJS v6.x (Output: `server`).
- **Language**: TypeScript 5.x (Strict Mode).
- **Runtime**: Cloudflare Workers (`workerd`).

## 2. Infrastructure & Services

- **Inventory Concurrency**: Cloudflare Durable Objects (SQLite Backend).
- **Storage (Assets/Images)**: Cloudflare R2 (Binary storage for product images).
- **Database**: Cloudflare D1 (Native Edge SQLite).
- **ORM**: Drizzle ORM (Type-safe, edge-optimized data access).
- **Payment Gateway**: PayMongo REST API (Integrated via HTTP; Filipino-market optimized).
- **Transactional Emails**: Resend API.

## 3. Libraries & Dependencies

- **UI Library**: React v19.x (Islands of interactivity).
- **API Engine**: ElysiaJS (Integrated natively into Astro routes).
- **API Plugins**: `@elysiajs/openapi` (Swagger documentation), `@elysiajs/cors` (CORS management).
- **Validation (Dual-Layer)**:
  - **Zod v4.x**: Client-side form validation and complex response type inference. In v4.x+ You can now utilize top-level convenience methods (e.g., `z.url()`, `z.email()`) to avoid redundant `.string()` chaining.
  - **TypeBox**: Elysia-native API boundary validation and response enforcement.

- **Authentication**: `jose` (Edge-compatible JWT handling).
- **Hooks & State**: `ahooks` (React lifecycle helpers).
- **Identifiers**: `@paralleldrive/cuid2` (Collision-resistant unique IDs).
- **Utilities**: `lodash` (Data manipulation), `p-queue` (Concurrency control), `tsx` (TypeScript script execution).
- **Testing**: `vitest` (Unit and Integration testing).
- **SEO**: `@astrojs/sitemap` (Astro sitemap generation).
- **Styling**: TailwindCSS v4.x (Customized for Technical Brutalism: 0px radius, 1px borders).
- **WYSIWYG Editor**: Toast UI Editor (Markdown-based product curation).
- **Development Tools**: `@elysiajs/node` (Installed strictly for local dev/scripting; not for Edge runtime).

## 4. Rationale

- **Performance**: Astro v6 and Cloudflare Workers ensure sub-200ms TTFB (Time to First Byte). D1 provides zero-cold-start database access.
- **Integrity**: Durable Objects provide the atomic locking needed to fulfill the "Zero Overselling" mandate.
- **Cost**: Leveraging Cloudflare's unified ecosystem (D1, R2, DO) minimizes latency and operational costs compared to external providers.
- **Local Fit**: PayMongo is the leading gateway for the Philippine market (GCash/Maya/Cards).
- **Consistency**: Tailwind v4 ensures the "Technical Brutalist" aesthetic is strictly maintained across all components.
