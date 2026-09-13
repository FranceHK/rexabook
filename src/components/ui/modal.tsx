"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  glass?: boolean;
}

export function Modal({ open, onClose, title, subtitle, children, footer, maxWidth = "max-w-lg", glass = false }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn("modal-overlay open", !glass && "dark:[&_.modal-box]:bg-surface-2")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : undefined}
    >
      <div className={cn("modal-box", glass && "glass-modal", maxWidth)}>
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div>
              <h3 className="text-lg font-medium text-ink">{title}</h3>
              {subtitle ? <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-ink"
              aria-label="Funga"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}