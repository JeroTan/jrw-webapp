import {
  evaluateRouteAccess,
  type RouteAuthMetadata,
} from "@/domain/auth/rbac";
import type { RequestContextDecorations } from "@/server/context/request-context";
import { GeneralError } from "@/utils/general/error";

export function rbacGuard(auth: RouteAuthMetadata) {
  return (ctx: Partial<RequestContextDecorations>) => {
    const decision = evaluateRouteAccess({
      auth,
      actor: ctx.requestContext?.actor,
    });

    if (!decision.allowed) {
      throw new GeneralError(undefined, decision.code);
    }
  };
}
