# Debug Session 004: Missing Admin Password Endpoints

This debug session addresses the missing capability for administrators to manage their passwords (forgot, reset, and change password) within the API routing structure.

## Fixing Checklist

- [x] task 1 - Refactor Identity Routes for Admin Password Management
  > **Summary:** Update `src/api/routes/IdentityRoutes.ts`. Extend the `/admin` group to include:
  > - `POST /admin/auth/forgot-password` (Request password reset)
  > - `POST /admin/auth/reset-password` (Reset password with token)
  > - `POST /admin/profile/change-password` (Change password for logged-in admin)
  > We will reuse the existing `identityController` handlers (`handleForgotPassword`, `handleResetPassword`, `handleChangePassword`) and existing TypeBox schemas (`tboxForgotPasswordBody`, `tboxResetPasswordBody`, `tboxChangePasswordBody`), simply tagging them appropriately for Swagger documentation.
