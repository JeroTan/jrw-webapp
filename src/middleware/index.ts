import { env } from "cloudflare:workers";
import { sequence } from "astro:middleware";

import { createAdminPageGuard } from "./auth/admin-page-guard";
import { createCustomerPageGuard } from "./auth/customer-page-guard";

const getRuntimeEnv = () => env as Partial<Env> & Record<string, unknown>;

export const onRequest = sequence(
  createAdminPageGuard({ getRuntimeEnv }),
  createCustomerPageGuard({ getRuntimeEnv })
);
