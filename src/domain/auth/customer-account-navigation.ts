const CUSTOMER_RETURN_BASE = "https://jrw.local";
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function isBlockedRoute(pathname: string): boolean {
  const normalized = pathname.toLowerCase();
  return (
    normalized === "/admin" ||
    normalized.startsWith("/admin/") ||
    normalized === "/api" ||
    normalized.startsWith("/api/")
  );
}

export function sanitizeCustomerReturnTo(
  value: string | null | undefined
): string | undefined {
  if (!value || CONTROL_CHARACTERS.test(value)) return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;

  try {
    const url = new URL(value, CUSTOMER_RETURN_BASE);
    if (url.origin !== CUSTOMER_RETURN_BASE) return undefined;

    const decodedPathname = decodeURIComponent(url.pathname);
    if (CONTROL_CHARACTERS.test(decodedPathname)) return undefined;
    if (!decodedPathname.startsWith("/") || decodedPathname.startsWith("//")) {
      return undefined;
    }
    if (isBlockedRoute(decodedPathname)) return undefined;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}
