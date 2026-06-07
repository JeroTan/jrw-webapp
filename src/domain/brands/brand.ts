import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

const BRAND_NAME_MIN_LENGTH = 2;
const BRAND_NAME_MAX_LENGTH = 120;
const BRAND_SLUG_MIN_LENGTH = 2;
const BRAND_SLUG_MAX_LENGTH = 120;
const BRAND_DESCRIPTION_MAX_LENGTH = 500;
const BRAND_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type BrandCreateInput = {
  name: string;
  slug?: string | null;
  description?: string | null;
};

export type BrandUpdateInput = {
  name?: string | null;
  slug?: string | null;
  description?: string | null;
};

export type BrandCreateDraft = {
  name: string;
  slug: string;
  description: string | null;
};

export type BrandUpdateDraft = {
  name?: string;
  slug?: string;
  description?: string | null;
};

export type BrandCreationResult = AppResult<
  BrandCreateDraft,
  { reasons: string[] }
>;

type BrandConflictReason = Extract<
  BrandConflictDecision,
  { ok: false }
>["reason"];

export type BrandUpdateResult = AppResult<
  BrandUpdateDraft,
  { reasons?: string[]; reason?: BrandConflictReason }
>;

export type BrandConflictInput = {
  existingByName: { id: string; name: string } | null;
  existingBySlug: { id: string; slug: string } | null;
  existingArchivedByName: { id: string; name: string } | null;
};

export type BrandConflictDecision =
  | { ok: true }
  | {
      ok: false;
      code: "CONFLICT_STATE";
      reason: "DUPLICATE_NAME" | "DUPLICATE_SLUG" | "ARCHIVED_NAME_CONFLICT";
    };

export type BrandArchiveInput = {
  currentStatus: "ACTIVE" | "ARCHIVED";
  timestamp: string;
};

export type BrandArchiveResult = AppResult<
  { status: "ARCHIVED"; archivedAt: string },
  { reason: "ALREADY_ARCHIVED" }
>;

export type BrandInvitationMembershipRole = "OWNER" | "MEMBER";

export type BrandInvitationMembershipStatus = "ACTIVE" | "PENDING" | "REVOKED";

export type BrandInvitationActorRole = "ADMIN" | "SUPER_ADMIN";

export type BrandInvitationTargetRole =
  | BrandInvitationActorRole
  | "CUSTOMER"
  | "PROSPECT";

export type BrandInvitationAccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type BrandInvitationMembershipState = {
  adminId: string;
  role: BrandInvitationMembershipRole;
  status: BrandInvitationMembershipStatus;
};

export type BrandInvitationActor = {
  adminId: string;
  role: BrandInvitationActorRole;
  currentMembership: BrandInvitationMembershipState | null;
};

export type BrandInvitationTarget = {
  adminId: string;
  role: BrandInvitationTargetRole;
  status: BrandInvitationAccountStatus;
  emailVerifiedAt: string | null;
  approvedAt: string | null;
};

export type BrandInvitationDraft = {
  brandId: string;
  adminId: string;
  role: "MEMBER";
  status: "PENDING";
  invitedByAdminId: string;
};

export type BrandInvitationFailureReason =
  | "TARGET_ADMIN_NOT_FOUND"
  | "TARGET_ROLE_NOT_ADMIN"
  | "TARGET_ADMIN_INACTIVE"
  | "TARGET_ADMIN_SUSPENDED"
  | "TARGET_EMAIL_NOT_VERIFIED"
  | "TARGET_ADMIN_NOT_APPROVED"
  | "ACTOR_NOT_BRAND_MEMBER"
  | "DUPLICATE_ACTIVE_MEMBERSHIP"
  | "DUPLICATE_PENDING_INVITATION";

export type BrandJoinFailureReason =
  | BrandInvitationFailureReason
  | "INVITATION_NOT_FOUND"
  | "INVITATION_NOT_PENDING"
  | "INVITATION_NOT_FOR_ACTOR"
  | "INVITATION_REVOKED"
  | "JOIN_REQUEST_NOT_FOUND"
  | "JOIN_REQUEST_NOT_PENDING"
  | "APPROVER_NOT_AUTHORIZED"
  | "DUPLICATE_PENDING_REQUEST";

export type BrandInvitationResult = AppResult<
  BrandInvitationDraft,
  { reason: BrandInvitationFailureReason }
>;

export type AcceptBrandInvitationInput = {
  actorAdminId: string;
  invitationMembership: BrandInvitationMembershipState | null;
};

export type AcceptBrandInvitationResult = AppResult<
  { newStatus: "ACTIVE" },
  { reason: BrandJoinFailureReason }
>;

export type RequestBrandJoinInput = {
  actorAdminId: string;
  existingMembership: BrandInvitationMembershipState | null;
};

export type RequestBrandJoinResult = AppResult<
  {
    adminId: string;
    role: "MEMBER";
    status: "PENDING";
    invitedByAdminId: null;
  },
  { reason: BrandJoinFailureReason }
>;

export type ApproveBrandJoinRequestInput = {
  approverRole: BrandInvitationActorRole;
  approverMembership: BrandInvitationMembershipState | null;
  targetAdminId: string;
  joinRequestMembership: BrandInvitationMembershipState | null;
};

export type RejectBrandJoinRequestInput = ApproveBrandJoinRequestInput;

export type ApproveBrandJoinRequestResult = AppResult<
  { newStatus: "ACTIVE" },
  { reason: BrandJoinFailureReason }
>;

export type RejectBrandJoinRequestResult = AppResult<
  { newStatus: "REVOKED" },
  { reason: BrandJoinFailureReason }
>;

export type BrandInvitationTargetValidationResult = AppResult<
  { targetAdminId: string },
  { reason: BrandInvitationFailureReason }
>;

export type BrandInvitationTargetValidationInput = {
  targetAdminId: string;
  targetAdmin: BrandInvitationTarget | null;
  existingMembership: BrandInvitationMembershipState | null;
};

export type CreateBrandInvitationInput = {
  invitingActor: BrandInvitationActor;
  targetAdminId: string;
  brandId: string;
  existingMembership: BrandInvitationMembershipState | null;
  targetAdmin: BrandInvitationTarget | null;
};

type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; code: "VALIDATION_FAILED"; reasons: string[] };

function cleanText(value: string): string {
  return value.trim();
}

function validationError(reasons: string[]): ValidationResult {
  return {
    ok: false,
    code: "VALIDATION_FAILED",
    reasons,
  };
}

function invitationValidationError(
  reason: Extract<
    BrandInvitationFailureReason,
    | "TARGET_ADMIN_NOT_FOUND"
    | "TARGET_ROLE_NOT_ADMIN"
    | "TARGET_ADMIN_INACTIVE"
    | "TARGET_ADMIN_SUSPENDED"
    | "TARGET_EMAIL_NOT_VERIFIED"
    | "TARGET_ADMIN_NOT_APPROVED"
  >
): BrandInvitationTargetValidationResult {
  return Result.error(
    new GeneralError({ reason }, "VALIDATION_FAILED")
  ) as BrandInvitationTargetValidationResult;
}

function invitationConflictError(
  reason: Extract<
    BrandInvitationFailureReason,
    "DUPLICATE_ACTIVE_MEMBERSHIP" | "DUPLICATE_PENDING_INVITATION"
  >
): BrandInvitationTargetValidationResult {
  return Result.error(
    new GeneralError({ reason }, "CONFLICT_STATE")
  ) as BrandInvitationTargetValidationResult;
}

function actorCanInvite(actor: BrandInvitationActor): boolean {
  if (!actor.currentMembership) {
    return false;
  }

  return (
    actor.currentMembership.status === "ACTIVE" &&
    (actor.currentMembership.role === "OWNER" ||
      actor.currentMembership.role === "MEMBER")
  );
}

function joinValidationError(
  reason: Extract<
    BrandJoinFailureReason,
    | "INVITATION_NOT_FOUND"
    | "INVITATION_REVOKED"
    | "JOIN_REQUEST_NOT_FOUND"
    | "TARGET_ADMIN_NOT_FOUND"
    | "TARGET_ROLE_NOT_ADMIN"
    | "TARGET_ADMIN_INACTIVE"
    | "TARGET_ADMIN_SUSPENDED"
    | "TARGET_EMAIL_NOT_VERIFIED"
    | "TARGET_ADMIN_NOT_APPROVED"
  >
): AppResult<never, { reason: BrandJoinFailureReason }> {
  return Result.error(new GeneralError({ reason }, "VALIDATION_FAILED"));
}

function joinConflictError(
  reason: Extract<
    BrandJoinFailureReason,
    | "INVITATION_NOT_PENDING"
    | "JOIN_REQUEST_NOT_PENDING"
    | "DUPLICATE_ACTIVE_MEMBERSHIP"
    | "DUPLICATE_PENDING_INVITATION"
    | "DUPLICATE_PENDING_REQUEST"
  >
): AppResult<never, { reason: BrandJoinFailureReason }> {
  return Result.error(new GeneralError({ reason }, "CONFLICT_STATE"));
}

function joinForbiddenError(
  reason: Extract<
    BrandJoinFailureReason,
    "INVITATION_NOT_FOR_ACTOR" | "APPROVER_NOT_AUTHORIZED"
  >
): AppResult<never, { reason: BrandJoinFailureReason }> {
  return Result.error(new GeneralError({ reason }, "AUTH_FORBIDDEN"));
}

function approverCanManageJoinRequest(
  _approverRole: BrandInvitationActorRole,
  approverMembership: BrandInvitationMembershipState | null
): boolean {
  if (!approverMembership) {
    return false;
  }

  return (
    approverMembership.status === "ACTIVE" &&
    (approverMembership.role === "OWNER" ||
      approverMembership.role === "MEMBER")
  );
}

export function acceptBrandInvitation(
  input: AcceptBrandInvitationInput
): AcceptBrandInvitationResult {
  if (!input.invitationMembership) {
    return joinValidationError("INVITATION_NOT_FOUND");
  }

  if (input.invitationMembership.adminId !== input.actorAdminId) {
    return joinForbiddenError("INVITATION_NOT_FOR_ACTOR");
  }

  if (input.invitationMembership.status === "REVOKED") {
    return joinValidationError("INVITATION_REVOKED");
  }

  if (input.invitationMembership.status !== "PENDING") {
    return joinConflictError("INVITATION_NOT_PENDING");
  }

  return Result.okay({ newStatus: "ACTIVE" });
}

export function requestBrandJoin(
  input: RequestBrandJoinInput
): RequestBrandJoinResult {
  if (input.existingMembership?.status === "ACTIVE") {
    return joinConflictError("DUPLICATE_ACTIVE_MEMBERSHIP");
  }

  if (input.existingMembership?.status === "PENDING") {
    return joinConflictError("DUPLICATE_PENDING_REQUEST");
  }

  return Result.okay({
    adminId: input.actorAdminId,
    role: "MEMBER",
    status: "PENDING",
    invitedByAdminId: null,
  });
}

export function approveBrandJoinRequest(
  input: ApproveBrandJoinRequestInput
): ApproveBrandJoinRequestResult {
  if (
    !approverCanManageJoinRequest(input.approverRole, input.approverMembership)
  ) {
    return joinForbiddenError("APPROVER_NOT_AUTHORIZED");
  }

  if (!input.joinRequestMembership) {
    return joinValidationError("JOIN_REQUEST_NOT_FOUND");
  }

  if (input.joinRequestMembership.adminId !== input.targetAdminId) {
    return joinValidationError("JOIN_REQUEST_NOT_FOUND");
  }

  if (input.joinRequestMembership.status !== "PENDING") {
    return joinConflictError("JOIN_REQUEST_NOT_PENDING");
  }

  return Result.okay({ newStatus: "ACTIVE" });
}

export function rejectBrandJoinRequest(
  input: RejectBrandJoinRequestInput
): RejectBrandJoinRequestResult {
  if (
    !approverCanManageJoinRequest(input.approverRole, input.approverMembership)
  ) {
    return joinForbiddenError("APPROVER_NOT_AUTHORIZED");
  }

  if (!input.joinRequestMembership) {
    return joinValidationError("JOIN_REQUEST_NOT_FOUND");
  }

  if (input.joinRequestMembership.adminId !== input.targetAdminId) {
    return joinValidationError("JOIN_REQUEST_NOT_FOUND");
  }

  if (input.joinRequestMembership.status !== "PENDING") {
    return joinConflictError("JOIN_REQUEST_NOT_PENDING");
  }

  return Result.okay({ newStatus: "REVOKED" });
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateBrandName(name: string): ValidationResult {
  const value = cleanText(name);

  if (!value.length) {
    return validationError(["name:required"]);
  }

  if (
    value.length < BRAND_NAME_MIN_LENGTH ||
    value.length > BRAND_NAME_MAX_LENGTH
  ) {
    return validationError(["name:length"]);
  }

  return { ok: true, value };
}

export function validateBrandSlug(slug: string): ValidationResult {
  const value = cleanText(slug);

  if (!value.length) {
    return validationError(["slug:required"]);
  }

  if (
    value.length < BRAND_SLUG_MIN_LENGTH ||
    value.length > BRAND_SLUG_MAX_LENGTH
  ) {
    return validationError(["slug:length"]);
  }

  if (!BRAND_SLUG_PATTERN.test(value)) {
    return validationError(["slug:format"]);
  }

  return { ok: true, value };
}

export function detectBrandCreateConflict(
  input: BrandConflictInput
): BrandConflictDecision {
  if (input.existingArchivedByName) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "ARCHIVED_NAME_CONFLICT",
    };
  }

  if (input.existingByName) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "DUPLICATE_NAME",
    };
  }

  if (input.existingBySlug) {
    return {
      ok: false,
      code: "CONFLICT_STATE",
      reason: "DUPLICATE_SLUG",
    };
  }

  return { ok: true };
}

export function detectBrandUpdateConflict(
  input: BrandConflictInput
): BrandConflictDecision {
  return detectBrandCreateConflict(input);
}

export function createBrand(input: BrandCreateInput): BrandCreationResult {
  const name = validateBrandName(input.name);
  if (!name.ok) {
    return Result.error(new GeneralError({ reasons: name.reasons }, name.code));
  }

  const rawSlug =
    typeof input.slug === "string" && input.slug.trim().length > 0
      ? input.slug
      : generateSlug(name.value);
  const slug = validateBrandSlug(rawSlug);
  if (!slug.ok) {
    return Result.error(new GeneralError({ reasons: slug.reasons }, slug.code));
  }

  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  if (description.length > BRAND_DESCRIPTION_MAX_LENGTH) {
    return Result.error(
      new GeneralError({ reasons: ["description:length"] }, "VALIDATION_FAILED")
    );
  }

  return Result.okay({
    name: name.value,
    slug: slug.value,
    description: description.length ? description : null,
  });
}

export function validateBrandInvitationTarget(
  input: BrandInvitationTargetValidationInput
): BrandInvitationTargetValidationResult {
  if (!input.targetAdmin) {
    return invitationValidationError("TARGET_ADMIN_NOT_FOUND");
  }

  if (input.targetAdmin.role !== "ADMIN") {
    return invitationValidationError("TARGET_ROLE_NOT_ADMIN");
  }

  if (input.targetAdmin.status === "SUSPENDED") {
    return invitationValidationError("TARGET_ADMIN_SUSPENDED");
  }

  if (input.targetAdmin.status !== "ACTIVE") {
    return invitationValidationError("TARGET_ADMIN_INACTIVE");
  }

  if (!input.targetAdmin.emailVerifiedAt) {
    return invitationValidationError("TARGET_EMAIL_NOT_VERIFIED");
  }

  if (!input.targetAdmin.approvedAt) {
    return invitationValidationError("TARGET_ADMIN_NOT_APPROVED");
  }

  if (input.existingMembership?.status === "ACTIVE") {
    return invitationConflictError("DUPLICATE_ACTIVE_MEMBERSHIP");
  }

  if (input.existingMembership?.status === "PENDING") {
    return invitationConflictError("DUPLICATE_PENDING_INVITATION");
  }

  return Result.okay({ targetAdminId: input.targetAdminId });
}

export function createBrandInvitation(
  input: CreateBrandInvitationInput
): BrandInvitationResult {
  if (!actorCanInvite(input.invitingActor)) {
    return Result.error(
      new GeneralError({ reason: "ACTOR_NOT_BRAND_MEMBER" }, "AUTH_FORBIDDEN")
    );
  }

  const targetValidation = validateBrandInvitationTarget({
    targetAdminId: input.targetAdminId,
    targetAdmin: input.targetAdmin,
    existingMembership: input.existingMembership,
  });
  if (targetValidation.error) {
    return Result.error(targetValidation.error);
  }

  return Result.okay({
    brandId: input.brandId,
    adminId: input.targetAdminId,
    role: "MEMBER",
    status: "PENDING",
    invitedByAdminId: input.invitingActor.adminId,
  });
}

function hasUpdateValue<T extends object>(
  input: T,
  key: keyof BrandUpdateInput
): boolean {
  return Object.prototype.hasOwnProperty.call(input, key);
}

export function validateBrandUpdate(
  input: BrandUpdateInput
): BrandUpdateResult {
  const hasName = hasUpdateValue(input, "name");
  const hasSlug = hasUpdateValue(input, "slug");
  const hasDescription = hasUpdateValue(input, "description");

  if (!hasName && !hasSlug && !hasDescription) {
    return Result.error(
      new GeneralError({ reasons: ["update:required"] }, "VALIDATION_FAILED")
    );
  }

  const draft: BrandUpdateDraft = {};
  const reasons: string[] = [];

  if (hasName) {
    const name = validateBrandName(input.name ?? "");
    if (!name.ok) {
      reasons.push(...name.reasons);
    } else {
      draft.name = name.value;
    }
  }

  if (hasSlug) {
    const slug = validateBrandSlug(input.slug ?? "");
    if (!slug.ok) {
      reasons.push(...slug.reasons);
    } else {
      draft.slug = slug.value;
    }
  }

  if (hasDescription) {
    const rawDescription =
      typeof input.description === "string" ? input.description.trim() : "";
    if (rawDescription.length > BRAND_DESCRIPTION_MAX_LENGTH) {
      reasons.push("description:length");
    } else {
      draft.description = rawDescription.length ? rawDescription : null;
    }
  }

  if (reasons.length > 0) {
    return Result.error(new GeneralError({ reasons }, "VALIDATION_FAILED"));
  }

  return Result.okay(draft);
}

export function updateBrand(input: {
  patch: BrandUpdateInput;
  conflict: BrandConflictInput;
}): BrandUpdateResult {
  const draft = validateBrandUpdate(input.patch);
  if (draft.error) {
    return draft;
  }

  const conflict = detectBrandUpdateConflict(input.conflict);
  if (!conflict.ok) {
    return Result.error(
      new GeneralError({ reason: conflict.reason }, "CONFLICT_STATE")
    );
  }

  return draft;
}

export function archiveBrand(input: BrandArchiveInput): BrandArchiveResult {
  if (input.currentStatus === "ARCHIVED") {
    return Result.error(
      new GeneralError({ reason: "ALREADY_ARCHIVED" }, "CONFLICT_STATE")
    );
  }

  return Result.okay({
    status: "ARCHIVED",
    archivedAt: input.timestamp,
  });
}
