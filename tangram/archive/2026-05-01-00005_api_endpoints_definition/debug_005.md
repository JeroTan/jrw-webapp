# Debug Session 005: Separate Admin Authentication Logic

This debug session addresses the fact that the `/admin` auth and profile endpoints currently reuse the customer handlers (`handleLogin`, `handleForgotPassword`, etc.). We need specific admin controllers and services to return the correct admin response shapes and simulate the isolated admin authentication flow.

## Fixing Checklist

- [x] task 1 - Create Admin Specific Mock Services
  > **Summary:** Update `src/domain/services/IdentityService.ts` to add specific mock methods for admins: `mockAdminLogin`, `mockAdminForgotPassword`, `mockAdminResetPassword`, `mockAdminChangePassword`, returning appropriate shapes (e.g., matching `tboxAdminResponse` where necessary).

- [x] task 2 - Create Admin Specific Controller Handlers
  > **Summary:** Update `src/api/controller/IdentityController.ts` to add handler methods: `handleAdminLogin`, `handleAdminForgotPassword`, `handleAdminResetPassword`, and `handleAdminChangePassword`. These should call the new admin mock services.

- [x] task 3 - Update Admin Routes with New Handlers
  > **Summary:** Update `src/api/routes/IdentityRoutes.ts` to map the `/admin` endpoints to the new admin-specific handlers from the controller.
