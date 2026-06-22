import {
  inspectCustomerPageSession,
  type CustomerPageSessionInput,
  type CustomerPageSessionInspection,
} from "@/server/auth/customer-page-session";
import { getOrCreateRequestId } from "@/utils/request-id";

export type StorefrontHeaderAccountState = "authenticated" | "public";

export type ResolveCustomerHeaderAccountStateInput = {
  inspectSession?: (
    input: CustomerPageSessionInput
  ) => Promise<CustomerPageSessionInspection>;
  request: Request;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
};

export async function resolveCustomerHeaderAccountState({
  inspectSession = inspectCustomerPageSession,
  request,
  runtimeEnv,
}: ResolveCustomerHeaderAccountStateInput): Promise<StorefrontHeaderAccountState> {
  try {
    const session = await inspectSession({
      request,
      requestId: getOrCreateRequestId(request.headers),
      runtimeEnv,
    });

    return session.authenticated ? "authenticated" : "public";
  } catch {
    return "public";
  }
}
