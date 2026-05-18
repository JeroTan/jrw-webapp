import { DurableObject } from "cloudflare:workers";

export class InventoryDurableObject extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(_request: Request): Promise<Response> {
    return new Response("Inventory Durable Object");
  }
}
