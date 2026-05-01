import type Elysia from "elysia";
import { SampleContainer } from "./SampleContainer";
import { IdentityContainer } from "./IdentityContainer";
import { CatalogContainer } from "./CatalogContainer";
import { TransactionContainer } from "./TransactionContainer";
import { AuditContainer } from "./AuditContainer";

/**
 * Root API Container
 * Orchestrates the registration of domain-specific containers to prevent a "God File".
 * Add new domain containers here.
 */
export function ApiContainer(app: Elysia) {
  return app
    .use(SampleContainer)
    .use(IdentityContainer)
    .use(CatalogContainer)
    .use(TransactionContainer)
    .use(AuditContainer);
}
