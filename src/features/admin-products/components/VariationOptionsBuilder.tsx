import * as React from "react";
import { useId, useMemo, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui";
import { InputBox } from "@/components/ui/InputBox";
import { mergeVariationOption } from "../mergeVariationOption";
import { normalizeVariationOptionPart } from "../normalizeVariationOptionPart";
import {
  PRODUCT_VARIANT_OPTION_GROUP_MAX_LENGTH,
  PRODUCT_VARIANT_OPTION_NAME_MAX_LENGTH,
} from "../productValidationLimits";
import { removeVariationOptionGroup } from "../removeVariationOptionGroup";
import type { ProductVariantOption, ProductVariantRecord } from "../types";
import { variationOptionGroupsFromVariants } from "../variationOptionGroupsFromVariants";

type DraftState =
  | { mode: "idle" }
  | { error: string | null; group: string; mode: "group"; value: string }
  | { error: string | null; group: string; mode: "value"; value: string };

export type VariationOptionsBuilderProps = {
  disabled?: boolean;
  error?: string;
  onChange: (options: ProductVariantOption[]) => void;
  options: ProductVariantOption[];
  referenceVariants?: ProductVariantRecord[];
};

const sectionClass = "grid gap-grid-xs";
const titleClass = "font-system text-[0.8125rem] font-bold text-brand-content";
const errorClass = "font-system text-xs font-bold text-brand-danger";
const panelClass =
  "grid min-h-control-md border border-brand-border-strong bg-brand-surface [&>*+*]:border-t [&>*+*]:border-brand-border";
const draftRowClass =
  "grid grid-cols-[minmax(120px,0.75fr)_minmax(180px,1fr)_auto] items-start gap-grid-xs p-grid-xs max-md:grid-cols-1";
const rowClass = "grid gap-grid-xs p-grid-xs";
const groupClass = "font-system text-xs font-bold uppercase text-brand-muted";
const chipClass =
  "min-h-control-sm border px-grid-xs font-system text-xs hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent";
const idleChipClass = "border-brand-border bg-brand-surface text-brand-muted";
const selectedChipClass =
  "border-brand-accent bg-brand-accent font-bold text-brand-surface";
const chipRowClass = "flex flex-wrap items-center gap-1";
const inlineEditorClass =
  "grid grid-cols-[minmax(180px,1fr)_auto] items-start gap-grid-xs max-md:grid-cols-1";
const actionClass = "inline-flex flex-wrap justify-end gap-grid-xs";

export function VariationOptionsBuilder({
  disabled = false,
  error,
  onChange,
  options,
  referenceVariants = [],
}: VariationOptionsBuilderProps) {
  const titleId = useId();
  const [draft, setDraft] = useState<DraftState>({ mode: "idle" });
  const groups = useMemo(
    () =>
      variationOptionGroupsFromVariants({
        options,
        variants: referenceVariants,
      }),
    [options, referenceVariants]
  );
  const visibleError =
    draft.mode === "idle" ? (error ?? null) : (draft.error ?? error ?? null);

  function setDraftError(message: string) {
    setDraft((current) =>
      current.mode === "idle" ? current : { ...current, error: message }
    );
  }

  function startGroupDraft() {
    setDraft({ error: null, group: "", mode: "group", value: "" });
  }

  function startValueDraft(group: string, value = "") {
    setDraft({ error: null, group, mode: "value", value });
  }

  function cancelDraft() {
    setDraft({ mode: "idle" });
  }

  function selectValue(group: string, name: string) {
    if (disabled || draft.mode !== "idle") {
      return;
    }

    onChange(mergeVariationOption(options, { group, name }));
  }

  function confirmDraft() {
    if (draft.mode === "idle") {
      return;
    }

    const group = normalizeVariationOptionPart(draft.group);
    const name = normalizeVariationOptionPart(draft.value);

    if (!group) {
      setDraftError("Category required.");
      return;
    }

    if (!name) {
      setDraftError("Value required.");
      return;
    }

    if (group.length > PRODUCT_VARIANT_OPTION_GROUP_MAX_LENGTH) {
      setDraftError("Category too long.");
      return;
    }

    if (name.length > PRODUCT_VARIANT_OPTION_NAME_MAX_LENGTH) {
      setDraftError("Value too long.");
      return;
    }

    if (
      draft.mode === "group" &&
      groups.some(
        (optionGroup) =>
          normalizeVariationOptionPart(optionGroup.group).toLowerCase() ===
          group.toLowerCase()
      )
    ) {
      setDraftError("Category already exists.");
      return;
    }

    onChange(mergeVariationOption(options, { group, name }));
    cancelDraft();
  }

  function removeGroup(group: string) {
    if (disabled || draft.mode !== "idle") {
      return;
    }

    onChange(removeVariationOptionGroup(options, group));
  }

  return (
    <section aria-labelledby={titleId} className={sectionClass}>
      <div className="flex flex-wrap items-center justify-between gap-grid-xs">
        <p className={titleClass} id={titleId}>
          Variation options
        </p>
        <Button
          disabled={disabled || draft.mode !== "idle"}
          onClick={startGroupDraft}
          size="sm"
          textSize="sm"
          variant="secondary"
        >
          <Plus aria-hidden="true" size={14} />
          Category
        </Button>
      </div>

      {visibleError ? (
        <p className={errorClass} role="alert">
          {visibleError}
        </p>
      ) : null}

      <div className={panelClass}>
        {draft.mode === "group" ? (
          <div className={draftRowClass}>
            <InputBox
              autoFocus
              error={draft.error ?? undefined}
              label="Category"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDraft((current) =>
                  current.mode === "group"
                    ? {
                        ...current,
                        error: null,
                        group: value,
                      }
                    : current
                );
              }}
              placeholder="Size"
              value={draft.group}
            />
            <InputBox
              label="Value"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDraft((current) =>
                  current.mode === "group"
                    ? {
                        ...current,
                        error: null,
                        value,
                      }
                    : current
                );
              }}
              placeholder="Small"
              value={draft.value}
            />
            <div className={actionClass}>
              <Button
                aria-label="Apply option"
                onClick={confirmDraft}
                size="sm"
                square
                title="Apply option"
                variant="primary"
              >
                <Check aria-hidden="true" size={14} />
              </Button>
              <Button
                aria-label="Cancel option"
                onClick={cancelDraft}
                size="sm"
                square
                title="Cancel option"
                variant="secondary"
              >
                <X aria-hidden="true" size={14} />
              </Button>
            </div>
          </div>
        ) : null}

        {groups.map((group) => {
          const editing =
            draft.mode === "value" &&
            normalizeVariationOptionPart(draft.group).toLowerCase() ===
              group.group.toLowerCase();

          return (
            <div className={rowClass} key={group.group}>
              <span className={groupClass}>{group.group}</span>

              <div className={chipRowClass}>
                {group.values.length > 0
                  ? group.values.map((value) => {
                      const selected =
                        normalizeVariationOptionPart(
                          group.selectedValue ?? ""
                        ).toLowerCase() ===
                        normalizeVariationOptionPart(value).toLowerCase();

                      return (
                        <button
                          aria-label={`Select ${value} for ${group.group}`}
                          aria-pressed={selected}
                          className={`${chipClass} ${
                            selected ? selectedChipClass : idleChipClass
                          }`}
                          disabled={disabled || draft.mode !== "idle"}
                          key={value}
                          onClick={() => selectValue(group.group, value)}
                          type="button"
                        >
                          {value}
                        </button>
                      );
                    })
                  : null}

                {!editing ? (
                  <Button
                    aria-label={`Add ${group.group} value`}
                    disabled={disabled || draft.mode !== "idle"}
                    onClick={() => startValueDraft(group.group)}
                    size="sm"
                    square
                    title="Add value"
                    variant="secondary"
                  >
                    <Plus aria-hidden="true" size={14} />
                  </Button>
                ) : null}

                {!editing && group.selectedValue ? (
                  <Button
                    aria-label={`Remove ${group.group}`}
                    disabled={disabled || draft.mode !== "idle"}
                    onClick={() => removeGroup(group.group)}
                    size="sm"
                    square
                    title="Remove category"
                    variant="danger"
                  >
                    <Trash2 aria-hidden="true" size={14} />
                  </Button>
                ) : null}
              </div>

              {editing ? (
                <div className={inlineEditorClass}>
                  <InputBox
                    autoFocus
                    error={draft.error ?? undefined}
                    hideLabel
                    label={`${group.group} value`}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setDraft((current) =>
                        current.mode === "value"
                          ? {
                              ...current,
                              error: null,
                              value,
                            }
                          : current
                      );
                    }}
                    placeholder="Small"
                    value={draft.value}
                  />
                  <div className={actionClass}>
                    <Button
                      aria-label={`Apply ${group.group} value`}
                      onClick={confirmDraft}
                      size="sm"
                      square
                      title="Apply value"
                      variant="primary"
                    >
                      <Check aria-hidden="true" size={14} />
                    </Button>
                    <Button
                      aria-label={`Cancel ${group.group} value`}
                      onClick={cancelDraft}
                      size="sm"
                      square
                      title="Cancel value"
                      variant="secondary"
                    >
                      <X aria-hidden="true" size={14} />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}

        {groups.length === 0 && draft.mode !== "group" ? (
          <div aria-hidden="true" className="min-h-control-md" />
        ) : null}
      </div>
    </section>
  );
}
