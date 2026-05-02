import { getDb } from "@/adapter/infrastructure/db/client";
import { admins } from "@/domain/schema/identity";
import { verifyHash } from "@/lib/crypto/hash";
import { jwtEncrypt } from "@/lib/crypto/jwt";
import { Result } from "@/utils/general/result";
import { LogicError } from "@/utils/general/error";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";

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
  async adminLogin({ email, password }: { email: string; password: string }) {
    const db = getDb();

    // 1. Find Admin
    const adminResult = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email))
      .limit(1);
    
    const admin = adminResult[0];

    if (!admin) {
      return Result.error(new LogicError("Unauthorized access", "UNAUTHORIZED"));
    }

    // 2. Verify Password
    const isPasswordValid = await verifyHash(password, admin.password_hash);
    if (!isPasswordValid) {
      return Result.error(new LogicError("Unauthorized access", "UNAUTHORIZED"));
    }

    // 3. Generate JWT
    const tokenResult = await jwtEncrypt({
      payload: {
        sub: admin.id,
        email: admin.email,
        is_owner: admin.is_owner,
      },
      secretKey: env.JWT_SECRET,
      expiresInSeconds: 86400, // 24 hours
    });

    if (tokenResult.error) {
      return Result.error(new LogicError("Failed to generate secure token", "INTERNAL_ERROR"));
    }

    return Result.okay({ token: tokenResult.data });
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
