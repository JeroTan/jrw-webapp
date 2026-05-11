import { t } from "elysia";

export function tboxName({
  fieldName = "Field",
  minLength = 2,
  maxLength = 64,
}: { fieldName?: string; minLength?: number; maxLength?: number } = {}) {
  // Unicode ranges: Letters (all languages), numbers, spaces, and common punctuation
  // Includes Latin, Japanese (Hiragana, Katakana, Kanji), Chinese, Korean, Arabic, etc.
  return t.String({
    minLength,
    maxLength,
    pattern:
      "^[\\u0020-\\u007E\\u00A0-\\u00FF\\u0100-\\u017F\\u0180-\\u024F\\u1E00-\\u1EFF\\u2000-\\u206F\\u3040-\\u309F\\u30A0-\\u30FF\\u4E00-\\u9FFF\\uAC00-\\uD7AF\\u0600-\\u06FF\\s0-9.,'\"\\-]+$",
    description: fieldName,
    error: `${fieldName} must be between ${minLength} and ${maxLength} characters long and contain valid characters.`,
  });
}

export function tboxTextEssentials({
  fieldName = "Field",
  minLength = 2,
  maxLength = 150,
}: { fieldName?: string; minLength?: number; maxLength?: number } = {}) {
  return t.String({
    minLength,
    maxLength,
    pattern: "^[\\p{L}\\p{M}\\s.,0-9 !\"&'()+,\\-./:;=\\\\_]+$",
    description: fieldName,
    error: `${fieldName} should only contain letters, numbers, spaces and some essential characters.`,
  });
}

export function tboxEmail({
  fieldName = "Email Address",
  minLength = 5,
  maxLength = 100,
}: { fieldName?: string; minLength?: number; maxLength?: number } = {}) {
  return t.String({
    format: "email",
    minLength,
    maxLength,
    description: fieldName,
    error: `Invalid ${fieldName}.`,
  });
}

export function tboxPassword({
  fieldName = "Password",
  minLength = 8,
  maxLength = 256,
}: { fieldName?: string; minLength?: number; maxLength?: number } = {}) {
  return t.String({
    minLength,
    maxLength,
    pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
    description: fieldName,
    error: `${fieldName} should contain at least one lowercase letter, one uppercase letter, and one digit.`,
  });
}

export function tboxAlphaNumericSpace({
  fieldName = "Field",
  minLength = 2,
  maxLength = 32,
}: { fieldName?: string; minLength?: number; maxLength?: number } = {}) {
  return t.String({
    minLength,
    maxLength,
    pattern: "^[a-zA-Z0-9 ]+$",
    description: fieldName,
    error: `${fieldName} should only contain letters, numbers and spaces.`,
  });
}

export function tboxLargeText({
  fieldName = "Field",
  maxLength = 512,
}: { fieldName?: string; maxLength?: number } = {}) {
  return t.String({
    maxLength,
    description: fieldName,
    error: `${fieldName} must be at most ${maxLength} characters long.`,
  });
}

export function tboxAddress({
  fieldName = "Address",
  minLength = 5,
  maxLength = 150,
}: { fieldName?: string; minLength?: number; maxLength?: number } = {}) {
  return t
    .String({
      pattern: "^[A-Za-z0-9 !\"&'()+,\\-./:;=\\\\_]+$",
      maxLength,
      description: fieldName,
      error: `${fieldName} should only contain letters, numbers, spaces and some essential characters.`,
    })
    .min(minLength, { message: `${fieldName} must be at least ${minLength} characters long.` });
}

export function tbox0To9({ fieldName = "Field" }: { fieldName?: string } = {}) {
  return t.Number({
    minimum: 0,
    maximum: 9,
    description: fieldName,
    error: `${fieldName} must be a number from 0 to 9.`,
  });
}

export function tbox0To9AsString({ fieldName = "Field" }: { fieldName?: string } = {}) {
  return t.String({
    pattern: "^[0-9]$",
    description: `${fieldName} accepts as string but treated as number.`,
    error: `${fieldName} must be a string representing a number from 0 to 9.`,
  });
}

export function tboxRarity({ fieldName = "Rarity" }: { fieldName?: string } = {}) {
  return t.Number({
    minimum: 1,
    maximum: 5,
    description: fieldName,
    error: `${fieldName} must be a number from 1 to 5.`,
  });
}

export function tboxRarityAsString({ fieldName = "Rarity" }: { fieldName?: string } = {}) {
  return t.String({
    pattern: "^[1-5]$",
    description: `${fieldName} accepts as string but treated as number.`,
    error: `${fieldName} must be a string representing a number from 1 to 5.`,
  });
}

export function tboxFile({
  fieldName = "File",
  fileTypes = ["image/jpeg"],
}: { fieldName?: string; fileTypes?: string[] } = {}) {
  return t.File({
    type: fileTypes,
    description: fieldName,
    error: `${fieldName} must be a ${fileTypes.join(", ")}.`,
  });
}

export function tboxImage({ fieldName = "Image" }: { fieldName?: string } = {}) {
  const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
  return tboxFile({ fieldName, fileTypes: imageTypes });
}

export function tboxDateTime({ fieldName = "Date Time" }: { fieldName?: string } = {}) {
  return t.String({
    format: "date-time",
    description: fieldName,
    error: `Invalid ${fieldName}.`,
  });
}

export function tboxLiterals({
  fieldName = "Field",
  literals = [],
}: {
  fieldName?: string;
  literals: string[];
}) {
  const formatLiterals = (items: string[]) => {
    if (items.length === 0) return "";
    if (items.length === 1) return `"${items[0]}"`;
    if (items.length === 2) return `"${items[0]}" or "${items[1]}"`;
    return `${items
      .slice(0, -1)
      .map((i) => `"${i}"`)
      .join(", ")} or "${items[items.length - 1]}"`;
  };

  const formatted = formatLiterals(literals);
  return t.Union(
    literals.map((lit) => t.Literal(lit)),
    { error: `${fieldName} must be one of the predefined values: ${formatted}.` },
  );
}
