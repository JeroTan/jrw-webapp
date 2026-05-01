import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { openapi } from "@elysiajs/openapi";
import getCorsConfig from "@/api/config/cors";
import type { APIRoute } from "astro";
import { ApiContainer } from "@/api/container/ApiContainer";

// Initialize the app at the global scope for performance
const app = new Elysia({
  prefix: "/api",
  adapter: CloudflareAdapter,
  aot: false,
  normalize: true,
})
  .use(
    openapi({
      documentation: {
        info: {
          title: "JRW Simple E-commerce API",
          version: "1.0.0",
          description:
            "## The Technical Brutalist E-commerce Engine\n\nThis API powers a high-performance, edge-native e-commerce platform built specifically for Cloudflare Workers. It is designed around 'Technical Brutalist' principles: radical simplicity, raw performance, and absolute resilience.\n\n### Key Architectural Pillars\n- **Edge Native**: Runs globally across Cloudflare's edge network using V8 Isolates (via ElysiaJS) for millisecond latency.\n- **Zero Overselling**: Critical inventory logic is secured by atomic Durable Object Mutexes and Optimistic Concurrency Control (OCC) using the `stock_lock_version` Safety Belt protocol, making overselling mathematically impossible during flash sales.\n- **Multi-Provider Identity**: Supports modular OAuth seamlessly linked to a primary customer record.\n\nThis documentation serves as the exact, strictly-typed API contract bridging the frontend clients and the backend D1 SQLite database.",
        },
      },
    })
  )
  .use(getCorsConfig());

const handle: APIRoute = async (ctx) => {
  // Use scoped derive to inject real Astro data into the global app instance
  // This overwrites the "placeholders" in your modular plugins for this request only.
  return await app
    .derive({ as: "scoped" }, () => ({
      urlData: ctx.url,
      astroCookies: ctx.cookies,
    }))
    .use(ApiContainer)
    .handle(ctx.request);
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
export const HEAD = handle;
export const OPTIONS = handle;
export const TRACE = handle;
export const CONNECT = handle;
export const LINK = handle;
export const UNLINK = handle;
