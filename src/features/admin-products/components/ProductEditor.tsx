import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal, Select, Textarea } from "@/components/ui";
import { slugifyProductText } from "@/domain/products/product";
import { zodCreateProductInput } from "@/domain/products/schemas";
import {
  archiveProduct,
  fetchProductReadiness,
  fetchProductImages,
  publishProduct,
  removeProductImage,
  setPrimaryProductImage,
  unpublishProduct,
  updateProductImageOrder,
  uploadProductImage,
  type ApiFailure,
} from "../api";
import type {
  ProductAssignableBrand,
  ProductAssignableCategory,
  ProductPhotoRecord,
  ProductReadinessResult,
  ProductStatus,
  ProductMutationInput,
  ProductOrganizationRecord,
  ProductRecord,
} from "../types";
import { ImageList } from "./ImageList";
import { ImageUpload } from "./ImageUpload";
import { PublishControl } from "./PublishControl";
import { ReadinessPanel } from "./ReadinessPanel";

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

type ImageLoadState = "idle" | "loading" | "ready" | "failed";

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
  onProductStatusChange?: (
    product: ProductRecord,
    operation: "publish" | "unpublish" | "archive"
  ) => void;
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

function imageActionErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error !== "object" ||
    error === null ||
    !(("code" in error) && typeof (error as ApiFailure).code === "string")
  ) {
    return fallback;
  }

  const failure = error as ApiFailure;
  const reason =
    typeof failure.details === "object" &&
    failure.details !== null &&
    "reason" in failure.details &&
    typeof (failure.details as { reason?: unknown }).reason === "string"
      ? String((failure.details as { reason: string }).reason)
      : null;

  if (failure.code === "VALIDATION_FAILED") {
    if (reason === "UNSUPPORTED_IMAGE_TYPE") {
      return "Only JPEG, PNG, and WEBP files are allowed.";
    }
    if (reason === "IMAGE_TOO_LARGE") {
      return "Image exceeds 5MB limit.";
    }
    if (reason === "IMAGE_CORRUPT") {
      return "Image file is corrupt or unreadable.";
    }
    return "Image data is invalid. Check file and try again.";
  }

  if (failure.code === "AUTH_FORBIDDEN") {
    if (reason === "BRAND_MEMBERSHIP_REQUIRED") {
      return "You need active membership in this product brand.";
    }
    return "You do not have permission to manage product images.";
  }

  if (failure.code === "PROVIDER_UNAVAILABLE") {
    return "Image storage is unavailable right now. Try again.";
  }

  return typeof failure.message === "string" && failure.message.trim().length > 0
    ? failure.message
    : fallback;
}

function statusActionErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error !== "object" ||
    error === null ||
    !(("code" in error) && typeof (error as ApiFailure).code === "string")
  ) {
    return fallback;
  }

  const failure = error as ApiFailure;
  const reason =
    typeof failure.details === "object" &&
    failure.details !== null &&
    "reason" in failure.details &&
    typeof (failure.details as { reason?: unknown }).reason === "string"
      ? String((failure.details as { reason: string }).reason)
      : null;

  if (failure.code === "CONFLICT_STATE") {
    if (reason === "PRODUCT_NOT_READY_FOR_PUBLISH") {
      return "Product is missing publish requirements.";
    }
    if (reason === "INVALID_STATUS_TRANSITION" || reason === "STATUS_TERMINAL") {
      return "Status transition is not allowed.";
    }
    if (reason === "BRAND_ARCHIVED") {
      return "Assigned brand is archived.";
    }

    return "Product status conflicts with current state.";
  }

  if (failure.code === "AUTH_FORBIDDEN") {
    if (reason === "BRAND_MEMBERSHIP_REQUIRED") {
      return "You need active membership in this product brand.";
    }
    return "You do not have permission to change product status.";
  }

  if (failure.code === "RESOURCE_NOT_FOUND") {
    return "Product was not found.";
  }

  return typeof failure.message === "string" && failure.message.trim().length > 0
    ? failure.message
    : fallback;
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
  onProductStatusChange,
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
  const [images, setImages] = useState<ProductPhotoRecord[]>([]);
  const [imageLoadState, setImageLoadState] = useState<ImageLoadState>("idle");
  const [imageBusy, setImageBusy] = useState(false);
  const [imageFeedback, setImageFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [currentStatus, setCurrentStatus] = useState<ProductStatus>(
    () => product?.status ?? "DRAFT"
  );
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [readiness, setReadiness] = useState<ProductReadinessResult | null>(null);
  const [readinessLoadState, setReadinessLoadState] = useState<
    "idle" | "loading" | "ready" | "failed"
  >("idle");

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
    setCurrentStatus(product?.status ?? "DRAFT");
    setStatusBusy(false);
    setStatusFeedback(null);
    setReadiness(null);
    setReadinessLoadState("idle");
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

  const editingProductId = mode === "edit" ? product?.id ?? null : null;

  async function reloadImages(productId: string): Promise<void> {
    const result = await fetchProductImages(productId);
    setImages(result.items);
    setImageLoadState("ready");
  }

  async function reloadReadiness(productId: string): Promise<void> {
    setReadinessLoadState("loading");
    const result = await fetchProductReadiness(productId);
    setReadiness(result);
    setReadinessLoadState("ready");
  }

  useEffect(() => {
    if (!open || mode !== "edit" || !editingProductId) {
      setImages([]);
      setImageLoadState("idle");
      setImageFeedback(null);
      return;
    }

    let active = true;
    setImageLoadState("loading");
    setImageFeedback(null);

    fetchProductImages(editingProductId)
      .then((result) => {
        if (!active) {
          return;
        }

        setImages(result.items);
        setImageLoadState("ready");
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setImageLoadState("failed");
        setImages([]);
        setImageFeedback({
          tone: "error",
          message: imageActionErrorMessage(
            error,
            "Could not load product images."
          ),
        });
      });

    return () => {
      active = false;
    };
  }, [editingProductId, mode, open]);

  useEffect(() => {
    if (!open || mode !== "edit" || !editingProductId) {
      setReadiness(null);
      setReadinessLoadState("idle");
      return;
    }

    let active = true;
    setReadinessLoadState("loading");

    fetchProductReadiness(editingProductId)
      .then((result) => {
        if (!active) {
          return;
        }
        setReadiness(result);
        setReadinessLoadState("ready");
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setReadiness(null);
        setReadinessLoadState("failed");
      });

    return () => {
      active = false;
    };
  }, [editingProductId, mode, open]);

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

  async function handleUploadImage(file: File) {
    if (!editingProductId) {
      return;
    }

    setImageBusy(true);
    setImageFeedback(null);
    try {
      await uploadProductImage(editingProductId, {
        image: file,
        name: file.name,
      });
      await reloadImages(editingProductId);
      await reloadReadiness(editingProductId);
      setImageFeedback({
        tone: "success",
        message: "Image uploaded.",
      });
    } catch (error) {
      setImageFeedback({
        tone: "error",
        message: imageActionErrorMessage(error, "Image upload failed."),
      });
      throw error;
    } finally {
      setImageBusy(false);
    }
  }

  async function handleSetPrimaryImage(photoId: string) {
    if (!editingProductId) {
      return;
    }

    setImageBusy(true);
    setImageFeedback(null);
    try {
      await setPrimaryProductImage(editingProductId, photoId);
      await reloadImages(editingProductId);
      setImageFeedback({
        tone: "success",
        message: "Primary image updated.",
      });
    } catch (error) {
      setImageFeedback({
        tone: "error",
        message: imageActionErrorMessage(error, "Could not set primary image."),
      });
      throw error;
    } finally {
      setImageBusy(false);
    }
  }

  async function handleReorderImage(photoId: string, sortOrder: number) {
    if (!editingProductId) {
      return;
    }

    setImageBusy(true);
    setImageFeedback(null);
    try {
      await updateProductImageOrder(editingProductId, photoId, { sortOrder });
      await reloadImages(editingProductId);
      setImageFeedback({
        tone: "success",
        message: "Image order updated.",
      });
    } catch (error) {
      setImageFeedback({
        tone: "error",
        message: imageActionErrorMessage(error, "Could not reorder image."),
      });
      throw error;
    } finally {
      setImageBusy(false);
    }
  }

  async function handleRemoveImage(photoId: string) {
    if (!editingProductId) {
      return;
    }

    setImageBusy(true);
    setImageFeedback(null);
    try {
      await removeProductImage(editingProductId, photoId);
      await reloadImages(editingProductId);
      await reloadReadiness(editingProductId);
      setImageFeedback({
        tone: "success",
        message: "Image removed from current catalog list.",
      });
    } catch (error) {
      setImageFeedback({
        tone: "error",
        message: imageActionErrorMessage(error, "Could not remove image."),
      });
      throw error;
    } finally {
      setImageBusy(false);
    }
  }

  async function handlePublish() {
    if (!editingProductId) {
      return;
    }

    setStatusBusy(true);
    setStatusFeedback(null);
    try {
      const nextProduct = await publishProduct(editingProductId);
      setCurrentStatus(nextProduct.status);
      await reloadReadiness(editingProductId);
      if (onProductStatusChange) {
        onProductStatusChange(nextProduct, "publish");
      }
      setStatusFeedback({
        tone: "success",
        message: "Product published.",
      });
    } catch (error) {
      const missingItems =
        typeof error === "object" &&
        error !== null &&
        "details" in error &&
        typeof (error as ApiFailure).details === "object" &&
        (error as ApiFailure).details !== null &&
        "missingItems" in ((error as ApiFailure).details as Record<string, unknown>) &&
        Array.isArray(
          ((error as ApiFailure).details as { missingItems?: unknown }).missingItems
        )
          ? (
              ((error as ApiFailure).details as {
                missingItems: Array<unknown>;
              }).missingItems
            ).filter((item): item is string => typeof item === "string")
          : null;

      if (missingItems && missingItems.length > 0) {
        setReadiness({
          isReady: false,
          missingItems,
        });
        setReadinessLoadState("ready");
      }

      setStatusFeedback({
        tone: "error",
        message: statusActionErrorMessage(error, "Publish action failed."),
      });
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleUnpublish() {
    if (!editingProductId) {
      return;
    }

    setStatusBusy(true);
    setStatusFeedback(null);
    try {
      const nextProduct = await unpublishProduct(editingProductId);
      setCurrentStatus(nextProduct.status);
      await reloadReadiness(editingProductId);
      if (onProductStatusChange) {
        onProductStatusChange(nextProduct, "unpublish");
      }
      setStatusFeedback({
        tone: "success",
        message: "Product moved to draft.",
      });
    } catch (error) {
      setStatusFeedback({
        tone: "error",
        message: statusActionErrorMessage(error, "Unpublish action failed."),
      });
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleArchive() {
    if (!editingProductId) {
      return;
    }

    setStatusBusy(true);
    setStatusFeedback(null);
    try {
      const nextProduct = await archiveProduct(editingProductId);
      setCurrentStatus(nextProduct.status);
      await reloadReadiness(editingProductId);
      if (onProductStatusChange) {
        onProductStatusChange(nextProduct, "archive");
      }
      setStatusFeedback({
        tone: "success",
        message: "Product archived.",
      });
    } catch (error) {
      setStatusFeedback({
        tone: "error",
        message: statusActionErrorMessage(error, "Archive action failed."),
      });
      throw error;
    } finally {
      setStatusBusy(false);
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

        {mode === "edit" && editingProductId ? (
          <section className="jrw-products__images-section">
            {imageFeedback ? (
              <section
                aria-live="assertive"
                className={`jrw-products__image-feedback jrw-products__image-feedback--${imageFeedback.tone}`}
                role={imageFeedback.tone === "error" ? "alert" : "status"}
              >
                <p>{imageFeedback.message}</p>
              </section>
            ) : null}

            <ImageUpload
              disabled={!organizationReady || saving || imageBusy}
              onUpload={async (input) => {
                await handleUploadImage(input.image);
              }}
              uploading={imageBusy}
            />

            <ImageList
              busy={saving || imageBusy || !organizationReady}
              images={images}
              loading={imageLoadState === "loading"}
              onRemove={handleRemoveImage}
              onReorder={handleReorderImage}
              onSetPrimary={handleSetPrimaryImage}
              productName={product?.name}
            />
          </section>
        ) : null}

        {mode === "edit" && editingProductId ? (
          <section className="jrw-products__publish-section">
            {statusFeedback ? (
              <section
                className={`jrw-products__publish-feedback jrw-products__publish-feedback--${statusFeedback.tone}`}
                role={statusFeedback.tone === "error" ? "alert" : "status"}
              >
                <p>{statusFeedback.message}</p>
              </section>
            ) : null}

            <ReadinessPanel
              busy={saving || statusBusy}
              errorMessage={
                readinessLoadState === "failed"
                  ? "Could not load publish readiness."
                  : null
              }
              loading={readinessLoadState === "loading"}
              onRefresh={async () => {
                await reloadReadiness(editingProductId);
              }}
              readiness={readiness}
            />

            <PublishControl
              busy={saving || statusBusy}
              onArchive={handleArchive}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              readiness={readiness}
              status={currentStatus}
            />
          </section>
        ) : null}
      </form>
    </Modal>
  );
}
