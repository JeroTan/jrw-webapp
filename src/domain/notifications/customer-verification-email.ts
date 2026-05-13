export type CustomerVerificationEmailInput = {
  toEmail: string;
  token: string;
  expiresAt: string;
  requestId: string;
};

export type CustomerVerificationEmailNotifier = {
  sendVerificationEmail(
    input: CustomerVerificationEmailInput
  ): Promise<{ ok: true } | { ok: false; error?: unknown }>;
};
