export const FORBIDDEN_BRAND_TERMS = [
  "seller",
  "merchant",
  "tenant",
  "store owner",
  "payout owner",
  "paymongo owner",
] as const;

const SAFE_LABEL_MAP: Record<(typeof FORBIDDEN_BRAND_TERMS)[number], string> = {
  seller: "brand",
  merchant: "brand",
  tenant: "catalog group",
  "store owner": "brand member",
  "payout owner": "brand member",
  "paymongo owner": "JRW seller of record",
};

const ALLOWED_SELLER_OF_RECORD_PATTERN =
  /\bjrw(?:\s+(?:is|remains|as))?\s+seller\s+of\s+record\b/gi;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsForbiddenTerm(text: string, forbiddenTerm: string): boolean {
  const normalized =
    forbiddenTerm === "seller"
      ? text.replace(ALLOWED_SELLER_OF_RECORD_PATTERN, "").toLowerCase()
      : text.toLowerCase();
  const pattern = new RegExp(`\\b${escapeRegExp(forbiddenTerm)}\\b`, "i");
  return pattern.test(normalized);
}

export function validateBrandCopy(text: string, context: string): string[] {
  const violations: string[] = [];

  for (const term of FORBIDDEN_BRAND_TERMS) {
    if (!containsForbiddenTerm(text, term)) {
      continue;
    }

    violations.push(`${context}: forbidden term "${term}"`);
  }

  return violations;
}

export function safeBrandLabel(term: string): string {
  const normalized = term.trim().toLowerCase();

  if (normalized in SAFE_LABEL_MAP) {
    return SAFE_LABEL_MAP[normalized as keyof typeof SAFE_LABEL_MAP];
  }

  return term.trim().length > 0 ? term.trim() : "brand";
}
