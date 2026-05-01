import { AuditRoutes } from "@/api/routes/AuditRoutes";
import { AuditController } from "@/api/controller/AuditController";
import { AuditService } from "@/domain/services/AuditService";
import type Elysia from "elysia";

const auditService = new AuditService();
const auditController = new AuditController(auditService);

export function AuditContainer(app: Elysia) {
  return app.use(AuditRoutes(auditController));
}
