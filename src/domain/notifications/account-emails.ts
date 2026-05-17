export type EmailSendResult = { ok: true } | { ok: false; error?: unknown };

export type CustomerVerificationEmailInput = {
  toEmail: string;
  token: string;
  expiresAt: string;
  requestId: string;
};

export type PasswordResetEmailInput = {
  toEmail: string;
  token: string;
  expiresAt: string;
  requestId: string;
};

export type AdminLifecycleEmailInput = {
  toEmail: string;
  requestId: string;
  displayName?: string | null;
  actionUrl?: string | null;
  statusLabel?: "invited" | "approved" | "rejected";
};

export type BrandInvitationEmailInput = {
  toEmail: string;
  brandName: string;
  invitedByDisplayName: string;
  actionUrl: string;
  requestId: string;
};

export type CustomerVerificationEmailNotifier = {
  sendVerificationEmail(
    input: CustomerVerificationEmailInput
  ): Promise<EmailSendResult>;
};

export type AccountEmailNotifier = CustomerVerificationEmailNotifier & {
  sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<EmailSendResult>;
  sendAdminInvitationEmail(
    input: AdminLifecycleEmailInput
  ): Promise<EmailSendResult>;
  sendAdminApprovalEmail(
    input: AdminLifecycleEmailInput
  ): Promise<EmailSendResult>;
  sendAdminRejectionEmail(
    input: AdminLifecycleEmailInput
  ): Promise<EmailSendResult>;
  sendBrandInvitationEmail(
    input: BrandInvitationEmailInput
  ): Promise<EmailSendResult>;
};
