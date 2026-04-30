# Project Folder Structure

Based on Bulletproof React and DDD backend constraints, the project will follow this structure:

```text
src/
├── api/                   # ElysiaJS Backend
│   ├── config/            # API specific configurations (CORS, etc)
│   ├── container/         # Dependency Injection (Modular Hybrid Containers)
│   ├── controller/        # HTTP validation and routing handlers
│   └── routes/            # Centralized Elysia route definitions and endpoint aggregators
├── cloudflare/            # Cloudflare Worker Specifics
│   ├── worker.ts          # Main worker entrypoint
│   └── durable-objects/   # Durable Object classes (e.g., InventoryDO.ts)
├── adapter/               # DDD Adapters
│   ├── application/       # Application use cases (Flow orchestration)
│   └── infrastructure/    # External system implementations
├── domain/                # DDD Domain Layer (Entities, Value Objects, Types)
│   ├── schema/            # Drizzle database schemas
│   ├── services/          # Pure business logic services
│   └── validation/        # Modular dual-layer validation schemas (Zod/TypeBox)
├── features/              # Bulletproof React Features
│   ├── auth/              # Bounded context: Auth
│   ├── catalog/           # Bounded context: Products & Variants
│   └── checkout/          # Bounded context: Cart & Payment
├── components/            # Global UI atomic components
├── hooks/                 # Global React hooks
├── lib/                   # 3rd-Party Library wrappers & Custom Utilities
│   ├── zod/               # Custom Zod wrappers and schema builders
│   ├── typebox/           # TypeBox API validation utilities
│   └── ...                # Other wrappers (PayMongo, Jose, etc)
├── utils/                 # Independent atomic helper functions
├── pages/                 # Astro Pages (Routing)
│   └── api/
│       └── [...slug].ts   # The Elysia app instance and Astro catch-all API entry point
├── layouts/               # Astro Layouts
└── styles/                # Global CSS / Tokens
```

...

## Project Scripts & Workflow

The following scripts are defined in `package.json` to manage the lifecycle of the application:

### Development
- `npm run dev`: Starts the local Astro development server. Use this for general frontend and SSR development.
- `npm run wrangler-dev`: Builds the project and starts the `wrangler dev` environment. Use this when testing Cloudflare-specific features like Durable Objects or R2 locally.

### Infrastructure & Types
- `npm run wrangler-types`: Generates the `worker-configuration.d.ts` file. **MUST** be run after any change to `wrangler.jsonc` (e.g., adding a new R2 bucket or DO binding).

### Code Quality & Testing
- `npm run check`: Runs `astro check` to verify TypeScript and Astro-specific component types.
- `npm run test`: Executes unit and integration tests via `vitest`.
- `npm run prettier`: Automatically formats the entire codebase according to project standards.

### Build & Deployment
- `npm run build`: Performs a full production build, including type checks and tests.
- `npm run deploy-development`: Deploys the application to the Cloudflare **Development** environment.
- `npm run deploy-production`: Deploys the application to the Cloudflare **Production** environment (Live site).

## Alignment
- *Source*: User Prompt (Bulletproof React, DDD backend, `utils/` vs `lib/`).
- *Source*: `.gemini/knowledge/setup/astro-cloudflare-worker-setup/references/ddd-architecture.md`.
