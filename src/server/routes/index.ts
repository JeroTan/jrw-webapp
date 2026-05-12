import type Elysia from "elysia";

export const serverRouteGroups = [
  "auth",
  "brands",
  "products",
  "checkout",
  "payments",
  "webhooks",
  "orders",
  "returns-refunds",
  "assets",
  "audit",
] as const;

export function serverRoutes(app: Elysia) {
  return app;
}
