# Story 1.4 Observability Setup Checklist

Status: baseline
Owner: Story 1.4
Last updated: 2026-05-12

## Purpose

This checklist gates production readiness for request tracing, operational logs, safe error context, platform logs, and payment-critical failure visibility.

Real customer payments remain blocked until critical items are satisfied or explicitly accepted by owner.

## Existing Foundation

| Capability | Current file | Current baseline |
| --- | --- | --- |
| Request ID header constant and generation | `src/utils/request-id.ts` | Uses `x-request-id`, existing header reuse, and generated `req_...` fallback. |
| Per-request context | `src/server/context/request-context.ts` | Scoped Elysia derive creates request context and sets response header. |
| Safe operational log events | `src/adapter/infrastructure/logging/operational-log.ts` | Structured event shape with request ID, timestamp, actor context, target resource, error code, and scrubbed details. |
| API error handling | `src/server/app.ts` | Maps safe public errors, restores `x-request-id`, logs internal/provider failures, and returns public envelope with request ID. |
| Cloudflare observability config | `wrangler.jsonc` | Top-level `observability.enabled = true`, `head_sampling_rate = 1`. |

## Required Checklist

| Item | Required before real payments | Current status | Evidence required | Owner/story |
| --- | --- | --- | --- | --- |
| Request ID created or accepted for every API request | Yes | Foundation exists | API smoke check showing `x-request-id` response header. | Story 1.2, future API stories |
| Request ID propagated through app context | Yes | Foundation exists | Route/controller/service logging uses request context where operational failures can happen. | Future endpoint stories |
| Response includes `x-request-id` header | Yes | Foundation exists | Smoke check for `/api/` and changed API routes. | Story 1.2, future API stories |
| Safe error response includes request ID where useful | Yes | Foundation exists | Error path test or smoke check confirms envelope has safe error and request ID. | Future API stories |
| Structured JSON operational logs | Yes | Foundation exists | Cloudflare or console log sample with request ID/timestamp/error code. | Story 1.2, Story 7.3 |
| Scrubbed error/log details | Yes | Foundation exists | Tests or review evidence for passwords, tokens, cookies, auth headers, signatures, email, phone, address, PayMongo/provider/payment payloads, raw card data, pepper, stack. | Story 1.2, Story 7.5 |
| Cloudflare Workers Logs enabled for deployed envs | Yes | Partial | Confirm named env inheritance or add per-env observability config; record sampling. | Story 1.4, deploy stories |
| Source maps decision | Before production launch | Open | Document enabled/deferred/disabled; if enabled, confirm source visibility and secret safety. | Deployment readiness |
| Third-party error tracking decision | Before production payments | Open | Document enabled/deferred/accepted risk, environment gates, scrub rules, and DSN/secret handling. | Story 7.4 |
| Critical failure categories visible | Yes | Open | For each category below, record platform log/error tracking evidence. | Payment/auth/deploy owners |
| Launch blocker review | Yes | Open | Owner explicitly accepts or closes every critical blocker before real payments. | Owner |

## Critical Failure Categories

Each category needs at least Cloudflare Workers Logs coverage before production, and third-party error tracking decision before real customer payments.

| Category | Minimum event context | Launch status |
| --- | --- | --- |
| Unhandled API exceptions | Request ID, error code, route/resource, environment, sanitized details. | Blocked until smoke/error evidence exists. |
| Payment webhook failures | Request ID, provider event id if safe, payment/order id, error code, environment, sanitized details. | Blocked until signature and idempotency stories land. |
| Checkout/payment reconciliation failures | Request ID, checkout/order/payment id, actor role, error code, environment. | Blocked until payment reconciliation story lands. |
| Auth/email verification failures | Request ID, actor role or safe actor id, error code, environment, sanitized provider/email context. | Blocked until auth/email stories land. |
| Image upload failures | Request ID, actor role, product/resource id, error code, R2 operation class, environment. | Blocked for product image launch until Story 3.5 lands. |
| Provider timeouts | Request ID, provider name, operation class, error code, environment, retry/idempotency indicator. | Blocked for payment/email/image flows until each provider path records evidence. |
| D1 migration/deploy failures | Command, environment, D1 database name/id, migration file, timestamp, failure output. | Production migration remains review-gated. |

## Safe Event Context

Allowed operational event context:

- Request ID.
- Actor role.
- Safe actor identifier.
- Target resource identifier.
- Error code.
- Timestamp.
- Environment.
- Operation or route class.
- Sanitized details only.

Never log:

- Raw passwords, passphrases, password hashes, peppers.
- JWTs, tokens, OAuth secrets, cookies, sessions, auth headers, signatures.
- Raw PayMongo payloads, raw provider payloads, raw payment responses.
- Raw card data.
- Stack traces in public responses.
- Admin/customer email, phone, address, or other unnecessary PII in operational event details.

## Cloudflare Logs Checklist

| Check | Required evidence |
| --- | --- |
| Development env Workers Logs visible | Screenshot/link or copied excerpt showing request ID and sanitized error event. |
| Production env Workers Logs configured | Review note before production deploy. |
| Sampling rate documented | Current baseline: top-level `head_sampling_rate = 1`; verify env behavior. |
| Log retention understood | Document Cloudflare retention limits and whether additional export/error tracking is needed. |
| Alerting decision | Decide whether Workers Logs alone are enough for launch or third-party alerts are required. |

## Launch Blockers

Real customer payments are blocked while any critical item remains open:

- Named env Cloudflare observability behavior unverified.
- Third-party error tracking decision missing or risk not explicitly accepted.
- Payment webhook failures lack signature/idempotency/log evidence.
- Checkout/payment reconciliation failures lack safe trace evidence.
- Operational logs can expose raw payment/provider payloads or PII.
- No owner acceptance recorded for unresolved critical observability risk.
