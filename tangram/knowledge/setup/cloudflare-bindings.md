# Cloudflare Bindings & Environment Access

In the 2025/2026 Cloudflare Workers runtime, the standard way to access environment variables and bindings is through the `cloudflare:workers` module. This replaces the old pattern of passing the `env` object through the `fetch` handler.

## 1. Global Import Pattern
You can access your `wrangler.jsonc` bindings (D1, R2, KV, etc.) and environment variables from **anywhere** in your codebase using a direct import.

```typescript
import { env } from "cloudflare:workers";

// Accessing a variable
const apiKey = env.API_KEY;

// Accessing a D1 Database binding
const db = env.DB;
```

## 2. Advantages for Architecture
- **Global Static DI**: Services and Controllers can be instantiated at the top level of their files.
- **No Prop Drilling**: You no longer need to pass the `env` object through every service or helper function.
- **Top-Level Logic**: Configuration and client initialization (like Drizzle ORM) can happen once during the Worker's "Cold Start" and be reused across all requests.

## 3. Implementation in this Project
We use this pattern to initialize our **Dependency Injection Container** at the top level of `src/pages/api/[...slug].ts`, ensuring that the Elysia app is a static "Singleton" throughout the life of the Worker isolate.

## 4. Limitations
- **No I/O at Evaluation**: While you can *access* the `env` object at the top level, you cannot perform I/O operations (like `db.prepare(...).execute()`) outside of a request handler (`fetch`, `scheduled`, etc.).
- **Isolate Persistence**: Because global variables persist between requests in a warm isolate, always ensure that user-specific data is **never** stored in global variables.
