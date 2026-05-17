import type { AnyElysia } from "elysia";
import {
  adminAccountRoutes,
  type AdminAccountRoutesOptions,
} from "./admin-accounts.routes";
import {
  accountRecoveryRoutes,
  type AccountRecoveryRoutesOptions,
} from "./account-recovery.routes";
import { authRoutes, type AuthRoutesOptions } from "./auth.routes";
import { customerRoutes, type CustomerRoutesOptions } from "./customer.routes";
import { foundationRoutes } from "./foundation.routes";
import {
  googleOAuthRoutes,
  type GoogleOAuthRoutesOptions,
} from "./google-oauth.routes";
import {
  ownerGovernanceRoutes,
  type OwnerGovernanceRoutesOptions,
} from "./owner-governance.routes";
export { serverRouteGroups } from "./route-groups";

export type ServerRoutesOptions = {
  accountRecovery?: AccountRecoveryRoutesOptions;
  adminAccounts?: AdminAccountRoutesOptions;
  auth?: AuthRoutesOptions;
  customers?: CustomerRoutesOptions;
  googleOAuth?: GoogleOAuthRoutesOptions;
  ownerGovernance?: OwnerGovernanceRoutesOptions;
};

export function serverRoutes(
  app: AnyElysia,
  options: ServerRoutesOptions = {}
) {
  return app
    .use(foundationRoutes)
    .use((routes) => authRoutes(routes, options.auth))
    .use((routes) => googleOAuthRoutes(routes, options.googleOAuth))
    .use((routes) => accountRecoveryRoutes(routes, options.accountRecovery))
    .use((routes) => customerRoutes(routes, options.customers))
    .use((routes) => adminAccountRoutes(routes, options.adminAccounts))
    .use((routes) => ownerGovernanceRoutes(routes, options.ownerGovernance));
}
