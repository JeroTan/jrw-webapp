import type { IdentityController } from "@/api/controller/IdentityController";
import { tboxApiResponse } from "@/lib/typebox/wrappers";
import {
  tboxLoginBody,
  tboxRegistrationBody,
  tboxCustomerResponse,
  tboxForgotPasswordBody,
  tboxResetPasswordBody,
  tboxUpdateProfileBody,
  tboxChangePasswordBody,
} from "@/domain/validation/identity";
import type Elysia from "elysia";
import { t } from "elysia";

export const IdentityRoutes =
  (identityController: IdentityController) => (app: Elysia) =>
    app
      .group("/auth", (app) =>
        app
          .post(
            "/login",
            async (ctx) => await identityController.handleLogin(ctx),
            {
              body: tboxLoginBody,
              detail: {
                summary: "Customer login",
                description:
                  "Authenticates a customer and returns a JWT token. Fails if the user registered exclusively via OAuth and has not set a password.",
                tags: ["Identity"],
              },
              response: {
                200: tboxApiResponse(t.Object({ token: t.String() })),
                500: t.String(),
              },
            }
          )
          .post("/register", (ctx) => identityController.handleRegister(ctx), {
            body: tboxRegistrationBody,
            detail: {
              summary: "Customer registration",
              description:
                "Registers a new customer account using an email and password.",
              tags: ["Identity"],
            },
            response: { 200: tboxApiResponse(t.Any()), 500: t.String() },
          })
          .post(
            "/forgot-password",
            (ctx) => identityController.handleForgotPassword(ctx),
            {
              body: tboxForgotPasswordBody,
              detail: {
                summary: "Request password reset",
                description:
                  "Sends a password reset email to the customer if the account exists.",
                tags: ["Identity"],
              },
              response: {
                200: tboxApiResponse(t.Object({ success: t.Boolean() })),
                500: t.String(),
              },
            }
          )
          .post(
            "/reset-password",
            (ctx) => identityController.handleResetPassword(ctx),
            {
              body: tboxResetPasswordBody,
              detail: {
                summary: "Reset password with token",
                description:
                  "Resets the customer's password using a secure token received via email.",
                tags: ["Identity"],
              },
              response: {
                200: tboxApiResponse(t.Object({ success: t.Boolean() })),
                500: t.String(),
              },
            }
          )
      )
      .group("/profile", (app) =>
        app
          .get("/", () => identityController.handleProfile(), {
            detail: {
              summary: "Get customer profile",
              description:
                "Retrieves the authenticated customer's profile details. Requires active customer authorization token.",
              tags: ["Identity"],
            },
            response: {
              200: tboxApiResponse(tboxCustomerResponse),
              500: t.String(),
            },
          })
          .patch("/", (ctx) => identityController.handleUpdateProfile(ctx), {
            body: tboxUpdateProfileBody,
            detail: {
              summary: "Update customer profile",
              description:
                "Updates the authenticated customer's profile details. Requires active customer authorization token.",
              tags: ["Identity"],
            },
            response: {
              200: tboxApiResponse(tboxCustomerResponse),
              500: t.String(),
            },
          })
          .post(
            "/change-password",
            (ctx) => identityController.handleChangePassword(ctx),
            {
              body: tboxChangePasswordBody,
              detail: {
                summary: "Change password",
                description:
                  "Changes the authenticated customer's password. Requires active customer authorization token and current password validation.",
                tags: ["Identity"],
              },
              response: {
                200: tboxApiResponse(t.Object({ success: t.Boolean() })),
                500: t.String(),
              },
            }
          )
      )
      .group("/admin", (app) =>
        app
          .group("/auth", (app) =>
            app
              .post(
                "/login",
                ({ body, set }) => {
                  return identityController.handleAdminLogin({ body, set });
                },
                {
                  body: tboxLoginBody,
                  detail: {
                    summary: "Admin login",
                    description:
                      "Authenticates an administrator or system owner and returns an elevated JWT token.",
                    tags: ["Admin Identity"],
                  },
                  response: {
                    200: tboxApiResponse(
                      t.Object({ token: t.Union([t.String(), t.Null()]) })
                    ),
                    401: tboxApiResponse(t.Null()),
                    500: t.String(),
                  },
                }
              )
              .post(
                "/forgot-password",
                (ctx) => identityController.handleAdminForgotPassword(ctx),
                {
                  body: tboxForgotPasswordBody,
                  detail: {
                    summary: "Request admin password reset",
                    description:
                      "Sends a password reset email to the administrator if the account exists.",
                    tags: ["Admin Identity"],
                  },
                  response: {
                    200: tboxApiResponse(t.Object({ success: t.Boolean() })),
                    500: t.String(),
                  },
                }
              )
              .post(
                "/reset-password",
                (ctx) => identityController.handleAdminResetPassword(ctx),
                {
                  body: tboxResetPasswordBody,
                  detail: {
                    summary: "Reset admin password with token",
                    description:
                      "Resets the administrator's password using a secure token received via email.",
                    tags: ["Admin Identity"],
                  },
                  response: {
                    200: tboxApiResponse(t.Object({ success: t.Boolean() })),
                    500: t.String(),
                  },
                }
              )
          )
          .group("/profile", (app) =>
            app.post(
              "/change-password",
              (ctx) => identityController.handleAdminChangePassword(ctx),
              {
                body: tboxChangePasswordBody,
                detail: {
                  summary: "Change admin password",
                  description:
                    "Changes the authenticated administrator's password. Requires active admin authorization token and current password validation.",
                  tags: ["Admin Identity"],
                },
                response: {
                  200: tboxApiResponse(t.Object({ success: t.Boolean() })),
                  500: t.String(),
                },
              }
            )
          )
      );
