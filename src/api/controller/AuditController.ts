import type { AuditService } from "@/domain/services/AuditService";

export class AuditController {
  constructor(public auditService: AuditService) {}

  async handleListLogs() {
    return {
      data: this.auditService.mockListLogs(),
      meta: { page: 1, total: 0, limit: 10 },
      message: "Audit logs retrieved successfully",
      code: "SUCCESS" as const,
    };
  }
}
