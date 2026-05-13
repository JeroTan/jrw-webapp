import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

const serverOnlyOptimizeExcludes = [
  "elysia",
  "@elysiajs/openapi",
  "drizzle-orm",
  "drizzle-orm/d1",
];

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [react()],
  vite: {
    optimizeDeps: {
      exclude: serverOnlyOptimizeExcludes,
    },
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    ssr: {
      optimizeDeps: {
        exclude: serverOnlyOptimizeExcludes,
      },
    },
  },
});
