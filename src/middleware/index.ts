import { env } from "cloudflare:workers";

import { createAdminPageGuard } from "./auth/admin-page-guard";

export const onRequest = createAdminPageGuard({
  getRuntimeEnv: () => env as Partial<Env> & Record<string, unknown>,
});
