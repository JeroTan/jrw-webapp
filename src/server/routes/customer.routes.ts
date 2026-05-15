import { t } from "elysia";
import type { OperationalLogger } from "@/adapter/infrastructure/logging/operational-log";
import { createCustomerVerificationEmailNotifier } from "@/adapter/infrastructure/resend/CustomerVerificationEmailNotifier";
import { validatePasswordPepper } from "@/domain/auth/super-admin-seed";
import { hashSessionToken } from "@/lib/crypto/session-token";
import { tboxApiSuccess, openApiErrorResponses } from "@/lib/typebox/api";
import {
  CustomerAccountController,
  type CustomerAccountServiceLike,
} from "@/server/controllers/CustomerAccountController";
import type {
  RequestActorContext,
  RequestContextDecorations,
} from "@/server/context/request-context";
import { routeDetail } from "@/server/openapi/route-metadata";
import { createCustomerAccountRepositories } from "@/server/repositories/CustomerAccountRepository";
import { CustomerAccountService } from "@/server/services/CustomerAccountService";
import { GeneralError } from "@/utils/general/error";
import type { AnyElysia } from "elysia";

const tboxNullableString = t.Nullable(t.String());

const tboxCustomerProfile = t.Object({
  id: t.String(),
  email: t.String({ format: "email" }),
  role: t.Literal("CUSTOMER"),
  emailVerified: t.Boolean(),
  displayName: tboxNullableString,
  firstName: tboxNullableString,
  lastName: tboxNullableString,
  phone: tboxNullableString,
  streetAddress: tboxNullableString,
  barangay: tboxNullableString,
  cityProvince: tboxNullableString,
  postalCode: tboxNullableString,
  avatarUrl: tboxNullableString,
  emailMarketingOptIn: t.Boolean(),
});

const tboxCustomerRegistrationBody = t.Object(
  {
    email: t.String({ format: "email", minLength: 3, maxLength: 254 }),
    password: t.String({ minLength: 8, maxLength: 1024 }),
    displayName: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
    firstName: t.Optional(t.String({ minLength: 1, maxLength: 80 })),
    lastName: t.Optional(t.String({ minLength: 1, maxLength: 80 })),
    phone: t.Optional(t.String({ minLength: 7, maxLength: 32 })),
    streetAddress: t.Optional(t.String({ minLength: 1, maxLength: 240 })),
    barangay: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
    cityProvince: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
    postalCode: t.Optional(t.String({ minLength: 1, maxLength: 24 })),
    emailMarketingOptIn: t.Optional(t.Boolean()),
  },
  { additionalProperties: false }
);

const tboxCustomerRegistrationData = t.Object({
  customer: tboxCustomerProfile,
  verificationEmail: t.Object({
    sent: t.Boolean(),
  }),
});

const tboxEmailVerificationBody = t.Object(
  {
    token: t.String({ minLength: 1, maxLength: 2048 }),
  },
  { additionalProperties: false }
);

const tboxEmailVerificationData = t.Object({
  verified: t.Boolean(),
});

const tboxCustomerProfilePatchBody = t.Object(
  {
    displayName: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
    firstName: t.Optional(t.String({ minLength: 1, maxLength: 80 })),
    lastName: t.Optional(t.String({ minLength: 1, maxLength: 80 })),
    phone: t.Optional(t.String({ minLength: 7, maxLength: 32 })),
    streetAddress: t.Optional(t.String({ minLength: 1, maxLength: 240 })),
    barangay: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
    cityProvince: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
    postalCode: t.Optional(t.String({ minLength: 1, maxLength: 24 })),
    emailMarketingOptIn: t.Optional(t.Boolean()),
  },
  { additionalProperties: false }
);

export type CustomerControllerFactoryInput = {
  request: Request;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
  requestId: string;
};

export type CustomerRoutesOptions = {
  controllerFactory?: (
    input: CustomerControllerFactoryInput
  ) => CustomerAccountController;
  operationalLogger?: OperationalLogger;
};

function getRuntimePasswordPepper(
  runtimeEnv: (Partial<Env> & Record<string, unknown>) | undefined
): string | undefined {
  const passwordPepper = runtimeEnv?.PASSWORD_PEPPER;

  if (typeof passwordPepper === "string") return passwordPepper;
  return undefined;
}

function createRuntimeController(
  input: CustomerControllerFactoryInput,
  options: CustomerRoutesOptions
): CustomerAccountController {
  const db = input.runtimeEnv?.DB;
  const pepper = validatePasswordPepper(
    getRuntimePasswordPepper(input.runtimeEnv)
  );

  if (!db) {
    throw new GeneralError(
      { reason: "missing_db_binding" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  if (!pepper.ok) {
    throw new GeneralError(
      { reason: "invalid_password_pepper" },
      "PROVIDER_UNAVAILABLE"
    );
  }

  const repositories = createCustomerAccountRepositories(db as D1Database);
  const service = new CustomerAccountService({
    ...repositories,
    passwordPepper: pepper.pepper,
    verificationEmails: createCustomerVerificationEmailNotifier(
      input.runtimeEnv ?? {},
      { requestUrl: input.request.url }
    ),
    operationalLogger: options.operationalLogger,
  });

  return new CustomerAccountController(service);
}

function getController(
  input: CustomerControllerFactoryInput,
  options: CustomerRoutesOptions
): CustomerAccountController {
  return (
    options.controllerFactory?.(input) ??
    createRuntimeController(input, options)
  );
}

function customerActor(
  actor: RequestActorContext | undefined
): Parameters<CustomerAccountServiceLike["getProfile"]>[0]["actor"] {
  return actor
    ? {
        authenticated: actor.authenticated,
        role: actor.role,
        actorId: actor.actorId,
      }
    : undefined;
}

async function sourceIpHash(request: Request): Promise<string | undefined> {
  const sourceIp =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return sourceIp ? hashSessionToken(`ip:${sourceIp}`) : undefined;
}

export function customerRoutes(
  app: AnyElysia,
  options: CustomerRoutesOptions = {}
) {
  return app
    .post(
      "/customers",
      async (ctx) => {
        const { request, set, runtimeEnv, body, requestId } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              body: Record<string, unknown>;
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.registerCustomer({
          body,
          requestId,
          sourceIpHash: await sourceIpHash(request),
        });

        set.status = result.status;

        return result.body as never;
      },
      {
        body: tboxCustomerRegistrationBody,
        detail: routeDetail({
          summary: "Register customer",
          description:
            "Creates an unverified customer account and sends a verification email through the notification boundary. Only email and password are required for signup. Optional profile/contact fields are accepted for early profile setup, but the intended storefront flow collects name, phone, and delivery details later through PATCH /customers/me or the checkout contact/delivery step.",
          tags: ["Customers"],
          auth: { mode: "public", roles: ["PROSPECT"] },
          rateLimitClass: "email-token",
          errorCodes: [
            "VALIDATION_FAILED",
            "CONFLICT_STATE",
            "RATE_LIMITED",
            "PROVIDER_UNAVAILABLE",
            "INTERNAL_ERROR",
          ],
        }),
        response: {
          201: tboxApiSuccess(tboxCustomerRegistrationData),
          ...openApiErrorResponses([400, 409, 429, 500, 503]),
        },
      }
    )
    .post(
      "/email-verifications",
      async (ctx) => {
        const { request, set, runtimeEnv, body, requestId } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              body: { token?: unknown };
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.verifyEmail({
          body,
          requestId,
        });

        set.status = result.status;

        return result.body as never;
      },
      {
        body: tboxEmailVerificationBody,
        detail: routeDetail({
          summary: "Verify customer email",
          description:
            "Consumes a single-use email verification token and marks the customer email verified when valid.",
          tags: ["Customers"],
          auth: { mode: "public", roles: ["PROSPECT", "CUSTOMER"] },
          rateLimitClass: "email-token",
          errorCodes: [
            "VALIDATION_FAILED",
            "RESOURCE_NOT_FOUND",
            "CONFLICT_STATE",
            "RATE_LIMITED",
            "INTERNAL_ERROR",
          ],
        }),
        response: {
          200: tboxApiSuccess(tboxEmailVerificationData),
          ...openApiErrorResponses([400, 404, 409, 429, 500]),
        },
      }
    )
    .get(
      "/customers/me",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, requestId } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.getProfile({
          actor: customerActor(requestContext.actor),
          requestId,
        });

        set.status = result.status;

        return result.body as never;
      },
      {
        detail: routeDetail({
          summary: "Get current customer profile",
          description:
            "Returns the safe profile summary for the authenticated customer.",
          tags: ["Customers"],
          auth: { mode: "required", roles: ["CUSTOMER"] },
          rateLimitClass: "public-read",
          errorCodes: [
            "AUTH_REQUIRED",
            "AUTH_FORBIDDEN",
            "RESOURCE_NOT_FOUND",
            "INTERNAL_ERROR",
          ],
        }),
        response: {
          200: tboxApiSuccess(tboxCustomerProfile),
          ...openApiErrorResponses([401, 403, 404, 500]),
        },
      }
    )
    .patch(
      "/customers/me",
      async (ctx) => {
        const { request, set, runtimeEnv, requestContext, body, requestId } =
          ctx as typeof ctx &
            RequestContextDecorations & {
              runtimeEnv?: Partial<Env> & Record<string, unknown>;
              body: Record<string, unknown>;
            };
        const controller = getController(
          { request, runtimeEnv, requestId },
          options
        );
        const result = await controller.updateProfile({
          actor: customerActor(requestContext.actor),
          requestId,
          body,
        });

        set.status = result.status;

        return result.body as never;
      },
      {
        body: tboxCustomerProfilePatchBody,
        detail: routeDetail({
          summary: "Update current customer profile",
          description:
            "Updates allowed profile/contact fields for the authenticated customer.",
          tags: ["Customers"],
          auth: { mode: "required", roles: ["CUSTOMER"] },
          rateLimitClass: "customer-write",
          errorCodes: [
            "VALIDATION_FAILED",
            "AUTH_REQUIRED",
            "AUTH_FORBIDDEN",
            "RESOURCE_NOT_FOUND",
            "INTERNAL_ERROR",
          ],
        }),
        response: {
          200: tboxApiSuccess(tboxCustomerProfile),
          ...openApiErrorResponses([400, 401, 403, 404, 500]),
        },
      }
    );
}
