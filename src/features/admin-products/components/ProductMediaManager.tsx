import * as React from "react";
import { mergeClassNames } from "@/components/utils";
import type { ProductPhotoRecord, UploadProductImageInput } from "../types";
import { ImageList } from "./ImageList";
import { ImageUpload } from "./ImageUpload";

type MediaFeedback = {
  tone: "success" | "error";
  message: string;
};

export type ProductMediaManagerProps = {
  busy?: boolean;
  disabled?: boolean;
  feedback?: MediaFeedback | null;
  images: ProductPhotoRecord[];
  loading?: boolean;
  onRemove: (photoId: string) => Promise<void> | void;
  onReorder: (photoId: string, sortOrder: number) => Promise<void> | void;
  onSetPrimary: (photoId: string) => Promise<void> | void;
  onUpload: (input: UploadProductImageInput) => Promise<void> | void;
  productName?: string;
};

const mediaFeedbackClass =
  "border border-brand-border-strong p-grid-sm font-system text-[0.8125rem] font-bold [&_p]:m-0";
const feedbackToneClass = {
  success: "border-brand-success bg-brand-success/6 text-brand-success",
  error: "border-brand-danger bg-brand-danger/6 text-brand-danger",
};

export function ProductMediaManager({
  busy = false,
  disabled = false,
  feedback = null,
  images,
  loading = false,
  onRemove,
  onReorder,
  onSetPrimary,
  onUpload,
  productName,
}: ProductMediaManagerProps) {
  return (
    <section className="grid gap-grid-sm border-t border-brand-border pt-grid-sm">
      {feedback ? (
        <section
          aria-live="assertive"
          className={mergeClassNames(
            mediaFeedbackClass,
            feedbackToneClass[feedback.tone]
          )}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          <p>{feedback.message}</p>
        </section>
      ) : null}

      <ImageUpload disabled={disabled} onUpload={onUpload} uploading={busy} />

      <ImageList
        busy={disabled || busy}
        images={images}
        loading={loading}
        onRemove={onRemove}
        onReorder={onReorder}
        onSetPrimary={onSetPrimary}
        productName={productName}
      />
    </section>
  );
}
