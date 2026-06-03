import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

const serverOnlyOptimizeExcludes = [
  "elysia",
  "@elysiajs/openapi",
  "@elysiajs/cors",
  "drizzle-orm",
  "drizzle-orm/d1",
];

const workerServerOptimizeIncludes = [
  "elysia",
  "elysia/adapter/cloudflare-worker",
  "@elysiajs/openapi",
  "@elysiajs/cors",
  "drizzle-orm",
  "drizzle-orm/d1",
  "drizzle-orm/sqlite-core",
  "@paralleldrive/cuid2",
  "resend",
  "svix",
  "postal-mime",
  "showdown",
  "zod",
  "@sinclair/typebox",
];

function optimizeWorkerServerDeps() {
  return {
    name: "optimize-worker-server-deps",
    configEnvironment(environment) {
      if (environment === "client") return;

      return {
        optimizeDeps: {
          include: workerServerOptimizeIncludes,
        },
      };
    },
  };
}

// https://astro.build/config
export default defineConfig({
  output: "server",
  devToolbar: {
    enabled: false,
  },
  adapter: cloudflare(),
  integrations: [react()],
  vite: {
    optimizeDeps: {
      exclude: serverOnlyOptimizeExcludes,
    },
    plugins: [tailwindcss(), optimizeWorkerServerDeps()],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
  },
});
