import {
  AlertTriangle,
  Check,
  CircleDot,
  LoaderCircle,
  MinusCircle,
  X,
} from "lucide-react"

type StatusVariant = "green" | "amber" | "blue" | "orange" | "red" | "gray"

const STATUS_VARIANTS: Record<string, StatusVariant> = {
  approved: "green",
  active: "green",
  completed: "green",
  complete: "green",
  paid: "green",
  verified: "green",
  success: "green",
  delivered: "green",
  taken: "green",
  refunded: "green",
  pending: "amber",
  awaiting_review: "amber",
  open: "amber",
  queued: "amber",
  processing: "blue",
  in_progress: "blue",
  in_transit: "blue",
  under_review: "blue",
  reviewing: "blue",
  ready: "blue",
  new: "blue",
  confirmed: "blue",
  preparing: "blue",
  picked_up: "blue",
  out_for_delivery: "blue",
  flagged: "orange",
  needs_revision: "orange",
  action_required: "orange",
  attention_needed: "orange",
  returned: "orange",
  reversed: "orange",
  rejected: "red",
  failed: "red",
  cancelled: "red",
  suspended: "red",
  blocked: "red",
  restricted: "red",
  removed: "red",
  draft: "gray",
  inactive: "gray",
  expired: "gray",
  archived: "gray",
  unknown: "gray",
  waived: "gray",
}

const VARIANT_STYLES: Record<StatusVariant, string> = {
  green:
    "border-[var(--color-green-border)] bg-[var(--color-green-light)] text-[var(--color-green)]",
  amber:
    "border-[var(--color-amber-border)] bg-[var(--color-amber-light)] text-[var(--color-amber)]",
  blue: "border-[var(--color-navy)]/20 bg-[var(--color-navy-surface)] text-[var(--color-navy)]",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  red: "border-[var(--color-red-border)] bg-[var(--color-red-light)] text-[var(--color-red)]",
  gray: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)]",
}

function normalizeStatus(status: string | null | undefined): string {
  return (status ?? "unknown")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
}

function humanizeStatus(status: string): string {
  return status
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Unknown"
}

function StatusIcon({ variant }: { variant: StatusVariant }) {
  if (variant === "green") return <Check size={12} strokeWidth={2.5} aria-hidden="true" />
  if (variant === "amber") return <CircleDot size={12} strokeWidth={2} aria-hidden="true" />
  if (variant === "blue") return <LoaderCircle size={12} strokeWidth={2} aria-hidden="true" />
  if (variant === "orange") return <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />
  if (variant === "red") return <X size={12} strokeWidth={2.5} aria-hidden="true" />
  return <MinusCircle size={12} strokeWidth={2} aria-hidden="true" />
}

export function getStatusBadgeVariant(status: string | null | undefined): StatusVariant {
  return STATUS_VARIANTS[normalizeStatus(status)] ?? "gray"
}

export function StatusBadge({
  status,
  label,
  className = "",
}: {
  status: string | null | undefined
  label?: string
  className?: string
}) {
  const normalized = normalizeStatus(status)
  const variant = getStatusBadgeVariant(status)
  const text = label ?? humanizeStatus(normalized)

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-[500] leading-none ${VARIANT_STYLES[variant]} ${className}`}
      aria-label={`Status: ${text}`}
      title={text}
    >
      <StatusIcon variant={variant} />
      <span className="max-w-[12rem] truncate">{text}</span>
    </span>
  )
}
