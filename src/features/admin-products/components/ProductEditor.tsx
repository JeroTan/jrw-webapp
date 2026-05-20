import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal, Textarea } from "@/components/ui";
import { slugifyProductText } from "@/domain/products/product";
import { zodCreateProductInput } from "@/domain/products/schemas";
import type { ProductMutationInput, ProductRecord } from "../types";

type ProductEditorMode = "create" | "edit";

type ProductEditorFormState = {
  name: string;
  slug: string;
  summary: string;
  description: string;
};

type ProductEditorValidationState = {
  summary: string[];
  fields: Partial<Record<keyof ProductEditorFormState, string>>;
};

export type ProductEditorProps = {
  product?: ProductRecord | null;
  mode: ProductEditorMode;
  onClose: () => void;
  onSave: (input: ProductMutationInput) => Promise<void>;
  open: boolean;
  saving?: boolean;
};

function emptyValidationState(): ProductEditorValidationState {
  return { summary: [], fields: {} };
}

function toEditorFormState(product?: ProductRecord | null): ProductEditorFormState {
  if (!product) {
    return {
      name: "",
      slug: "",
      summary: "",
      description: "",
    };
  }

  return {
    name: product.name,
    slug: product.slug,
    summary: product.summary ?? "",
    description: product.description,
  };
}

function issueToField(path: string): keyof ProductEditorFormState | undefined {
  switch (path) {
    case "name":
      return "name";
    case "slug":
      return "slug";
    case "summary":
      return "summary";
    case "description":
      return "description";
    default:
      return undefined;
  }
}

export function suggestedProductSlug(name: string): string {
  return name.trim().length > 0 ? slugifyProductText(name) : "";
}

function validateProductInput(
  form: ProductEditorFormState
):
  | {
      okay: true;
      value: ProductMutationInput;
    }
  | {
      okay: false;
      validation: ProductEditorValidationState;
    } {
  const payload = {
    name: form.name,
    slug: form.slug.trim().length > 0 ? form.slug : undefined,
    summary: form.summary.trim().length > 0 ? form.summary : null,
    description: form.description,
  };

  const parsed = zodCreateProductInput.safeParse(payload);
  if (!parsed.success) {
    const summary = parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "form"}: ${issue.message}`
    );
    const fields: Partial<Record<keyof ProductEditorFormState, string>> = {};

    parsed.error.issues.forEach((issue) => {
      const key = issueToField(issue.path.join("."));
      if (key && !fields[key]) {
        fields[key] = issue.message;
      }
    });

    return { okay: false, validation: { summary, fields } };
  }

  return {
    okay: true,
    value: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      summary: parsed.data.summary ?? null,
      description: parsed.data.description,
    },
  };
}

function serializeFormState(form: ProductEditorFormState): string {
  return JSON.stringify(form);
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

  return "We could not save this product right now.";
}

export function ProductEditor({
  product = null,
  mode,
  onClose,
  onSave,
  open,
  saving = false,
}: ProductEditorProps) {
  const [form, setForm] = useState<ProductEditorFormState>(() =>
    toEditorFormState(product)
  );
  const [baselineForm, setBaselineForm] = useState(() =>
    serializeFormState(toEditorFormState(product))
  );
  const [validation, setValidation] = useState<ProductEditorValidationState>(
    () => emptyValidationState()
  );
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    () => mode === "edit"
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const next = toEditorFormState(product);
    setForm(next);
    setBaselineForm(serializeFormState(next));
    setValidation(emptyValidationState());
    setSlugManuallyEdited(mode === "edit");
  }, [product, mode, open]);

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

  function updateField<K extends keyof ProductEditorFormState>(
    key: K,
    value: ProductEditorFormState[K]
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
    if (validation.fields[key] || validation.summary.length > 0) {
      setValidation(emptyValidationState());
    }
  }

  function updateName(value: string) {
    setForm((previous) => ({
      ...previous,
      name: value,
      slug:
        mode === "create" && !slugManuallyEdited
          ? suggestedProductSlug(value)
          : previous.slug,
    }));
    if (validation.fields.name || validation.summary.length > 0) {
      setValidation(emptyValidationState());
    }
  }

  function updateSlug(value: string) {
    setSlugManuallyEdited(true);
    updateField("slug", value);
  }

  function handleClose() {
    if (
      open &&
      isDirty &&
      typeof window !== "undefined" &&
      !window.confirm("You have unsaved changes. Leave product editor?")
    ) {
      return;
    }

    onClose();
  }

  async function handleSubmit(
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) {
    event.preventDefault();
    const result = validateProductInput(form);

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
      description="You can create or edit product identity before variants, pricing, stock, and publishing."
      onClose={handleClose}
      open={open}
      title={mode === "create" ? "Create product" : "Edit product"}
      footer={
        <>
          <Button onClick={handleClose} variant="secondary">
            Cancel
          </Button>
          <Button
            form="product-editor-form"
            loading={saving}
            type="submit"
            variant="primary"
          >
            {mode === "create" ? "Create product" : "Save changes"}
          </Button>
        </>
      }
    >
      <form
        className="jrw-products__editor-form"
        id="product-editor-form"
        onSubmit={handleSubmit}
      >
        {validation.summary.length > 0 ? (
          <section
            aria-live="assertive"
            className="jrw-products__error-summary"
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

        <Input
          error={validation.fields.name}
          label="Product name"
          onChange={(event) => updateName(event.currentTarget.value)}
          required
          value={form.name}
        />

        <Input
          error={validation.fields.slug}
          label="Slug"
          onChange={(event) => updateSlug(event.currentTarget.value)}
          placeholder="desk-lamp"
          value={form.slug}
        />

        <Textarea
          error={validation.fields.summary}
          label="Summary"
          onChange={(event) => updateField("summary", event.currentTarget.value)}
          rows={2}
          value={form.summary}
        />

        <Textarea
          error={validation.fields.description}
          label="Description"
          onChange={(event) =>
            updateField("description", event.currentTarget.value)
          }
          required
          rows={6}
          value={form.description}
        />
      </form>
    </Modal>
  );
}
