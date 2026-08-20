import type { ReactNode } from "react";
import { X } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  children?: ReactNode;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  onCancel,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[var(--color-ink)]/50 cursor-default"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md bg-white border border-[var(--color-border)] rounded-sm shadow-[0_20px_60px_rgba(28,27,24,0.18)]">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-[600] text-[var(--color-ink)]">{title}</h2>
            <p className="text-sm text-[var(--color-ink-muted)] mt-1">{description}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] transition-colors"
            aria-label="Close confirmation dialog"
          >
            <X size={16} />
          </button>
        </div>

        {children ? <div className="px-5 py-4">{children}</div> : null}

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-[500] rounded-sm border border-[var(--color-border)] text-[var(--color-ink)] hover:bg-[var(--color-surface)] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-[500] rounded-sm transition-colors ${
              danger
                ? "bg-[var(--color-red)] text-white hover:opacity-90"
                : "bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-hover)]"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
