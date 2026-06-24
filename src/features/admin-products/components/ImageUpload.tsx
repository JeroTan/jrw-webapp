import * as React from "react";
import { useId, useRef, useState } from "react";
import { compressProductImageFile } from "../compressProductImageFile";
import { createProductImageResizeFailureNotice } from "../createProductImageResizeFailureNotice";
import { createProductImageResizeNotice } from "../createProductImageResizeNotice";
import { createProductImageSizeNotice } from "../createProductImageSizeNotice";
import { isProductImageResizeRequired } from "../isProductImageResizeRequired";
import { productImageUploadAcceptedTypes } from "../productImageUploadPolicy";
import type { UploadProductImageInput } from "../types";
import { Button } from "@/components/ui";

export type ImageUploadProps = {
  disabled?: boolean;
  uploading?: boolean;
  onUpload: (input: UploadProductImageInput) => Promise<void> | void;
};

const acceptedTypes = productImageUploadAcceptedTypes.join(",");
const uploadNoticeClass =
  "border p-grid-sm font-system text-xs font-bold [&_p]:m-0";
const uploadNoticeToneClass = {
  error: "border-brand-danger bg-brand-danger/6 text-brand-danger",
  info: "border-brand-accent bg-brand-accent/6 text-brand-content",
};

export function ImageUpload({
  disabled = false,
  uploading = false,
  onUpload,
}: ImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [clientNotice, setClientNotice] = useState<{
    message: string;
    tone: "error" | "info";
  } | null>(null);
  const busy = disabled || uploading || processing;

  function triggerPicker() {
    if (busy) {
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
    if (!file || busy) {
      return;
    }

    setProcessing(true);
    setClientNotice(null);

    try {
      setClientNotice({
        message: createProductImageSizeNotice(file),
        tone: "info",
      });

      let prepared: Awaited<ReturnType<typeof compressProductImageFile>>;

      try {
        prepared = await compressProductImageFile(file);
      } catch {
        if (isProductImageResizeRequired(file)) {
          setClientNotice({
            message: createProductImageResizeFailureNotice(file),
            tone: "error",
          });
          clearInputValue();
          return;
        }

        throw new Error("Image could not be prepared.");
      }

      if (prepared.resized) {
        setClientNotice({
          message: createProductImageResizeNotice(prepared),
          tone: "info",
        });
      }

      await onUpload({
        image: prepared.file,
        name: prepared.file.name,
      });
      clearInputValue();
    } catch {
      // Parent handles and renders upload failure state.
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section
      className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm"
      aria-label="Image upload section"
    >
      <div className="grid gap-0.5">
        <p className="font-system text-xs font-bold uppercase text-brand-muted">
          Product media
        </p>
        <h3 className="m-0 text-lg">Upload image</h3>
      </div>

      <p className="font-system text-xs text-brand-muted">
        You can upload JPEG, PNG, or WEBP image files up to 5MB. Images larger
        than 5MB are reduced before upload.
      </p>

      {clientNotice ? (
        <section
          aria-live="polite"
          className={`${uploadNoticeClass} ${uploadNoticeToneClass[clientNotice.tone]}`}
          role={clientNotice.tone === "error" ? "alert" : "status"}
        >
          <p>{clientNotice.message}</p>
        </section>
      ) : null}

      <div
        className="grid gap-grid-xs border border-dashed border-brand-border bg-brand-border/25 p-grid-sm data-[active=true]:border-solid data-[active=true]:border-brand-accent data-[disabled=true]:opacity-70"
        data-active={dragActive ? "true" : undefined}
        data-disabled={busy ? "true" : undefined}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!busy) {
            setDragActive(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) {
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
        <p className="m-0 text-xs text-brand-muted">
          or choose file from your device
        </p>
        <div className="flex flex-wrap items-center gap-grid-xs">
          <Button disabled={busy} onClick={triggerPicker} variant="secondary">
            Choose image
          </Button>
          {processing ? (
            <span className="font-system text-xs font-bold" role="status">
              Preparing image...
            </span>
          ) : uploading ? (
            <span className="font-system text-xs font-bold" role="status">
              Upload in progress...
            </span>
          ) : null}
        </div>
      </div>

      <label
        className="font-system text-[0.8125rem] font-bold text-brand-content"
        htmlFor={inputId}
      >
        Image file picker
      </label>
      <input
        accept={acceptedTypes}
        className="max-w-full"
        disabled={busy}
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
