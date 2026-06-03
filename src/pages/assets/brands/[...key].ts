import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

function resolveBrandObjectKey(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const segments = value
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (
    segments.length === 0 ||
    segments.some((segment) => segment === "." || segment === "..")
  ) {
    return null;
  }

  return `brands/${segments.join("/")}`;
}

function r2ObjectResponse(object: R2ObjectBody, request: Request): Response {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");

  if (!headers.has("content-type")) {
    headers.set("content-type", "application/octet-stream");
  }

  return new Response(request.method === "HEAD" ? null : object.body, {
    headers,
    status: 200,
  });
}

const handle: APIRoute = async ({ params, request }) => {
  const key = resolveBrandObjectKey(params.key);
  if (!key) {
    return new Response("Not found", { status: 404 });
  }

  const storage = (env as Partial<Env>).STORAGE;
  if (!storage) {
    return new Response("Storage unavailable", { status: 503 });
  }

  const object = await storage.get(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  return r2ObjectResponse(object, request);
};

export const GET = handle;
export const HEAD = handle;
