# Debug Session 003: Drizzle D1 Relational Query Bug

This debug session addresses a Drizzle ORM query failure reported by the user (`Failed query: select ... from "admins" "admins"`). This error is a known dialect issue that occasionally occurs with the Drizzle Relational Query API (`db.query.table.findFirst`) when executing against Cloudflare D1. 

To resolve this and ensure absolute stability, we will refactor the query to use the standard, explicit Drizzle Query Builder (`db.select().from(table).where(...)`).

## Fixing Checklist

- [x] task 1 - Refactor adminLogin Query
  > **Summary:** Update `src/domain/services/IdentityService.ts`. Import `eq` from `drizzle-orm`. Change the `db.query.admins.findFirst(...)` call to use the standard `db.select().from(admins).where(eq(admins.email, email)).limit(1)` syntax. Ensure the first result is safely extracted.
