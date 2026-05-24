import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal, Textarea, Toggle } from "@/components/ui";
import { slugifyCategoryText } from "@/domain/categories/category";
import { zodCreateCategoryInput } from "@/domain/categories/schemas";
import type { CategoryMutationInput, CategoryRecord } from "../types";

type CategoryEditorMode = "create" | "edit";

type CategoryEditorFormState = {
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
  isVisible: boolean;
};

type CategoryEditorValidationState = {
  summary: string[];
  fields: Partial<Record<keyof CategoryEditorFormState, string>>;
};

export type CategoryEditorProps = {
  category?: CategoryRecord | null;
  mode: CategoryEditorMode;
  onClose: () => void;
  onSave: (input: CategoryMutationInput) => Promise<void>;
  open: boolean;
  saving?: boolean;
};

function emptyValidationState(): CategoryEditorValidationState {
  return { summary: [], fields: {} };
}

function toEditorFormState(
  category?: CategoryRecord | null
): CategoryEditorFormState {
  if (!category) {
    return {
      name: "",
      slug: "",
      description: "",
      sortOrder: "0",
      isVisible: true,
    };
  }

  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    sortOrder: String(category.sortOrder),
    isVisible: category.isVisible,
  };
}

function issueToField(path: string): keyof CategoryEditorFormState | undefined {
  switch (path) {
    case "name":
      return "name";
    case "slug":
      return "slug";
    case "description":
      return "description";
    case "sortOrder":
      return "sortOrder";
    case "isVisible":
      return "isVisible";
    default:
      return undefined;
  }
}

export function suggestedCategorySlug(name: string): string {
  return name.trim().length > 0 ? slugifyCategoryText(name) : "";
}

function validateCategoryInput(form: CategoryEditorFormState):
  | {
      okay: true;
      value: CategoryMutationInput;
    }
  | {
      okay: false;
      validation: CategoryEditorValidationState;
    } {
  const payload = {
    name: form.name,
    slug: form.slug.trim().length > 0 ? form.slug : undefined,
    description: form.description.trim().length > 0 ? form.description : null,
    sortOrder: Number(form.sortOrder),
    isVisible: form.isVisible,
  };

  const parsed = zodCreateCategoryInput.safeParse(payload);
  if (!parsed.success) {
    const summary = parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "form"}: ${issue.message}`
    );
    const fields: Partial<Record<keyof CategoryEditorFormState, string>> = {};

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
      description: parsed.data.description ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
      isVisible: parsed.data.isVisible ?? true,
    },
  };
}

function serializeFormState(form: CategoryEditorFormState): string {
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

  return "We could not save this category right now.";
}

export function CategoryEditor({
  category = null,
  mode,
  onClose,
  onSave,
  open,
  saving = false,
}: CategoryEditorProps) {
  const [form, setForm] = useState<CategoryEditorFormState>(() =>
    toEditorFormState(category)
  );
  const [baselineForm, setBaselineForm] = useState(() =>
    serializeFormState(toEditorFormState(category))
  );
  const [validation, setValidation] = useState<CategoryEditorValidationState>(
    () => emptyValidationState()
  );
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    () => mode === "edit"
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const next = toEditorFormState(category);
    setForm(next);
    setBaselineForm(serializeFormState(next));
    setValidation(emptyValidationState());
    setSlugManuallyEdited(mode === "edit");
  }, [category, mode, open]);

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

  function updateField<K extends keyof CategoryEditorFormState>(
    key: K,
    value: CategoryEditorFormState[K]
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
          ? suggestedCategorySlug(value)
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
      !window.confirm("You have unsaved changes. Leave category editor?")
    ) {
      return;
    }

    onClose();
  }

  async function handleSubmit(
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) {
    event.preventDefault();
    const result = validateCategoryInput(form);

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
      description="You can create or edit category details used across admin and storefront catalog views."
      onClose={handleClose}
      open={open}
      title={mode === "create" ? "Create category" : "Edit category"}
      footer={
        <>
          <Button onClick={handleClose} variant="secondary">
            Cancel
          </Button>
          <Button
            form="category-editor-form"
            loading={saving}
            type="submit"
            variant="primary"
          >
            {mode === "create" ? "Create category" : "Save changes"}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-grid-sm"
        id="category-editor-form"
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

        <Input
          error={validation.fields.name}
          label="Category name"
          onChange={(event) => updateName(event.currentTarget.value)}
          required
          value={form.name}
        />

        <Input
          error={validation.fields.slug}
          label="Slug"
          onChange={(event) => updateSlug(event.currentTarget.value)}
          placeholder="home-decor"
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

        <Input
          error={validation.fields.sortOrder}
          label="Sort order"
          min={0}
          onChange={(event) =>
            updateField("sortOrder", event.currentTarget.value)
          }
          step={1}
          type="number"
          value={form.sortOrder}
        />

        <Toggle
          checked={form.isVisible}
          error={validation.fields.isVisible}
          label="Visible in catalog"
          onChange={(event) =>
            updateField("isVisible", event.currentTarget.checked)
          }
        />
      </form>
    </Modal>
  );
}
