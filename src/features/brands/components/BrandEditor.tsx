import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  createBrand as buildBrandDraft,
  generateSlug,
} from "@/domain/brands/brand";
import { Button, Modal, Textarea } from "@/components/ui";
import { InputBox } from "@/components/ui/InputBox";
import type { BrandEditorSaveInput } from "../types";

type BrandEditorFormState = {
  name: string;
  slug: string;
  description: string;
  image: File | null;
  imageAlt: string;
};

type BrandEditorValidationState = {
  summary: string[];
  fields: Partial<Record<keyof BrandEditorFormState, string>>;
};

export type BrandEditorProps = {
  onClose: () => void;
  onSave: (input: BrandEditorSaveInput) => Promise<void>;
  open: boolean;
  saving?: boolean;
};

function emptyFormState(): BrandEditorFormState {
  return {
    name: "",
    slug: "",
    description: "",
    image: null,
    imageAlt: "",
  };
}

function emptyValidationState(): BrandEditorValidationState {
  return { summary: [], fields: {} };
}

function serializeFormState(form: BrandEditorFormState): string {
  return JSON.stringify({
    name: form.name,
    slug: form.slug,
    description: form.description,
    imageAlt: form.imageAlt,
    imageName: form.image?.name ?? null,
    imageSize: form.image?.size ?? null,
  });
}

export function suggestedBrandSlug(name: string): string {
  return name.trim().length > 0 ? generateSlug(name) : "";
}

export function brandImagePreviewAlt(input: {
  brandName: string;
  imageAlt: string;
}): string {
  const explicitAlt = input.imageAlt.trim();
  if (explicitAlt.length > 0) {
    return explicitAlt;
  }

  const brandName = input.brandName.trim();
  return brandName.length > 0
    ? `${brandName} brand image preview`
    : "Selected brand image preview";
}

function validationReasonMessage(reason: string): string {
  switch (reason) {
    case "name:required":
      return "Brand name is required.";
    case "name:length":
      return "Brand name must be 2 to 120 characters.";
    case "slug:required":
      return "Slug is required.";
    case "slug:length":
      return "Slug must be 2 to 120 characters.";
    case "slug:format":
      return "Slug can use lowercase letters, numbers, and hyphens.";
    case "description:length":
      return "Description must be 500 characters or less.";
    case "image:type":
      return "Brand image must be JPEG, PNG, or WEBP.";
    case "image:size":
      return "Brand image must be 5MB or less.";
    default:
      return "Brand details are invalid.";
  }
}

function reasonToField(reason: string): keyof BrandEditorFormState | undefined {
  const field = reason.split(":")[0];
  if (field === "name" || field === "slug" || field === "description") {
    return field;
  }

  if (field === "image") {
    return "image";
  }

  return undefined;
}

function validateBrandInput(form: BrandEditorFormState):
  | {
      okay: true;
      value: BrandEditorSaveInput;
    }
  | {
      okay: false;
      validation: BrandEditorValidationState;
    } {
  const result = buildBrandDraft({
    name: form.name,
    slug: form.slug.trim().length > 0 ? form.slug : null,
    description: form.description.trim().length > 0 ? form.description : null,
  });

  if (result.error) {
    const reasons =
      typeof result.error.data === "object" &&
      result.error.data !== null &&
      "reasons" in result.error.data &&
      Array.isArray((result.error.data as { reasons?: unknown }).reasons)
        ? (result.error.data as { reasons: string[] }).reasons
        : ["form:invalid"];
    const fields: Partial<Record<keyof BrandEditorFormState, string>> = {};

    reasons.forEach((reason) => {
      const field = reasonToField(reason);
      if (field && !fields[field]) {
        fields[field] = validationReasonMessage(reason);
      }
    });

    return {
      okay: false,
      validation: {
        summary: reasons.map(validationReasonMessage),
        fields,
      },
    };
  }

  if (form.image) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxBytes = 5 * 1024 * 1024;

    if (!allowedTypes.includes(form.image.type)) {
      const message = validationReasonMessage("image:type");
      return {
        okay: false,
        validation: {
          summary: [message],
          fields: { image: message },
        },
      };
    }

    if (form.image.size > maxBytes) {
      const message = validationReasonMessage("image:size");
      return {
        okay: false,
        validation: {
          summary: [message],
          fields: { image: message },
        },
      };
    }
  }

  return {
    okay: true,
    value: {
      name: result.content.name,
      slug: result.content.slug,
      description: result.content.description,
      image: form.image,
      imageAlt: form.imageAlt.trim().length > 0 ? form.imageAlt.trim() : null,
    },
  };
}

function actionErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();
    if (message.length > 0) {
      return message;
    }
  }

  return "We could not create this brand right now.";
}

export function BrandEditor({
  onClose,
  onSave,
  open,
  saving = false,
}: BrandEditorProps) {
  const [form, setForm] = useState<BrandEditorFormState>(() =>
    emptyFormState()
  );
  const [baselineForm, setBaselineForm] = useState(() =>
    serializeFormState(emptyFormState())
  );
  const [validation, setValidation] = useState<BrandEditorValidationState>(() =>
    emptyValidationState()
  );
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const next = emptyFormState();
    setForm(next);
    setBaselineForm(serializeFormState(next));
    setValidation(emptyValidationState());
    setSlugManuallyEdited(false);
  }, [open]);

  const isDirty = useMemo(
    () => serializeFormState(form) !== baselineForm,
    [baselineForm, form]
  );

  useEffect(() => {
    if (!open || !isDirty || typeof window === "undefined") {
      return;
    }

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [isDirty, open]);

  useEffect(() => {
    if (
      !open ||
      !form.image ||
      typeof URL === "undefined" ||
      typeof URL.createObjectURL !== "function"
    ) {
      setImagePreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(form.image);
    setImagePreviewUrl(nextPreviewUrl);

    return () => {
      if (typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(nextPreviewUrl);
      }
    };
  }, [form.image, open]);

  function clearValidation() {
    if (
      validation.summary.length > 0 ||
      Object.keys(validation.fields).length > 0
    ) {
      setValidation(emptyValidationState());
    }
  }

  function updateField<K extends keyof BrandEditorFormState>(
    key: K,
    value: BrandEditorFormState[K]
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
    clearValidation();
  }

  function updateName(value: string) {
    setForm((previous) => ({
      ...previous,
      name: value,
      slug: !slugManuallyEdited ? suggestedBrandSlug(value) : previous.slug,
    }));
    clearValidation();
  }

  function updateSlug(value: string) {
    setSlugManuallyEdited(true);
    updateField("slug", value);
  }

  function updateImage(file: File | null) {
    setForm((previous) => ({
      ...previous,
      image: file,
      imageAlt:
        previous.imageAlt.trim().length > 0 || !file
          ? previous.imageAlt
          : previous.name,
    }));
    clearValidation();
  }

  function handleClose() {
    if (
      open &&
      isDirty &&
      typeof window !== "undefined" &&
      !window.confirm("You have unsaved changes. Leave brand editor?")
    ) {
      return;
    }

    onClose();
  }

  async function handleSubmit(
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) {
    event.preventDefault();
    const result = validateBrandInput(form);

    if (!result.okay) {
      setValidation(result.validation);
      return;
    }

    try {
      await onSave(result.value);
      setBaselineForm(serializeFormState(form));
      setValidation(emptyValidationState());
    } catch (error) {
      setValidation({
        summary: [actionErrorMessage(error)],
        fields: {},
      });
    }
  }

  return (
    <Modal
      description="Create brand details used for product assignment and admin collaboration."
      footer={
        <>
          <Button onClick={handleClose} variant="secondary">
            Cancel
          </Button>
          <Button
            form="brand-editor-form"
            loading={saving}
            type="submit"
            variant="primary"
          >
            Create brand
          </Button>
        </>
      }
      onClose={handleClose}
      open={open}
      title="Create brand"
    >
      <form
        className="grid gap-grid-sm"
        id="brand-editor-form"
        onSubmit={handleSubmit}
      >
        {validation.summary.length > 0 ? (
          <section
            aria-live="assertive"
            className="grid gap-grid-xs border border-brand-danger bg-brand-danger/6 p-grid-sm text-brand-danger [&_p]:font-system [&_p]:text-[0.8125rem] [&_p]:font-bold [&_ul]:m-0 [&_ul]:pl-grid-sm"
            role="alert"
          >
            <p>We found issues in this form:</p>
            <ul>
              {validation.summary.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <InputBox
          error={validation.fields.name}
          label="Brand name"
          onChange={(event) => updateName(event.currentTarget.value)}
          required
          value={form.name}
        />

        <InputBox
          error={validation.fields.slug}
          label="Slug"
          onChange={(event) => updateSlug(event.currentTarget.value)}
          placeholder="jrw-studio"
          value={form.slug}
        />

        <Textarea
          error={validation.fields.description}
          label="Description"
          onChange={(event) =>
            updateField("description", event.currentTarget.value)
          }
          rows={4}
          value={form.description}
        />

        <InputBox
          accept="image/jpeg,image/png,image/webp"
          description="Optional brand image shown in admin brand cards and detail."
          error={validation.fields.image}
          label="Brand image"
          onChange={(event) =>
            updateImage(event.currentTarget.files?.item(0) ?? null)
          }
          type="file"
        />

        {form.image ? (
          <section aria-live="polite" className="grid gap-grid-xs">
            <p className="m-0 font-system text-xs text-brand-muted">
              Selected image: {form.image.name}
            </p>
            {imagePreviewUrl ? (
              <div className="aspect-square w-24 overflow-hidden border border-brand-border-strong bg-brand-surface-subtle">
                <img
                  alt={brandImagePreviewAlt({
                    brandName: form.name,
                    imageAlt: form.imageAlt,
                  })}
                  className="h-full w-full object-cover"
                  src={imagePreviewUrl}
                />
              </div>
            ) : null}
          </section>
        ) : null}

        <InputBox
          label="Image alt text"
          onChange={(event) =>
            updateField("imageAlt", event.currentTarget.value)
          }
          value={form.imageAlt}
        />
      </form>
    </Modal>
  );
}
