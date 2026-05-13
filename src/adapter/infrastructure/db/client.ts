import { drizzle } from "drizzle-orm/d1";
import * as identitySchema from "@/domain/schema/identity";
import * as catalogSchema from "@/domain/schema/catalog";
import * as transactionSchema from "@/domain/schema/transactions";
import * as auditSchema from "@/domain/schema/audit";

const schema = {
  ...identitySchema,
  ...catalogSchema,
  ...transactionSchema,
  ...auditSchema,
};

export function createDb(db: D1Database) {
  return drizzle(db, { schema });
}

export type AppDb = ReturnType<typeof createDb>;

export function getDb(db?: D1Database) {
  if (!db) {
    throw new Error("D1 DB binding is required.");
  }

  return createDb(db);
}
