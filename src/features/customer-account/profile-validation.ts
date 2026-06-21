export type CustomerProfileFormState = {
  barangay: string;
  cityProvince: string;
  displayName: string;
  emailMarketingOptIn: boolean;
  firstName: string;
  lastName: string;
  phone: string;
  postalCode: string;
  streetAddress: string;
};

export type CustomerProfileFieldErrors = Partial<
  Record<Exclude<keyof CustomerProfileFormState, "emailMarketingOptIn">, string>
>;

const maxLengths: Record<keyof CustomerProfileFieldErrors, number> = {
  barangay: 120,
  cityProvince: 120,
  displayName: 120,
  firstName: 80,
  lastName: 80,
  phone: 32,
  postalCode: 24,
  streetAddress: 240,
};

export function validateCustomerProfileForm(
  form: CustomerProfileFormState
): CustomerProfileFieldErrors {
  const errors: CustomerProfileFieldErrors = {};

  for (const [field, maxLength] of Object.entries(maxLengths) as Array<
    [keyof CustomerProfileFieldErrors, number]
  >) {
    if (form[field].length > maxLength) {
      errors[field] = `Enter no more than ${maxLength} characters.`;
    }
  }

  if (form.phone.length > 0 && form.phone.length < 7) {
    errors.phone = "Enter at least 7 characters.";
  }

  return errors;
}
