# Agenda: Admin Login Implementation (Feature 00007)

## Context
The goal is to transform the mock `POST /api/admin/auth/login` endpoint into a fully functional authentication system. We currently have the D1 schema, JWT utilities (`jose`), and password hashing (`WebCrypto`) in place, but the service logic is still mocked.

## Technical Alignment
- **Architecture**: Domain-Driven Design (DDD) with Service-Layer logic.
- **Security**: JWT-based auth using the existing `src/lib/crypto/` library.
- **Database**: Drizzle ORM querying Cloudflare D1.

## Interrogation Questions
1. **Scope Restriction**: You mentioned "one endpoint at a time." Should we strictly limit this feature to the login generation (producing a JWT), or do you also want the verification middleware (protecting routes with the JWT) implemented now?
2. **Persistence**: We will be querying the real `admins` table. Have you already seeded a test admin, or should I also verify the `scripts/seed-admin.ts` functionality?
3. **Error Handling**: For a functional login, do you want specific error codes (e.g., `INVALID_CREDENTIALS` vs `USER_NOT_FOUND`) or a generic "Unauthorized" response for security?
4. **Token Payload**: What standard claims should be in the JWT? (Currently planning: `sub` (id), `email`, and `is_owner`).

## Definition of Done
- `IdentityService.adminLogin` implemented with real D1 query and password verification.
- `IdentityController.handleAdminLogin` returns a real, encrypted JWT.
- Successful login verified via local `wrangler dev` testing (manual or automated).
