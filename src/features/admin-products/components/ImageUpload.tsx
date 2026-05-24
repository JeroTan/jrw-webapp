import * as React from "react";
import { useId, useRef, useState } from "react";
import type { UploadProductImageInput } from "../types";
import { Button } from "@/components/ui";

export type ImageUploadProps = {
  disabled?: boolean;
  uploading?: boolean;
  onUpload: (input: UploadProductImageInput) => Promise<void> | void;
};

const acceptedTypes = "image/jpeg,image/png,image/webp";

export function ImageUpload({
  disabled = false,
  uploading = false,
  onUpload,
}: ImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  function triggerPicker() {
    if (disabled || uploading) {
      return;
    }

    inputRef.current?.click();
  }

  function clearInputValue() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function uploadFile(file: File | null) {
    if (!file || disabled || uploading) {
      return;
    }

    try {
      await onUpload({
        image: file,
        name: file.name,
      });
      clearInputValue();
    } catch {
      // Parent handles and renders user-facing failure state.
    }
  }

  return (
    <section className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm" aria-label="Image upload section">
      <div className="grid gap-0.5">
        <p className="font-system text-xs font-bold uppercase text-brand-muted">Product media</p>
        <h3 className="m-0 text-lg">Upload image</h3>
      </div>

      <p className="font-system text-xs text-brand-muted">
        You can upload JPEG, PNG, or WEBP image files up to 5MB.
      </p>

      <div
        className="grid gap-grid-xs border border-dashed border-brand-border bg-brand-border/25 p-grid-sm data-[active=true]:border-solid data-[active=true]:border-brand-accent data-[disabled=true]:opacity-70"
        data-active={dragActive ? "true" : undefined}
        data-disabled={disabled || uploading ? "true" : undefined}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled && !uploading) {
            setDragActive(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !uploading) {
            setDragActive(true);
          }
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={async (event) => {
          event.preventDefault();
          setDragActive(false);
          const file = event.dataTransfer?.files?.item(0) ?? null;
          await uploadFile(file);
        }}
      >
        <p className="m-0 font-heading text-sm">Drop image here</p>
        <p className="m-0 text-xs text-brand-muted">or choose file from your device</p>
        <div className="flex flex-wrap items-center gap-grid-xs">
          <Button
            disabled={disabled || uploading}
            onClick={triggerPicker}
            variant="secondary"
          >
            Choose image
          </Button>
          {uploading ? (
            <span className="font-system text-xs font-bold" role="status">
              Upload in progress...
            </span>
          ) : null}
        </div>
      </div>

      <label className="font-system text-[0.8125rem] font-bold text-brand-content" htmlFor={inputId}>
        Image file picker
      </label>
      <input
        accept={acceptedTypes}
        className="max-w-full"
        disabled={disabled || uploading}
        id={inputId}
        onChange={async (event) => {
          const file = event.currentTarget.files?.item(0) ?? null;
          await uploadFile(file);
        }}
        ref={inputRef}
        type="file"
      />
    </section>
  );
}
