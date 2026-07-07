import { t } from "elysia";
import { createDb } from "@/adapter/infrastructure/db/client";
import type { OperationalLogger } from "@/adapter/infrastructure/logging/operational-log";
import { createCustomerVerificationEmailNotifier } from "@/adapter/infrastructure/resend/CustomerVerificationEmailNotifier";
import { parseReceiptAccountPrefillToken } from "@/domain/auth/receipt-account-prefill";
import { publicErrorMessage } from "@/lib/api/errors";
import { apiErrorWithRequestId, apiSuccessWithRequestId } from "@/lib/api/response";
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
import { rbacGuard } from "@/server/middleware/rbac";
import { routeDetail } from "@/server/openapi/route-metadata";
import {
  DrizzleCustomerRegistrationPrefillRepository,
  type CustomerRegistrationPrefill,
} from "@/server/repositories/CustomerRegistrationPrefillRepository";
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

const tboxCustomerRegistrationPrefillQuery = t.Object(
  {
    receiptContext: t.String({ minLength: 1, maxLength: 2048 }),
  },
  { additionalProperties: false }
);

const tboxCustomerRegistrationPrefillData = t.Object({
  email: t.String({ format: "email" }),
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
  registrationPrefillResolver?: (
    input: CustomerRegistrationPrefillResolverInput
  ) => Promise<CustomerRegistrationPrefill | null>;
};

export type CustomerRegistrationPrefillResolverInput = {
  receiptContext: string;
  requestId: string;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
};

function stringEnv(
  runtimeEnv: (Partial<Env> & Record<string, unknown>) | undefined,
  key: string
): string | undefined {
  const processValue =
    typeof process !== "undefined" ? process.env?.[key] : undefined;
  const value = runtimeEnv?.[key] ?? processValue;

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function getRuntimePasswordPepper(
  runtimeEnv: (Partial<Env> & Record<string, unknown>) | undefined
): string | undefined {
  const passwordPepper = runtimeEnv?.PASSWORD_PEPPER;

  if (typeof passwordPepper === "string") return passwordPepper;
  return undefined;
}

async function resolveRuntimeRegistrationPrefill(
  input: CustomerRegistrationPrefillResolverInput
): Promise<CustomerRegistrationPrefill | null> {
  const db = input.runtimeEnv?.DB;
  const secret = stringEnv(input.runtimeEnv, "JWT_SECRET");

  if (!db || !secret) {
    return null;
  }

  const payload = await parseReceiptAccountPrefillToken({
    secretKey: secret,
    token: input.receiptContext,
  });

  if (!payload) {
    return null;
  }

  const repository = new DrizzleCustomerRegistrationPrefillRepository(
    createDb(db as D1Database)
  );

  return repository.findConfirmedGuestReceiptPrefill(payload);
}

function prefillNotFound(requestId: string) {
  return apiErrorWithRequestId(
    "RESOURCE_NOT_FOUND",
    publicErrorMessage("RESOURCE_NOT_FOUND"),
    requestId
  );
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

const customerProfileAuth = {
  mode: "required",
  roles: ["CUSTOMER"],
} as const;

const customerProfileErrors = [
  "AUTH_REQUIRED",
  "AUTH_FORBIDDEN",
  "ACCOUNT_SUSPENDED",
  "EMAIL_NOT_VERIFIED",
  "RESOURCE_NOT_FOUND",
  "INTERNAL_ERROR",
] as const;

const customerProfileWriteErrors = [
  "VALIDATION_FAILED",
  ...customerProfileErrors,
] as const;

export function customerRoutes(
  app: AnyElysia,
  options: CustomerRoutesOptions = {}
) {
  return app
    .get(
      "/customers/registration-prefill",
      async (ctx) => {
        const { query, runtimeEnv, set, requestId } = ctx as typeof ctx &
          RequestContextDecorations & {
            query: { receiptContext: string };
            runtimeEnv?: Partial<Env> & Record<string, unknown>;
          };
        const resolver =
          options.registrationPrefillResolver ??
          resolveRuntimeRegistrationPrefill;
        const prefill = await resolver({
          receiptContext: query.receiptContext,
          requestId,
          runtimeEnv,
        });

        if (!prefill) {
          set.status = 404;
          return prefillNotFound(requestId) as never;
        }

        set.status = 200;
        return apiSuccessWithRequestId(prefill, requestId, {
          code: "SUCCESS",
        }) as never;
      },
      {
        detail: routeDetail({
          summary: "Resolve receipt registration prefill",
          description:
            "Resolves a signed checkout receipt context into the guest checkout email for account registration. The browser URL carries only signed payment/attempt context, never raw email. Context resolves only for confirmed guest orders.",
          tags: ["Customers"],
          auth: { mode: "public", roles: ["PROSPECT"] },
          rateLimitClass: "email-token",
          errorCodes: [
            "VALIDATION_FAILED",
            "RESOURCE_NOT_FOUND",
            "PROVIDER_UNAVAILABLE",
            "INTERNAL_ERROR",
          ],
        }),
        query: tboxCustomerRegistrationPrefillQuery,
        response: {
          200: tboxApiSuccess(tboxCustomerRegistrationPrefillData),
          ...openApiErrorResponses([400, 404, 500, 503]),
        },
      }
    )
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
            `Creates an unverified customer account and sends a verification email through the notification boundary. Only email and password are required for signup. Optional profile/contact fields are accepted for early profile setup, but the intended storefront flow collects name, phone, and delivery details later through PATCH /customers/me or the checkout contact/delivery step.

**Path:** \`POST /customers\`

**Authentication:** Public — no authentication required.

**Request Body:**
- \`email\` (string, required): Customer email address (3-254 characters, valid email format).
- \`password\` (string, required): Account password (8-1024 characters, must meet security requirements).
- \`displayName\` (string, optional): Display name shown in storefront (1-120 characters).
- \`firstName\` (string, optional): Customer first name (1-80 characters).
- \`lastName\` (string, optional): Customer last name (1-80 characters).
- \`phone\` (string, optional): Contact phone number (7-32 characters).
- \`streetAddress\` (string, optional): Street address for delivery (1-240 characters).
- \`barangay\` (string, optional): Barangay/district for delivery (1-120 characters).
- \`cityProvince\` (string, optional): City or province for delivery (1-120 characters).
- \`postalCode\` (string, optional): Postal/ZIP code (1-24 characters).
- \`emailMarketingOptIn\` (boolean, optional): Whether customer opts into marketing emails.

**Response (201):**
- \`data.customer.id\` (string): The newly created customer UUID.
- \`data.customer.email\` (string): Customer email address.
- \`data.customer.role\` (string): Always \`CUSTOMER\`.
- \`data.customer.emailVerified\` (boolean): Always \`false\` on registration — must verify via email.
- \`data.customer.displayName\` (string or null): Display name if provided.
- \`data.customer.firstName\` (string or null): First name if provided.
- \`data.customer.lastName\` (string or null): Last name if provided.
- \`data.customer.phone\` (string or null): Phone number if provided.
- \`data.customer.streetAddress\` (string or null): Street address if provided.
- \`data.customer.barangay\` (string or null): Barangay if provided.
- \`data.customer.cityProvince\` (string or null): City/province if provided.
- \`data.customer.postalCode\` (string or null): Postal code if provided.
- \`data.customer.avatarUrl\` (string or null): Avatar URL (null on registration).
- \`data.customer.emailMarketingOptIn\` (boolean): Marketing opt-in preference.
- \`data.verificationEmail.sent\` (boolean): Whether the verification email was successfully sent.`,
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
            `Consumes a single-use email verification token and marks the customer email verified when valid.

**Path:** \`POST /email-verifications\`

**Authentication:** Public — no authentication required.

**Request Body:**
- \`token\` (string, required): The single-use email verification token from the verification email link (1-2048 characters).

**Response (200):**
- \`data.verified\` (boolean): \`true\` when the token was valid and the email is now verified.

**Note:** The token is single-use and expires after consumption. Attempting to reuse the same token will return a 409 CONFLICT_STATE error.`,
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
            `Returns the safe profile summary for the authenticated customer.

**Path:** \`GET /customers/me\`

**Authentication:** Required — \`CUSTOMER\` role. Account must be active and email verified.

**Request:** No body required.

**Response (200):**
- \`id\` (string): The customer account UUID.
- \`email\` (string): Customer email address.
- \`role\` (string): Always \`CUSTOMER\`.
- \`emailVerified\` (boolean): Whether the email has been verified.
- \`displayName\` (string or null): Display name.
- \`firstName\` (string or null): First name.
- \`lastName\` (string or null): Last name.
- \`phone\` (string or null): Contact phone number.
- \`streetAddress\` (string or null): Street address for delivery.
- \`barangay\` (string or null): Barangay/district.
- \`cityProvince\` (string or null): City or province.
- \`postalCode\` (string or null): Postal/ZIP code.
- \`avatarUrl\` (string or null): Avatar image URL.
- \`emailMarketingOptIn\` (boolean): Marketing email preference.`,
          tags: ["Customers"],
          auth: customerProfileAuth,
          rateLimitClass: "public-read",
          errorCodes: [...customerProfileErrors],
        }),
        transform: rbacGuard(customerProfileAuth),
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
            `Updates allowed profile/contact fields for the authenticated customer.

**Path:** \`PATCH /customers/me\`

**Authentication:** Required — \`CUSTOMER\` role. Account must be active and email verified.

**Request Body (at least one field required, all optional):**
- \`displayName\` (string, optional): New display name (1-120 characters).
- \`firstName\` (string, optional): New first name (1-80 characters).
- \`lastName\` (string, optional): New last name (1-80 characters).
- \`phone\` (string, optional): New contact phone number (7-32 characters).
- \`streetAddress\` (string, optional): New street address (1-240 characters).
- \`barangay\` (string, optional): New barangay/district (1-120 characters).
- \`cityProvince\` (string, optional): New city or province (1-120 characters).
- \`postalCode\` (string, optional): New postal/ZIP code (1-24 characters).
- \`emailMarketingOptIn\` (boolean, optional): New marketing email preference.

**Response (200):** Returns the updated customer profile object with all fields (same schema as GET /customers/me).

**Note:** Email and password cannot be changed through this endpoint. Use the account recovery flow for password changes.`,
          tags: ["Customers"],
          auth: customerProfileAuth,
          rateLimitClass: "customer-write",
          errorCodes: [...customerProfileWriteErrors],
        }),
        transform: rbacGuard(customerProfileAuth),
        response: {
          200: tboxApiSuccess(tboxCustomerProfile),
          ...openApiErrorResponses([400, 401, 403, 404, 500]),
        },
      }
    );
}
