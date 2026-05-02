import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
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

export function getDb() {
  return drizzle(env.DB, { schema });
}
