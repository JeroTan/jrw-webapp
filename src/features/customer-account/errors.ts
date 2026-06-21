import { CustomerAccountApiError } from "./api";

type CustomerAccountAction =
  | "load-profile"
  | "register"
  | "save-profile"
  | "sign-in";

const fallbackMessages: Record<CustomerAccountAction, string> = {
  "load-profile": "We could not load your profile. Please try again.",
  register: "We could not create your account. Please try again.",
  "save-profile": "We could not save your profile. Please try again.",
  "sign-in": "We could not sign you in. Please try again.",
};

export function customerAccountErrorMessage(
  action: CustomerAccountAction,
  error: unknown
): string {
  if (!(error instanceof CustomerAccountApiError)) {
    return fallbackMessages[action];
  }

  switch (error.code) {
    case "AUTHENTICATION":
      return "Email or password is incorrect.";
    case "EMAIL_NOT_VERIFIED":
      return "Verify your email before signing in.";
    case "ACCOUNT_SUSPENDED":
    case "AUTH_FORBIDDEN":
      return "This account is unavailable. Contact support if you need help.";
    case "CONFLICT_STATE":
      return action === "register"
        ? "An account already uses this email."
        : fallbackMessages[action];
    case "RATE_LIMITED":
      return "Too many attempts. Try again later.";
    case "VALIDATION_FAILED":
      return "Check your account details and try again.";
    default:
      return fallbackMessages[action];
  }
}
