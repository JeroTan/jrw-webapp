# API File Flow

## General File Flow

```mermaid
flowchart TD
  A["HTTP request: /api/**"] --> B["src/pages/api/[...slug].ts<br/>Astro catch-all"]
  B --> C["bindAstroBridgeDecorations()<br/>runtimeEnv + ctx.url + astroCookies"]
  C --> D["src/server/app.ts<br/>createApp().handle(request)"]
  D --> E["@elysiajs/openapi<br/>docs UI + docs JSON"]
  D --> F["src/server/middleware/cors.ts"]
  D --> G["onError()<br/>standard error envelope + x-request-id"]
  D --> H["src/lib/elysia/astroBridgeContext.ts<br/>request-scoped Astro data"]
  H --> I["src/server/context/request-context.ts<br/>requestId + actor from realm cookie"]
  I --> J["src/server/routes/index.ts<br/>mount canonical route groups"]
  J --> K["src/server/routes/*.routes.ts<br/>transport schema + handler"]
  K --> L["src/server/controllers/**<br/>orchestrate HTTP-facing use case"]
  L --> M["src/server/services/**<br/>business workflow"]
  M --> N["src/domain/**<br/>pure rules + credentials + decisions"]
  M --> O["src/server/repositories/**<br/>D1 reads/writes"]
  M --> P["src/adapter/**<br/>provider adapters"]
  O --> Q["Cloudflare D1"]
  P --> R["Resend / R2 / PayMongo / other provider"]
```

Debug order:

1. `src/pages/api/[...slug].ts`
2. `src/server/app.ts`
3. `src/server/context/request-context.ts`
4. `src/server/routes/index.ts`
5. `src/server/routes/<group>.routes.ts`
6. `src/server/controllers/<Thing>Controller.ts`
7. `src/server/services/<Thing>Service.ts`
8. `src/domain/**`
9. `src/server/repositories/**` or `src/adapter/**`

Notes:

- Active backend source of truth: `src/server/**`.
- Planned endpoint source: `_bmad-output/implementation-artifacts/1-3-api-endpoint-catalog.md`.
- Deprecated brownfield route tree intentionally excluded here.

## Active Endpoint Flows

### GET /api/

```mermaid
flowchart TD
  A["GET /api/"] --> B["src/pages/api/[...slug].ts"]
  B --> C["src/server/app.ts"]
  C --> D["src/server/routes/index.ts"]
  D --> E["src/server/routes/foundation.routes.ts"]
  E --> F["requestContext.requestId"]
  F --> G["src/lib/api/response.ts<br/>apiSuccessWithRequestId()"]
  G --> H["Response: { data, meta }"]
```

### GET /api/openapi and GET /api/openapi/json

```mermaid
flowchart TD
  A["GET /api/openapi<br/>GET /api/openapi/json"] --> B["src/pages/api/[...slug].ts"]
  B --> C["src/server/app.ts"]
  C --> D["@elysiajs/openapi plugin"]
  D --> E["src/server/openapi/documentation.ts"]
  E --> F["Mounted route contracts"]
  F --> G["OpenAPI UI or JSON response"]
```

### Realm-Specific Email/Password Auth

```mermaid
flowchart TD
  A["POST /api/admin/auth/sessions<br/>POST /api/customer/auth/sessions"] --> B["src/pages/api/[...slug].ts"]
  A2["DELETE /api/admin/auth/sessions/current<br/>DELETE /api/customer/auth/sessions/current"] --> B
  A3["GET /api/admin/auth/session<br/>GET /api/customer/auth/session"] --> B
  B --> C["src/server/app.ts"]
  C --> D["src/server/context/request-context.ts<br/>requestId + actor"]
  D --> E["src/server/routes/auth.routes.ts<br/>realm route config"]
  E --> F["createRuntimeController()<br/>requires DB + PASSWORD_PEPPER"]
  F --> G["src/server/controllers/AuthController.ts<br/>createSession()"]
  G --> H["src/server/services/AuthService.ts<br/>signIn()"]
  H --> I["src/server/repositories/AuthRepository.ts<br/>rateLimiter.isLimited()"]
  I --> J{"Realm path"}
  J -->|"Admin"| K["AdminAuthRepository<br/>admins only"]
  J -->|"Customer"| L["CustomerAuthRepository<br/>customers only"]
  K --> M["src/domain/auth/password-credentials.ts<br/>verifyPasswordCredential()"]
  L --> M
  M --> N["src/domain/auth/auth-decisions.ts<br/>evaluateAccountEligibility()"]
  N --> O["src/domain/auth/session-credentials.ts<br/>createSessionCredential()"]
  O --> P["AuthRepository.sessions.createSession()<br/>insert sessions with ADMIN or CUSTOMER actor_kind"]
  P --> Q["auth.routes.ts<br/>set jrw_admin_session or jrw_customer_session"]
  Q --> R["Response: actor + session, no raw token"]
```

### Realm-Specific Session Delete/Inspect

```mermaid
flowchart TD
  A["DELETE /api/admin/auth/sessions/current<br/>GET /api/admin/auth/session"] --> B["src/pages/api/[...slug].ts"]
  A2["DELETE /api/customer/auth/sessions/current<br/>GET /api/customer/auth/session"] --> B
  B --> C["src/server/app.ts"]
  C --> D["src/server/routes/auth.routes.ts<br/>read realm cookie"]
  D --> E["createRuntimeController()<br/>requires DB + PASSWORD_PEPPER"]
  E --> F["src/server/controllers/AuthController.ts<br/>deleteCurrentSession() or getCurrentSession()"]
  F --> G["src/server/services/AuthService.ts<br/>signOut() or inspectSession()"]
  G --> H{"Cookie token present?"}
  H -->|"No"| I["Return anonymous or revoked=false"]
  H -->|"Yes"| J["hashSessionToken()"]
  J --> K["AuthRepository.sessions<br/>revoke, find, or touch session"]
  K --> L{"Realm path"}
  L -->|"Admin"| M["AdminAuthRepository.findByActor()<br/>admins only"]
  L -->|"Customer"| N["CustomerAuthRepository.findByActor()<br/>customers only"]
  M --> O["Response envelope"]
  N --> O
  I --> O
```

### Realm-Specific Password Recovery

```mermaid
flowchart TD
  A["POST /api/admin/auth/password-resets<br/>POST /api/admin/auth/password-resets/confirmations"] --> B["src/pages/api/[...slug].ts"]
  A2["POST /api/customer/auth/password-resets<br/>POST /api/customer/auth/password-resets/confirmations"] --> B
  A3["POST /api/customer/auth/email-verifications/requests"] --> B
  B --> C["src/server/app.ts"]
  C --> D["src/server/routes/account-recovery.routes.ts<br/>realm route config"]
  D --> E["createRuntimeController()<br/>requires DB + PASSWORD_PEPPER"]
  E --> F{"Realm path"}
  F -->|"Admin"| G["AdminAccountRecoveryRepository<br/>admins + password_reset_tokens only"]
  F -->|"Customer"| H["CustomerAccountRecoveryRepository<br/>customers + password/email tokens only"]
  G --> I["AccountRecoveryService<br/>reset request or confirmation"]
  H --> I
  I --> J["Response envelope<br/>no account enumeration"]
```

### Google OAuth Customer Sign-In

```mermaid
flowchart TD
  A["GET /api/oauth/google/sessions<br/>GET /api/oauth/google/callback"] --> B["src/pages/api/[...slug].ts"]
  B --> C["src/server/app.ts"]
  C --> D["src/server/routes/google-oauth.routes.ts"]
  D --> E["GoogleOAuthController"]
  E --> F["GoogleOAuthService"]
  F --> G["GoogleOAuthRepository<br/>customers + customer_providers only"]
  G --> H["AuthRepository.sessions.createSession()<br/>actor_kind CUSTOMER"]
  H --> I["google-oauth.routes.ts<br/>set jrw_customer_session"]
  I --> J["Redirect response"]
```

### POST /api/customers

```mermaid
flowchart TD
  A["POST /api/customers"] --> B["src/pages/api/[...slug].ts"]
  B --> C["src/server/app.ts"]
  C --> D["src/server/routes/customer.routes.ts<br/>registration schema"]
  D --> E["createRuntimeController()<br/>requires DB + PASSWORD_PEPPER"]
  E --> F["src/adapter/infrastructure/resend/CustomerVerificationEmailNotifier.ts<br/>RESEND_FROM_EMAIL + APP_BASE_URL fallback"]
  F --> G["src/server/controllers/CustomerAccountController.ts<br/>registerCustomer()"]
  G --> H["src/server/services/CustomerAccountService.ts<br/>registerCustomer()"]
  H --> I["src/domain/customers/customer-account.ts<br/>validateCustomerRegistration()"]
  I --> J["AuthRepository rate limiter<br/>auth_rate_limits"]
  J --> K["CustomerAccountRepository.findCustomerByEmail()"]
  K --> L["customer-account.ts<br/>evaluateRegistrationAccountState()"]
  L --> M["src/domain/auth/password-credentials.ts<br/>createCustomerPasswordCredential()"]
  M --> N["CustomerAccountRepository.createCustomer()<br/>insert customers"]
  N --> O["src/domain/auth/email-verification-token.ts<br/>createEmailVerificationCredential()"]
  O --> P["CustomerAccountRepository.createEmailVerificationToken()"]
  P --> Q["CustomerVerificationEmailNotifier.sendVerificationEmail()<br/>Resend"]
  Q --> R["Response: customer summary + sent flag"]
```

### POST /api/email-verifications

```mermaid
flowchart TD
  A["POST /api/email-verifications"] --> B["src/pages/api/[...slug].ts"]
  B --> C["src/server/app.ts"]
  C --> D["src/server/routes/customer.routes.ts<br/>verification schema"]
  D --> E["createRuntimeController()<br/>requires DB + PASSWORD_PEPPER"]
  E --> F["src/server/controllers/CustomerAccountController.ts<br/>verifyEmail()"]
  F --> G["src/server/services/CustomerAccountService.ts<br/>verifyEmail()"]
  G --> H["src/domain/auth/email-verification-token.ts<br/>validate + hash token"]
  H --> I["CustomerAccountRepository.findVerificationTokenByHash()"]
  I --> J["email-verification-token.ts<br/>evaluateEmailVerificationTokenState()"]
  J --> K["CustomerAccountRepository.findCustomerById()"]
  K --> L["CustomerAccountRepository.markEmailVerifiedAndTokenUsed()<br/>D1 batch"]
  L --> M["Response: verified=true"]
```

### GET /api/customers/me

```mermaid
flowchart TD
  A["GET /api/customers/me"] --> B["src/pages/api/[...slug].ts"]
  B --> C["src/server/app.ts"]
  C --> D["src/server/context/request-context.ts<br/>actor from jrw_customer_session"]
  D --> E["src/server/routes/customer.routes.ts"]
  E --> F["createRuntimeController()<br/>requires DB + PASSWORD_PEPPER"]
  F --> G["src/server/controllers/CustomerAccountController.ts<br/>getProfile()"]
  G --> H["src/server/services/CustomerAccountService.ts<br/>getProfile()"]
  H --> I["requireCustomerActor()<br/>must be CUSTOMER"]
  I --> J["CustomerAccountRepository.findCustomerById()"]
  J --> K["Response: CustomerProfileDto"]
```

### PATCH /api/customers/me

```mermaid
flowchart TD
  A["PATCH /api/customers/me"] --> B["src/pages/api/[...slug].ts"]
  B --> C["src/server/app.ts"]
  C --> D["src/server/context/request-context.ts<br/>actor from jrw_customer_session"]
  D --> E["src/server/routes/customer.routes.ts<br/>profile patch schema"]
  E --> F["createRuntimeController()<br/>requires DB + PASSWORD_PEPPER"]
  F --> G["src/server/controllers/CustomerAccountController.ts<br/>updateProfile()"]
  G --> H["src/server/services/CustomerAccountService.ts<br/>updateProfile()"]
  H --> I["requireCustomerActor()<br/>must be CUSTOMER"]
  I --> J["src/domain/customers/customer-account.ts<br/>validateCustomerProfileUpdate()"]
  J --> K["CustomerAccountRepository.updateCustomerProfile()"]
  K --> L["Response: updated CustomerProfileDto"]
```

### Unknown /api/\*\* Route

```mermaid
flowchart TD
  A["Any unmounted /api/** route"] --> B["src/pages/api/[...slug].ts"]
  B --> C["src/server/app.ts"]
  C --> D["Elysia route lookup"]
  D --> E["No mounted route match"]
  E --> F["onError()<br/>map NOT_FOUND"]
  F --> G["src/lib/api/response.ts<br/>apiErrorWithRequestId()"]
  G --> H["Response: 404 error envelope"]
```

## Planned Endpoint Flows

Planned endpoints still start at the same Astro catch-all. Their route/controller/service/domain/repository files do not exist yet or are not complete. Last node stays `To be implemented`.

Auth recovery and Google OAuth are active endpoint flows above.

### Admin Accounts And Ownership

```mermaid
flowchart TD
  A["GET /api/admin-accounts"] --> X["src/pages/api/[...slug].ts"]
  B["POST /api/admin-accounts"] --> X
  C["GET /api/admin-accounts/{adminAccountId}"] --> X
  D["PATCH /api/admin-accounts/{adminAccountId}"] --> X
  E["POST /api/admin-accounts/{adminAccountId}/approvals"] --> X
  F["POST /api/ownership-transfers"] --> X
  X --> Y["src/server/app.ts"]
  Y --> Z["planned canonical admin auth/governance routes"]
  Z --> T["To be implemented"]
```

### Brands

```mermaid
flowchart TD
  A["GET /api/brands"] --> X["src/pages/api/[...slug].ts"]
  B["POST /api/brands"] --> X
  C["GET /api/brands/{brandId}"] --> X
  D["PATCH /api/brands/{brandId}"] --> X
  E["POST /api/brands/{brandId}/archive"] --> X
  F["POST /api/brands/{brandId}/invitations"] --> X
  G["POST /api/brands/{brandId}/join-requests"] --> X
  X --> Y["src/server/app.ts"]
  Y --> Z["planned src/server/routes/brand.routes.ts"]
  Z --> T["To be implemented"]
```

### Products And Categories

```mermaid
flowchart TD
  A["GET /api/products"] --> X["src/pages/api/[...slug].ts"]
  B["POST /api/products"] --> X
  C["GET /api/products/{productId}"] --> X
  D["PATCH /api/products/{productId}"] --> X
  E["GET /api/categories"] --> X
  F["POST /api/categories"] --> X
  G["PATCH /api/categories/{categoryId}"] --> X
  H["POST /api/products/{productId}/variants"] --> X
  I["PATCH /api/products/{productId}/variants/{variantId}"] --> X
  J["POST /api/products/{productId}/publish"] --> X
  X --> Y["src/server/app.ts"]
  Y --> Z["planned src/server/routes/product.routes.ts + category routes"]
  Z --> T["To be implemented"]
```

### Product Assets

```mermaid
flowchart TD
  A["POST /api/assets/product-images"] --> X["src/pages/api/[...slug].ts"]
  B["PATCH /api/assets/product-images/{assetId}"] --> X
  C["DELETE /api/assets/product-images/{assetId}"] --> X
  X --> Y["src/server/app.ts"]
  Y --> Z["planned src/server/routes/asset.routes.ts"]
  Z --> T["To be implemented"]
```

### Checkout

```mermaid
flowchart TD
  A["POST /api/checkouts"] --> X["src/pages/api/[...slug].ts"]
  B["POST /api/checkouts/{checkoutId}/validations"] --> X
  C["POST /api/checkouts/{checkoutId}/reservations"] --> X
  X --> Y["src/server/app.ts"]
  Y --> Z["planned src/server/routes/checkout.routes.ts"]
  Z --> T["To be implemented"]
```

### Payments And Webhooks

```mermaid
flowchart TD
  A["POST /api/payments"] --> X["src/pages/api/[...slug].ts"]
  B["GET /api/payments/{paymentId}"] --> X
  C["POST /api/payments/{paymentId}/reconciliations"] --> X
  D["POST /api/webhooks/paymongo"] --> X
  X --> Y["src/server/app.ts"]
  Y --> Z["planned payment and webhook routes"]
  Z --> T["To be implemented"]
```

### Orders

```mermaid
flowchart TD
  A["GET /api/orders"] --> X["src/pages/api/[...slug].ts"]
  B["GET /api/orders/{orderId}"] --> X
  C["PATCH /api/orders/{orderId}/fulfillment-status"] --> X
  X --> Y["src/server/app.ts"]
  Y --> Z["planned src/server/routes/order.routes.ts"]
  Z --> T["To be implemented"]
```

### Returns And Refunds

```mermaid
flowchart TD
  A["GET /api/orders/{orderId}/returns"] --> X["src/pages/api/[...slug].ts"]
  B["POST /api/orders/{orderId}/returns"] --> X
  C["GET /api/orders/{orderId}/refunds"] --> X
  D["POST /api/orders/{orderId}/refunds"] --> X
  X --> Y["src/server/app.ts"]
  Y --> Z["planned return/refund routes"]
  Z --> T["To be implemented"]
```

### Audit And Activity

```mermaid
flowchart TD
  A["GET /api/audit-events"] --> X["src/pages/api/[...slug].ts"]
  B["GET /api/activity-history"] --> X
  X --> Y["src/server/app.ts"]
  Y --> Z["planned src/server/routes/audit.routes.ts"]
  Z --> T["To be implemented"]
```
