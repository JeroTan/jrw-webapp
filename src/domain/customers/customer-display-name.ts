const CUSTOMER_DISPLAY_NAME_MAX_LENGTH = 120;

export function sanitizeCustomerDisplayName(
  value: string | null | undefined
): string | undefined {
  if (typeof value !== "string") return undefined;

  const displayName = value.trim().replace(/\s+/g, " ");
  if (displayName.length === 0) return undefined;

  return displayName.slice(0, CUSTOMER_DISPLAY_NAME_MAX_LENGTH);
}

function emailLocalPartFragment(email: string): string {
  const localPart = email.trim().toLowerCase().split("@")[0] ?? "";
  const fragment = localPart
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return fragment.length >= 3 ? fragment : "customer";
}

export function createGeneratedCustomerDisplayName(
  email: string,
  randomToken: () => string = () => crypto.randomUUID()
): string {
  const suffix =
    randomToken()
      .replace(/[^a-z0-9]+/gi, "")
      .slice(0, 8)
      .toLowerCase() || "account";
  const separator = "-";
  const maxBaseLength = Math.max(
    1,
    CUSTOMER_DISPLAY_NAME_MAX_LENGTH - separator.length - suffix.length
  );
  const base =
    emailLocalPartFragment(email)
      .slice(0, maxBaseLength)
      .replace(/-+$/g, "") || "customer";

  return `${base}${separator}${suffix}`.slice(0, CUSTOMER_DISPLAY_NAME_MAX_LENGTH);
}
