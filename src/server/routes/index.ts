import type { AnyElysia } from "elysia";
import {
  accountRecoveryRoutes,
  type AccountRecoveryRoutesOptions,
} from "./account-recovery.routes";
import { authRoutes, type AuthRoutesOptions } from "./auth.routes";
import { customerRoutes, type CustomerRoutesOptions } from "./customer.routes";
import { foundationRoutes } from "./foundation.routes";
export { serverRouteGroups } from "./route-groups";

export type ServerRoutesOptions = {
  accountRecovery?: AccountRecoveryRoutesOptions;
  auth?: AuthRoutesOptions;
  customers?: CustomerRoutesOptions;
};

export function serverRoutes(app: AnyElysia, options: ServerRoutesOptions = {}) {
  return app
    .use(foundationRoutes)
    .use((routes) => authRoutes(routes, options.auth))
    .use((routes) => accountRecoveryRoutes(routes, options.accountRecovery))
    .use((routes) => customerRoutes(routes, options.customers));
}
