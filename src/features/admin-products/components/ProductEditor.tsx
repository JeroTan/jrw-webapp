import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal, Select, Textarea } from "@/components/ui";
import { mergeClassNames } from "@/components/utils";
import { slugifyProductText } from "@/domain/products/product";
import {
  inventoryStateConsistent,
  zodCreateProductInput,
} from "@/domain/products/schemas";
import {
  archiveProduct,
  fetchProductVariants,
  fetchProductReadiness,
  fetchProductImages,
  publishProduct,
  removeProductImage,
  setPrimaryProductImage,
  unpublishProduct,
  updateVariantInventoryState,
  updateVariantStockQuantity,
  updateProductImageOrder,
  uploadProductImage,
  type ApiFailure,
} from "../api";
import type {
  InventoryState,
  ProductAssignableBrand,
  ProductAssignableCategory,
  ProductPhotoRecord,
  ProductReadinessResult,
  ProductStatus,
  ProductMutationInput,
  ProductOrganizationRecord,
  ProductRecord,
  ProductVariantRecord,
} from "../types";
import { ImageList } from "./ImageList";
import { ImageUpload } from "./ImageUpload";
import { InventoryAdjuster } from "./InventoryAdjuster";
import { PublishControl } from "./PublishControl";
import { ReadinessPanel } from "./ReadinessPanel";
import { VariantList } from "./VariantList";

type ProductEditorMode = "create" | "edit";

const imageFeedbackClass =
  "border border-brand-border-strong p-grid-sm font-system text-[0.8125rem] font-bold [&_p]:m-0";
const publishFeedbackClass =
  "grid gap-grid-xs border border-brand-border-strong p-grid-sm font-system text-[0.8125rem] font-bold [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-grid-sm";
const feedbackToneClass = {
  success: "border-brand-success bg-brand-success/6 text-brand-success",
  error: "border-brand-danger bg-brand-danger/6 text-brand-danger",
};

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
  mutationsBlocked?: boolean;
  mutationBlockReason?: string | null;
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
    brandId: mode === "edit" ? (organization?.brand?.id ?? "") : "",
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
    categoryIds: (organization?.categories ?? []).map(
      (category) => category.id
    ),
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
    if (
      form.brandId.length > 0 &&
      !options.availableBrandIds.has(form.brandId)
    ) {
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
      brandId:
        typeof parsed.brandId === "string" ? parsed.brandId : fallback.brandId,
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
    !("code" in error && typeof (error as ApiFailure).code === "string")
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

  return typeof failure.message === "string" &&
    failure.message.trim().length > 0
    ? failure.message
    : fallback;
}

function statusActionErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error && typeof (error as ApiFailure).code === "string")
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
    if (
      reason === "INVALID_STATUS_TRANSITION" ||
      reason === "STATUS_TERMINAL"
    ) {
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

  return typeof failure.message === "string" &&
    failure.message.trim().length > 0
    ? failure.message
    : fallback;
}

export type InventoryValidationState = {
  quantity?: string;
  state?: string;
  reason?: string;
  summary?: string;
};

const inventoryStates: InventoryState[] = [
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "PREORDER",
];

function isInventoryStateValue(value: string): value is InventoryState {
  return inventoryStates.includes(value as InventoryState);
}

export function validateInventoryAdjustmentInput(input: {
  quantity: string;
  state: InventoryState;
  reason: string;
}): InventoryValidationState {
  const nextValidation: InventoryValidationState = {};
  const quantity = Number(input.quantity);

  if (
    input.quantity.trim().length === 0 ||
    !Number.isInteger(quantity) ||
    quantity < 0
  ) {
    nextValidation.quantity = "Quantity must be non-negative integer.";
  }

  if (!isInventoryStateValue(input.state)) {
    nextValidation.state = "Choose valid inventory state.";
  }

  if (
    !nextValidation.quantity &&
    !nextValidation.state &&
    !inventoryStateConsistent({
      quantity,
      state: input.state,
    })
  ) {
    nextValidation.state =
      "Inventory state conflicts with quantity. Use Out of stock for 0, Low stock for 1-10, In stock above 10, or Preorder.";
  }

  if (input.reason.trim().length > 280) {
    nextValidation.reason = "Reason must be 280 characters or less.";
  }

  if (
    nextValidation.quantity ||
    nextValidation.state ||
    nextValidation.reason
  ) {
    nextValidation.summary = "Inventory form has validation errors.";
  }

  return nextValidation;
}

function inventoryActionErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error && typeof (error as ApiFailure).code === "string")
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
    if (reason === "INVENTORY_STATE_MISMATCH") {
      return "Inventory state conflicts with stock quantity.";
    }
    if (reason === "VARIANT_ARCHIVED") {
      return "Archived variant cannot receive inventory changes.";
    }

    return "Inventory state conflicts with latest server data.";
  }

  if (failure.code === "VALIDATION_FAILED") {
    return "Inventory update payload is invalid.";
  }

  if (failure.code === "AUTH_FORBIDDEN") {
    if (reason === "BRAND_MEMBERSHIP_REQUIRED") {
      return "You need active membership in this product brand.";
    }
    return "You do not have permission to update inventory.";
  }

  return typeof failure.message === "string" &&
    failure.message.trim().length > 0
    ? failure.message
    : fallback;
}

function allowedNextActionFromError(error: unknown): string | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("details" in error) ||
    typeof (error as ApiFailure).details !== "object" ||
    (error as ApiFailure).details === null
  ) {
    return null;
  }

  const details = (error as ApiFailure).details as Record<string, unknown>;
  if (typeof details.allowedNextAction === "string") {
    return details.allowedNextAction;
  }

  return null;
}

function ProductSetupGuide({
  activeVariantCount,
  categoryCount,
  hasAvailableVariant,
  imageCount,
  loadingVariants,
}: {
  activeVariantCount: number;
  categoryCount: number;
  hasAvailableVariant: boolean;
  imageCount: number;
  loadingVariants: boolean;
}) {
  const requiredReady =
    categoryCount > 0 && activeVariantCount > 0 && hasAvailableVariant;
  const rows = [
    {
      label: "Category",
      status: categoryCount > 0 ? `${categoryCount} selected` : "Required next",
      ready: categoryCount > 0,
    },
    {
      label: "Variant",
      status: loadingVariants
        ? "Checking variants"
        : activeVariantCount > 0
          ? `${activeVariantCount} active`
          : "Required next",
      ready: activeVariantCount > 0,
    },
    {
      label: "Availability",
      status: loadingVariants
        ? "Checking stock"
        : activeVariantCount <= 0
          ? "After variant"
          : hasAvailableVariant
            ? "Ready"
            : "Set stock or preorder",
      ready: hasAvailableVariant,
    },
    {
      label: "Image",
      status:
        imageCount > 0
          ? `${imageCount} uploaded`
          : "Optional; placeholder used",
      ready: true,
    },
  ];

  return (
    <section
      aria-label="Product setup next steps"
      className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm"
    >
      <header className="grid gap-grid-xs">
        <p className="m-0 text-sm font-bold">Next catalog steps</p>
        <p className="font-system text-xs text-brand-muted">
          {requiredReady
            ? "Required setup is ready. Review publish readiness below."
            : "Finish required rows, then publish. Image upload can wait."}
        </p>
      </header>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] border border-brand-border-strong">
        {rows.map((row) => (
          <div
            className="grid gap-grid-xs border-r border-brand-border p-grid-sm last:border-r-0 max-md:border-b max-md:border-r-0 max-md:last:border-b-0"
            key={row.label}
          >
            <span className="font-system text-xs font-bold uppercase text-brand-muted">
              {row.label}
            </span>
            <strong
              className={row.ready ? "text-brand-success" : "text-brand-danger"}
            >
              {row.status}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductEditor({
  availableBrands = [],
  availableCategories = [],
  organization = null,
  organizationReady = false,
  organizationUnavailable = false,
  mutationsBlocked = false,
  mutationBlockReason = null,
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
  const [readiness, setReadiness] = useState<ProductReadinessResult | null>(
    null
  );
  const [readinessLoadState, setReadinessLoadState] = useState<
    "idle" | "loading" | "ready" | "failed"
  >("idle");
  const [variants, setVariants] = useState<ProductVariantRecord[]>([]);
  const [variantLoadState, setVariantLoadState] = useState<
    "idle" | "loading" | "ready" | "failed"
  >("idle");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [inventoryQuantity, setInventoryQuantity] = useState("0");
  const [inventoryState, setInventoryState] =
    useState<InventoryState>("OUT_OF_STOCK");
  const [inventoryReason, setInventoryReason] = useState("");
  const [inventoryValidation, setInventoryValidation] =
    useState<InventoryValidationState>({});
  const [inventoryBusy, setInventoryBusy] = useState(false);
  const [inventoryFeedback, setInventoryFeedback] = useState<{
    tone: "success" | "error";
    message: string;
    allowedNextAction?: string | null;
  } | null>(null);
  const [variantEditorOpen, setVariantEditorOpen] = useState(false);

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
    setVariants([]);
    setVariantLoadState("idle");
    setSelectedVariantId("");
    setInventoryQuantity("0");
    setInventoryState("OUT_OF_STOCK");
    setInventoryReason("");
    setInventoryValidation({});
    setInventoryBusy(false);
    setInventoryFeedback(null);
    setVariantEditorOpen(false);
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

  const editingProductId = mode === "edit" ? (product?.id ?? null) : null;

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

  async function reloadVariants(productId: string): Promise<void> {
    const result = await fetchProductVariants(productId, {
      page: 1,
      pageSize: 100,
    });
    setVariants(result.items);
    setVariantLoadState("ready");
    if (result.items.length > 0) {
      setSelectedVariantId((previous) => {
        const stillExists = result.items.some(
          (variant) => variant.id === previous
        );
        return stillExists ? previous : result.items[0].id;
      });
    } else {
      setSelectedVariantId("");
    }
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

  useEffect(() => {
    if (!open || mode !== "edit" || !editingProductId) {
      setVariants([]);
      setVariantLoadState("idle");
      setSelectedVariantId("");
      return;
    }

    let active = true;
    setVariantLoadState("loading");

    fetchProductVariants(editingProductId, {
      page: 1,
      pageSize: 100,
    })
      .then((result) => {
        if (!active) {
          return;
        }
        setVariants(result.items);
        setVariantLoadState("ready");
        if (result.items.length > 0) {
          setSelectedVariantId(result.items[0].id);
        } else {
          setSelectedVariantId("");
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setVariants([]);
        setVariantLoadState("failed");
        setSelectedVariantId("");
      });

    return () => {
      active = false;
    };
  }, [editingProductId, mode, open]);

  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [selectedVariantId, variants]
  );
  const activeVariantCount = useMemo(
    () => variants.filter((variant) => variant.status === "ACTIVE").length,
    [variants]
  );
  const hasAvailableVariant = useMemo(
    () =>
      variants.some(
        (variant) =>
          variant.status === "ACTIVE" &&
          (variant.hasAvailableStock || variant.inventoryState === "PREORDER")
      ),
    [variants]
  );

  useEffect(() => {
    if (!selectedVariant) {
      setInventoryQuantity("0");
      setInventoryState("OUT_OF_STOCK");
      setInventoryReason("");
      setInventoryValidation({});
      setInventoryFeedback(null);
      return;
    }

    setInventoryQuantity(String(selectedVariant.stock));
    setInventoryState(selectedVariant.inventoryState);
    setInventoryReason("");
    setInventoryValidation({});
    setInventoryFeedback(null);
  }, [
    selectedVariantId,
    selectedVariant?.id,
    selectedVariant?.stock,
    selectedVariant?.inventoryState,
  ]);

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

    if (mode === "edit" && mutationsBlocked) {
      setValidation({
        summary: [
          mutationBlockReason ??
            "You need active membership in this product brand.",
        ],
        fields: {},
      });
      return;
    }

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
    if (!editingProductId || mutationsBlocked) {
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
    if (!editingProductId || mutationsBlocked) {
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
    if (!editingProductId || mutationsBlocked) {
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
    if (!editingProductId || mutationsBlocked) {
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
    if (!editingProductId || mutationsBlocked) {
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
        "missingItems" in
          ((error as ApiFailure).details as Record<string, unknown>) &&
        Array.isArray(
          ((error as ApiFailure).details as { missingItems?: unknown })
            .missingItems
        )
          ? (
              (error as ApiFailure).details as {
                missingItems: Array<unknown>;
              }
            ).missingItems.filter(
              (item): item is string => typeof item === "string"
            )
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
    if (!editingProductId || mutationsBlocked) {
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
    if (!editingProductId || mutationsBlocked) {
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
    } finally {
      setStatusBusy(false);
    }
  }

  function validateInventoryInput(): InventoryValidationState {
    return validateInventoryAdjustmentInput({
      quantity: inventoryQuantity,
      state: inventoryState,
      reason: inventoryReason,
    });
  }

  async function handleApplyInventory() {
    if (!editingProductId || !selectedVariant) {
      return;
    }

    if (mutationsBlocked) {
      setInventoryFeedback({
        tone: "error",
        message:
          mutationBlockReason ??
          "You need active membership in this product brand.",
      });
      return;
    }

    const nextValidation = validateInventoryInput();
    if (nextValidation.summary) {
      setInventoryValidation(nextValidation);
      return;
    }

    const nextQuantity = Number(inventoryQuantity);
    const previousVariant = selectedVariant;

    setInventoryBusy(true);
    setInventoryFeedback(null);
    setInventoryValidation({});

    setVariants((previous) =>
      previous.map((variant) =>
        variant.id === previousVariant.id
          ? {
              ...variant,
              stock: nextQuantity,
              inventoryState,
            }
          : variant
      )
    );

    try {
      let updatedVariant = previousVariant;

      if (updatedVariant.stock !== nextQuantity) {
        updatedVariant = await updateVariantStockQuantity(
          editingProductId,
          previousVariant.id,
          {
            quantity: nextQuantity,
          }
        );
      }

      if (updatedVariant.inventoryState !== inventoryState) {
        updatedVariant = await updateVariantInventoryState(
          editingProductId,
          previousVariant.id,
          {
            state: inventoryState,
          }
        );
      }

      setVariants((previous) =>
        previous.map((variant) =>
          variant.id === updatedVariant.id ? updatedVariant : variant
        )
      );
      setInventoryQuantity(String(updatedVariant.stock));
      setInventoryState(updatedVariant.inventoryState);
      setInventoryReason("");
      setInventoryFeedback({
        tone: "success",
        message: "Inventory updated.",
      });
      await reloadReadiness(editingProductId);
      await reloadVariants(editingProductId);
    } catch (error) {
      setVariants((previous) =>
        previous.map((variant) =>
          variant.id === previousVariant.id ? previousVariant : variant
        )
      );
      setInventoryQuantity(String(previousVariant.stock));
      setInventoryState(previousVariant.inventoryState);

      const isConflict =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as ApiFailure).code === "string" &&
        (error as ApiFailure).code === "CONFLICT_STATE";

      setInventoryFeedback({
        tone: "error",
        message: isConflict
          ? `${inventoryActionErrorMessage(
              error,
              "Inventory update failed."
            )} Values rolled back.`
          : inventoryActionErrorMessage(error, "Inventory update failed."),
        allowedNextAction:
          allowedNextActionFromError(error) ??
          (isConflict
            ? "Refresh variant matrix, confirm latest stock and state, then apply."
            : null),
      });

      if (isConflict) {
        await reloadVariants(editingProductId);
      }
    } finally {
      setInventoryBusy(false);
    }
  }

  const inventoryMutationDisabled =
    saving ||
    statusBusy ||
    imageBusy ||
    inventoryBusy ||
    !organizationReady ||
    mutationsBlocked;

  const brandDescription =
    mode === "create"
      ? "Save product first, then assign brand and categories."
      : mutationsBlocked
        ? (mutationBlockReason ??
          "You need active membership in this product brand.")
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
      className={mode === "edit" ? "!w-[min(100%,1040px)]" : undefined}
      description="You can create or edit product identity before variants, pricing, stock, and publishing."
      onClose={handleClose}
      open={open}
      title={mode === "create" ? "Create product" : "Edit product"}
      footer={
        variantEditorOpen ? null : (
          <>
            <Button onClick={handleClose} variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={mode === "edit" && mutationsBlocked}
              form="product-editor-form"
              loading={saving}
              title={
                mode === "edit" && mutationsBlocked
                  ? (mutationBlockReason ?? undefined)
                  : undefined
              }
              type="submit"
              variant="primary"
            >
              {mode === "create" ? "Create product" : "Save changes"}
            </Button>
          </>
        )
      }
    >
      <div className="grid gap-grid-sm">
        <form
          className="grid gap-grid-sm"
          id="product-editor-form"
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

          {mode === "edit" && mutationsBlocked ? (
            <section
              className="grid gap-grid-xs border border-brand-border-strong p-grid-sm font-system text-[0.8125rem] font-bold [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-grid-sm border-brand-danger bg-brand-danger/6 text-brand-danger"
              role="alert"
            >
              <p>
                {mutationBlockReason ??
                  "You need active membership in this product brand."}
              </p>
            </section>
          ) : null}

          <Input
            disabled={saving || (mode === "edit" && mutationsBlocked)}
            error={validation.fields.name}
            label="Product name"
            onChange={(event) => updateName(event.currentTarget.value)}
            required
            value={form.name}
          />

          <Input
            disabled={saving || (mode === "edit" && mutationsBlocked)}
            error={validation.fields.slug}
            label="Slug"
            onChange={(event) => updateSlug(event.currentTarget.value)}
            placeholder="desk-lamp"
            value={form.slug}
          />

          <Textarea
            disabled={saving || (mode === "edit" && mutationsBlocked)}
            error={validation.fields.summary}
            label="Summary"
            onChange={(event) =>
              updateField("summary", event.currentTarget.value)
            }
            rows={2}
            value={form.summary}
          />

          <Textarea
            disabled={saving || (mode === "edit" && mutationsBlocked)}
            error={validation.fields.description}
            label="Description"
            onChange={(event) =>
              updateField("description", event.currentTarget.value)
            }
            required
            rows={6}
            value={form.description}
          />

          {mode === "edit" ? (
            <>
              <Select
                description={brandDescription}
                disabled={!organizationReady || saving || mutationsBlocked}
                error={validation.fields.brandId}
                label="Brand"
                onChange={(event) =>
                  updateField("brandId", event.currentTarget.value)
                }
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
                description="Assign one or more active categories. Archived categories are rejected."
                disabled={!organizationReady || saving || mutationsBlocked}
                error={validation.fields.categoryIds}
                label="Categories"
                multiple
                onChange={(event) =>
                  updateField(
                    "categoryIds",
                    Array.from(
                      event.currentTarget.selectedOptions,
                      (option) => option.value
                    )
                  )
                }
                selectClassName="min-h-[8.5rem]"
                size={Math.min(Math.max(availableCategories.length, 2), 8)}
                value={form.categoryIds}
              >
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>

              <p className="font-system text-xs text-brand-muted">
                {organizationReady
                  ? `Category links selected: ${form.categoryIds.length}`
                  : organizationUnavailable
                    ? "Product organization unavailable. Save updates for identity only."
                    : "Loading product organization..."}
              </p>
            </>
          ) : null}
        </form>

        {mode === "edit" && editingProductId ? (
          <ProductSetupGuide
            activeVariantCount={activeVariantCount}
            categoryCount={form.categoryIds.length}
            hasAvailableVariant={hasAvailableVariant}
            imageCount={images.length}
            loadingVariants={variantLoadState === "loading"}
          />
        ) : null}

        {mode === "edit" && editingProductId ? (
          <section className="grid gap-grid-sm border-t border-brand-border pt-grid-sm">
            {imageFeedback ? (
              <section
                aria-live="assertive"
                className={mergeClassNames(
                  imageFeedbackClass,
                  feedbackToneClass[imageFeedback.tone]
                )}
                role={imageFeedback.tone === "error" ? "alert" : "status"}
              >
                <p>{imageFeedback.message}</p>
              </section>
            ) : null}

            <ImageUpload
              disabled={
                !organizationReady || saving || imageBusy || mutationsBlocked
              }
              onUpload={async (input) => {
                await handleUploadImage(input.image);
              }}
              uploading={imageBusy}
            />

            <ImageList
              busy={
                saving || imageBusy || !organizationReady || mutationsBlocked
              }
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
          <section className="grid gap-grid-sm border-t border-brand-border pt-grid-sm">
            <VariantList
              allowMutations={!mutationsBlocked && organizationReady}
              embedded
              mutationDisabledReason={
                mutationBlockReason ??
                "You need active membership in this product brand."
              }
              onEditorOpenChange={setVariantEditorOpen}
              productId={editingProductId}
            />
          </section>
        ) : null}

        {mode === "edit" && editingProductId ? (
          <section className="grid gap-grid-sm border-t border-brand-border pt-grid-sm">
            <header className="flex flex-wrap items-start justify-between gap-grid-sm">
              <div>
                <p className="m-0 text-sm font-bold">Inventory adjuster</p>
                <p className="font-system text-xs text-brand-muted">
                  Apply stock and state updates for one variant at a time.
                </p>
              </div>
              <Button
                disabled={inventoryBusy || variantLoadState !== "ready"}
                onClick={async () => {
                  await reloadVariants(editingProductId);
                }}
                size="sm"
                variant="secondary"
              >
                Refresh variants
              </Button>
            </header>

            {inventoryFeedback ? (
              <section
                className={mergeClassNames(
                  publishFeedbackClass,
                  feedbackToneClass[inventoryFeedback.tone]
                )}
                role={inventoryFeedback.tone === "error" ? "alert" : "status"}
              >
                <p>{inventoryFeedback.message}</p>
                {inventoryFeedback.allowedNextAction ? (
                  <p>Next action: {inventoryFeedback.allowedNextAction}</p>
                ) : null}
              </section>
            ) : null}

            {variantLoadState === "loading" ? (
              <p className="font-system text-xs text-brand-muted">
                Loading variants for inventory update...
              </p>
            ) : null}

            {variantLoadState === "failed" ? (
              <section
                className="grid gap-grid-xs border border-brand-border-strong p-grid-sm font-system text-[0.8125rem] font-bold [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-grid-sm border-brand-danger bg-brand-danger/6 text-brand-danger"
                role="alert"
              >
                <p>Could not load variants for inventory updates.</p>
              </section>
            ) : null}

            {variantLoadState === "ready" && variants.length === 0 ? (
              <p className="font-system text-xs text-brand-muted">
                Create variant first before inventory updates.
              </p>
            ) : null}

            {variantLoadState === "ready" && variants.length > 0 ? (
              <>
                <Select
                  description="Select variant row for stock and state changes."
                  disabled={inventoryMutationDisabled}
                  label="Variant"
                  onChange={(event) =>
                    setSelectedVariantId(event.currentTarget.value)
                  }
                  value={selectedVariantId}
                >
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name} - {variant.sku}
                    </option>
                  ))}
                </Select>

                <InventoryAdjuster
                  allowedNextAction={
                    inventoryFeedback?.allowedNextAction ?? null
                  }
                  conflictMessage={
                    inventoryFeedback?.tone === "error" &&
                    inventoryFeedback.allowedNextAction
                      ? inventoryFeedback.message
                      : undefined
                  }
                  disabled={inventoryMutationDisabled || !selectedVariant}
                  error={inventoryValidation.quantity}
                  onChange={setInventoryQuantity}
                  onReasonChange={setInventoryReason}
                  onStateChange={setInventoryState}
                  quantity={inventoryQuantity}
                  reason={inventoryReason}
                  reasonError={inventoryValidation.reason}
                  showReasonField
                  state={inventoryState}
                  stateError={inventoryValidation.state}
                />

                {inventoryValidation.summary ? (
                  <p
                    className="font-system text-xs font-bold text-brand-danger"
                    role="alert"
                  >
                    {inventoryValidation.summary}
                  </p>
                ) : null}

                <Button
                  disabled={inventoryMutationDisabled || !selectedVariant}
                  loading={inventoryBusy}
                  onClick={async () => {
                    await handleApplyInventory();
                  }}
                  title={
                    mutationsBlocked
                      ? (mutationBlockReason ?? undefined)
                      : undefined
                  }
                  variant="primary"
                >
                  Apply inventory update
                </Button>
              </>
            ) : null}
          </section>
        ) : null}

        {mode === "edit" && editingProductId ? (
          <section className="grid gap-grid-sm border-t border-brand-border pt-grid-sm">
            {statusFeedback ? (
              <section
                className={mergeClassNames(
                  publishFeedbackClass,
                  feedbackToneClass[statusFeedback.tone]
                )}
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
              mutationsBlocked={mutationsBlocked}
              onArchive={handleArchive}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              publishBlockedReason={mutationBlockReason}
              readiness={readiness}
              status={currentStatus}
            />
          </section>
        ) : null}
      </div>
    </Modal>
  );
}
