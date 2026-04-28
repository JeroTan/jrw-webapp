# Project Folder Structure

Based on Bulletproof React and DDD backend constraints, the project will follow this structure:

```text
src/
├── api/                   # ElysiaJS Backend
│   ├── config/            # API specific configurations (CORS, etc)
│   ├── controller/        # HTTP validation and routing handlers
│   ├── routes/            # Astro API catch-all / Elysia route definitions
│   └── container/         # Dependency Injection
├── cloudflare/            # Cloudflare Worker Specifics
│   ├── worker.ts          # Main worker entrypoint
│   └── durable-objects/   # Durable Object classes (e.g., InventoryDO.ts)
├── adapter/               # DDD Adapters
│   ├── application/       # Application use cases
│   └── infrastructure/    # Services containing business logic (Domain logic wrappers)
├── domain/                # DDD Domain Layer (Entities, Value Objects, Types)
├── features/              # Bulletproof React Features
│   ├── auth/              # Bounded context: Auth
│   ├── catalog/           # Bounded context: Products & Variants
│   └── checkout/          # Bounded context: Cart & Payment
├── components/            # Global UI atomic components
├── hooks/                 # Global React hooks
├── lib/                   # 3rd-Party Library wrappers (PayMongo, Resend, Supabase)
├── utils/                 # Independent atomic helper functions
├── pages/                 # Astro Pages (Routing)
├── layouts/               # Astro Layouts
└── styles/                # Global CSS / Tokens
```

## Alignment
- *Source*: User Prompt (Bulletproof React, DDD backend, `utils/` vs `lib/`).
- *Source*: `.gemini/knowledge/setup/astro-cloudflare-worker-setup/references/ddd-architecture.md`.
