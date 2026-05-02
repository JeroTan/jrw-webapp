# Debug Session 001: Eliminate 'any' in IdentityController

This debug session addresses the user's feedback regarding the use of `any` types in `src/api/controller/IdentityController.ts`. We will replace these with strict TypeBox `Static` types imported from the validation layer to ensure type safety and align with the project's engineering standards.

## Fixing Checklist

- [x] task 2 - Type handleAdminLogin
  > **Summary:** Update `src/api/controller/IdentityController.ts`. Replace `any` in `handleAdminLogin` with `Static<typeof tboxLoginBody>` for the `body` and the appropriate internal Elysia type for `set`.

- [x] task 2 - Type all other IdentityController methods
  > **Summary:** Update `src/api/controller/IdentityController.ts`. Systematically replace `any` in all other handlers (`handleLogin`, `handleRegister`, `handleForgotPassword`, etc.) with their corresponding TypeBox static types.
