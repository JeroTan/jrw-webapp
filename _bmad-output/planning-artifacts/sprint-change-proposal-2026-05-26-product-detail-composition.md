---
workflowType: "correct-course"
mode: "batch"
status: "applied-by-user-request"
projectName: "jrw-webapp"
userName: "MR. JRW"
createdDate: "2026-05-26"
triggerStory: "4-3-product-detail-experience"
recommendedScope: "moderate"
---

# Sprint Change Proposal: Product Detail Composition

Date: 2026-05-26
Project: jrw-webapp
Mode: Batch proposal
Status: Applied by MR. JRW request
Owner: MR. JRW

## 1. Issue Summary

Story 4.3 delivered functional product detail, and Story 4.9 tightened visual fidelity, but product detail now needs a fuller page composition:

- Square image-first gallery at left, about 40% desktop width and 100% mobile width.
- Thumbnail carousel below image with side arrows, hidden for single-image products.
- Details/CTA at about 60% desktop width with product name first.
- Rating/reviews hidden for post-MVP.
- Dynamic variant option groups instead of flat full-variant list.
- Variant-specific availability, constrained quantity stepper, wide `Buy`, add-to-cart, and share controls.
- Full-width markdown description rendered as HTML.
- Optional brand block with image, name, and product count.
- Other-products block showing related products, falling back to latest products, hidden if no real products exist.
- Hidden comments/reviews placeholder for future story.

## 2. Impact Analysis

Epic impact: Epic 4 remains valid. No new epic needed.

Story impact:

- Story 4.3 remains historical done record.
- Story 4.4 cart behavior remains useful and should be reused for add-to-cart/quantity.
- Story 4.9 remains visual fidelity baseline.
- Add Story 4.11 for direct product detail correction before checkout validation/payment expansion.

Artifact conflicts:

- PRD: add FR81 for specific product-detail composition.
- Epics: add Story 4.11 and FR81 coverage.
- UX: update `ProductDetailPanel` anatomy.
- Architecture: add markdown rendering safety note.
- Sprint status: add 4.11 as `ready-for-dev`.

Technical impact:

- Likely touch `src/features/product-detail/**`, public detail DTO/service/repository only if safe fields are missing, and tests.
- Use installed `showdown` for markdown conversion only with sanitizer/safe HTML policy.
- Related/latest products must use real public product data. Do not ship fake purchasable products.

## 3. Recommended Approach

Direct adjustment.

Reason: completed stories should stay as sprint history; new Story 4.11 captures the delta cleanly and can reuse current SSR detail, cart store, product card, and public catalog patterns.

Scope classification: Moderate.

Risk: medium. UI changes are contained, but markdown rendering and related/latest product data can introduce security or fake-data risk if handled casually.

## 4. Detailed Change Proposals

Updated artifacts:

- `_bmad-output/planning-artifacts/prd.md`
  - Added FR81.
  - Added rendering requirement for sanitized markdown-to-HTML product descriptions.
- `_bmad-output/planning-artifacts/ux-design-specification.md`
  - Updated `ProductDetailPanel` anatomy for high-level modules, 40/60 layout, square gallery, dynamic variants, quantity, CTA row, markdown, brand, and related products.
- `_bmad-output/planning-artifacts/architecture.md`
  - Added product detail markdown rendering safety boundary.
- `_bmad-output/planning-artifacts/epics.md`
  - Added FR80/FR81 inventory and coverage.
  - Added Story 4.11 acceptance criteria.
- `_bmad-output/implementation-artifacts/4-3-product-detail-experience.md`
  - Added addendum pointing to Story 4.11 instead of rewriting completed history.
- `_bmad-output/implementation-artifacts/4-11-product-detail-composition-content-and-recommendations.md`
  - Created ready-for-dev story.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
  - Added 4.11 as `ready-for-dev`.

## 5. Implementation Handoff

Developer owns Story 4.11 implementation.

Implementation sequence:

1. Check current product detail DTO and cart quantity rules.
2. Add safe markdown renderer and tests.
3. Recompose product detail layout.
4. Update gallery carousel.
5. Replace flat variants with dynamic option groups.
6. Add availability/quantity and Buy/cart/share CTA row.
7. Add optional brand module.
8. Add related/latest products module with real public data only.
9. Keep reviews placeholder hidden.
10. Run focused tests, style grep, `npm run check`, and responsive QA.

Success criteria:

- Product detail matches requested composition.
- No fake live products.
- No unsafe markdown HTML execution.
- Variant, availability, and quantity stay synced.
- Mobile and desktop do not overflow.

## 6. Checklist Status

- 1.1 Triggering story identified: Done. Story 4.3 product detail.
- 1.2 Core problem defined: Done. New stakeholder layout/content requirement after completed implementation.
- 1.3 Evidence gathered: Done. User request, current 4.3/4.4/4.9 artifacts, PRD, epics, UX, architecture, and code components reviewed.
- 2.1 Current epic impact: Done. Epic 4 still valid.
- 2.2 Epic-level changes: Done. Add Story 4.11.
- 2.3 Future epic impact: Done. Run before checkout/payment expansion.
- 2.4 Obsolete epic check: Done. No epic obsolete.
- 2.5 Priority/order check: Done. 4.11 inserted before remaining checkout validation/payment work.
- 3.1 PRD conflict check: Done. Added FR81.
- 3.2 Architecture impact: Done. Markdown safety note added.
- 3.3 UI/UX impact: Done. ProductDetailPanel updated.
- 3.4 Secondary artifacts: Done. 4.3 addendum and sprint status updated.
- 4.1 Direct Adjustment: Viable. Moderate effort, medium risk.
- 4.2 Rollback: Not viable. Existing work remains useful.
- 4.3 MVP Review: Not needed. Scope still supports MVP.
- 4.4 Recommended path: Done. Direct adjustment.
- 5.1 Issue summary: Done.
- 5.2 Impact and artifact adjustments: Done.
- 5.3 Path forward: Done.
- 5.4 MVP/action plan: Done.
- 5.5 Agent handoff: Done.
- 6.1 Checklist review: Done.
- 6.2 Proposal accuracy: Done.
- 6.3 User approval: Applied by direct user request.
- 6.4 Sprint-status update: Done.
- 6.5 Handoff confirmation: Done. Story 4.11 ready for Developer.
