import * as React from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui";
import {
  CustomerAccountApiError,
  type CustomerProfile,
  getCustomerProfile,
  updateCustomerProfile,
} from "./api";
import { AccountFormField } from "./components/AccountFormField";
import { AccountDashboardShell } from "./components/AccountDashboardShell";
import { customerAccountErrorMessage } from "./errors";
import {
  type CustomerProfileFieldErrors,
  type CustomerProfileFormState,
  validateCustomerProfileForm,
} from "./profile-validation";

function profileToForm(profile: CustomerProfile) {
  return {
    barangay: profile.barangay ?? "",
    cityProvince: profile.cityProvince ?? "",
    displayName: profile.displayName ?? "",
    emailMarketingOptIn: profile.emailMarketingOptIn,
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    phone: profile.phone ?? "",
    postalCode: profile.postalCode ?? "",
    streetAddress: profile.streetAddress ?? "",
  };
}

export function CustomerProfilePanel() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [form, setForm] = useState<CustomerProfileFormState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CustomerProfileFieldErrors>(
    {}
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    getCustomerProfile()
      .then((loadedProfile) => {
        if (!mounted) return;
        setProfile(loadedProfile);
        setForm(profileToForm(loadedProfile));
      })
      .catch((loadError) => {
        if (!mounted) return;
        if (
          loadError instanceof CustomerAccountApiError &&
          (loadError.status === 401 || loadError.status === 403)
        ) {
          window.location.replace("/account/sign-in?returnTo=/account/profile");
          return;
        }
        setError(customerAccountErrorMessage("load-profile", loadError));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <AccountDashboardShell
        description="Loading your safe customer profile."
        title="Your profile"
      >
        <p className="border border-brand-border bg-brand-background p-grid-sm text-sm text-brand-muted">
          Loading account details...
        </p>
      </AccountDashboardShell>
    );
  }

  if (!profile || !form) {
    return (
      <AccountDashboardShell
        description="We could not load your account details right now."
        title="Your profile"
      >
        <p
          className="border border-brand-danger bg-brand-surface p-grid-xs text-sm text-brand-danger"
          role="alert"
        >
          {error ?? "Profile unavailable."}
        </p>
      </AccountDashboardShell>
    );
  }

  function updateField<TKey extends keyof CustomerProfileFormState>(
    key: TKey,
    value: CustomerProfileFormState[TKey]
  ) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  }

  return (
    <AccountDashboardShell
      description="Update the details JRW. can reuse for faster checkout and future account features."
      title="Your profile"
    >
      <div className="grid gap-1 text-sm text-brand-content">
        <p>
          Signed in as <strong>{profile.email}</strong>
        </p>
        <p className="text-brand-muted">
          Email verification:{" "}
          {profile.emailVerified ? "Verified" : "Needs verification"}
        </p>
      </div>
      <form
        className="grid max-w-3xl gap-grid-sm"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setSuccess(null);
          const validationErrors = validateCustomerProfileForm(form);
          setFieldErrors(validationErrors);
          if (Object.keys(validationErrors).length > 0) {
            setError("Check the highlighted profile fields.");
            return;
          }
          setSaving(true);
          try {
            const updatedProfile = await updateCustomerProfile(form);
            setProfile(updatedProfile);
            setForm(profileToForm(updatedProfile));
            setSuccess("Profile saved.");
          } catch (submitError) {
            setError(customerAccountErrorMessage("save-profile", submitError));
          } finally {
            setSaving(false);
          }
        }}
      >
        {error ? (
          <p
            className="border border-brand-danger bg-brand-surface p-grid-xs text-sm text-brand-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {success ? (
          <p
            className="border border-brand-accent bg-brand-surface p-grid-xs text-sm text-brand-content"
            role="status"
          >
            {success}
          </p>
        ) : null}
        <div className="grid gap-grid-sm md:grid-cols-2">
          <AccountFormField
            id="customer-profile-display-name"
            error={fieldErrors.displayName}
            label="Display name"
            maxLength={120}
            onChange={(event) =>
              updateField("displayName", event.currentTarget.value)
            }
            type="text"
            value={form.displayName}
          />
          <AccountFormField
            id="customer-profile-phone"
            error={fieldErrors.phone}
            label="Phone"
            maxLength={32}
            onChange={(event) =>
              updateField("phone", event.currentTarget.value)
            }
            type="tel"
            value={form.phone}
          />
          <AccountFormField
            id="customer-profile-first-name"
            error={fieldErrors.firstName}
            label="First name"
            maxLength={80}
            onChange={(event) =>
              updateField("firstName", event.currentTarget.value)
            }
            type="text"
            value={form.firstName}
          />
          <AccountFormField
            id="customer-profile-last-name"
            error={fieldErrors.lastName}
            label="Last name"
            maxLength={80}
            onChange={(event) =>
              updateField("lastName", event.currentTarget.value)
            }
            type="text"
            value={form.lastName}
          />
          <AccountFormField
            id="customer-profile-street-address"
            error={fieldErrors.streetAddress}
            label="Street address"
            maxLength={240}
            onChange={(event) =>
              updateField("streetAddress", event.currentTarget.value)
            }
            type="text"
            value={form.streetAddress}
          />
          <AccountFormField
            id="customer-profile-barangay"
            error={fieldErrors.barangay}
            label="Barangay"
            maxLength={120}
            onChange={(event) =>
              updateField("barangay", event.currentTarget.value)
            }
            type="text"
            value={form.barangay}
          />
          <AccountFormField
            id="customer-profile-city-province"
            error={fieldErrors.cityProvince}
            label="City / Province"
            maxLength={120}
            onChange={(event) =>
              updateField("cityProvince", event.currentTarget.value)
            }
            type="text"
            value={form.cityProvince}
          />
          <AccountFormField
            id="customer-profile-postal-code"
            error={fieldErrors.postalCode}
            label="Postal code"
            maxLength={24}
            onChange={(event) =>
              updateField("postalCode", event.currentTarget.value)
            }
            type="text"
            value={form.postalCode}
          />
        </div>
        <label className="flex items-start gap-grid-xs text-sm leading-6 text-brand-content">
          <input
            checked={form.emailMarketingOptIn}
            className="mt-1 size-4 rounded-none border-brand-border-strong accent-brand-accent"
            onChange={(event) =>
              updateField("emailMarketingOptIn", event.currentTarget.checked)
            }
            type="checkbox"
          />
          Send me JRW. updates and product notices.
        </label>
        <Button loading={saving} loadingLabel="Saving profile" type="submit">
          Save profile
        </Button>
      </form>
    </AccountDashboardShell>
  );
}
