# Project Overview: JRW Simple E-commerce Site

**Vision**: To build an ultra-clean, high-performance e-commerce engine for apparel, emphasizing transactional integrity and local Philippine logistics.

**Core Concept**:
A "Technical Brutalist" web application that leverages Cloudflare Workers' edge computing capabilities to solve common e-commerce pain points:

- **Zero Overselling**: Controlled via Durable Objects.
- **Localized Trust**: Integrated PayMongo payments and a clear COD/Courier roadmap.
- **Architectural Clarity**: A 1px grid-based UI that feels authoritative and disciplined.

**Key Technical Pillars**:

- **Stack**: AstroJS (Full-stack) + React (Frontend) + ElysiaJS (API).
- **Data**: Cloudflare D1 (SQLite) with Drizzle ORM.
- **Logic**: Cloudflare Durable Objects for atomicity.
- **Design**: Google Stitch Technical Brutalist System.

**Status**: Construction - Feature `00007_admin_login` complete.

**Current Implementation Notes**:

- Features `00001` through `00007` have built the database schema, validation schemas, API contracts, R2 image-reference model, and functional admin login.
- Most API endpoints are still intentionally mocked. They exist as route contracts for future feature execution.
- Authorization middleware, Durable Object stock-locking behavior, PayMongo checkout, Resend emails, and storefront/admin UI are still planned work.
- The Astro starter home page remains in place until a dedicated UI feature is scheduled.
