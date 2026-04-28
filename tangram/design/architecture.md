# System Architecture

## 1. Architectural Paradigm
- **Frontend**: Feature-Based Modules (Bulletproof React). All React logic is encapsulated in `src/features/[feature-name]/`.
- **Backend (API)**: Domain-Driven Design (DDD) using a Layered Pattern (`Route -> Controller -> Service`).
- **Data Access**: **Prisma ORM** as the unified interface for Supabase interaction, ensuring type-safe queries and portable migrations.
- **Inventory Concurrency**: Cloudflare Durable Objects (DO) using **Per-SKU Sharding** (`idFromName(sku_id)`). This ensures a single viral product doesn't bottle-neck the entire catalog.

## 2. Component Design & Patterns
- **Transactional Integrity**: Use **DO SQLite-backed storage** to handle atomic SQL transactions (e.g., deducting stock + logging audit trail in one `COMMIT`).
- **Communication**: Utilize **Worker RPC** for type-safe, low-latency communication between ElysiaJS services and Durable Objects (avoiding the overhead of `fetch`).
- **Fluent Interfaces**: Complex logic (e.g., query builders, payment intent builders) MUST use method chaining (`return this`) for modular, readable programming.
- **Atomic Helpers**: Independent functions reside purely in `src/utils/**`.
- **3rd-Party Integrations**: All external library wrappers (e.g., PayMongo, Resend) MUST be isolated in `src/lib/**`.

## 3. Data Flow Model (Checkout Flow)
1. **Client**: Astro (SSR grid) -> React Component (Cart).
2. **API**: ElysiaJS Route -> Controller (validation) -> OrderService.
3. **DO**: `OrderService` calls `InventoryDurableObject` to lock stock.
4. **Payment**: `OrderService` calls `src/lib/paymongo` using the latest **PIPM (Payment Intent & Payment Method)** API workflow.
5. **Persistence**: If successful, DO commits state, and Supabase replicates Minimum Meta into `OrderSnapshot`.

## 4. Alignment
- *Source*: User prompt (Bulletproof React, DDD, Route->Controller->Service, Fluent Interfaces, `utils` vs `lib`).
- *Source*: `tangram/studies/feature-backlog.md` (Durable Stock Management, Snapshotting).
