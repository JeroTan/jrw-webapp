# Plan: Admin Login Implementation (Feature 00007)

## I. Architectural Alignment

- **Project Constitution (Principle 3)**: Maintains strict isolation between the Route (definitions) and the Service (business logic).
- **Design Pillar (Security)**: Adheres to the JWT + WebCrypto strategy. All security operations (hashing/encryption) occur at the Edge.
- **Design Pillar (Structure)**: Follows the Layered Pattern: `IdentityRoutes` -> `IdentityController` -> `IdentityService`.

## II. Data Model & Schema Changes

- **No Table Changes**: Uses the existing `admins` table in `src/domain/schema/identity.ts`.
- **API Contract**: Keeps the `tboxLoginBody` (email/password) and returns a `tboxApiResponse` with a `token`.

## III. Atomic Task List

### 1. Business Logic Layer (IdentityService)

- [x] **Implement functional adminLogin**
  > **Detailed Summary:** Update `src/domain/services/IdentityService.ts`. Import `verifyHash` and `jwtEncrypt`. Inject the D1 database instance. Implement `adminLogin(email, password)` to query the `admins` table using Drizzle. If user is found, verify the salted hash. If successful, generate a JWT with payload `{ sub: admin.id, email: admin.email, is_owner: admin.is_owner }`. Return a `Result` object (Success or Generic Unauthorized).

### 2. Presentation Layer (IdentityController)

- [x] **Update handleAdminLogin**
  > **Detailed Summary:** Update `src/api/controller/IdentityController.ts`. Refactor `handleAdminLogin` to call the now-functional service method. Map the `Result` output into the standardized `{ data, message }` JSON envelope.

## IV. Critical Path & Dependencies

1. **D1 Connectivity**: Relies on the `getDb()` adapter to interact with the database.
2. **Crypto Utils**: Relies on `src/lib/crypto/` being correctly imported and invoked.

## V. Verification & Testing Mechanism (MANDATORY)

| Requirement        | Verification Method        | Pass Criteria                                                               |
| :----------------- | :------------------------- | :-------------------------------------------------------------------------- |
| **Auth Security**  | Manual Test (Wrangler Dev) | `POST /api/admin/auth/login` with correct credentials returns a signed JWT. |
| **Fail Safety**    | Manual Test (Wrangler Dev) | Incorrect email or password returns HTTP 401 with "unauthorized access".    |
| **Token Payload**  | JWT.io Inspection          | Decoded token contains correct `sub`, `email`, and `is_owner` claims.       |
| **Type Integrity** | Static Analysis            | `npx tsc --noEmit` passes cleanly across all layers.                        |
