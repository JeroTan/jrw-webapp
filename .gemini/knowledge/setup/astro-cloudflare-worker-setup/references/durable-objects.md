# Durable Objects & WebSockets

If the user needs persistent storage or WebSockets:

- **IMPORTANT**: Ensure `wrangler.jsonc` is already configured with the Durable Object and Migration bindings, then run `npm run wrangler-types` to synchronize the `Env` types before continuing.

1. **Plan Architecture**: Always create the Durable Object classes FIRST before adding them to your exports or configuration.
2. **Durable Object Implementation**: Create classes in `src/cloudflare/durable-objects/`:
   - Extend `DurableObject`.
   - Use `makeWSServer` from `src/lib/durableObject.ts` (copy helper logic from reference codebase).
   - Prefix custom logic methods with `__` (e.g., `__joinRoom`).
   ```typescript
   import { DurableObject } from "cloudflare:workers";
   export class ExampleDurableObject extends DurableObject {
     constructor(ctx: DurableObjectState, env: Env) {
       super(ctx, env);
     }
     async fetch(request: Request): Promise<Response> {
       // Return websocket or response here
     }
     // Optional WebSocket event handlers
     webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {}
     webSocketClose(
       ws: WebSocket,
       code: number,
       reason: string,
       wasClean: boolean,
     ) {}
     async webSocketError(ws: WebSocket, error: unknown) {}
   }
   ```
3. **Storage & Concurrency**:
   - Use `this.ctx.storage.get/put/delete` for persistent storage.
   - Use `this.ctx.blockConcurrencyWhile(async () => { ... })` for transactional/critical sections.
4. **Worker Entry Point**: Export classes in `src/cloudflare/worker.ts` using the modular pattern.

   ```typescript
   import { handle } from "@astrojs/cloudflare/handler";

   // Modular export of Durable Objects
   export * from "./durable-objects/ExampleDurableObject";

   export default {
     async fetch(request, env, ctx) {
       return handle(request, env, ctx);
     },
     // ...
   } satisfies ExportedHandler<Env>;
   ```

5. **Documentation**: Create `src/features/websocket/durable-object-guide.md` explaining these storage and concurrency patterns.
