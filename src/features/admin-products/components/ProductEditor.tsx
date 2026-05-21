import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal, Select, Textarea } from "@/components/ui";
import { slugifyProductText } from "@/domain/products/product";
import { zodCreateProductInput } from "@/domain/products/schemas";
import type {
  ProductAssignableBrand,
  ProductAssignableCategory,
  ProductMutationInput,
  ProductOrganizationRecord,
  ProductRecord,
} from "../types";

type ProductEditorMode = "create" | "edit";

type ProductEditorFormState = {
  name: string;
  slug: string;
  summary: string;
  description: string;
  brandId: string;
  categoryIds: string[];
};

type ProductEditorValidationState = {
  summary: string[];
  fields: Partial<Record<keyof ProductEditorFormState, string>>;
};

export type ProductEditorSaveInput = {
  identity: ProductMutationInput;
  organization: {
    persist: boolean;
    brandId: string | null;
    categoryIds: string[];
  };
};

export type ProductEditorProps = {
  availableBrands?: ProductAssignableBrand[];
  availableCategories?: ProductAssignableCategory[];
  organization?: ProductOrganizationRecord | null;
  organizationReady?: boolean;
  organizationUnavailable?: boolean;
  product?: ProductRecord | null;
  mode: ProductEditorMode;
  onClose: () => void;
  onSave: (input: ProductEditorSaveInput) => Promise<void>;
  open: boolean;
  saving?: boolean;
};

function emptyValidationState(): ProductEditorValidationState {
  return { summary: [], fields: {} };
}

function toEditorFormState(input: {
  product?: ProductRecord | null;
  mode: ProductEditorMode;
  organization?: ProductOrganizationRecord | null;
}): ProductEditorFormState {
  const { product, mode, organization } = input;

  if (!product) {
    return {
      name: "",
      slug: "",
      summary: "",
      description: "",
      brandId: "",
      categoryIds: [],
    };
  }

  return {
    name: product.name,
    slug: product.slug,
    summary: product.summary ?? "",
    description: product.description,
    brandId: mode === "edit" ? organization?.brand?.id ?? "" : "",
    categoryIds:
      mode === "edit"
        ? (organization?.categories ?? []).map((category) => category.id)
        : [],
  };
}

function productOrganizationFields(input: {
  mode: ProductEditorMode;
  organization?: ProductOrganizationRecord | null;
}): Pick<ProductEditorFormState, "brandId" | "categoryIds"> {
  const { mode, organization } = input;

  if (mode !== "edit") {
    return {
      brandId: "",
      categoryIds: [],
    };
  }

  return {
    brandId: organization?.brand?.id ?? "",
    categoryIds: (organization?.categories ?? []).map((category) => category.id),
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
    case "brandId":
      return "brandId";
    case "categoryIds":
      return "categoryIds";
    default:
      return undefined;
  }
}

export function suggestedProductSlug(name: string): string {
  return name.trim().length > 0 ? slugifyProductText(name) : "";
}

function validateProductInput(
  form: ProductEditorFormState,
  options: {
    allowOrganization: boolean;
    availableBrandIds: Set<string>;
    availableCategoryIds: Set<string>;
  }
):
  | {
      okay: true;
      value: ProductEditorSaveInput;
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

  if (options.allowOrganization) {
    if (form.brandId.length > 0 && !options.availableBrandIds.has(form.brandId)) {
      return {
        okay: false,
        validation: {
          summary: ["brandId: Selected brand is not available."],
          fields: {
            brandId: "Selected brand is not available.",
          },
        },
      };
    }

    const unknownCategoryIds = form.categoryIds.filter(
      (categoryId) => !options.availableCategoryIds.has(categoryId)
    );
    if (unknownCategoryIds.length > 0) {
      return {
        okay: false,
        validation: {
          summary: ["categoryIds: Selected category is not available."],
          fields: {
            categoryIds: "Selected category is not available.",
          },
        },
      };
    }
  }

  return {
    okay: true,
    value: {
      identity: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        summary: parsed.data.summary ?? null,
        description: parsed.data.description,
      },
      organization: {
        persist: options.allowOrganization,
        brandId: form.brandId.trim().length > 0 ? form.brandId : null,
        categoryIds: Array.from(
          new Set(
            form.categoryIds
              .map((categoryId) => categoryId.trim())
              .filter((categoryId) => categoryId.length > 0)
          )
        ),
      },
    },
  };
}

function serializeFormState(form: ProductEditorFormState): string {
  return JSON.stringify(form);
}

function applyProductOrganizationFields(
  form: ProductEditorFormState,
  input: {
    mode: ProductEditorMode;
    organization?: ProductOrganizationRecord | null;
  }
): ProductEditorFormState {
  return {
    ...form,
    ...productOrganizationFields(input),
  };
}

function parseSerializedFormState(
  value: string,
  fallback: ProductEditorFormState
): ProductEditorFormState {
  try {
    const parsed = JSON.parse(value) as Partial<ProductEditorFormState>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : fallback.name,
      slug: typeof parsed.slug === "string" ? parsed.slug : fallback.slug,
      summary:
        typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
      description:
        typeof parsed.description === "string"
          ? parsed.description
          : fallback.description,
      brandId: typeof parsed.brandId === "string" ? parsed.brandId : fallback.brandId,
      categoryIds: Array.isArray(parsed.categoryIds)
        ? parsed.categoryIds.filter(
            (categoryId): categoryId is string => typeof categoryId === "string"
          )
        : fallback.categoryIds,
    };
  } catch {
    return fallback;
  }
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
  availableBrands = [],
  availableCategories = [],
  organization = null,
  organizationReady = false,
  organizationUnavailable = false,
  product = null,
  mode,
  onClose,
  onSave,
  open,
  saving = false,
}: ProductEditorProps) {
  const [form, setForm] = useState<ProductEditorFormState>(() =>
    toEditorFormState({
      product,
      mode,
      organization,
    })
  );
  const [baselineForm, setBaselineForm] = useState(() =>
    serializeFormState(
      toEditorFormState({
        product,
        mode,
        organization,
      })
    )
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

    const next = toEditorFormState({
      product,
      mode,
      organization,
    });
    setForm(next);
    setBaselineForm(serializeFormState(next));
    setValidation(emptyValidationState());
    setSlugManuallyEdited(mode === "edit");
  }, [product, mode, open]);

  useEffect(() => {
    if (!open || mode !== "edit" || !organizationReady) {
      return;
    }

    setForm((previous) =>
      applyProductOrganizationFields(previous, {
        mode,
        organization,
      })
    );
    setBaselineForm((previous) =>
      serializeFormState(
        applyProductOrganizationFields(
          parseSerializedFormState(
            previous,
            toEditorFormState({
              product,
              mode,
              organization,
            })
          ),
          {
            mode,
            organization,
          }
        )
      )
    );
  }, [mode, open, organization, organizationReady, product]);

  const isDirty = useMemo(
    () => serializeFormState(form) !== baselineForm,
    [baselineForm, form]
  );

  const availableBrandIds = useMemo(
    () => new Set(availableBrands.map((brand) => brand.id)),
    [availableBrands]
  );
  const availableCategoryIds = useMemo(
    () => new Set(availableCategories.map((category) => category.id)),
    [availableCategories]
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
    const result = validateProductInput(form, {
      allowOrganization: mode === "edit" && organizationReady,
      availableBrandIds,
      availableCategoryIds,
    });

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

  const brandDescription =
    mode === "create"
      ? "Save product first, then assign brand and categories."
      : !organizationReady
        ? organizationUnavailable
          ? "Product organization data unavailable. You can still update identity."
          : "Loading product organization..."
        : form.brandId.length === 0
          ? "Brand optional. Product stays brandless when no brand selected."
          : availableBrandIds.has(form.brandId)
            ? "Membership status: You are active brand member for selected brand."
            : "Membership status: Brand membership required for selected brand.";

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
          onChange={(event) => updateField("description", event.currentTarget.value)}
          required
          rows={6}
          value={form.description}
        />

        <Select
          description={brandDescription}
          disabled={mode !== "edit" || !organizationReady || saving}
          error={validation.fields.brandId}
          label="Brand"
          onChange={(event) => updateField("brandId", event.currentTarget.value)}
          value={form.brandId}
        >
          <option value="">No brand (brandless)</option>
          {availableBrands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </Select>

        <Select
          description={
            mode === "create"
              ? "Save product first, then assign category links."
              : "Assign one or more active categories. Archived categories are rejected."
          }
          disabled={mode !== "edit" || !organizationReady || saving}
          error={validation.fields.categoryIds}
          label="Categories"
          multiple
          onChange={(event) =>
            updateField(
              "categoryIds",
              Array.from(event.currentTarget.selectedOptions, (option) => option.value)
            )
          }
          selectClassName="jrw-products__category-select"
          size={Math.min(Math.max(availableCategories.length, 2), 8)}
          value={form.categoryIds}
        >
          {availableCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>

        {mode === "edit" ? (
          <p className="jrw-field__description">
            {organizationReady
              ? `Category links selected: ${form.categoryIds.length}`
              : organizationUnavailable
                ? "Product organization unavailable. Save updates for identity only."
                : "Loading product organization..."}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
