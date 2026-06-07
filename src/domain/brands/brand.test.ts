import { describe, expect, it } from "vitest";
import {
  acceptBrandInvitation,
  approveBrandJoinRequest,
  archiveBrand,
  createBrandInvitation,
  createBrand,
  detectBrandCreateConflict,
  detectBrandUpdateConflict,
  rejectBrandJoinRequest,
  requestBrandJoin,
  generateSlug,
  updateBrand,
  validateBrandInvitationTarget,
  validateBrandName,
  validateBrandUpdate,
  validateBrandSlug,
} from "./brand";

describe("brand domain rules", () => {
  it("generates slug from brand name and accepts valid payload", () => {
    expect(generateSlug("  JRW Lifestyle + Co.  ")).toBe("jrw-lifestyle-co");

    const result = createBrand({
      name: "  JRW Lifestyle + Co.  ",
      description: "Catalog collaboration group",
    });

    expect(result).toEqual({
      content: {
        name: "JRW Lifestyle + Co.",
        slug: "jrw-lifestyle-co",
        description: "Catalog collaboration group",
      },
      error: null,
    });
  });

  it("rejects empty or too-long brand names with stable error code", () => {
    const empty = validateBrandName("   ");
    const tooLong = validateBrandName("x".repeat(121));

    expect(empty).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      reasons: ["name:required"],
    });
    expect(tooLong).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      reasons: ["name:length"],
    });
  });

  it("rejects invalid slug format and leading or trailing hyphen", () => {
    expect(validateBrandSlug("JRW-Lifestyle")).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      reasons: ["slug:format"],
    });

    expect(validateBrandSlug("-jrw-lifestyle")).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      reasons: ["slug:format"],
    });

    expect(validateBrandSlug("jrw-lifestyle-")).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      reasons: ["slug:format"],
    });
  });

  it("detects duplicate slug conflict", () => {
    expect(
      detectBrandCreateConflict({
        existingByName: null,
        existingBySlug: { id: "brand_2", slug: "jrw-lifestyle" },
        existingArchivedByName: null,
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "DUPLICATE_SLUG",
    });
  });

  it("detects archived-name conflict before create", () => {
    expect(
      detectBrandCreateConflict({
        existingByName: null,
        existingBySlug: null,
        existingArchivedByName: { id: "brand_9", name: "JRW Lifestyle" },
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "ARCHIVED_NAME_CONFLICT",
    });
  });

  it("supports valid partial update for description-only change", () => {
    const validation = validateBrandUpdate({
      description: "  Updated catalog group  ",
    });
    expect(validation.error).toBeNull();
    expect(validation.content).toEqual({
      description: "Updated catalog group",
    });
  });

  it("rejects invalid name and slug on update", () => {
    const invalidName = validateBrandUpdate({ name: "x" });
    expect(invalidName.error?.code).toBe("VALIDATION_FAILED");
    expect(invalidName.error?.data).toMatchObject({
      reasons: ["name:length"],
    });

    const invalidSlug = validateBrandUpdate({ slug: "Bad Slug" });
    expect(invalidSlug.error?.code).toBe("VALIDATION_FAILED");
    expect(invalidSlug.error?.data).toMatchObject({
      reasons: ["slug:format"],
    });
  });

  it("detects duplicate conflicts on update", () => {
    expect(
      detectBrandUpdateConflict({
        existingByName: { id: "brand_2", name: "JRW Lifestyle" },
        existingBySlug: null,
        existingArchivedByName: null,
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "DUPLICATE_NAME",
    });

    expect(
      detectBrandUpdateConflict({
        existingByName: null,
        existingBySlug: { id: "brand_2", slug: "jrw-lifestyle" },
        existingArchivedByName: null,
      })
    ).toEqual({
      ok: false,
      code: "CONFLICT_STATE",
      reason: "DUPLICATE_SLUG",
    });
  });

  it("rejects update when archived-name conflict exists", () => {
    const result = updateBrand({
      patch: { name: "JRW Lifestyle" },
      conflict: {
        existingByName: null,
        existingBySlug: null,
        existingArchivedByName: { id: "brand_9", name: "JRW Lifestyle" },
      },
    });

    expect(result.error?.code).toBe("CONFLICT_STATE");
    expect(result.error?.data).toEqual({ reason: "ARCHIVED_NAME_CONFLICT" });
  });

  it("returns draft for valid name update", () => {
    const result = updateBrand({
      patch: { name: "  JRW Lifestyle Updated  " },
      conflict: {
        existingByName: null,
        existingBySlug: null,
        existingArchivedByName: null,
      },
    });

    expect(result.error).toBeNull();
    expect(result.content).toEqual({ name: "JRW Lifestyle Updated" });
  });

  it("creates valid brand invitation draft for active owner actor", () => {
    const result = createBrandInvitation({
      invitingActor: {
        adminId: "admin_owner",
        role: "ADMIN",
        currentMembership: {
          adminId: "admin_owner",
          role: "OWNER",
          status: "ACTIVE",
        },
      },
      targetAdminId: "admin_target",
      brandId: "brand_1",
      targetAdmin: {
        adminId: "admin_target",
        role: "ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: "2026-05-17T20:00:00.000Z",
        approvedAt: "2026-05-17T20:30:00.000Z",
      },
      existingMembership: null,
    });

    expect(result.error).toBeNull();
    expect(result.content).toEqual({
      brandId: "brand_1",
      adminId: "admin_target",
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: "admin_owner",
    });
  });

  it("creates valid brand invitation draft for active member actor", () => {
    const result = createBrandInvitation({
      invitingActor: {
        adminId: "admin_member",
        role: "ADMIN",
        currentMembership: {
          adminId: "admin_member",
          role: "MEMBER",
          status: "ACTIVE",
        },
      },
      targetAdminId: "admin_target",
      brandId: "brand_1",
      targetAdmin: {
        adminId: "admin_target",
        role: "ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: "2026-05-17T20:00:00.000Z",
        approvedAt: "2026-05-17T20:30:00.000Z",
      },
      existingMembership: null,
    });

    expect(result.error).toBeNull();
    expect(result.content?.invitedByAdminId).toBe("admin_member");
  });

  it("rejects invitation when target is not ADMIN role", () => {
    const result = validateBrandInvitationTarget({
      targetAdminId: "target_customer",
      targetAdmin: {
        adminId: "target_customer",
        role: "CUSTOMER",
        status: "ACTIVE",
        emailVerifiedAt: "2026-05-17T20:00:00.000Z",
        approvedAt: "2026-05-17T20:30:00.000Z",
      },
      existingMembership: null,
    });

    expect(result.error?.code).toBe("VALIDATION_FAILED");
    expect(result.error?.data).toEqual({
      reason: "TARGET_ROLE_NOT_ADMIN",
    });
  });

  it("rejects invitation when target admin is suspended", () => {
    const result = validateBrandInvitationTarget({
      targetAdminId: "admin_suspended",
      targetAdmin: {
        adminId: "admin_suspended",
        role: "ADMIN",
        status: "SUSPENDED",
        emailVerifiedAt: "2026-05-17T20:00:00.000Z",
        approvedAt: "2026-05-17T20:30:00.000Z",
      },
      existingMembership: null,
    });

    expect(result.error?.code).toBe("VALIDATION_FAILED");
    expect(result.error?.data).toEqual({
      reason: "TARGET_ADMIN_SUSPENDED",
    });
  });

  it("returns conflict for duplicate active brand membership", () => {
    const result = validateBrandInvitationTarget({
      targetAdminId: "admin_member",
      targetAdmin: {
        adminId: "admin_member",
        role: "ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: "2026-05-17T20:00:00.000Z",
        approvedAt: "2026-05-17T20:30:00.000Z",
      },
      existingMembership: {
        adminId: "admin_member",
        role: "MEMBER",
        status: "ACTIVE",
      },
    });

    expect(result.error?.code).toBe("CONFLICT_STATE");
    expect(result.error?.data).toEqual({
      reason: "DUPLICATE_ACTIVE_MEMBERSHIP",
    });
  });

  it("returns conflict for duplicate pending invitation", () => {
    const result = validateBrandInvitationTarget({
      targetAdminId: "admin_pending",
      targetAdmin: {
        adminId: "admin_pending",
        role: "ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: "2026-05-17T20:00:00.000Z",
        approvedAt: "2026-05-17T20:30:00.000Z",
      },
      existingMembership: {
        adminId: "admin_pending",
        role: "MEMBER",
        status: "PENDING",
      },
    });

    expect(result.error?.code).toBe("CONFLICT_STATE");
    expect(result.error?.data).toEqual({
      reason: "DUPLICATE_PENDING_INVITATION",
    });
  });

  it("rejects invitation when target admin is inactive, unverified, or unapproved", () => {
    const inactive = validateBrandInvitationTarget({
      targetAdminId: "admin_inactive",
      targetAdmin: {
        adminId: "admin_inactive",
        role: "ADMIN",
        status: "INACTIVE",
        emailVerifiedAt: "2026-05-17T20:00:00.000Z",
        approvedAt: "2026-05-17T20:30:00.000Z",
      },
      existingMembership: null,
    });
    expect(inactive.error?.data).toEqual({
      reason: "TARGET_ADMIN_INACTIVE",
    });

    const unverified = validateBrandInvitationTarget({
      targetAdminId: "admin_unverified",
      targetAdmin: {
        adminId: "admin_unverified",
        role: "ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: null,
        approvedAt: "2026-05-17T20:30:00.000Z",
      },
      existingMembership: null,
    });
    expect(unverified.error?.data).toEqual({
      reason: "TARGET_EMAIL_NOT_VERIFIED",
    });

    const unapproved = validateBrandInvitationTarget({
      targetAdminId: "admin_unapproved",
      targetAdmin: {
        adminId: "admin_unapproved",
        role: "ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: "2026-05-17T20:00:00.000Z",
        approvedAt: null,
      },
      existingMembership: null,
    });
    expect(unapproved.error?.data).toEqual({
      reason: "TARGET_ADMIN_NOT_APPROVED",
    });
  });

  it("archives active brand and rejects already archived", () => {
    const archived = archiveBrand({
      currentStatus: "ACTIVE",
      timestamp: "2026-05-17T22:10:00.000Z",
    });
    expect(archived.error).toBeNull();
    expect(archived.content).toEqual({
      status: "ARCHIVED",
      archivedAt: "2026-05-17T22:10:00.000Z",
    });

    const alreadyArchived = archiveBrand({
      currentStatus: "ARCHIVED",
      timestamp: "2026-05-17T22:10:00.000Z",
    });
    expect(alreadyArchived.error?.code).toBe("CONFLICT_STATE");
    expect(alreadyArchived.error?.data).toEqual({
      reason: "ALREADY_ARCHIVED",
    });
  });

  it("accepts valid pending invitation for current actor", () => {
    const result = acceptBrandInvitation({
      actorAdminId: "admin_target",
      invitationMembership: {
        adminId: "admin_target",
        role: "MEMBER",
        status: "PENDING",
      },
    });

    expect(result.error).toBeNull();
    expect(result.content).toEqual({ newStatus: "ACTIVE" });
  });

  it("rejects invitation accept when invitation is not pending, revoked, or for different actor", () => {
    const notPending = acceptBrandInvitation({
      actorAdminId: "admin_target",
      invitationMembership: {
        adminId: "admin_target",
        role: "MEMBER",
        status: "ACTIVE",
      },
    });
    expect(notPending.error?.code).toBe("CONFLICT_STATE");
    expect(notPending.error?.data).toEqual({
      reason: "INVITATION_NOT_PENDING",
    });

    const revoked = acceptBrandInvitation({
      actorAdminId: "admin_target",
      invitationMembership: {
        adminId: "admin_target",
        role: "MEMBER",
        status: "REVOKED",
      },
    });
    expect(revoked.error?.code).toBe("VALIDATION_FAILED");
    expect(revoked.error?.data).toEqual({
      reason: "INVITATION_REVOKED",
    });

    const wrongActor = acceptBrandInvitation({
      actorAdminId: "admin_actor",
      invitationMembership: {
        adminId: "admin_target",
        role: "MEMBER",
        status: "PENDING",
      },
    });
    expect(wrongActor.error?.code).toBe("AUTH_FORBIDDEN");
    expect(wrongActor.error?.data).toEqual({
      reason: "INVITATION_NOT_FOR_ACTOR",
    });
  });

  it("creates join request draft and blocks duplicate active or pending memberships", () => {
    const success = requestBrandJoin({
      actorAdminId: "admin_joiner",
      existingMembership: null,
    });
    expect(success.error).toBeNull();
    expect(success.content).toEqual({
      adminId: "admin_joiner",
      role: "MEMBER",
      status: "PENDING",
      invitedByAdminId: null,
    });

    const duplicateActive = requestBrandJoin({
      actorAdminId: "admin_joiner",
      existingMembership: {
        adminId: "admin_joiner",
        role: "MEMBER",
        status: "ACTIVE",
      },
    });
    expect(duplicateActive.error?.code).toBe("CONFLICT_STATE");
    expect(duplicateActive.error?.data).toEqual({
      reason: "DUPLICATE_ACTIVE_MEMBERSHIP",
    });

    const duplicatePending = requestBrandJoin({
      actorAdminId: "admin_joiner",
      existingMembership: {
        adminId: "admin_joiner",
        role: "MEMBER",
        status: "PENDING",
      },
    });
    expect(duplicatePending.error?.code).toBe("CONFLICT_STATE");
    expect(duplicatePending.error?.data).toEqual({
      reason: "DUPLICATE_PENDING_REQUEST",
    });
  });

  it("approves pending join request for authorized approver and rejects unauthorized approver", () => {
    const approved = approveBrandJoinRequest({
      approverRole: "ADMIN",
      approverMembership: {
        adminId: "admin_owner",
        role: "OWNER",
        status: "ACTIVE",
      },
      targetAdminId: "admin_joiner",
      joinRequestMembership: {
        adminId: "admin_joiner",
        role: "MEMBER",
        status: "PENDING",
      },
    });
    expect(approved.error).toBeNull();
    expect(approved.content).toEqual({ newStatus: "ACTIVE" });

    const memberApproved = approveBrandJoinRequest({
      approverRole: "ADMIN",
      approverMembership: {
        adminId: "admin_member",
        role: "MEMBER",
        status: "ACTIVE",
      },
      targetAdminId: "admin_joiner",
      joinRequestMembership: {
        adminId: "admin_joiner",
        role: "MEMBER",
        status: "PENDING",
      },
    });
    expect(memberApproved.error).toBeNull();
    expect(memberApproved.content).toEqual({ newStatus: "ACTIVE" });

    const unauthorized = approveBrandJoinRequest({
      approverRole: "ADMIN",
      approverMembership: null,
      targetAdminId: "admin_joiner",
      joinRequestMembership: {
        adminId: "admin_joiner",
        role: "MEMBER",
        status: "PENDING",
      },
    });
    expect(unauthorized.error?.code).toBe("AUTH_FORBIDDEN");
    expect(unauthorized.error?.data).toEqual({
      reason: "APPROVER_NOT_AUTHORIZED",
    });
  });

  it("rejects pending join request for authorized approver", () => {
    const rejected = rejectBrandJoinRequest({
      approverRole: "ADMIN",
      approverMembership: {
        adminId: "admin_owner",
        role: "OWNER",
        status: "ACTIVE",
      },
      targetAdminId: "admin_joiner",
      joinRequestMembership: {
        adminId: "admin_joiner",
        role: "MEMBER",
        status: "PENDING",
      },
    });

    expect(rejected.error).toBeNull();
    expect(rejected.content).toEqual({ newStatus: "REVOKED" });
  });
});
