---
title: 'Checkout receipt spacing cleanup'
type: 'bugfix'
created: '2026-06-30'
status: 'done'
route: 'one-shot'
---

# Checkout receipt spacing cleanup

## Intent

**Problem:** Checkout receipt return view had a bordered inner card and oversized empty shell height, making confirmed payment page look boxed-in and wasteful.

**Approach:** Remove the inner receipt panel frame, left-align the content inside the checkout body, tighten receipt-only padding, and reduce receipt step minimum height while preserving larger checkout form height elsewhere.

## Suggested Review Order

**Receipt content**

- Receipt panel is now frameless and uses available body space.
  [`PaymentReturnStatus.tsx:89`](../../src/features/cart-checkout/components/PaymentReturnStatus.tsx#L89)

- Order detail block keeps compact spacing without extra separator border.
  [`PaymentReturnStatus.tsx:105`](../../src/features/cart-checkout/components/PaymentReturnStatus.tsx#L105)

**Checkout shell spacing**

- Receipt step gets compact height without shrinking forms.
  [`CheckoutFlow.tsx:297`](../../src/features/cart-checkout/components/CheckoutFlow.tsx#L297)

- Desktop padding stays tight only for receipt step.
  [`CheckoutFlow.tsx:315`](../../src/features/cart-checkout/components/CheckoutFlow.tsx#L315)
