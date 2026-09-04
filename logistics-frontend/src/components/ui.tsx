import { useState, type ReactNode } from "react"
import {
  AlertTriangle, Check, CircleDot, CircleX, Eye, EyeOff, Info,
  LoaderCircle, MinusCircle, X,
} from "lucide-react"

/**
 * Marketo UI primitives for the Logistics Partner Portal.
 *
 * These mirror the Marketplace implementations so both apps render one design
 * system: Field/AuthAlert from frontend/src/pages/auth/AuthLayout.tsx,
 * StatusBadge from frontend/src/components/admin/StatusBadge.tsx, and the
 * card/page-header conventions from the Admin pages. The two apps are separate
 * Vite builds, so the markup is reproduced rather than imported across
 * projects. Keep the classes in step with the Marketplace originals.
 */

// ── Buttons ───────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-hover)]",
  secondary: "bg-white text-[var(--color-ink)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
  ghost: "bg-transparent text-[var(--color-navy)] hover:bg-[var(--color-surface)]",
  danger: "bg-[var(--color-red)] text-white hover:bg-[var(--color-red-hover)]",
}

export function Button({
  children, variant = "primary", type = "button", onClick, disabled, loading, fullWidth, className = "",
}: {
  children: ReactNode
  variant?: ButtonVariant
  type?: "button" | "submit"
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${fullWidth ? "w-full " : ""}py-3 px-4 text-sm font-[500] rounded-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${BUTTON_VARIANTS[variant]} ${className}`}
    >
      {loading && <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

// ── Form field (mirrors the Marketplace auth Field) ───────────────────────────

export function Field({
  id, label, type = "text", value, onChange, error, hint, placeholder, required,
  inputMode, autoComplete, maxLength,
}: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: ReactNode
  placeholder?: string
  required?: boolean
  inputMode?: "numeric" | "text"
  autoComplete?: string
  maxLength?: number
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === "password"

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-[600] text-[var(--color-ink)] mb-1.5">
        {label}
        {required && <span className="text-[var(--color-red)] ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword ? (showPassword ? "text" : "password") : type}
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full px-3.5 py-2.5 text-sm rounded-sm border outline-none transition-all bg-white text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] ${
            error
              ? "border-[var(--color-red)] focus:ring-2 focus:ring-[var(--color-red)]/15"
              : "border-[var(--color-border)] focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10"
          } ${isPassword ? "pr-10" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(shown => !shown)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer transition-colors"
          >
            {showPassword ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-[var(--color-red)] mt-1.5 flex items-center gap-1">
          <CircleX size={11} aria-hidden="true" />
          {error}
        </p>
      )}
      {hint && !error && <div className="text-xs text-[var(--color-ink-muted)] mt-1.5">{hint}</div>}
    </div>
  )
}

// ── Alert (mirrors the Marketplace AuthAlert) ─────────────────────────────────

export function Alert({ type = "error", children }: { type?: "error" | "warning" | "info" | "success"; children: ReactNode }) {
  const styles = {
    error: { bg: "var(--color-red-light)", border: "var(--color-red-border)", text: "var(--color-red)" },
    warning: { bg: "var(--color-warning-light)", border: "var(--color-warning-border)", text: "var(--color-warning)" },
    info: { bg: "var(--color-navy-surface)", border: "var(--color-navy-border)", text: "var(--color-navy)" },
    success: { bg: "var(--color-green-light)", border: "var(--color-green-border)", text: "var(--color-green)" },
  }[type]
  const icon = {
    error: <AlertTriangle size={13} aria-hidden="true" />,
    warning: <AlertTriangle size={13} aria-hidden="true" />,
    info: <Info size={13} aria-hidden="true" />,
    success: <Check size={13} aria-hidden="true" />,
  }[type]

  return (
    <div
      role={type === "error" ? "alert" : undefined}
      className="rounded-sm px-3.5 py-3 text-sm flex items-start gap-2.5 leading-relaxed"
      style={{ background: styles.bg, border: `1px solid ${styles.border}`, color: styles.text }}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <span>{children}</span>
    </div>
  )
}

// ── Status badge (mirrors components/admin/StatusBadge.tsx) ───────────────────

type StatusVariant = "green" | "amber" | "blue" | "orange" | "red" | "gray"

const STATUS_VARIANTS: Record<string, StatusVariant> = {
  approved: "green", active: "green", completed: "green", verified: "green", delivered: "green",
  pending: "amber", awaiting_review: "amber", queued: "amber",
  processing: "blue", in_transit: "blue", under_review: "blue", ready: "blue", picked_up: "blue",
  flagged: "orange", action_required: "orange", returned: "orange",
  rejected: "red", failed: "red", cancelled: "red", suspended: "red", restricted: "red",
  draft: "gray", inactive: "gray", expired: "gray", archived: "gray", unknown: "gray",
}

const VARIANT_STYLES: Record<StatusVariant, string> = {
  green: "border-[var(--color-green-border)] bg-[var(--color-green-light)] text-[var(--color-green)]",
  amber: "border-[var(--color-amber-border)] bg-[var(--color-amber-light)] text-[var(--color-amber)]",
  blue: "border-[var(--color-navy)]/20 bg-[var(--color-navy-surface)] text-[var(--color-navy)]",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  red: "border-[var(--color-red-border)] bg-[var(--color-red-light)] text-[var(--color-red)]",
  gray: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)]",
}

const normalizeStatus = (status: string | null | undefined): string =>
  (status ?? "unknown").trim().toLowerCase().replace(/[\s-]+/g, "_")

const humanizeStatus = (status: string): string =>
  status.split("_").filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") || "Unknown"

function StatusIcon({ variant }: { variant: StatusVariant }) {
  if (variant === "green") return <Check size={12} strokeWidth={2.5} aria-hidden="true" />
  if (variant === "amber") return <CircleDot size={12} strokeWidth={2} aria-hidden="true" />
  if (variant === "blue") return <LoaderCircle size={12} strokeWidth={2} aria-hidden="true" />
  if (variant === "orange") return <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />
  if (variant === "red") return <X size={12} strokeWidth={2.5} aria-hidden="true" />
  return <MinusCircle size={12} strokeWidth={2} aria-hidden="true" />
}

export function StatusBadge({ status, label }: { status: string | null | undefined; label?: string }) {
  const normalized = normalizeStatus(status)
  const variant = STATUS_VARIANTS[normalized] ?? "gray"
  const text = label ?? humanizeStatus(normalized)

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-[500] leading-none ${VARIANT_STYLES[variant]}`}
      aria-label={`Status: ${text}`}
      title={text}
    >
      <StatusIcon variant={variant} />
      <span className="max-w-[12rem] truncate">{text}</span>
    </span>
  )
}

// ── Page header, cards, states ────────────────────────────────────────────────

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--color-ink-muted)] mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ title, icon, children }: { title?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white border border-[var(--color-border)] rounded-sm">
      {title && (
        <h2 className="flex items-center gap-2 p-4 border-b border-[var(--color-border)] text-sm font-[600] text-[var(--color-ink)]">
          {icon && <span className="text-[var(--color-navy)] shrink-0">{icon}</span>}
          {title}
        </h2>
      )}
      <div className="p-5 space-y-4">{children}</div>
    </section>
  )
}

/** Label/value pair used inside cards, matching Admin detail panes. */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <dt className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase">{label}</dt>
      <dd className="text-sm text-[var(--color-ink)] text-right">{children}</dd>
    </div>
  )
}

export function EmptyState({ icon, title, description, action }: {
  icon: ReactNode; title: string; description?: string; action?: ReactNode
}) {
  return (
    <div className="text-center py-10 px-4">
      <div className="w-10 h-10 mx-auto rounded-sm bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-ink-muted)]">
        {icon}
      </div>
      <p className="text-sm font-[600] text-[var(--color-ink)] mt-3">{title}</p>
      {description && <p className="text-xs text-[var(--color-ink-muted)] mt-1.5 leading-relaxed max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

/** Shimmer placeholder, using the same `.skeleton` rule as the Marketplace. */
export function Skeleton({ width = "100%", height = 13 }: { width?: string | number; height?: number }) {
  return (
    <div
      className="skeleton rounded-sm shrink-0"
      style={{ width: typeof width === "number" ? `${width}px` : width, height: `${height}px` }}
    />
  )
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <Skeleton width="30%" height={10} />
          <Skeleton width="45%" height={13} />
        </div>
      ))}
    </div>
  )
}

// ── Table primitives (reusable; no data is invented here) ─────────────────────

export function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-left border-collapse">
        <thead>
          <tr className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
            {headers.map(header => (
              <th key={header} className="px-4 py-2.5 font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase font-[500]">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function TableRow({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-surface)] transition-colors">
      {children}
    </tr>
  )
}

export function TableCell({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 text-sm text-[var(--color-ink)] align-middle">{children}</td>
}
