# Story 1.3 API Endpoint Catalog Baseline

Status: baseline

Source of truth: generated Elysia route contracts under `src/server/**`.

Docs routes:

- API docs UI: `GET /api/openapi`
- API docs JSON: `GET /api/openapi/json`

Generated docs routes are contract tooling routes. They are not counted as completed canonical business endpoints in this baseline.

## Update Rule

Every future endpoint story must update this catalog when any endpoint method/path, route group, auth mode, role, rate-limit class, DTO/schema, documented error code, or implementation status changes.

Canonical backend/API work belongs under `src/server/**`. New backend/API work must not be added under deprecated `src/api/**`.

## Status Labels

- `complete`: implemented canonical endpoint with route contract, envelope schema, OpenAPI detail metadata, and tests.
- `planned`: endpoint group reserved for future story implementation.
- `migration-only`: legacy behavior exists only as migration source.
- `frozen`: legacy/mock module remains for reference but is not canonical completion.
- `remove-later`: module or route should be removed after named replacement work lands.

## Endpoint Catalog

| Method/Path | Route Group | Owning Story | Auth Mode | Roles | Rate-Limit Class | Primary DTO/Schema | Documented Error Codes | Implementation Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /api/` | Foundation | Story 1.2 | public | `PROSPECT` | `public-read` | `tboxApiSuccess({ name, routeGroups })` in `src/server/routes/foundation.routes.ts` | `INTERNAL_ERROR` | complete | Only current completed canonical endpoint. Uses standard `{ data, meta }` envelope and safe request ID metadata. |
| `POST /api/auth/sessions`<br>`DELETE /api/auth/sessions/current`<br>`GET /api/auth/session` | auth | Story 1.7 | `POST`: public<br>`DELETE`: optional<br>`GET`: optional | `POST`: `PROSPECT`<br>`DELETE`/`GET`: `PROSPECT`, `CUSTOMER`, `ADMIN`, `SUPER_ADMIN` | `POST`/`DELETE`: `auth-password`<br>`GET`: `public-read` | `tboxSignInBody`, `tboxSignInData`, `tboxSignOutData`, `tboxSessionInspectionData` in `src/server/routes/auth.routes.ts` | `VALIDATION_FAILED`, `AUTHENTICATION`, `ACCOUNT_SUSPENDED`, `EMAIL_NOT_VERIFIED`, `ADMIN_APPROVAL_REQUIRED`, `RATE_LIMITED`, `AUTH_REQUIRED`, `PROVIDER_UNAVAILABLE`, `INTERNAL_ERROR` | complete | Session cookie is opaque `jrw_session`, HttpOnly, SameSite=Lax, Secure outside local HTTP; response bodies never return raw token. `DELETE` is idempotent when no active session exists. |
| `POST /api/customers`<br>`POST /api/email-verifications`<br>`GET /api/customers/me`<br>`PATCH /api/customers/me` | Customers | Story 1.8 | `POST /customers`: public<br>`POST /email-verifications`: public<br>`GET/PATCH /customers/me`: required | `POST /customers`: `PROSPECT`<br>`POST /email-verifications`: `PROSPECT`, `CUSTOMER`<br>`GET/PATCH /customers/me`: `CUSTOMER` | `POST /customers`: `email-token`<br>`POST /email-verifications`: `email-token`<br>`GET /customers/me`: `public-read`<br>`PATCH /customers/me`: `customer-write` | `tboxCustomerRegistrationBody`, `tboxCustomerRegistrationData`, `tboxEmailVerificationBody`, `tboxEmailVerificationData`, `tboxCustomerProfile`, `tboxCustomerProfilePatchBody` in `src/server/routes/customer.routes.ts` | `VALIDATION_FAILED`, `CONFLICT_STATE`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `RESOURCE_NOT_FOUND`, `AUTH_REQUIRED`, `AUTH_FORBIDDEN`, `INTERNAL_ERROR` | complete | Registration creates unverified `CUSTOMER`, stores PBKDF2 hash/salt and hashed verification token only, sends direct Resend verification email when configured, and never returns raw token/password/hash/salt. Profile DTO excludes secret/provider/status internals and only accepts allowed profile/contact fields. |
| `POST /api/password-resets`<br>`POST /api/password-resets/confirmations`<br>`POST /api/email-verifications/requests` | Auth / Customers | Story 1.9 | public | `PROSPECT`; verification resend also allows `CUSTOMER` metadata | `email-token` | `tboxRecoveryEmailBody`, `tboxPasswordResetConfirmationBody`, `tboxAcceptedData`, `tboxPasswordResetData` in `src/server/routes/account-recovery.routes.ts` | `VALIDATION_FAILED`, `RESOURCE_NOT_FOUND`, `CONFLICT_STATE`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `INTERNAL_ERROR` | complete | Reset request and verification resend return identical `{ accepted: true }` for missing, ineligible, ambiguous, already-verified, and provider-failed accounts. Confirmation consumes one hashed reset token and updates PBKDF2 password hash/salt without issuing or revoking sessions. |
| `GET /api/oauth/google/sessions`<br>`GET /api/oauth/google/callback` | auth | Story 1.10 | public | `PROSPECT`, `CUSTOMER` | `oauth-login` | `tboxStartGoogleOAuthQuery`, `tboxGoogleOAuthCallbackQuery` in `src/server/routes/google-oauth.routes.ts`; redirects documented as `302` | `VALIDATION_FAILED`, `AUTHENTICATION`, `AUTH_FORBIDDEN`, `ACCOUNT_SUSPENDED`, `CONFLICT_STATE`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `INTERNAL_ERROR` | complete | Start route stores hashed OAuth state/nonce only and redirects to Google. Callback consumes state once, verifies Google ID token, links or creates only `CUSTOMER` accounts, sets opaque HttpOnly `jrw_session`, and redirects to safe relative `returnTo`. `customer_providers.provider_user_id` stores Google `sub`, never email. Docs and responses include no auth codes, raw state/nonce, ID/access/refresh tokens, client secret, or raw Google payload. |
| `GET /api/admin-accounts`<br>`POST /api/admin-accounts`<br>`GET /api/admin-accounts/{adminAccountId}`<br>`PATCH /api/admin-accounts/{adminAccountId}`<br>`POST /api/admin-accounts/{adminAccountId}/approvals`<br>`POST /api/ownership-transfers` | auth | Stories 1.11, 1.13 | required | `SUPER_ADMIN`, `ADMIN` as applicable | `admin-write` | TBD in owning story | TBD in owning story | planned | Super Admin account management and ownership transfer governance. |
| `GET /api/brands`<br>`POST /api/brands`<br>`GET /api/brands/{brandId}`<br>`PATCH /api/brands/{brandId}`<br>`POST /api/brands/{brandId}/archive`<br>`POST /api/brands/{brandId}/invitations`<br>`POST /api/brands/{brandId}/join-requests` | brands | Stories 2.1-2.6 | required | `ADMIN`, `SUPER_ADMIN` as applicable | `admin-write` | TBD in owning story | TBD in owning story | planned | Brand is catalog collaboration group, not store/tenant/merchant. |
| `GET /api/products`<br>`POST /api/products`<br>`GET /api/products/{productId}`<br>`PATCH /api/products/{productId}`<br>`GET /api/categories`<br>`POST /api/categories`<br>`PATCH /api/categories/{categoryId}`<br>`POST /api/products/{productId}/variants`<br>`PATCH /api/products/{productId}/variants/{variantId}`<br>`POST /api/products/{productId}/publish` | products | Stories 3.1-3.8 | public or required by endpoint | `PROSPECT`, `CUSTOMER`, `ADMIN`, `SUPER_ADMIN` as applicable | `public-read` or `admin-write` | TBD in owning story | TBD in owning story | planned | Catalog, categories, variants, prices, stock, publish/archive, and product snapshot fields. |
| `POST /api/checkouts`<br>`POST /api/checkouts/{checkoutId}/validations`<br>`POST /api/checkouts/{checkoutId}/reservations` | checkout | Stories 5.1, 5.2 | required | `CUSTOMER` | `checkout-payment` | TBD in owning story | TBD in owning story | planned | Checkout identity/contact validation, server cart validation, and inventory reservation. |
| `POST /api/payments`<br>`GET /api/payments/{paymentId}`<br>`POST /api/payments/{paymentId}/reconciliations` | payments | Stories 5.3, 5.5, 5.7 | required | `CUSTOMER`, `ADMIN` as applicable | `checkout-payment` | TBD in owning story | TBD in owning story | planned | PayMongo handoff and safe payment status/reconciliation contracts. No raw provider payloads in public responses. |
| `POST /api/webhooks/paymongo` | webhooks | Story 5.4 | signature-verified webhook | N/A; verified provider caller | `webhook` | TBD in owning story | TBD in owning story | planned | Signature-verified, idempotent PayMongo webhook processing. Provider callers are not MVP user roles. |
| `GET /api/orders`<br>`GET /api/orders/{orderId}`<br>`PATCH /api/orders/{orderId}/fulfillment-status` | orders | Stories 6.1-6.3 | required | `CUSTOMER`, `ADMIN`, `SUPER_ADMIN` as applicable | `public-read` or `admin-write` | TBD in owning story | TBD in owning story | planned | Customer own-order status, Admin order list/detail, fulfillment transitions, and emails. |
| `GET /api/orders/{orderId}/returns`<br>`POST /api/orders/{orderId}/returns`<br>`GET /api/orders/{orderId}/refunds`<br>`POST /api/orders/{orderId}/refunds` | returns-refunds | Stories 6.4-6.6 | required | `CUSTOMER`, `ADMIN`, `SUPER_ADMIN` as applicable | `public-read` or `admin-write` | TBD in owning story | TBD in owning story | planned | Manual return/refund recording and customer-safe order truth timeline. |
| `POST /api/assets/product-images`<br>`PATCH /api/assets/product-images/{assetId}`<br>`DELETE /api/assets/product-images/{assetId}` | assets | Stories 3.5, 3.8 | public or required by endpoint | `PROSPECT`, `CUSTOMER`, `ADMIN`, `SUPER_ADMIN` as applicable | `public-read` or `asset-upload` | TBD in owning story | TBD in owning story | planned | Product asset metadata and R2-backed media references that preserve historical order snapshots. |
| `GET /api/audit-events`<br>`GET /api/activity-history` | audit | Stories 7.1, 7.2 | required | `ADMIN`, `SUPER_ADMIN` as applicable | `admin-write` | TBD in owning story | TBD in owning story | planned | Sensitive action audit events and authorized activity history. |

## Contract Requirements For Future Rows

Completed rows must name concrete TypeBox/Elysia schemas, public auth metadata, documented rate-limit class, and stable error codes. Public API JSON stays camelCase. Controllers/services map database snake_case rows to DTOs at transport boundaries.

Completed endpoint routes must include:

- Params, query, body, and response schemas where applicable.
- OpenAPI `summary`, `description`, and `tags`.
- `x-auth`, `x-rate-limit-class`, and `x-error-codes` through `routeDetail(...)`.
- Success envelope `{ data, meta }` and error envelope `{ error: { code, message, details? } }`.
- Safe docs content only: no secrets, tokens, raw provider payloads, environment values, stack traces, or unnecessary PII.
