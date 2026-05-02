import type { IdentityService } from "@/domain/services/IdentityService";
import {
  tboxLoginBody,
  tboxRegistrationBody,
  tboxForgotPasswordBody,
  tboxResetPasswordBody,
  tboxUpdateProfileBody,
  tboxChangePasswordBody,
} from "@/domain/validation/identity";
import type { Context, Static } from "elysia";

export class IdentityController {
  constructor(public identityService: IdentityService) {}

  async handleLogin({ body }: { body: Static<typeof tboxLoginBody> }) {
    return {
      data: this.identityService.mockLogin(),
      message: "Login successful",
      code: "SUCCESS" as const,
    };
  }

  async handleRegister({
    body,
  }: {
    body: Static<typeof tboxRegistrationBody>;
  }) {
    return {
      data: this.identityService.mockRegister(),
      message: "Registration successful",
      code: "SUCCESS" as const,
    };
  }

  async handleForgotPassword({
    body,
  }: {
    body: Static<typeof tboxForgotPasswordBody>;
  }) {
    return {
      data: this.identityService.mockForgotPassword(),
      message: "Password reset email sent",
      code: "SUCCESS" as const,
    };
  }

  async handleResetPassword({
    body,
  }: {
    body: Static<typeof tboxResetPasswordBody>;
  }) {
    return {
      data: this.identityService.mockResetPassword(),
      message: "Password reset successful",
      code: "SUCCESS" as const,
    };
  }

  async handleProfile() {
    return {
      data: this.identityService.mockProfile(),
      message: "Profile retrieved",
      code: "SUCCESS" as const,
    };
  }

  async handleUpdateProfile({
    body,
  }: {
    body: Static<typeof tboxUpdateProfileBody>;
  }) {
    return {
      data: this.identityService.mockUpdateProfile(),
      message: "Profile updated successfully",
      code: "SUCCESS" as const,
    };
  }

  async handleChangePassword({
    body,
  }: {
    body: Static<typeof tboxChangePasswordBody>;
  }) {
    return {
      data: this.identityService.mockChangePassword(),
      message: "Password changed successfully",
      code: "SUCCESS" as const,
    };
  }

  async handleAdminLogin({
    body,
    set,
  }: {
    body: Static<typeof tboxLoginBody>;
    set: Context["set"];
  }) {
    const result = await this.identityService.adminLogin(body);

    if (result.error) {
      set.status = result.error.code === "UNAUTHORIZED" ? 401 : 500;
      return {
        data: null,
        message: result.error.data,
        code: result.error.code,
      };
    }

    return {
      data: result.content,
      message: "Admin login successful",
      code: "SUCCESS" as const,
    };
  }

  async handleAdminForgotPassword({
    body,
  }: {
    body: Static<typeof tboxForgotPasswordBody>;
  }) {
    return {
      data: this.identityService.mockAdminForgotPassword(),
      message: "Admin password reset link sent",
      code: "SUCCESS" as const,
    };
  }

  async handleAdminResetPassword({
    body,
  }: {
    body: Static<typeof tboxResetPasswordBody>;
  }) {
    return {
      data: this.identityService.mockAdminResetPassword(),
      message: "Admin password successfully reset",
      code: "SUCCESS" as const,
    };
  }

  async handleAdminChangePassword({
    body,
  }: {
    body: Static<typeof tboxChangePasswordBody>;
  }) {
    return {
      data: this.identityService.mockAdminChangePassword(),
      message: "Admin password changed successfully",
      code: "SUCCESS" as const,
    };
  }
}
