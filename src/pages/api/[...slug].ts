import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { openapi } from "@elysiajs/openapi";
import getCorsConfig from "@/api/config/cors";
import type { APIRoute } from "astro";

// Required for Cloudflare Workers. In order to run elysia here
const handle: APIRoute = async (ctx) => {
  const app = new Elysia({
    prefix: "/api",
    adapter: CloudflareAdapter,
    aot: false, // After numerous trial to make it work, turning it off make it work on Cloudflare worker.
    normalize: true, //
  })
    .use(openapi())
    .use(getCorsConfig());

  app.decorate({
    urlData: ctx.url,
    astroCookies: ctx.cookies,
  });
  //---> A single function to call enpoints should be here <---// To avoid cluttering this file

  //-----------------------------------------------------------//
  return await app.handle(ctx.request);
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
