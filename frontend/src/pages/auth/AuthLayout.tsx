import { useState } from "react";
import type { ReactNode } from "react";

// ── Shared form field (used across all auth pages) ────────────────────────────

export function Field({
  label, type = "text", value, onChange, error, hint, placeholder, disabled, required,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  error?: string; hint?: string; placeholder?: string; disabled?: boolean; required?: boolean;
}) {
  const [showPwd, setShowPwd] = useState(false);
  const isPwd = type === "password";
  return (
    <div>
      <label className="block text-xs font-[600] text-[var(--color-ink)] mb-1.5">
        {label}
        {required && <span className="text-[var(--color-red)] ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={isPwd ? (showPwd ? "text" : "password") : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3.5 py-2.5 text-sm rounded-sm border outline-none transition-all bg-white text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] ${
            error
              ? "border-[var(--color-red)] focus:ring-2 focus:ring-[var(--color-red)]/15"
              : "border-[var(--color-border)] focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10"
          } disabled:bg-[var(--color-surface)] disabled:text-[var(--color-ink-muted)] ${isPwd ? "pr-10" : ""}`}
        />
        {isPwd && (
          <button type="button" onClick={() => setShowPwd(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer transition-colors">
            {showPwd ? (
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 2l14 14M7.5 7.5a2.5 2.5 0 003.5 3.5M5 5.5C3.2 6.8 2 8.5 2 9c0 1 3.2 4.5 7 4.5a7.5 7.5 0 003.2-1M9.5 4.5h.5c3.8 0 7 3.5 7 4.5 0 .6-.9 2.1-2.4 3.2" /></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 9c0-1 3.2-4.5 7-4.5S16 8 16 9s-3.2 4.5-7 4.5S2 10 2 9z" /><circle cx="9" cy="9" r="2.5" /></svg>
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-[var(--color-red)] mt-1.5 flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="5" /><path d="M6 4v2.5M6 8.5v.5" strokeLinecap="round" /></svg>
          {error}
        </p>
      )}
      {hint && !error && <p className="text-xs text-[var(--color-ink-muted)] mt-1.5">{hint}</p>}
    </div>
  );
}

// ── Inline alert (error / warning / info) ─────────────────────────────────────

export function AuthAlert({ type, message }: { type: "error" | "warning" | "info" | "success"; message: string }) {
  const styles = {
    error:   { bg: "var(--color-red-light)",     border: "var(--color-red-border)",     text: "var(--color-red)" },
    warning: { bg: "var(--color-warning-light)", border: "var(--color-warning-border)", text: "var(--color-warning)" },
    info:    { bg: "var(--color-navy-surface)",  border: "var(--color-navy-border)",    text: "var(--color-navy)" },
    success: { bg: "var(--color-green-light)",   border: "var(--color-green-border)",   text: "var(--color-green)" },
  }[type];
  const icons = {
    error:   <path d="M6 4v2.5M6 8.5v.5" strokeLinecap="round" />,
    warning: <path d="M6 4v2.5M6 8.5v.5" strokeLinecap="round" />,
    info:    <path d="M6 4v2.5M6 8.5v.5" strokeLinecap="round" />,
    success: <path d="M3.5 6l2 2 3.5-4" strokeLinecap="round" strokeLinejoin="round" />,
  }[type];
  return (
    <div className="rounded-sm px-3.5 py-3 text-sm flex items-start gap-2.5 leading-relaxed"
      style={{ background: styles.bg, border: `1px solid ${styles.border}`, color: styles.text }}>
      <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 mt-0.5">
        <circle cx="6" cy="6" r="5" />{icons}
      </svg>
      <span>{message}</span>
    </div>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────────

export function FormDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-[var(--color-border)]" />
      <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] tracking-widest uppercase">{label}</span>
      <div className="flex-1 h-px bg-[var(--color-border)]" />
    </div>
  );
}

// ── Password strength indicator ────────────────────────────────────────────────

export function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Strong", "Very strong"];
  const barColors = [
    "bg-[var(--color-border)]",
    "bg-[var(--color-red)]",
    "bg-[var(--color-warning)]",
    "bg-[var(--color-amber)]",
    "bg-[var(--color-green)]",
  ];
  if (!password) return null;
  return (
    <div>
      <div className="flex gap-1 mb-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < score ? barColors[score] : "bg-[var(--color-border)]"}`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{labels[score]}</p>
        <div className="flex gap-2.5">
          {[["8+ chars", checks[0]], ["Uppercase", checks[1]], ["Number", checks[2]], ["Symbol", checks[3]]].map(([l, ok]) => (
            <span key={l as string} className={`font-[var(--font-mono)] text-[9px] ${ok ? "text-[var(--color-green)]" : "text-[var(--color-ink-disabled)]"}`}>
              {ok ? "✓" : "·"} {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main centered auth layout ──────────────────────────────────────────────────

export default function AuthLayout({
  children, title, subtitle, footer,
}: {
  children: ReactNode; title: string; subtitle?: ReactNode; footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-ground)] flex flex-col items-center justify-center px-4 py-12">
      {/* Brand mark */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="w-11 h-11 bg-[var(--color-navy)] rounded-sm flex items-center justify-center shadow-[0_2px_12px_rgba(26,53,80,0.25)]">
          <span className="font-[var(--font-display)] text-2xl text-white font-[400] leading-none">M</span>
        </div>
        <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-[0.22em] uppercase">Marketo</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white border border-[var(--color-border)] rounded-sm shadow-[0_4px_32px_rgba(28,27,24,0.08)]">
        <div className="px-8 pt-7 pb-6 border-b border-[var(--color-border)]">
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] leading-snug">{title}</h1>
          {subtitle && <div className="text-sm text-[var(--color-ink-muted)] mt-1.5 leading-relaxed">{subtitle}</div>}
        </div>
        <div className="px-8 py-7 space-y-5">{children}</div>
      </div>

      {footer && <div className="mt-5 text-center text-sm text-[var(--color-ink-muted)]">{footer}</div>}
    </div>
  );
}
