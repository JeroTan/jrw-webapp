import type { AuditController } from "@/api/controller/AuditController";
import { tboxPaginatedResponse } from "@/lib/typebox/wrappers";
import { tboxAuditLog } from "@/domain/validation/audit";
import type Elysia from "elysia";

export const AuditRoutes =
  (auditController: AuditController) => (app: Elysia) =>
    app.group("/audit", (app) =>
      app.get("/", () => auditController.handleListLogs(), {
        detail: { 
          summary: "List audit logs", 
          description: "Retrieves a paginated list of system-wide audit logs. Requires active owner or admin authorization token. Useful for monitoring administrator actions and system changes.", 
          tags: ["Audit"] 
        },
        response: { 200: tboxPaginatedResponse(tboxAuditLog) },
      })
    );
