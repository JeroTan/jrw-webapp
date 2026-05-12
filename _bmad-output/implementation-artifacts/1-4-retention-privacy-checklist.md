# Story 1.4 Retention And Privacy Checklist

Status: baseline
Owner: Story 1.4
Last updated: 2026-05-12

## Purpose

This checklist records PII/data purpose, access scope, owning story, retention owner, retention rule status, deletion/review notes, privacy notice needs, and launch blockers.

JRW app must not collect raw card details. PayMongo hosted/controlled payment capture remains required.

## PII And Sensitive Data Baseline

| Field/group | Table/source | Purpose | Access scope | Owning story | Retention owner | Retention rule | Deletion/review notes | Privacy notice required | Launch blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Admin email | `admins.email` | Admin login, account management, audit actor identity. | Super Admin; own admin where applicable. | Stories 1.6, 1.11, 1.13 | Super Admin | TBD before production launch. | Preserve if needed for audit history; review anonymization on account removal. | Admin notice required. | Yes, until retention owner/rule defined. |
| Admin password hash | `admins.password_hash` | Admin credential verification. | Server auth only; never returned to client/logs. | Stories 1.6, 1.7, 1.11 | Super Admin/security owner | Retain while admin account active; rotate/reset through auth flow. | Delete or invalidate when account removed; never expose raw hash. | Admin notice required. | Yes, until auth access controls land. |
| Admin owner/approval state | `admins.is_owner`, future approval/suspension fields | Super Admin uniqueness and admin account governance. | Super Admin; audit-visible. | Stories 1.6, 1.11, 1.13 | Super Admin | Retain while admin account exists; audit history retained per audit rule. | Ownership transfer must keep audit trail. | Admin notice required. | Yes, until unique owner and transfer rules land. |
| Customer email | `customers.email` | Registration, login, order notifications, verification, support. | Customer self; Admin/Super Admin for order/customer operations. | Stories 1.8, 1.9, 1.10, 6.1 | Privacy owner TBD | TBD before registration launch. | Support correction/deletion review needed; order records may need retained legal/business trail. | Registration and checkout notice required. | Yes, until retention owner/rule and notice exist. |
| Customer password hash | `customers.password_hash` | Customer credential verification. | Server auth only; never returned/logged. | Stories 1.8, 1.9 | Security/privacy owner TBD | Retain while credential login active; delete/invalidate on account deletion/reset flow. | Never expose raw hash; ensure reset token separate and hashed. | Registration notice required. | Yes, until auth story lands. |
| Customer name | `customers.first_name`, `customers.last_name` | Account profile, delivery/contact, order display. | Customer self; Admin/Super Admin for order fulfillment/support. | Story 1.8, checkout stories | Privacy owner TBD | TBD before checkout launch. | Review deletion/anonymization when no longer needed, subject to order history obligations. | Registration and checkout notice required. | Yes, until notice and access scope accepted. |
| Customer phone | `customers.phone` | Delivery coordination and customer contact. | Customer self; Admin/Super Admin for fulfillment/support. | Story 1.8, Story 5.1 | Privacy owner TBD | TBD before checkout launch. | Avoid logs; delete/anonymize when not needed unless order record retention applies. | Checkout notice required. | Yes, until retention rule defined. |
| Address fields | `customers.street_address`, `barangay`, `city_province`, `postal_code`; future checkout delivery address | Delivery fulfillment and customer profile. | Customer self; Admin/Super Admin for fulfillment/support. | Story 1.8, Story 5.1 | Privacy owner TBD | TBD before checkout launch. | Avoid operational logs; review default retention after order completion. | Checkout notice required. | Yes, until retention rule and privacy notice exist. |
| OAuth provider identity | `customer_providers.provider`, `provider_user_id` | Customer Google sign-in link. | Customer self; server auth; limited admin visibility only when needed. | Story 1.10 | Security/privacy owner TBD | Retain while OAuth link active. | Support unlink/delete flow required; avoid displaying provider subject IDs. | Registration notice required. | Yes, until OAuth retention/access scope documented. |
| OAuth avatar URL | `customers.avatar_url` | Customer profile display. | Customer self; admin visibility only where product needs it. | Story 1.10 | Privacy owner TBD | TBD; likely retain while account active and profile chooses it. | Delete/update on unlink/profile edit; avoid caching beyond need. | Registration notice required. | Yes, until profile/avatar policy defined. |
| OAuth provider metadata | `customer_providers.metadata` | Troubleshooting/account link snapshot if retained. | Server auth/support only; highly restricted. | Story 1.10 | Security/privacy owner TBD | Prefer minimized sanitized fields; raw provider payload retention needs explicit approval. | Do not store raw provider payload unless approved; scrub before logs. | Registration notice required if retained. | Yes if raw or unnecessary metadata collected. |
| Order history | `orders`, `order_snapshots`, future order status/timeline tables | Customer order tracking, fulfillment, records. | Customer own orders; Admin/Super Admin for operations. | Stories 5.5, 6.1-6.3 | Operations/privacy owner TBD | TBD; likely business/legal retention period. | Deletion may anonymize customer link while preserving business records if required. | Checkout notice required. | Yes, until order retention owner/rule defined. |
| Payment metadata | Future payment/payment events tables; PayMongo IDs only | Payment reconciliation, support, fraud/dispute review. | Server/payment operations; Admin/Super Admin limited support view. | Stories 5.3-5.5 | Operations/security owner TBD | TBD before real payments. | Store PayMongo IDs and sanitized status only; do not store raw card details or raw provider payloads. | Checkout/payment notice required. | Yes, until payment data policy and observability accepted. |
| Raw card data | Must not be stored in JRW app | Not applicable; PayMongo hosted capture only. | None in JRW app. | Story 5.3 | Security owner | Prohibited. | Any raw card collection is production blocker and must be removed. | Checkout/payment notice can state hosted payment processing. | Yes if collected. |
| Audit actor identifiers | `audit_logs.admin_id`, future actor fields | Sensitive action audit trail. | Super Admin/Admin with audit permission; server. | Stories 7.1-7.2 | Compliance/privacy owner TBD | TBD; must balance accountability with privacy. | Preserve integrity; redact unnecessary PII in details. | Admin notice required; customer notice if customer identifiers appear. | Yes, until audit access and retention defined. |
| Audit/log details | `audit_logs.details`, operational logs | Accountability, troubleshooting, incident review. | Restricted admin/security/operations. | Stories 7.1-7.5 | Security/privacy owner TBD | TBD; platform log retention must be known. | Scrub secrets, tokens, provider payloads, emails, phone, address, card data, stack traces. | Admin/customer notice depending data included. | Yes if scrub evidence missing. |
| Request IDs | API context, logs, error responses | Trace requests and support troubleshooting. | Admin/security/operations; may appear in customer-safe error response. | Stories 1.2, 7.3 | Operations owner TBD | TBD with log retention. | Request IDs should not encode PII. | Privacy notice optional unless tied to account logs. | No if random/non-PII and retention documented before launch. |
| Image metadata | `product_photos`, R2 object ids, future upload metadata | Product catalog asset display and historical snapshots. | Admin/Super Admin; public product images when published. | Story 3.5 | Catalog owner | Retain while product/snapshot requires it. | Preserve historical order image references; review EXIF stripping if user-uploaded images added. | Not customer PII for product assets; support if user uploads later. | No for product assets; yes if customer uploads added. |
| Support/contact records | Future support/contact tables/forms | Support communication and issue resolution. | Admin/Super Admin/support role when added. | Future support story | Support/privacy owner TBD | TBD before feature launch. | Define deletion, export, and sensitive-content handling. | Contact/support notice required. | Yes before support launch. |

## Required Before Registration

- Privacy notice covers customer email, password hash, name, optional phone/address/profile data, OAuth identity/avatar if enabled.
- Access scope documented for customer self-service and admin support.
- Retention owner and retention rule defined for customer PII.
- Password hashes and OAuth tokens/provider data never appear in logs or public responses.

## Required Before Checkout

- Checkout/payment notice covers delivery contact data, order history, PayMongo hosted payment processing, and payment metadata.
- JRW app does not collect raw card details.
- Address/phone retention rule exists.
- Payment metadata policy exists before real payments.
- Admin order access scope exists.

## Production Launch Blockers

Production launch remains blocked by any of these:

- Missing privacy notice before registration or checkout.
- Undefined retention owner/rule for customer PII.
- Unnecessary PII collection without purpose.
- Raw provider payload exposure or retention without explicit approval.
- Raw payment/card data collection in JRW app.
- Missing access-control story for admin/customer PII.
- Missing log/error scrub evidence for secrets, tokens, payment payloads, provider payloads, phone, address, and email.
- Undefined audit access scope or audit retention owner.
