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
    <section className="jrw-images__upload" aria-label="Image upload section">
      <div className="jrw-images__upload-header">
        <p className="jrw-page-kicker">Product media</p>
        <h3 className="jrw-images__upload-title">Upload image</h3>
      </div>

      <p className="jrw-field__description">
        You can upload JPEG, PNG, or WEBP image files up to 5MB.
      </p>

      <div
        className="jrw-images__dropzone"
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
        <p className="jrw-images__dropzone-label">Drop image here</p>
        <p className="jrw-images__dropzone-copy">or choose file from your device</p>
        <div className="jrw-images__upload-actions">
          <Button
            disabled={disabled || uploading}
            onClick={triggerPicker}
            variant="secondary"
          >
            Choose image
          </Button>
          {uploading ? (
            <span className="jrw-images__upload-progress" role="status">
              Upload in progress...
            </span>
          ) : null}
        </div>
      </div>

      <label className="jrw-field__label" htmlFor={inputId}>
        Image file picker
      </label>
      <input
        accept={acceptedTypes}
        className="jrw-images__file-input"
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
