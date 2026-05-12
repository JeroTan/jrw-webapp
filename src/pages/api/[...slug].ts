import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
  bindAstroBridgeDecorations,
  clearAstroBridgeDecorations,
} from "@/lib/elysia/astroBridgeContext";
import { createApp } from "@/server/app";

export const prerender = false;

const app = createApp();

const handle: APIRoute = async (ctx) => {
  bindAstroBridgeDecorations(ctx.request, {
    urlData: ctx.url,
    astroCookies: ctx.cookies,
    runtimeEnv: env as Partial<Env> & Record<string, unknown>,
  });

  try {
    return await app.handle(ctx.request);
  } finally {
    clearAstroBridgeDecorations(ctx.request);
  }
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
