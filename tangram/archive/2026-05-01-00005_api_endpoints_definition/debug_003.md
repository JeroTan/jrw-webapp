# Debug Session 003: Audit Log Nullability

This debug session addresses the architectural concern regarding the `audit_logs` table. Currently, `admin_id` is marked as `notNull()`. If an admin (such as a seeded owner) is deleted, this strict constraint would either prevent the deletion or cause cascading failures, violating the project's data integrity rules (similar to the "Receipt Rule" for orders).

## Fixing Checklist

- [x] task 1 - Make `admin_id` Nullable in Database Schema
  > **Summary:** Modify `src/domain/schema/audit.ts` to change `admin_id: text("admin_id").notNull().references(() => admins.id)` to `admin_id: text("admin_id").references(() => admins.id, { onDelete: "set null" })`. This ensures that if an admin is removed, their historical audit logs are retained but orphaned.

- [x] task 2 - Generate Drizzle Migration
  > **Summary:** Run `npx drizzle-kit generate` to create the SQL migration file for the `admin_id` constraint change.

- [x] task 3 - Synchronize Validation Schemas
  > **Summary:** Update `src/domain/validation/audit.ts`. Change `admin_id: z.cuid2()` to `admin_id: z.cuid2().nullable().optional()` in the Zod schema, and update the TypeBox equivalent to `t.Optional(t.Union([t.String(), t.Null()]))`.
