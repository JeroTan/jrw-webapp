import type Elysia from "elysia";
import { foundationRoutes } from "./foundation.routes";
export { serverRouteGroups } from "./route-groups";

export function serverRoutes(app: Elysia) {
  return app.use(foundationRoutes);
}
