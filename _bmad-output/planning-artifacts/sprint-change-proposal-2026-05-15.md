# Sprint Change Proposal: Split Customer Registration From Profile And Checkout Details

Date: 2026-05-15
Project: jrw-webapp
Owner: MR. JRW
Mode: Batch draft

## 1. Issue Summary

Customer registration API currently advertises identity fields plus optional profile/contact/delivery fields in one request body. This makes registration look heavier than intended, even though the server already accepts email/password-only registration.

Trigger:

- User reviewed API and noticed registration feels convoluted.
- UX direction says prospect browses first, account comes later only when checkout needs identity.
- Checkout flow says registration/verification or Google sign-in happens before delivery/contact details.

Problem statement:

Registration should create trusted identity only. Profile/contact/delivery details should be collected after email verification, Google sign-in, or during checkout when needed.

Evidence:

- UX: Prospect browses first, account comes later only when checkout needs identity.
- UX: Step checkout is cart -> contact/delivery -> payment -> confirmation.
- UX anti-pattern: hiding storefront behind registration.
- PRD: Customer can register with email/password, verify email, sign in with Google, then manage profile fields.
- Epics: Story 1.8 combines registration, verification, and profile management, but Story 5.1 owns checkout identity/contact/delivery validation.
- Code: `src/server/routes/customer.routes.ts` registration body includes optional `displayName`, `firstName`, `lastName`, `phone`, `streetAddress`, `barangay`, `cityProvince`, `postalCode`, and `emailMarketingOptIn`.

## 2. Impact Analysis

Epic impact:

- Epic 1 remains valid, but Story 1.8 needs sharper boundaries.
- Epic 5 remains valid and should own checkout contact/delivery collection.
- No epic needs removal or reorder.

Story impact:

- Story 1.8 should define registration body as `email` + `password` only.
- Story 1.8 should keep profile management as separate authenticated profile update after verification/sign-in.
- Story 1.10 Google sign-in should create or link customer identity without password or address fields.
- Story 5.1 should collect contact/delivery details during checkout and decide whether to save them to profile/default address by explicit customer action.

Artifact conflicts:

- PRD mostly supports split already.
- UX strongly supports split already.
- Architecture supports split through identity/RBAC vs checkout/payments capability boundaries.
- API contract is current conflict: registration route exposes too many optional fields.

Technical impact:

- Low risk if registration route body is narrowed.
- Domain registration validator can be narrowed to identity-only.
- Existing profile update route can keep profile/contact fields.
- Checkout route later should own required delivery/contact validation.
- Tests need updates for OpenAPI contract and registration validation.

## 3. Recommended Approach

Recommended path: Direct Adjustment.

Rationale:

- Requirement already exists in PRD/UX/epics.
- Current implementation accepts email/password-only today, so behavior change is mostly contract cleanup.
- Narrower registration improves privacy minimization and mobile UX.
- Checkout data stays near checkout intent, where validation can be stricter.

Effort: Low to Medium.
Risk: Low.
Timeline impact: Small.

No rollback needed.
No MVP reduction needed.

## 4. Detailed Change Proposals

### Story 1.8: Customer Registration, Verification, and Profile

Section: Acceptance Criteria

OLD:

- Prospect submits valid registration details.
- Customer registers, verifies email, and manages basic profile details.

NEW:

- Prospect submits `email` and `password` only for initial registration.
- Registration creates an unverified `CUSTOMER` account and sends verification email.
- Profile details are managed through an authenticated profile update flow after verification/sign-in.
- Registration response and OpenAPI body do not include phone, address, delivery, or checkout fields.

Rationale:

Initial registration should be low-friction identity creation, not checkout/profile completion.

### Story 1.10: Customer Google Sign-In

Section: Acceptance Criteria

OLD:

- Google callback returns verified email for new Customer.

NEW:

- Google callback with safe verified email creates or links Customer identity.
- Google sign-in does not require password, phone, address, or checkout fields.
- Optional profile fields from Google are stored only if explicitly supported and privacy-safe.

Rationale:

OAuth identity should not inherit password registration shape.

### Story 5.1: Checkout Identity, Contact, and Delivery Validation

Section: Acceptance Criteria

OLD:

- Checkout prompts sign-in, registration, verification, or Google sign-in.
- Authenticated verified Customer enters contact/delivery details.

NEW:

- Checkout prompts sign-in, email/password registration, email verification, or Google sign-in when identity is missing.
- After identity is valid, checkout collects required contact/delivery details.
- Checkout can use existing profile/default details when present.
- Checkout saves delivery/contact details to profile/default address only through explicit customer choice or later approved story.

Rationale:

Checkout details belong to checkout, not registration.

### API Contract

Endpoint: `POST /api/customers`

OLD request body:

```json
{
  "email": "buyer@example.test",
  "password": "correct horse battery staple",
  "displayName": "Buyer",
  "firstName": "Juan",
  "lastName": "Buyer",
  "phone": "0917 123 4567",
  "streetAddress": "123 Sample St",
  "barangay": "Barangay 1",
  "cityProvince": "Cebu City",
  "postalCode": "6000",
  "emailMarketingOptIn": true
}
```

NEW request body:

```json
{
  "email": "buyer@example.test",
  "password": "correct horse battery staple"
}
```

Keep:

- `POST /api/email-verifications`
- `GET /api/customers/me`
- `PATCH /api/customers/me`

Future/additional checkout route:

- `POST /api/checkout/attempts` or approved existing checkout endpoint collects contact/delivery details with cart validation.

## 5. Implementation Handoff

Scope: Minor technical change, moderate planning cleanup.

Developer agent:

- Narrow `tboxCustomerRegistrationBody` to `email` and `password`.
- Narrow `validateCustomerRegistration` to ignore/reject profile/contact fields during registration.
- Keep `PATCH /api/customers/me` for profile/contact updates.
- Update route/domain/service tests.
- Verify OpenAPI registration body no longer exposes profile/contact/delivery fields.

Product Owner / Developer:

- Update Story 1.8, 1.10, and 5.1 wording if backlog artifacts are being maintained.
- Decide whether `emailMarketingOptIn` belongs at registration, profile, checkout, or newsletter-only flow.

Success criteria:

- Register API contract contains only `email` and `password`.
- Email/password registration still sends verification email.
- Google sign-in remains customer identity path without address fields.
- Profile update remains separate authenticated flow.
- Checkout later owns required contact/delivery validation.

## 6. Checklist Status

- [x] Trigger understood: registration API feels overloaded.
- [x] Core problem defined: identity creation mixed with profile/checkout data.
- [x] Epic impact assessed: Epic 1 and Epic 5 boundary cleanup only.
- [x] PRD/UX/Architecture conflict checked: docs support split; API contract conflicts.
- [x] Path forward selected: Direct Adjustment.
- [!] Approval needed before implementation.
- [!] Sprint status/backlog update only after approval.
