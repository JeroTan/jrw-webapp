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
  "@elysiajs/openapi",
  "@elysiajs/cors",
  "drizzle-orm",
  "drizzle-orm/d1",
  "drizzle-orm/sqlite-core",
  "@paralleldrive/cuid2",
  "resend",
  "svix",
  "postal-mime",
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
