import type { IdentityService } from "@/domain/services/IdentityService";

export class IdentityController {
  constructor(public identityService: IdentityService) {}

  async handleLogin({ body }: { body: any }) {
    return {
      data: this.identityService.mockLogin(),
      message: "Login successful",
    };
  }

  async handleRegister({ body }: { body: any }) {
    return {
      data: this.identityService.mockRegister(),
      message: "Registration successful",
    };
  }

  async handleProfile() {
    return {
      data: this.identityService.mockProfile(),
      message: "Profile retrieved successfully",
    };
  }

  async handleForgotPassword({ body }: { body: any }) {
    return {
      data: this.identityService.mockForgotPassword(),
      message: "Password reset link sent",
    };
  }

  async handleResetPassword({ body }: { body: any }) {
    return {
      data: this.identityService.mockResetPassword(),
      message: "Password successfully reset",
    };
  }

  async handleUpdateProfile({ body }: { body: any }) {
    return {
      data: this.identityService.mockUpdateProfile(),
      message: "Profile updated successfully",
    };
  }

  async handleChangePassword({ body }: { body: any }) {
    return {
      data: this.identityService.mockChangePassword(),
      message: "Password changed successfully",
    };
  }

  // --- Admin Specific ---
  async handleAdminLogin({ body }: { body: any }) {
    return {
      data: this.identityService.mockAdminLogin(),
      message: "Admin login successful",
    };
  }

  async handleAdminForgotPassword({ body }: { body: any }) {
    return {
      data: this.identityService.mockAdminForgotPassword(),
      message: "Admin password reset link sent",
    };
  }

  async handleAdminResetPassword({ body }: { body: any }) {
    return {
      data: this.identityService.mockAdminResetPassword(),
      message: "Admin password successfully reset",
    };
  }

  async handleAdminChangePassword({ body }: { body: any }) {
    return {
      data: this.identityService.mockAdminChangePassword(),
      message: "Admin password changed successfully",
    };
  }
}
