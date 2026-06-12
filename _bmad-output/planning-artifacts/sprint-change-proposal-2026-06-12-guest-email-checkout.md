# Sprint Change Proposal: Guest Email Checkout

Date: 2026-06-12
Status: proposed
Scope: Moderate correction within current Epic 5 plan

## 1. Issue Summary

Original product intent was that a shopper can place an order with email/contact/delivery details even without a Customer account. The planning artifacts did not document this strongly enough. Epic 5 and generated Story 5.1 drifted toward account-gated checkout language, which would incorrectly force registration or sign-in before order creation.

Evidence:

- User correction on 2026-06-12: shoppers can order with email; email is important regardless of account status.
- Existing database direction already allows nullable order ownership through `customer_id`, but PRD/Epic/UX story language did not consistently describe guest checkout.
- Previous Story 5.1 text treated Customer identity/auth as prerequisite instead of optional account assistance.

## 2. Impact Analysis

### Epic Impact

- Epic 5 remains valid but must explicitly support guest and signed-in checkout.
- Story 5.1 must collect checkout email/contact/delivery before payment without requiring account creation.
- Stories 5.2, 5.3, 5.5, and 5.7 must carry checkout email/order contact snapshot through validation, reservation, PayMongo handoff, webhook reconciliation, receipt, and payment email.
- Epic 6 Story 6.1 must allow signed-in Customer order history and safe guest receipt/status access.

### Story Impact

- Story 5.1 changed from account-gated identity gate to guest-email checkout details gate.
- Story 5.7 payment status and emails must use checkout email, not only Customer account email.
- Story 6.1 must deny raw email-only lookup and require signed receipt/status token or equivalent safe access for guest order status.

### Artifact Conflicts

- PRD needed updates across personas, user journeys, auth model, FR39, FR40, FR49, checkout API area, data objects, and rate limits.
- Epics needed updates across FR mapping, Epic 5 goal, Story 5.1, Story 5.7, and Epic 6 Story 6.1.
- Architecture needed checkout data flow updates for optional `customer_id` and order contact snapshots.
- UX specification needed purchase flow and checkout step updates for required email/contact/delivery plus optional sign-in/register/Google.
- Project context needed source-of-truth correction so future agents do not reintroduce account-gated checkout.

### Technical Impact

- Checkout details endpoint should accept guest requests and signed-in Customer requests.
- Signed-in Customer ID must come from server session only, never request body.
- Order/checkout persistence must store checkout email/contact/delivery snapshot.
- `customer_id` must remain nullable for guest checkout.
- Later account linking must require safe email verification.
- Receipt/status access must use signed token/link or equivalent safe lookup, not raw email search.
- Logs and errors must not leak raw PII, auth tokens, PayMongo payloads, or provider internals.

## 3. Recommended Approach

Use Direct Adjustment. Keep Epic 5 sequence and update PRD, epics, UX, architecture, project context, and Story 5.1. No rollback and no MVP reduction needed.

Rationale:

- Requirement is not new scope; it is missed original intent.
- Existing domain direction already supports nullable Customer reference.
- Story 5.1 is ready-for-dev but not implemented yet, so correction cost is low.
- Guest checkout improves conversion while preserving Customer account benefits.

Effort estimate: Medium
Risk level: Medium
Timeline impact: Low if corrected before Story 5.1 implementation starts

## 4. Detailed Change Proposals

### PRD

OLD:

- Customers register/verify/use Google and purchase.
- Prospects browse before account creation.
- Customer can submit checkout.

NEW:

- Shoppers can purchase as guests with required checkout email/contact/delivery.
- Customer account is optional and improves repeat purchase, saved details, and account order history.
- Checkout email is order identity for guest orders.
- Guest orders store email/contact/delivery snapshot and optional Customer reference.

Justification: Product intent requires ordering by email without account creation.

### Epics And Stories

OLD:

- Epic 5 centered on Customer checkout.
- Story 5.1 required account-oriented identity/contact validation.
- Story 6.1 only covered account order history.

NEW:

- Epic 5 covers guest or signed-in shoppers.
- Story 5.1 collects required checkout email/contact/delivery without forcing account creation.
- Optional sign-in/register/Google can prefill details but cannot block guest checkout.
- Story 6.1 covers account history and safe guest receipt/status access.

Justification: Implementation handoff must prevent Developer agent from building registration as payment prerequisite.

### Architecture

OLD:

- Checkout data flow implied Customer account path.

NEW:

- Checkout accepts guest or signed-in shopper.
- Order/checkout state stores contact snapshot and nullable `customer_id`.
- Account linking happens only after safe email verification.

Justification: Data model and endpoint design must preserve guest order ownership safely.

### UX

OLD:

- Checkout flow could be read as sign-in/email verification before checkout.

NEW:

- Details step asks for checkout email/contact/delivery immediately.
- Sign-in, register, and Google are optional account assist paths.
- Signed-in Customer details prefill only when available; missing fields stay blank/editable and required.
- Unverified Customer account state is account-help, not order blocker.

Justification: UI must not hide checkout form behind auth wall.

### Project Context

OLD:

- Customers register or use Google sign-in for purchase and order tracking.

NEW:

- Shoppers can purchase as guests with required checkout email/contact/delivery.
- Customers may register or use Google for repeat purchase, profile reuse, and account order history.

Justification: Persistent AI context must match corrected source-of-truth.

## 5. Implementation Handoff

Change classification: Moderate.

Developer agent responsibilities:

- Implement Story 5.1 as guest-email checkout details gate.
- Add checkout details validation for required email/name/phone/address/privacy acknowledgement.
- Use optional Customer session only for prefill and account convenience; prefill available safe fields only and require user completion for missing fields.
- Add guest-capable `POST /api/checkout/details` or equivalent focused route.
- Persist or pass checkout contact snapshot safely.
- Keep payment/order/reservation creation out of Story 5.1.
- Add tests for guest success, signed-in prefill, invalid details, nullable Customer reference, PII minimization, focus/error behavior, and cart preservation.

Product/PO responsibilities:

- Review updated PRD/Epics/Story 5.1 for exact guest checkout language.
- Confirm no future story reintroduces account-gated checkout before PayMongo handoff.

Architect responsibilities:

- Confirm order schema and route contract support nullable `customer_id` plus contact snapshot before payment implementation.

Success criteria:

- Shopper can begin checkout and enter email/contact/delivery without account.
- Signed-in Customer can reuse/prefill available account details and fill any missing required checkout details.
- Payment handoff cannot proceed until details and cart validation pass.
- Guest order status requires safe receipt/status access, not raw email lookup.
- Emails send to checkout email.
- Tests document guest and signed-in paths.

## Checklist Result

- [x] 1.1 Triggering story identified: Story 5.1.
- [x] 1.2 Core problem categorized: misunderstanding/missed documentation of original requirement.
- [x] 1.3 Evidence recorded from user correction and existing nullable customer direction.
- [x] 2.1 Epic 5 can continue after direct adjustment.
- [x] 2.2 Epic 5 and Story 5.1 require scope wording changes.
- [x] 2.3 Future impacts identified for Story 5.7 and Epic 6 Story 6.1.
- [x] 2.4 No new epic needed.
- [x] 2.5 Epic order unchanged.
- [x] 3.1 PRD conflicts identified and corrected.
- [x] 3.2 Architecture conflicts identified and corrected.
- [x] 3.3 UX conflicts identified and corrected.
- [x] 3.4 Project context updated.
- [x] 4.1 Direct Adjustment selected.
- [x] 4.2 Rollback rejected.
- [x] 4.3 MVP review not required.
- [x] 4.4 Recommended path documented.
- [x] 5.1-5.5 Proposal and handoff documented.
- [!] 6.3 User approval pending.
