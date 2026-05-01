import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { sql, relations } from "drizzle-orm";
import { admins } from "./identity";

export const audit_logs = sqliteTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  admin_id: text("admin_id").references(() => admins.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entity_id: text("entity_id"),
  details: text("details", { mode: "json" }),
  created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Relationships
export const auditLogsRelations = relations(audit_logs, ({ one }) => ({
  admin: one(admins, { fields: [audit_logs.admin_id], references: [admins.id] }),
}));

export const adminsRelations = relations(admins, ({ many }) => ({
  audit_logs: many(audit_logs),
}));
