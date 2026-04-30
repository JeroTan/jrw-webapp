import { z } from "zod";
import { t } from "elysia";
import { zodPaginatedResponse } from "./shared";
import { tboxPaginatedResponse } from "@/lib/typebox/wrappers";

// --- BASE SCHEMAS (ZOD) ---
export const zodAuditLog = z.object({
  id: z.cuid2(),
  admin_id: z.cuid2(),
  action: z.string(),
  entity: z.string(),
  entity_id: z.string().nullable().optional(),
  details: z.any().nullable().optional(), // Flexible JSON details
  created_at: z.string(),
});
export type typeAuditLog = z.infer<typeof zodAuditLog>;

// --- BASE SCHEMAS (TYPEBOX) ---
export const tboxAuditLog = t.Object({
  id: t.String(),
  admin_id: t.String(),
  action: t.String(),
  entity: t.String(),
  entity_id: t.Optional(t.Union([t.String(), t.Null()])),
  details: t.Optional(t.Union([t.Any(), t.Null()])),
  created_at: t.String(),
});

// --- API RESPONSES ---

// Paginated Audit Log List
export const zodAuditLogList = zodPaginatedResponse(zodAuditLog);
export type typeAuditLogList = z.infer<typeof zodAuditLogList>;

export const tboxAuditLogList = tboxPaginatedResponse(tboxAuditLog);
