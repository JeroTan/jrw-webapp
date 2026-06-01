---
title: 'Admin Product API Credentials'
type: 'bugfix'
created: '2026-06-01'
status: 'done'
route: 'one-shot'
---

# Admin Product API Credentials

## Intent

**Problem:** Admin products page could remain on loading skeleton because product API calls did not explicitly carry admin session credentials, unlike admin auth calls.

**Approach:** Route all admin product client requests through one small credentialed fetch helper that preserves headers, defaults JSON accept, and forces cookie credentials.

## Suggested Review Order

**Credential Boundary**

- Single fetch helper guarantees admin cookies on product client requests.
  [`adminProductFetch.ts:1`](../../src/features/admin-products/adminProductFetch.ts#L1)

- Product list loader now uses credentialed helper for contents.
  [`api.ts:176`](../../src/features/admin-products/api.ts#L176)

**Coverage**

- Helper test locks cookie credentials and header preservation.
  [`adminProductFetch.test.ts:19`](../../src/features/admin-products/adminProductFetch.test.ts#L19)

- API client test proves product list requests include credentials.
  [`api.test.ts:19`](../../src/features/admin-products/api.test.ts#L19)
