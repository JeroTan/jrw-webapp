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
  .use(openapi())
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
