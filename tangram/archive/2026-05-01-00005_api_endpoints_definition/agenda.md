# Agenda: API Endpoints Definition (Feature 00005)

## 1. Feature Intent
To establish the complete, pure API routing and container architecture for the entire application. This phase focuses strictly on endpoint definition, input/output validation mapping (using TypeBox), and API documentation (Swagger/OpenAPI via Elysia), without implementing the underlying business or technical logic yet.

## 2. Target Audience
- Frontend Developers (who need immediate access to the API contracts/Swagger docs).
- Backend Engineers (who will later implement the business logic in the Services layer).

## 3. Core Requirements
- **Strict Logic Separation**: Routes MUST only be used for definition and documentation. All endpoint handlers must delegate to methods inside the Controller layer.
- **Empty Handlers**: Controller methods will return mock data or basic placeholder responses (`tboxApiResponse` structure) for now, fulfilling the contract without actual DB or DO interactions.
- **Domain Containers**: Define the DI setup for our Bounded Contexts:
  - `IdentityContainer` (Auth, Customer Profiles)
  - `CatalogContainer` (Products, Variants)
  - `TransactionContainer` (Checkout, Orders, Webhooks)
  - `AdminContainer` (Admin CRUD, Audit Logs)
- **OpenAPI Integration**: Ensure every route has proper `detail` metadata (tags, summaries, descriptions) so the `/swagger` endpoint provides a comprehensive API map.

## 4. Out of Scope
- Actual database queries (Cloudflare D1).
- Durable Object interactions for stock locking.
- Real PayMongo webhook verification or Resend email dispatch.
- Authentication validation logic (JWT parsing) – though the routes for login/registration will be defined.

## 5. Success Criteria
- The Elysia Swagger UI successfully renders all endpoints across all domains.
- All endpoints correctly map TypeBox schemas for inputs (`body`, `query`, `params`) and outputs (`response`).
- The project compiles successfully (`npx tsc --noEmit`).
