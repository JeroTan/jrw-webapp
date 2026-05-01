import { IdentityRoutes } from "@/api/routes/IdentityRoutes";
import { IdentityController } from "@/api/controller/IdentityController";
import { IdentityService } from "@/domain/services/IdentityService";
import type Elysia from "elysia";

const identityService = new IdentityService();
const identityController = new IdentityController(identityService);

export function IdentityContainer(app: Elysia) {
  return app.use(IdentityRoutes(identityController));
}
