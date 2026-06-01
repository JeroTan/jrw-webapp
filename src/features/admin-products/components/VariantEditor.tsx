import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal, Textarea, Toggle } from "@/components/ui";
import {
  deriveInventoryStateFromQuantity,
  inventoryStateConsistent,
  zodCreateProductVariantInput,
  zodUpdateInventoryStateInput,
} from "@/domain/products/schemas";
import type {
  InventoryState,
  ProductVariantOption,
  ProductVariantRecord,
} from "../types";
import { InventoryAdjuster } from "./InventoryAdjuster";
import { InventoryStateSelector } from "./InventoryStateSelector";
import { InputBox } from "@/components/ui/InputBox";

type VariantEditorMode = "create" | "edit";

type VariantEditorFormState = {
  name: string;
  sku: string;
  priceCentavos: string;
  stock: string;
  inventoryState: InventoryState;
  isPreorder: boolean;
  expectedRelease: string;
  variationChainText: string;
};

type VariantEditorValidationState = {
  summary: string[];
  fields: Partial<Record<keyof VariantEditorFormState, string>>;
};

export type VariantEditorSaveInput = {
  name: string;
  sku: string;
  priceCentavos: number;
  stock: number;
  inventoryState: InventoryState;
  isPreorder: boolean;
  expectedRelease: string | null;
  variationChain: ProductVariantOption[];
};

export type VariantEditorProps = {
  mode: VariantEditorMode;
  onClose: () => void;
  onSave: (input: VariantEditorSaveInput) => Promise<void>;
  open: boolean;
  saving?: boolean;
  variant?: ProductVariantRecord | null;
};

function emptyValidationState(): VariantEditorValidationState {
  return { summary: [], fields: {} };
}

function formatVariationChainText(options: ProductVariantOption[]): string {
  return options
    .map((option) => `${option.group}: ${option.name}`)
    .join("\n")
    .trim();
}

function toEditorFormState(
  mode: VariantEditorMode,
  variant?: ProductVariantRecord | null
): VariantEditorFormState {
  if (!variant || mode === "create") {
    return {
      name: "",
      sku: "",
      priceCentavos: "",
      stock: "0",
      inventoryState: "OUT_OF_STOCK",
      isPreorder: false,
      expectedRelease: "",
      variationChainText: "",
    };
  }

  const inventoryState =
    variant.inventoryState ??
    deriveInventoryStateFromQuantity({
      quantity: variant.stock,
      isPreorder: variant.isPreorder,
    });

  return {
    name: variant.name,
    sku: variant.sku,
    priceCentavos: String(variant.priceCentavos),
    stock: String(variant.stock),
    inventoryState,
    isPreorder: inventoryState === "PREORDER",
    expectedRelease: variant.expectedRelease ?? "",
    variationChainText: formatVariationChainText(variant.variationChain),
  };
}

function issueToField(path: string): keyof VariantEditorFormState | undefined {
  switch (path) {
    case "name":
      return "name";
    case "sku":
      return "sku";
    case "priceCentavos":
      return "priceCentavos";
    case "stock":
      return "stock";
    case "inventoryState":
    case "state":
      return "inventoryState";
    case "isPreorder":
      return "isPreorder";
    case "expectedRelease":
      return "expectedRelease";
    case "variationChain":
      return "variationChainText";
    default:
      return undefined;
  }
}

export function normalizeVariationChainText(
  value: string
): ProductVariantOption[] {
  const deduped = new Map<string, ProductVariantOption>();
  value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .forEach((line) => {
      const [group, ...nameParts] = line.split(":");
      if (!group || nameParts.length === 0) {
        return;
      }

      const normalizedGroup = group.trim();
      const normalizedName = nameParts.join(":").trim();
      if (normalizedGroup.length === 0 || normalizedName.length === 0) {
        return;
      }

      const key = `${normalizedGroup.toLowerCase()}::${normalizedName.toLowerCase()}`;
      if (!deduped.has(key)) {
        deduped.set(key, {
          group: normalizedGroup,
          name: normalizedName,
        });
      }
    });

  return Array.from(deduped.values()).sort((left, right) =>
    `${left.group.toLowerCase()}:${left.name.toLowerCase()}`.localeCompare(
      `${right.group.toLowerCase()}:${right.name.toLowerCase()}`
    )
  );
}

export function formatPriceCentavos(value: number): string {
  const amount = Number.isFinite(value) ? Math.max(0, value) : 0;
  return `PHP ${(amount / 100).toFixed(2)}`;
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

  return "We could not save this variant right now.";
}

function serializeForm(form: VariantEditorFormState): string {
  return JSON.stringify(form);
}

function validateVariantInput(form: VariantEditorFormState):
  | {
      okay: true;
      value: VariantEditorSaveInput;
    }
  | {
      okay: false;
      validation: VariantEditorValidationState;
    } {
  const priceCentavos = Number(form.priceCentavos);
  const stock = Number(form.stock);
  const variationChain = normalizeVariationChainText(form.variationChainText);
  const stateParsed = zodUpdateInventoryStateInput.safeParse({
    state: form.inventoryState,
  });

  const parsed = zodCreateProductVariantInput.safeParse({
    name: form.name,
    sku: form.sku,
    priceCentavos,
    stock,
    isPreorder: form.inventoryState === "PREORDER",
    expectedRelease:
      form.expectedRelease.trim().length > 0
        ? form.expectedRelease.trim()
        : null,
    variationChain,
  });

  if (!parsed.success) {
    const summary = parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "form"}: ${issue.message}`
    );
    const fields: Partial<Record<keyof VariantEditorFormState, string>> = {};

    parsed.error.issues.forEach((issue) => {
      const key = issueToField(issue.path.join("."));
      if (key && !fields[key]) {
        fields[key] = issue.message;
      }
    });

    if (
      form.variationChainText.trim().length > 0 &&
      variationChain.length === 0 &&
      !fields.variationChainText
    ) {
      fields.variationChainText = "Use `Group: Option` format for each line.";
      summary.push("variationChain: Use `Group: Option` format for each line.");
    }

    return {
      okay: false,
      validation: {
        summary,
        fields,
      },
    };
  }

  if (!stateParsed.success) {
    return {
      okay: false,
      validation: {
        summary: ["inventoryState: Invalid inventory state."],
        fields: {
          inventoryState: "Choose valid inventory state.",
        },
      },
    };
  }

  if (
    !inventoryStateConsistent({
      quantity: parsed.data.stock,
      state: stateParsed.data.state,
    })
  ) {
    return {
      okay: false,
      validation: {
        summary: [
          "inventoryState: Inventory state conflicts with stock quantity.",
        ],
        fields: {
          inventoryState:
            "Inventory state conflicts with quantity. Use Out of stock for 0, Low stock for threshold, In stock above threshold, or Preorder.",
        },
      },
    };
  }

  return {
    okay: true,
    value: {
      name: parsed.data.name,
      sku: parsed.data.sku,
      priceCentavos: parsed.data.priceCentavos,
      stock: parsed.data.stock,
      inventoryState: stateParsed.data.state,
      isPreorder: stateParsed.data.state === "PREORDER",
      expectedRelease: parsed.data.expectedRelease ?? null,
      variationChain: parsed.data.variationChain,
    },
  };
}

export function VariantEditor({
  mode,
  onClose,
  onSave,
  open,
  saving = false,
  variant = null,
}: VariantEditorProps) {
  const [form, setForm] = useState<VariantEditorFormState>(() =>
    toEditorFormState(mode, variant)
  );
  const [baselineForm, setBaselineForm] = useState(() =>
    serializeForm(toEditorFormState(mode, variant))
  );
  const [validation, setValidation] = useState<VariantEditorValidationState>(
    () => emptyValidationState()
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const next = toEditorFormState(mode, variant);
    setForm(next);
    setBaselineForm(serializeForm(next));
    setValidation(emptyValidationState());
  }, [mode, open, variant]);

  const isDirty = useMemo(
    () => serializeForm(form) !== baselineForm,
    [baselineForm, form]
  );

  function updateField<K extends keyof VariantEditorFormState>(
    key: K,
    value: VariantEditorFormState[K]
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
    if (validation.fields[key] || validation.summary.length > 0) {
      setValidation(emptyValidationState());
    }
  }

  function clearValidationFor(key: keyof VariantEditorFormState) {
    if (validation.fields[key] || validation.summary.length > 0) {
      setValidation(emptyValidationState());
    }
  }

  function handleStockQuantityChange(value: string) {
    setForm((previous) => {
      if (previous.inventoryState === "PREORDER") {
        return { ...previous, stock: value, isPreorder: true };
      }

      const numericValue = Number(value);
      const nextState = deriveInventoryStateFromQuantity({
        quantity:
          Number.isFinite(numericValue) && Number.isInteger(numericValue)
            ? numericValue
            : 0,
      });

      return {
        ...previous,
        stock: value,
        inventoryState: nextState,
        isPreorder: false,
      };
    });

    clearValidationFor("stock");
  }

  function handleInventoryStateChange(state: InventoryState) {
    updateField("inventoryState", state);
    updateField("isPreorder", state === "PREORDER");
  }

  function handlePreorderToggle(checked: boolean) {
    if (checked) {
      updateField("inventoryState", "PREORDER");
      updateField("isPreorder", true);
      return;
    }

    const numericValue = Number(form.stock);
    const nextState = deriveInventoryStateFromQuantity({
      quantity:
        Number.isFinite(numericValue) && Number.isInteger(numericValue)
          ? numericValue
          : 0,
    });
    updateField("inventoryState", nextState);
    updateField("isPreorder", false);
  }

  function handleClose() {
    if (
      open &&
      isDirty &&
      typeof window !== "undefined" &&
      !window.confirm("You have unsaved changes. Leave variant editor?")
    ) {
      return;
    }

    onClose();
  }

  async function handleSubmit(
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) {
    event.preventDefault();
    const result = validateVariantInput(form);
    if (!result.okay) {
      setValidation(result.validation);
      return;
    }

    try {
      await onSave(result.value);
      setBaselineForm(serializeForm(form));
      setValidation(emptyValidationState());
    } catch (error) {
      setValidation({
        summary: [actionErrorMessage(error)],
        fields: {},
      });
    }
  }

  const priceHint =
    form.priceCentavos.trim().length === 0 ||
    Number.isNaN(Number(form.priceCentavos))
      ? "Enter integer centavos. Example: 1999 for PHP 19.99."
      : `Display price: ${formatPriceCentavos(Number(form.priceCentavos))}`;

  return (
    <Modal
      description="You can create or edit product variants with SKU, centavos price, and option combinations."
      onClose={handleClose}
      open={open}
      title={mode === "create" ? "Create variant" : "Edit variant"}
      footer={
        <>
          <Button onClick={handleClose} variant="secondary">
            Cancel
          </Button>
          <Button
            form="variant-editor-form"
            loading={saving}
            type="submit"
            variant="primary"
          >
            {mode === "create" ? "Create variant" : "Save changes"}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-grid-sm"
        id="variant-editor-form"
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
          label="Variant name"
          onChange={(event) => updateField("name", event.currentTarget.value)}
          required
          value={form.name}
        />

        <InputBox
          error={validation.fields.sku}
          label="SKU"
          onChange={(event) => updateField("sku", event.currentTarget.value)}
          required
          value={form.sku}
        />

        <InputBox
          description={priceHint}
          error={validation.fields.priceCentavos}
          inputMode="numeric"
          label="Price (centavos)"
          min={0}
          onChange={(event) =>
            updateField("priceCentavos", event.currentTarget.value)
          }
          required
          step={1}
          type="number"
          value={form.priceCentavos}
        />

        <InventoryAdjuster
          conflictMessage={
            validation.fields.inventoryState &&
            validation.fields.inventoryState.includes("conflicts")
              ? validation.fields.inventoryState
              : undefined
          }
          disabled={saving}
          error={validation.fields.stock}
          onChange={handleStockQuantityChange}
          quantity={form.stock}
        />

        <Toggle
          checked={form.isPreorder}
          error={validation.fields.isPreorder}
          label="Preorder"
          onChange={(event) =>
            handlePreorderToggle(event.currentTarget.checked)
          }
        />

        <InventoryStateSelector
          disabled={saving}
          error={validation.fields.inventoryState}
          onChange={handleInventoryStateChange}
          state={form.inventoryState}
        />

        <InputBox
          description="Optional release date when preorder is on."
          disabled={form.inventoryState !== "PREORDER"}
          error={validation.fields.expectedRelease}
          label="Expected release"
          onChange={(event) =>
            updateField("expectedRelease", event.currentTarget.value)
          }
          placeholder="2026-08-31"
          value={form.expectedRelease}
        />

        <Textarea
          description="One option per line using `Group: Option` format."
          error={validation.fields.variationChainText}
          label="Variation options"
          onChange={(event) =>
            updateField("variationChainText", event.currentTarget.value)
          }
          placeholder={"Size: Small\nColor: Black"}
          rows={5}
          value={form.variationChainText}
        />
      </form>
    </Modal>
  );
}
