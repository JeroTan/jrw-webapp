export class IdentityService {
  mockLogin() {
    return { token: "mock_jwt_token" };
  }

  mockRegister() {
    return { id: "usr_mock", email: "test@example.com" };
  }

  mockProfile() {
    return {
      id: "usr_mock",
      email: "test@example.com",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  mockForgotPassword() {
    return { success: true };
  }

  mockResetPassword() {
    return { success: true };
  }

  mockUpdateProfile() {
    return this.mockProfile();
  }

  mockChangePassword() {
    return { success: true };
  }

  // --- Admin Specific ---
  mockAdminLogin() {
    return { token: "mock_admin_jwt_token" };
  }

  mockAdminForgotPassword() {
    return { success: true };
  }

  mockAdminResetPassword() {
    return { success: true };
  }

  mockAdminChangePassword() {
    return { success: true };
  }
}
