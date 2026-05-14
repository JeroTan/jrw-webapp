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
  H --> I["src/server/context/request-context.ts<br/>requestId + actor from jrw_session"]
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

### POST /api/auth/sessions

```mermaid
flowchart TD
  A["POST /api/auth/sessions"] --> B["src/pages/api/[...slug].ts"]
  B --> C["src/server/app.ts"]
  C --> D["src/server/context/request-context.ts<br/>requestId + actor"]
  D --> E["src/server/routes/auth.routes.ts<br/>body schema + route handler"]
  E --> F["createRuntimeController()<br/>requires DB + PASSWORD_PEPPER"]
  F --> G["src/server/controllers/AuthController.ts<br/>createSession()"]
  G --> H["src/server/services/AuthService.ts<br/>signIn()"]
  H --> I["src/server/repositories/AuthRepository.ts<br/>rateLimiter.isLimited()"]
  I --> J["AuthRepository.accounts.findByEmail()<br/>admins then customers"]
  J --> K["src/domain/auth/password-credentials.ts<br/>verifyPasswordCredential()"]
  K --> L["src/domain/auth/auth-decisions.ts<br/>evaluateAccountEligibility()"]
  L --> M["src/domain/auth/session-credentials.ts<br/>createSessionCredential()"]
  M --> N["AuthRepository.sessions.createSession()<br/>insert sessions"]
  N --> O["auth.routes.ts<br/>set HttpOnly jrw_session cookie"]
  O --> P["Response: actor + session, no raw token"]
```

### DELETE /api/auth/sessions/current

```mermaid
flowchart TD
  A["DELETE /api/auth/sessions/current"] --> B["src/pages/api/[...slug].ts"]
  B --> C["src/server/app.ts"]
  C --> D["src/server/routes/auth.routes.ts<br/>read jrw_session cookie"]
  D --> E["createRuntimeController()<br/>requires DB + PASSWORD_PEPPER"]
  E --> F["src/server/controllers/AuthController.ts<br/>deleteCurrentSession()"]
  F --> G["src/server/services/AuthService.ts<br/>signOut()"]
  G --> H{"Cookie token present?"}
  H -->|"No"| I["Return cleared=true revoked=false"]
  H -->|"Yes"| J["src/domain/auth/session-credentials.ts<br/>hashSessionToken()"]
  J --> K["AuthRepository.sessions.revokeByTokenHash()<br/>update sessions"]
  I --> L["auth.routes.ts<br/>clear jrw_session cookie"]
  K --> L
  L --> M["Response: signed out"]
```

### GET /api/auth/session

```mermaid
flowchart TD
  A["GET /api/auth/session"] --> B["src/pages/api/[...slug].ts"]
  B --> C["src/server/app.ts"]
  C --> D["src/server/routes/auth.routes.ts<br/>read jrw_session cookie"]
  D --> E["createRuntimeController()<br/>requires DB + PASSWORD_PEPPER"]
  E --> F["src/server/controllers/AuthController.ts<br/>getCurrentSession()"]
  F --> G["src/server/services/AuthService.ts<br/>inspectSession()"]
  G --> H{"Cookie token present?"}
  H -->|"No"| I["Return anonymous actor"]
  H -->|"Yes"| J["hashSessionToken()"]
  J --> K["AuthRepository.sessions.findByTokenHash()"]
  K --> L["src/domain/auth/auth-decisions.ts<br/>evaluateSessionState()"]
  L --> M["AuthRepository.accounts.findByActor()"]
  M --> N["AuthRepository.sessions.touchSession()"]
  N --> O["Response: authenticated actor"]
  I --> P["Response: anonymous actor"]
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
  C --> D["src/server/context/request-context.ts<br/>actor from jrw_session"]
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
  C --> D["src/server/context/request-context.ts<br/>actor from jrw_session"]
  D --> E["src/server/routes/customer.routes.ts<br/>profile patch schema"]
  E --> F["createRuntimeController()<br/>requires DB + PASSWORD_PEPPER"]
  F --> G["src/server/controllers/CustomerAccountController.ts<br/>updateProfile()"]
  G --> H["src/server/services/CustomerAccountService.ts<br/>updateProfile()"]
  H --> I["requireCustomerActor()<br/>must be CUSTOMER"]
  I --> J["src/domain/customers/customer-account.ts<br/>validateCustomerProfileUpdate()"]
  J --> K["CustomerAccountRepository.updateCustomerProfile()"]
  K --> L["Response: updated CustomerProfileDto"]
```

### Unknown /api/** Route

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

### Auth Recovery And OAuth

```mermaid
flowchart TD
  A["POST /api/password-resets"] --> X["src/pages/api/[...slug].ts"]
  B["POST /api/oauth/google/sessions"] --> X
  X --> Y["src/server/app.ts"]
  Y --> Z["planned src/server/routes/auth.routes.ts expansion"]
  Z --> T["To be implemented"]
```

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
