import { CatalogRoutes } from "@/api/routes/CatalogRoutes";
import { CatalogController } from "@/api/controller/CatalogController";
import { CatalogService } from "@/domain/services/CatalogService";
import type Elysia from "elysia";

const catalogService = new CatalogService();
const catalogController = new CatalogController(catalogService);

export function CatalogContainer(app: Elysia) {
  return app.use(CatalogRoutes(catalogController));
}
