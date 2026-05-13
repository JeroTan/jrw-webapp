import type { AnyElysia } from "elysia";
import { authRoutes, type AuthRoutesOptions } from "./auth.routes";
import { foundationRoutes } from "./foundation.routes";
export { serverRouteGroups } from "./route-groups";

export type ServerRoutesOptions = {
  auth?: AuthRoutesOptions;
};

export function serverRoutes(app: AnyElysia, options: ServerRoutesOptions = {}) {
  return app.use(foundationRoutes).use((routes) => authRoutes(routes, options.auth));
}
