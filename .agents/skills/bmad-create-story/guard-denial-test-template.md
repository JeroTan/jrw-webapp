# Guard Denial Test Template

Use when a story adds or changes an endpoint. Copy applicable cases into route and service tests. Delete only with an `N/A` reason in the story guard checklist.

## Required Matrix

| Case | Expected outcome |
| --- | --- |
| Unauthenticated actor hits protected endpoint | `AUTH_REQUIRED` envelope before controller/service side effects |
| Authenticated actor has wrong role | `AUTH_FORBIDDEN` envelope before side effects |
| Actor account is suspended, unverified, or unapproved | Account-state denial code before side effects |
| Admin lacks active brand membership for brand-scoped action | `AUTH_FORBIDDEN` with safe `BRAND_MEMBERSHIP_REQUIRED` reason |
| Elevated Admin path is allowed or explicitly denied | Test documents intended policy |
| Cross-brand or archived-scope access is attempted | Safe denial or conflict response, no data leak |
| Provider/infrastructure dependency fails after guard passes | Safe provider error, no authorization detail leak |

## Route Test Shape

```ts
describe("<METHOD> <path> guard denials", () => {
  it("returns auth required before controller work for anonymous actor", async () => {
    // Arrange request without session/auth context.
    // Act against route handler.
    // Assert response status and envelope code.
    // Assert controller/service dependency was not called.
  });

  it("returns forbidden for wrong role before side effects", async () => {
    // Arrange authenticated actor with role outside route metadata.
    // Assert AUTH_FORBIDDEN and no side effects.
  });

  it("returns safe account-state denial for invalid admin state", async () => {
    // Arrange suspended, unverified, or unapproved actor.
    // Assert existing account-state code and no side effects.
  });
});
```

## Service Test Shape

```ts
describe("<Service> brand membership guard", () => {
  it("denies brand-scoped mutation when admin lacks active membership", async () => {
    // Arrange product/brand scope with no active membership.
    // Act against service method directly.
    // Assert AUTH_FORBIDDEN and reason BRAND_MEMBERSHIP_REQUIRED.
    // Assert repository mutation, provider call, and audit publish did not run.
  });

  it("allows elevated admin according to story policy", async () => {
    // Arrange SUPER_ADMIN or documented elevated actor.
    // Assert success or explicit denial per acceptance criteria.
  });
});
```

## Completion Evidence

- List exact targeted tests run in `Debug Log References`.
- Include at least one denial-path assertion for each new protected route.
- Include side-effect assertions for mutation routes: no DB write, provider call, R2 action, audit event, or email send before guard success.
