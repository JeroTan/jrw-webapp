import { handle } from "@astrojs/cloudflare/handler";

// For modularity, export all from your durable objects here
export * from "./durable-objects/InventoryDurableObject";

export default {
  async fetch(request, env, ctx) {
    return handle(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
