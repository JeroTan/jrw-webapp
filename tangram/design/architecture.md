# System Architecture

## 1. Architectural Paradigm
- **Frontend**: Feature-Based Modules (Bulletproof React). All React logic is encapsulated in `src/features/[feature-name]/`.
- **Backend (API)**: Domain-Driven Design (DDD) using a Layered Pattern (`Route -> Controller -> Service`).
- **Data Access**: **Drizzle ORM** as the unified interface for Cloudflare D1 interaction, ensuring type-safe queries and edge-native performance.
- **Inventory Concurrency**: Cloudflare Durable Objects (DO) using **Per-SKU Sharding** (`idFromName(sku_id)`). This ensures a single viral product doesn't bottle-neck the entire catalog. We utilize a **"Safety Belt" Protocol** combining DO mutexes with Optimistic Concurrency Control (`stock_lock_version`). See `tangram/knowledge/tech-stack/inventory-concurrency.md` for details.

## 2. Component Design & Patterns
- **Transactional Integrity**: Use **DO SQLite-backed storage** to handle atomic SQL transactions (e.g., deducting stock + logging audit trail in one `COMMIT`).
- **Cloudflare Bindings**: Utilize `import { env } from "cloudflare:workers"` to access environment variables and bindings at any level of the project. **NEVER** manually define an `Env` interface; use the automatically generated global types. Avoid passing `env` through function parameters where possible.
- **Dependency Injection**: Utilize a **Modular Hybrid DI** pattern.
    - **Global Singletons**: Business logic (Services) and request handlers (Controllers) are instantiated once at the **top level** of their respective Domain Container files to maximize performance and minimize garbage collection.
    - **Domain Containers**: Small, synchronous factory files in `src/api/container/` (e.g., `CatalogContainer.ts`) that plug pre-instantiated controllers into the Elysia route tree.
    - **Hybrid Lifecycle Pattern**: In the Worker entry point (`src/pages/api/[...slug].ts`), the base Elysia `app` is a global singleton, but **Domain Containers** are registered inside the `handle` function via `.use(ApiContainer)` *after* the `.derive()` call. This ensures that pre-instantiated controllers correctly receive the request-scoped Astro context (`urlData`, `astroCookies`) without data leaks between concurrent requests.
- **Communication**: Utilize **Worker RPC** for type-safe, low-latency communication between ElysiaJS services and Durable Objects (avoiding the overhead of `fetch`).
- **Fluent Interfaces**: Complex logic (e.g., query builders, payment intent builders) MUST use method chaining (`return this`) for modular, readable programming.
- **Atomic Helpers**: Independent functions reside purely in `src/utils/**`.
- **3rd-Party Integrations**: All external library wrappers (e.g., PayMongo, Resend) MUST be isolated in `src/lib/**`.

## 3. Data Flow Model (Checkout Flow)
1. **Client**: Astro (SSR grid) -> React Component (Cart).
2. **API**: ElysiaJS Route -> Controller (validation) -> OrderService.
3. **DO**: `OrderService` calls `InventoryDurableObject` to lock stock.
4. **Payment**: `OrderService` calls `src/lib/paymongo` using the latest **PIPM (Payment Intent & Payment Method)** API workflow.
5. **Persistence**: If successful, DO commits state, and D1 persists the `OrderSnapshot`.

## 4. Business Logic & Domain Enums

### 4.1 Order Lifecycle
Orders follow a strict lifecycle enforced by D1 and validated by TypeBox. The `status` field in the `orders` table defaults to `PENDING`.

- **`PENDING`**: The initial state upon order creation.
    - *Descriptions*: "Waiting for payment", "Preparing item", "Verifying inventory".
- **`FAILED`**: A terminal state indicating the order cannot proceed.
    - *Descriptions*: "User cancelled", "Seller declined", "Logistics issue", "Payment failed".
- **`ON_THE_WAY`**: The order has been handed over to logistics.
    - *Descriptions*: "In transit", "Out for delivery".
- **`FULFILLED`**: The order has been successfully delivered and completed.

### 4.2 API Response Standards
All API responses MUST be wrapped in a standard envelope to ensure consistency for the frontend.
- **Single Item**: `{ "data": T, "message": string }`
- **Paginated List**: `{ "data": T[], "meta": { "page": number, "total": number, "limit": number }, "message": string }`

## 5. Alignment
- *Source*: User prompt (Bulletproof React, DDD, Route->Controller->Service, Fluent Interfaces, `utils` vs `lib`).
- *Source*: `tangram/studies/feature-backlog.md` (Durable Stock Management, Snapshotting).
- *Source*: Feature 00002 Execution (Order statuses, status descriptions, dual-layer validation).
