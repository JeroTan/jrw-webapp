import type Elysia from "elysia";
import { SampleContainer } from "./SampleContainer";

/**
 * Root API Container
 * Orchestrates the registration of domain-specific containers to prevent a "God File".
 * Add new domain containers here.
 */
export function ApiContainer(app: Elysia) {
  return app
    .use(SampleContainer);
    // .use(CatalogContainer)
    // .use(OrderContainer)
}
