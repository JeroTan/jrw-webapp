# Elysia API Setup

- Install `elysia @elysiajs/node @elysiajs/cors @elysiajs/openapi`.
- Create `src/pages/api/[...slug].ts`:

  ```typescript
  import { Elysia } from "elysia";
  import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
  import { openapi } from "@elysiajs/openapi";
  import getCorsConfig from "@/api/config/cors";
  import { ApiContainer } from "@/container/apiContainer";
  import type { APIRoute } from "astro";

  const handle: APIRoute = async (ctx) => {
    const app = new Elysia({
      prefix: "/api",
      adapter: CloudflareAdapter,
      aot: false,
      normalize: true,
    })
      .use(openapi())
      .use(getCorsConfig());

    app.decorate({
      env: ctx.locals.runtime.env,
      urlData: ctx.url,
      astroCookies: ctx.cookies,
    });
    ApiContainer(app as unknown as Elysia);
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
  ```

- Setup a custom CORS config in `src/api/config/cors.ts` allowing string or RegExp matching from a `whiteList`.
- Setup an API Container (`src/container/ApiContainer.ts`):
  ```typescript
  export function ApiContainer(app: Elysia) {
    const services = { sampleService: new SampleService() };
    const controller = {
      sampleController: new SampleController(services.sampleService),
    };
    app.onError(({ code, error }) => {
      if (code === "VALIDATION") return handleFieldValidation(error);
      if (code == undefined && error != null && typeof error === "object")
        return handleContentTypeMismatch(error);
    });
    SampleRoutes({ app, sampleController: controller.sampleController });
    return app;
  }
  ```
- Create `src/api/routes/sample.ts` with typed helper usage:
  ```typescript
  export function SampleRoutes({ app }: { app: Elysia }) {
    app
      .use(typedEnv)
      .use(typedUrlData)
      .use(typedAstroCookies)
      .get(
        "/sample",
        ({ env, astroCookies, urlData }) => {
          return Response.json({
            message: "This is a sample route",
            urlOrigin: urlData.origin,
            cookies:
              astroCookies.get("Something") ?? "No cookie named Something",
          });
        },
        {
          detail: {
            summary: "Sample route to test if everything is working",
            tags: ["Sample"],
          },
        },
      );
    return app;
  }
  ```
- **Note**: Ensure `typedEnv`, `typedUrlData`, and `typedAstroCookies` helpers are defined in your library (see Reference Codebase).
