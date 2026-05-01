import { z } from "zod";
import { fileType } from "elysia";

export function zodName({
  fieldName = "Field",
  minLength = 2,
  maxLength = 64,
}: { fieldName?: string; minLength?: number; maxLength?: number } = {}) {
  return z
    .string()
    .min(minLength, {
      message: `${fieldName} must be at least ${minLength} characters long.`,
    })
    .max(maxLength, {
      message: `${fieldName} must be at most ${maxLength} characters long.`,
    })
    .regex(/^[\p{L}\p{M}'ñÑáéíóúÁÉÍÓÚ\s\-\.,]+$/gu, {
      message: `${fieldName} should only contain letters, spaces, and the characters ., ' \"`,
    });
}
export function zodNameWithNumbers({
  fieldName = "Field",
  minLength = 2,
  maxLength = 64,
}: { fieldName?: string; minLength?: number; maxLength?: number } = {}) {
  return z
    .string()
    .min(minLength, {
      message: `${fieldName} must be at least ${minLength} characters long.`,
    })
    .max(maxLength, {
      message: `${fieldName} must be at most ${maxLength} characters long.`,
    })
    .regex(/^[\p{L}\p{M}0-9'ñÑáéíóúÁÉÍÓÚ\s\-\.,]+$/gu, {
      message: `${fieldName} should only contain letters, numbers, spaces, and the characters ., ' \"`,
    });
}

export function zodTextEssentials({
  fieldName = "Field",
  minLength = 2,
  maxLength = 150,
}: { fieldName?: string; minLength?: number; maxLength?: number } = {}) {
  return z
    .string()
    .min(minLength, {
      message: `${fieldName} must be at least ${minLength} characters long.`,
    })
    .max(maxLength, {
      message: `${fieldName} must be at most ${maxLength} characters long.`,
    })
    .regex(/^[\p{L}\p{M}'ñÑáéíóúÁÉÍÓÚ\s\.,0-9 !"&'()+,\-./:;=\\_]+$/u, {
      message: `${fieldName} should only contain letters, numbers, spaces and some essential characters.`,
    });
}

export function zodEmail({
  fieldName = "Email Address",
  minLength = 5,
  maxLength = 100,
}: { fieldName?: string; minLength?: number; maxLength?: number } = {}) {
  return z
    .email({ message: `Invalid ${fieldName}.` })
    .min(minLength, {
      message: `${fieldName} must be at least ${minLength} characters long.`,
    })
    .max(maxLength, {
      message: `${fieldName} must be at most ${maxLength} characters long.`,
    });
}

export function zodPassword({
  fieldName = "Password",
  minLength = 8,
  maxLength = 256,
}: { fieldName?: string; minLength?: number; maxLength?: number } = {}) {
  return z
    .string()
    .min(minLength, {
      message: `${fieldName} must be at least ${minLength} characters long.`,
    })
    .max(maxLength, {
      message: `${fieldName} must be at most ${maxLength} characters long.`,
    })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
      message: `${fieldName} should contain at least one lowercase letter, one uppercase letter, and one digit.`,
    });
}

export function zodAlphaNumericSpace({
  fieldName = "Field",
  minLength = 2,
  maxLength = 32,
}: { fieldName?: string; minLength?: number; maxLength?: number } = {}) {
  return z
    .string()
    .min(minLength, { message: `${fieldName} is required.` })
    .max(maxLength, {
      message: `${fieldName} must be at most ${maxLength} characters long.`,
    })
    .regex(/^[a-zA-Z0-9 ]+$/, {
      message: `${fieldName} should only contain letters, numbers and spaces.`,
    });
}

export function zodLargeText({
  fieldName = "Field",
  maxLength = 512,
}: { fieldName?: string; maxLength?: number } = {}) {
  return z.string().max(maxLength, {
    message: `${fieldName} must be at most ${maxLength} characters long.`,
  });
}

export function zodAddress({
  fieldName = "Address",
  minLength = 5,
  maxLength = 150,
}: { fieldName?: string; minLength?: number; maxLength?: number } = {}) {
  return z
    .string()
    .regex(/^[A-Za-z0-9 !"&'()+,\-./:;=\\_]+$/u, {
      message: `${fieldName} should only contain letters, numbers, spaces and some essential characters.`,
    })
    .min(minLength, {
      message: `${fieldName} must be at least ${minLength} characters long.`,
    })
    .max(maxLength, {
      message: `${fieldName} must be at most ${maxLength} characters long.`,
    });
}

export function zodRequired<T extends z.ZodType>(
  zodSchema: T,
  fieldName = "Field"
) {
  return zodSchema
    .transform((val) => (val === "" ? undefined : val))
    .refine((val) => val !== undefined && val !== null, {
      message: `${fieldName} is required.`,
    });
}

export function zod0To9({ fieldName = "Field" }: { fieldName?: string } = {}) {
  return z.coerce
    .number({ message: `${fieldName} must be a number from 0 to 9.` })
    .min(0, { message: `${fieldName} must be at least 0.` })
    .max(9, { message: `${fieldName} must be at most 9.` });
}

export function zodRarity({
  fieldName = "Rarity",
}: { fieldName?: string } = {}) {
  return z.coerce
    .number({ message: `${fieldName} must be a number from 1 to 5.` })
    .min(1, { message: `${fieldName} must be at least 1.` })
    .max(5, { message: `${fieldName} must be at most 5.` });
}

export function zodFile({
  fieldName = "File",
  fileTypes = ["image/jpeg"],
}: { fieldName?: string; fileTypes?: string[] } = {}) {
  return z
    .file()
    .refine((file) => fileTypes.some((type) => fileType(file, type)), {
      error: `${fieldName} must be a ${fileTypes.join(", ")}.`,
    });
}

export function zodImage({ fieldName = "Image" }: { fieldName?: string } = {}) {
  const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  return zodFile({ fieldName, fileTypes: imageTypes });
}

export function zodArrayMinMax<T extends z.ZodTypeAny>({
  zodSchema,
  minLength,
  maxLength,
  fieldName = "Field",
}: {
  zodSchema: T;
  minLength?: number;
  maxLength?: number;
  fieldName?: string;
}) {
  const zodData = z.array(zodSchema);
  if (minLength !== undefined)
    zodData.min(minLength, {
      message: `${fieldName} must have at least ${minLength} items.`,
    });

  if (maxLength !== undefined)
    zodData.max(maxLength, {
      message: `${fieldName} must have at most ${maxLength} items.`,
    });
  return zodData;
}

// API Wrappers (Zod)
export function zodApiResponse<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    message: z.string(),
  });
}

export function zodPaginatedResponse<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: z.array(dataSchema),
    meta: z.object({
      page: z.number(),
      total: z.number(),
      limit: z.number(),
    }),
    message: z.string(),
  });
}
