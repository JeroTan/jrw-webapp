---
title: "Checkout receipt status-only content"
type: "bugfix"
created: "2026-06-30"
status: "done"
route: "one-shot"
---

# Checkout receipt status-only content

## Intent

**Problem:** Receipt main content still rendered interactive fallback actions for pending, missing, or retryable payment states. Those actions duplicated the checkout sidebar action rail.

**Approach:** Make `PaymentReturnStatusView` status-only: no buttons and no links inside main receipt content. Keep all user actions in `CheckoutFlowShell` summary rail through `summaryAction`.

## Suggested Review Order

**Content/sidebar ownership**

- Main receipt content now renders status text and order facts only.
  [`PaymentReturnStatus.tsx:62`](../../src/features/cart-checkout/components/PaymentReturnStatus.tsx#L62)

- Sidebar summary remains single action owner.
  [`PaymentReturnStatus.tsx:182`](../../src/features/cart-checkout/components/PaymentReturnStatus.tsx#L182)

- Checkout shell passes only result data into status body.
  [`PaymentReturnStatus.tsx:208`](../../src/features/cart-checkout/components/PaymentReturnStatus.tsx#L208)

**Regression tests**

- Test blocks inline buttons, links, and duplicated action copy.
  [`cart-ui.test.tsx:1111`](../../src/features/cart-checkout/components/cart-ui.test.tsx#L1111)
