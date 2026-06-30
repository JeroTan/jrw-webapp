---
title: "Checkout receipt centered cleanup"
type: "bugfix"
created: "2026-06-30"
status: "done"
route: "one-shot"
---

# Checkout receipt centered cleanup

## Intent

**Problem:** Checkout receipt success content was pushed left inside the receipt step, leaving heavy unused space on the right. The main receipt also duplicated `Continue shopping`, already owned by the order summary rail.

**Approach:** Center the receipt status body with a compact max width, keep fallback retry/check-status actions only when needed, and leave the sidebar as the single confirmed-state shopping CTA.

## Suggested Review Order

**Receipt layout**

- Center receipt body within available checkout content space.
  [`PaymentReturnStatus.tsx:95`](../../src/features/cart-checkout/components/PaymentReturnStatus.tsx#L95)

- Keep action row only when refresh or retry action exists.
  [`PaymentReturnStatus.tsx:125`](../../src/features/cart-checkout/components/PaymentReturnStatus.tsx#L125)

**Sidebar CTA ownership**

- Sidebar still owns confirmed-state `Continue shopping`.
  [`PaymentReturnStatus.tsx:212`](../../src/features/cart-checkout/components/PaymentReturnStatus.tsx#L212)

**Regression tests**

- Lock centered class and removed duplicate inline CTA.
  [`cart-ui.test.tsx:1104`](../../src/features/cart-checkout/components/cart-ui.test.tsx#L1104)
