import * as React from "react";
import type { ReactNode } from "react";

import { Button } from "./Button";
import { Modal } from "./Modal";

export type ConfirmDialogProps = {
  cancelLabel?: string;
  children?: ReactNode;
  confirmLabel?: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  tone?: "default" | "danger";
};

export function ConfirmDialog({
  cancelLabel = "Cancel",
  children,
  confirmLabel = "Confirm",
  message,
  onCancel,
  onConfirm,
  open,
  title,
  tone = "default",
}: ConfirmDialogProps) {
  return (
    <Modal
      description={message}
      footer={
        <>
          <Button onClick={onCancel} variant="secondary">
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            variant={tone === "danger" ? "danger" : "primary"}
          >
            {confirmLabel}
          </Button>
        </>
      }
      onClose={onCancel}
      open={open}
      title={title}
    >
      {children ?? <p>{message}</p>}
    </Modal>
  );
}
