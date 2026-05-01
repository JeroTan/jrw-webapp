# Project Constitution

**Version:** 1.3
**Last Updated:** 2026-04-30

## Changelog

- **v1.0:** Initial establishment of architectural and programming standards focusing on Bulletproof React, DDD, and Fluent Interfaces.
- **v1.1:** Added Principle 6 to mandate incremental documentation updates and prevent the accidental deletion of historical context.
- **v1.2:** Added Principle 7 to mandate Remote-First D1 migrations during development.
- **v1.3:** Refined Principle 7 to specify the `development` environment target for remote migrations.

## Core Principles

### 1. Feature-Centric (Bulletproof) Architecture

> **Rationale:** Organizing by technical type leads to "spaghetti" logic as the project grows. Organizing by feature ensures scalability and easy deletion/modification.
> **Enforcement Rule:** All UI and associated logic MUST be stored in `src/features/[feature-name]/`. Shared components, hooks, or assets MUST live in `src/components/`, `src/hooks/`, etc. Features MUST only expose their public API via an `index.ts` barrel file.

### 2. Domain-Driven Backend Design (DDD)

> **Rationale:** Decouples business logic from technical implementation details (like HTTP or DB), making the core "Brain" of the app testable and robust.
> **Enforcement Rule:** The backend MUST be organized into Bounded Contexts. Business rules MUST reside within Domain Entities or Value Objects, never in the Controller or Repository layers.

### 3. Layered API Pattern (Route -> Controller -> Service)

> **Rationale:** Ensures separation of concerns. Controllers handle "How" the data arrives (HTTP), while Services handle "What" to do with it (Business Logic).
> **Enforcement Rule:** Controllers MUST NOT contain business logic. They MUST only parse inputs, handle status codes, and delegate to a Service. Services MUST remain transport-agnostic. **Routes MUST be used strictly for endpoint definition and documentation; they MUST NOT contain any implementation or technical logic (e.g., direct response generation).**

### 4. Fluent Interface Modular Programming

> **Rationale:** Increases code readability and discoverability by chaining operations into "human-readableable" sentences.
> **Enforcement Rule:** Complex logic builders (e.g., Query Builders, Order Processors) SHOULD utilize the Fluent Interface pattern. Methods in these builders MUST return `this` to allow chaining.

### 5. Standardized Global Utilities

> **Rationale:** Prevents "utility bloat" and ensures that third-party logic is isolated.
> **Enforcement Rule:** Atomic, independent helper functions MUST live in `src/utils/**`. All logic involving 3rd-party libraries or custom wrapper creations MUST be localized in `src/lib/**`.

### 6. Incremental Documentation Updates

> **Rationale:** Documentation represents the project's cumulative memory and technical laws. Overwriting entire files risks losing critical historical context and specific user-mandated rules.
> **Enforcement Rule:** When updating documentation (Design Pillars, Knowledge, or Memory), the AI MUST prioritize surgical edits and additions over wholesale replacement. Content SHOULD be appended or incrementally modified to preserve existing mandates. If needed then be careful when doing so.

### 7. Remote-First D1 Migrations

> **Rationale:** In an edge-native architecture, the remote Cloudflare D1 instance is the single source of truth for the system's state. Applying migrations locally can lead to schema drift and environment inconsistency.
> **Enforcement Rule:** All database migrations generated via Drizzle Kit MUST be applied to the **remote** D1 instance using the **development** environment (e.g., `npx wrangler d1 migrations apply DB --remote --env development`) during the development phase. Local D1 environments should only be used for isolated unit testing if specifically requested.
