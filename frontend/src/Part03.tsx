import { useState } from "react";
import { Tag, SectionHeader } from "./shared";

const SECTIONS = [
  { id: "tokens-color", label: "01 — Color Tokens" },
  { id: "tokens-type", label: "02 — Typography" },
  { id: "tokens-space", label: "03 — Spacing Scale" },
  { id: "comp-buttons", label: "04 — Buttons" },
  { id: "comp-forms", label: "05 — Form Elements" },
  { id: "comp-nav", label: "06 — Navigation" },
  { id: "comp-commerce", label: "07 — Commerce" },
  { id: "comp-data", label: "08 — Data Display" },
  { id: "comp-feedback", label: "09 — Feedback" },
  { id: "comp-responsive", label: "10 — Responsive Rules" },
  { id: "comp-a11y", label: "11 — Accessibility" },
];

// ── Primitives ───────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-3">{children}</p>;
}

function ShowCard({ children, label, className = "" }: { children: React.ReactNode; label?: string; className?: string }) {
  return (
    <div className={`bg-white border border-[var(--color-border)] rounded-sm ${className}`}>
      {label && <div className="px-4 pt-3 pb-0"><Label>{label}</Label></div>}
      <div className="px-4 pb-4 pt-2">{children}</div>
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────────────

export function BtnPrimary({ children, size = "md", loading = false, disabled = false, onClick }: {
  children: React.ReactNode; size?: "sm" | "md" | "lg"; loading?: boolean; disabled?: boolean; onClick?: () => void;
}) {
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-[var(--font-body)] font-[500] rounded-sm border border-[var(--color-navy)] bg-[var(--color-navy)] text-white ${sizes[size]} hover:bg-[var(--color-navy-hover)] hover:border-[var(--color-navy-hover)] active:bg-[var(--color-navy-active)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function BtnSecondary({ children, size = "md", disabled = false, onClick }: {
  children: React.ReactNode; size?: "sm" | "md" | "lg"; disabled?: boolean; onClick?: () => void;
}) {
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-[var(--font-body)] font-[500] rounded-sm border border-[var(--color-border-strong)] bg-white text-[var(--color-ink)] ${sizes[size]} hover:bg-[var(--color-surface)] hover:border-[var(--color-navy)] active:bg-[var(--color-surface)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}>
      {children}
    </button>
  );
}

export function BtnOutline({ children, size = "md", disabled = false, onClick }: {
  children: React.ReactNode; size?: "sm" | "md" | "lg"; disabled?: boolean; onClick?: () => void;
}) {
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-[var(--font-body)] font-[500] rounded-sm border border-[var(--color-navy)] bg-transparent text-[var(--color-navy)] ${sizes[size]} hover:bg-[var(--color-navy-surface)] active:bg-[var(--color-navy-surface)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}>
      {children}
    </button>
  );
}

export function BtnGhost({ children, size = "md", disabled = false, onClick }: {
  children: React.ReactNode; size?: "sm" | "md" | "lg"; disabled?: boolean; onClick?: () => void;
}) {
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-[var(--font-body)] font-[500] rounded-sm border border-transparent bg-transparent text-[var(--color-ink)] ${sizes[size]} hover:bg-[var(--color-surface)] active:bg-[var(--color-border)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}>
      {children}
    </button>
  );
}

export function BtnDestructive({ children, size = "md", disabled = false, onClick }: {
  children: React.ReactNode; size?: "sm" | "md" | "lg"; disabled?: boolean; onClick?: () => void;
}) {
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-[var(--font-body)] font-[500] rounded-sm border border-[var(--color-red)] bg-[var(--color-red)] text-white ${sizes[size]} hover:bg-[var(--color-red-hover)] hover:border-[var(--color-red-hover)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}>
      {children}
    </button>
  );
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" className="animate-spin" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────────

type StatusType = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded" | "approved" | "rejected" | "active" | "inactive" | "draft" | "review";

export function StatusBadge({ status }: { status: StatusType }) {
  const map: Record<StatusType, { label: string; bg: string; text: string; dot: string }> = {
    pending:    { label: "Pending",    bg: "bg-[var(--color-warning-light)]",  text: "text-[var(--color-warning)]",   dot: "bg-[var(--color-warning)]" },
    processing: { label: "Processing", bg: "bg-[var(--color-navy-surface)]",   text: "text-[var(--color-navy)]",      dot: "bg-[var(--color-navy)]" },
    shipped:    { label: "Shipped",    bg: "bg-[var(--color-navy-surface)]",   text: "text-[var(--color-navy-light)]",dot: "bg-[var(--color-navy-light)]" },
    delivered:  { label: "Delivered",  bg: "bg-[var(--color-green-light)]",    text: "text-[var(--color-green)]",     dot: "bg-[var(--color-green)]" },
    cancelled:  { label: "Cancelled",  bg: "bg-[var(--color-red-light)]",      text: "text-[var(--color-red)]",       dot: "bg-[var(--color-red)]" },
    refunded:   { label: "Refunded",   bg: "bg-[var(--color-violet-light)]",   text: "text-[var(--color-violet)]",    dot: "bg-[var(--color-violet)]" },
    approved:   { label: "Approved",   bg: "bg-[var(--color-green-light)]",    text: "text-[var(--color-green)]",     dot: "bg-[var(--color-green)]" },
    rejected:   { label: "Rejected",   bg: "bg-[var(--color-red-light)]",      text: "text-[var(--color-red)]",       dot: "bg-[var(--color-red)]" },
    active:     { label: "Active",     bg: "bg-[var(--color-green-light)]",    text: "text-[var(--color-green)]",     dot: "bg-[var(--color-green)]" },
    inactive:   { label: "Inactive",   bg: "bg-[var(--color-surface)]",        text: "text-[var(--color-ink-muted)]", dot: "bg-[var(--color-ink-disabled)]" },
    draft:      { label: "Draft",      bg: "bg-[var(--color-surface)]",        text: "text-[var(--color-ink-muted)]", dot: "bg-[var(--color-ink-disabled)]" },
    review:     { label: "In Review",  bg: "bg-[var(--color-amber-light)]",    text: "text-[var(--color-amber)]",     dot: "bg-[var(--color-amber)]" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-[var(--font-mono)] font-[500] tracking-wide ${s.bg} ${s.text}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ── Rating ───────────────────────────────────────────────────────────────────

export function Rating({ value, count, size = "sm" }: { value: number; count?: number; size?: "sm" | "md" }) {
  const starSize = size === "md" ? 16 : 13;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map(i => (
          <svg key={i} width={starSize} height={starSize} viewBox="0 0 16 16" fill={i <= Math.floor(value) ? "#B8782A" : i === Math.ceil(value) && value % 1 >= 0.5 ? "#B8782A" : "#DDD9CE"}>
            <path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.2 5.7l4-.6z" />
          </svg>
        ))}
      </div>
      <span className={`font-[var(--font-mono)] ${size === "md" ? "text-xs" : "text-[10px]"} text-[var(--color-ink-muted)]`}>
        {value.toFixed(1)}{count !== undefined && <span className="ml-1">({count.toLocaleString()})</span>}
      </span>
    </div>
  );
}

// ── Price ────────────────────────────────────────────────────────────────────

export function Price({ amount, original, currency = "₱", size = "md" }: {
  amount: number; original?: number; currency?: string; size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "text-sm", md: "text-base", lg: "text-xl" };
  const discount = original ? Math.round(((original - amount) / original) * 100) : null;
  return (
    <div className="flex items-baseline gap-2">
      <span className={`font-[var(--font-body)] font-[600] text-[var(--color-ink)] ${sizes[size]}`}>
        {currency}{amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
      </span>
      {original && (
        <>
          <span className="text-xs text-[var(--color-ink-muted)] line-through">
            {currency}{original.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] font-[var(--font-mono)] bg-[var(--color-red-light)] text-[var(--color-red)] px-1.5 py-0.5 rounded">
            -{discount}%
          </span>
        </>
      )}
    </div>
  );
}

// ── Quantity Selector ────────────────────────────────────────────────────────

export function QuantitySelector({ value, min = 1, max = 99, onChange }: {
  value: number; min?: number; max?: number; onChange: (v: number) => void;
}) {
  return (
    <div className="inline-flex items-center border border-[var(--color-border)] rounded-sm bg-white">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-8 h-8 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors border-r border-[var(--color-border)]">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </button>
      <span className="w-10 text-center text-sm font-[500] text-[var(--color-ink)] font-[var(--font-mono)]">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-8 h-8 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors border-l border-[var(--color-border)]">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}

// ── Product Card ─────────────────────────────────────────────────────────────

export function ProductCard({ image, name, seller, price, originalPrice, rating, ratingCount, badge }: {
  image: string; name: string; seller: string; price: number; originalPrice?: number;
  rating: number; ratingCount: number; badge?: string;
}) {
  const [wishlisted, setWishlisted] = useState(false);
  return (
    <div className="group bg-white border border-[var(--color-border)] rounded-sm overflow-hidden hover:shadow-[0_4px_16px_rgba(28,27,24,0.10)] hover:border-[var(--color-border-strong)] transition-all cursor-pointer">
      <div className="relative overflow-hidden bg-[var(--color-surface)] aspect-square">
        <img src={`${image}&w=400&h=400&fit=crop&auto=format`} alt={name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
        {badge && (
          <div className="absolute top-2.5 left-2.5">
            <span className="text-[10px] font-[var(--font-mono)] font-[500] bg-[var(--color-navy)] text-white px-2 py-1 rounded-sm">{badge}</span>
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setWishlisted(!wishlisted); }}
          className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white cursor-pointer">
          <svg width="14" height="14" viewBox="0 0 14 14" fill={wishlisted ? "#8B2C2C" : "none"} stroke={wishlisted ? "#8B2C2C" : "#6B6860"} strokeWidth="1.4">
            <path d="M7 12.5s-5.5-3.2-5.5-7A3 3 0 0 1 7 3.7 3 3 0 0 1 12.5 5.5c0 3.8-5.5 7-5.5 7z" />
          </svg>
        </button>
      </div>
      <div className="p-3.5">
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mb-1 truncate">{seller}</p>
        <p className="text-sm font-[500] text-[var(--color-ink)] leading-snug mb-2 line-clamp-2">{name}</p>
        <div className="mb-2"><Rating value={rating} count={ratingCount} /></div>
        <Price amount={price} original={originalPrice} size="sm" />
      </div>
    </div>
  );
}

// ── Seller Card ──────────────────────────────────────────────────────────────

export function SellerCard({ name, category, rating, productCount, initials }: {
  name: string; category: string; rating: number; productCount: number; initials: string;
}) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm p-4 flex items-start gap-3 hover:border-[var(--color-navy)] hover:shadow-[0_2px_8px_rgba(28,27,24,0.08)] transition-all cursor-pointer">
      <div className="w-12 h-12 rounded bg-[var(--color-navy)] flex items-center justify-center shrink-0">
        <span className="text-white font-[var(--font-display)] text-lg font-[400]">{initials}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-[600] text-[var(--color-ink)] mb-0.5 truncate">{name}</p>
        <p className="text-xs text-[var(--color-ink-muted)] mb-1.5">{category}</p>
        <div className="flex items-center gap-3">
          <Rating value={rating} />
          <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{productCount} products</span>
        </div>
      </div>
    </div>
  );
}

// ── Cart Item ────────────────────────────────────────────────────────────────

function CartItem({ image, name, seller, variant, price, qty, onQtyChange, onRemove }: {
  image: string; name: string; seller: string; variant: string;
  price: number; qty: number;
  onQtyChange: (v: number) => void; onRemove: () => void;
}) {
  return (
    <div className="flex gap-3 py-3.5 border-b border-[var(--color-border)] last:border-0">
      <div className="w-16 h-16 shrink-0 bg-[var(--color-surface)] rounded-sm overflow-hidden">
        <img src={`${image}&w=128&h=128&fit=crop&auto=format`} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] mb-0.5">{seller}</p>
        <p className="text-sm font-[500] text-[var(--color-ink)] leading-snug mb-1 truncate">{name}</p>
        <p className="text-xs text-[var(--color-ink-muted)] mb-2">{variant}</p>
        <div className="flex items-center justify-between">
          <QuantitySelector value={qty} onChange={onQtyChange} />
          <div className="flex items-center gap-3">
            <Price amount={price * qty} size="sm" />
            <button onClick={onRemove} className="text-[var(--color-ink-muted)] hover:text-[var(--color-red)] transition-colors cursor-pointer">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <path d="M1 3.5h12M4.5 3.5V2h5v1.5M5.5 6.5v4M8.5 6.5v4M2.5 3.5l.7 8h7.6l.7-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ orderId, date, seller, itemCount, total, status }: {
  orderId: string; date: string; seller: string; itemCount: number; total: number; status: StatusType;
}) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm p-4 hover:border-[var(--color-border-strong)] transition-all cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-[var(--font-mono)] text-xs text-[var(--color-navy)] font-[500]">{orderId}</p>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{date}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--color-ink-muted)]">From <span className="text-[var(--color-ink)] font-[500]">{seller}</span></p>
          <p className="text-xs text-[var(--color-ink-muted)]">{itemCount} {itemCount === 1 ? "item" : "items"}</p>
        </div>
        <Price amount={total} size="sm" />
      </div>
    </div>
  );
}

// ── Stats Card ───────────────────────────────────────────────────────────────

export function StatsCard({ label, value, delta, deltaLabel, accent = false }: {
  label: string; value: string; delta?: number; deltaLabel?: string; accent?: boolean;
}) {
  const positive = delta !== undefined && delta >= 0;
  return (
    <div className={`rounded-sm border p-4 ${accent ? "bg-[var(--color-navy)] border-[var(--color-navy)]" : "bg-white border-[var(--color-border)]"}`}>
      <p className={`font-[var(--font-mono)] text-[10px] tracking-widest uppercase mb-2 ${accent ? "text-white/60" : "text-[var(--color-ink-muted)]"}`}>{label}</p>
      <p className={`font-[var(--font-display)] text-3xl font-[400] mb-1 ${accent ? "text-white" : "text-[var(--color-ink)]"}`}>{value}</p>
      {delta !== undefined && (
        <p className={`text-xs font-[var(--font-mono)] ${positive ? "text-[var(--color-green)]" : "text-[var(--color-red)]"} ${accent ? "" : ""}`}>
          {positive ? "↑" : "↓"} {Math.abs(delta)}% {deltaLabel}
        </p>
      )}
    </div>
  );
}

// ── Alert ────────────────────────────────────────────────────────────────────

export function Alert({ type, title, children, dismissible = false }: {
  type: "info" | "success" | "warning" | "error"; title?: string; children: React.ReactNode; dismissible?: boolean;
}) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  const styles = {
    info:    { bg: "bg-[var(--color-navy-surface)]",  border: "border-[var(--color-navy-border)]",   text: "text-[var(--color-navy)]",  icon: "ℹ" },
    success: { bg: "bg-[var(--color-green-light)]",   border: "border-[var(--color-green-border)]",  text: "text-[var(--color-green)]", icon: "✓" },
    warning: { bg: "bg-[var(--color-warning-light)]", border: "border-[var(--color-warning-border)]",text: "text-[var(--color-warning)]",icon: "⚠" },
    error:   { bg: "bg-[var(--color-red-light)]",     border: "border-[var(--color-red-border)]",    text: "text-[var(--color-red)]",   icon: "✕" },
  };
  const s = styles[type];
  return (
    <div className={`flex gap-3 px-4 py-3.5 rounded-sm border ${s.bg} ${s.border}`} role="alert">
      <span className={`font-[var(--font-mono)] text-xs font-[600] shrink-0 mt-0.5 ${s.text}`}>{s.icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className={`text-sm font-[600] mb-0.5 ${s.text}`}>{title}</p>}
        <p className={`text-sm leading-relaxed ${s.text} opacity-90`}>{children}</p>
      </div>
      {dismissible && (
        <button onClick={() => setVisible(false)} className={`shrink-0 ${s.text} opacity-50 hover:opacity-100 cursor-pointer`} aria-label="Dismiss">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Input ────────────────────────────────────────────────────────────────────

export function Input({ label, hint, error, placeholder, type = "text", disabled = false }: {
  label?: string; hint?: string; error?: string; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-[600] text-[var(--color-ink)]">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm text-[var(--color-ink)] bg-white border rounded-sm placeholder:text-[var(--color-ink-disabled)] outline-none transition-all
          ${error ? "border-[var(--color-red)] focus:ring-2 focus:ring-[var(--color-red)]/20" : "border-[var(--color-border)] focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10"}
          ${disabled ? "bg-[var(--color-surface)] text-[var(--color-ink-disabled)] cursor-not-allowed" : ""}`}
      />
      {error && <p className="text-xs text-[var(--color-red)]">{error}</p>}
      {hint && !error && <p className="text-xs text-[var(--color-ink-muted)]">{hint}</p>}
    </div>
  );
}

// ── Search Input ─────────────────────────────────────────────────────────────

export function SearchInput({ placeholder = "Search...", value, onChange }: {
  placeholder?: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="6" cy="6" r="4.5" /><path d="M9.5 9.5l3 3" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[var(--color-border)] rounded-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10 transition-all"
      />
    </div>
  );
}

// ── Select ───────────────────────────────────────────────────────────────────

function Select({ label, options, value, onChange, error }: {
  label?: string; options: { value: string; label: string }[]; value: string;
  onChange: (v: string) => void; error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-[600] text-[var(--color-ink)]">{label}</label>}
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full appearance-none px-3 py-2 text-sm bg-white border rounded-sm text-[var(--color-ink)] outline-none pr-8 cursor-pointer focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10 transition-all ${error ? "border-[var(--color-red)]" : "border-[var(--color-border)]"}`}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 4l4 4 4-4" />
        </svg>
      </div>
      {error && <p className="text-xs text-[var(--color-red)]">{error}</p>}
    </div>
  );
}

// ── Checkbox ─────────────────────────────────────────────────────────────────

function Checkbox({ label, checked, onChange, disabled = false }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <label className={`flex items-center gap-2.5 cursor-pointer ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}>
      <span className={`w-4 h-4 shrink-0 rounded-sm border flex items-center justify-center transition-all ${checked ? "bg-[var(--color-navy)] border-[var(--color-navy)]" : "bg-white border-[var(--color-border-strong)]"}`}
        onClick={() => !disabled && onChange(!checked)}>
        {checked && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 5l2.5 2.5 4.5-4.5" /></svg>}
      </span>
      <span className="text-sm text-[var(--color-ink)]">{label}</span>
    </label>
  );
}

// ── Radio ────────────────────────────────────────────────────────────────────

function RadioGroup({ label, options, value, onChange }: {
  label: string; options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-[600] text-[var(--color-ink)] mb-2">{label}</p>
      <div className="space-y-2">
        {options.map(o => (
          <label key={o.value} className="flex items-center gap-2.5 cursor-pointer">
            <span className={`w-4 h-4 shrink-0 rounded-full border flex items-center justify-center transition-all ${value === o.value ? "border-[var(--color-navy)] bg-[var(--color-navy)]" : "border-[var(--color-border-strong)] bg-white"}`}
              onClick={() => onChange(o.value)}>
              {value === o.value && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
            </span>
            <span className="text-sm text-[var(--color-ink)]">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Switch ───────────────────────────────────────────────────────────────────

function Switch({ label, sublabel, checked, onChange, disabled = false }: {
  label: string; sublabel?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${disabled ? "opacity-40" : ""}`}>
      <div>
        <p className="text-sm text-[var(--color-ink)] font-[500]">{label}</p>
        {sublabel && <p className="text-xs text-[var(--color-ink-muted)]">{sublabel}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative w-10 h-6 rounded-full border transition-all cursor-pointer ${checked ? "bg-[var(--color-navy)] border-[var(--color-navy)]" : "bg-white border-[var(--color-border-strong)]"}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

// ── Breadcrumb ───────────────────────────────────────────────────────────────

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]"><path d="M3 2l4 3-4 3" /></svg>}
            {i === items.length - 1
              ? <span className="text-sm font-[500] text-[var(--color-ink)]">{item.label}</span>
              : <span className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer transition-colors">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="border-b border-[var(--color-border)]">
      <div className="flex gap-0 -mb-px">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`px-4 py-2.5 text-sm font-[500] border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              active === tab
                ? "border-[var(--color-navy)] text-[var(--color-navy)] font-[600]"
                : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-border)]"
            }`}>
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Pagination ───────────────────────────────────────────────────────────────

export function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  const pages = Array.from({ length: Math.min(total, 7) }, (_, i) => i + 1);
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(current - 1)} disabled={current === 1}
        className="w-8 h-8 flex items-center justify-center rounded-sm border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 2L4 6l4 4" /></svg>
      </button>
      {pages.map(p => (
        <button
          key={p} onClick={() => onChange(p)}
          className={`w-8 h-8 flex items-center justify-center rounded-sm border text-sm font-[var(--font-mono)] transition-all cursor-pointer ${p === current ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-white" : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"}`}>
          {p}
        </button>
      ))}
      {total > 7 && <span className="text-sm text-[var(--color-ink-muted)] px-1">…</span>}
      <button
        onClick={() => onChange(current + 1)} disabled={current === total}
        className="w-8 h-8 flex items-center justify-center rounded-sm border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 2l4 4-4 4" /></svg>
      </button>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-[var(--color-border)] rounded animate-pulse ${className}`} />;
}

function ProductCardSkeleton() {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
      <Skeleton className="aspect-square rounded-none" />
      <div className="p-3.5 space-y-2">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-full bg-[var(--color-surface)] flex items-center justify-center mb-4 text-[var(--color-ink-muted)]">{icon}</div>
      <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-2">{title}</p>
      <p className="text-sm text-[var(--color-ink-muted)] max-w-xs leading-relaxed mb-5">{description}</p>
      {action}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[var(--color-ink)]/50" onClick={onClose} />
      <div className="relative bg-white rounded-sm border border-[var(--color-border)] w-full max-w-md shadow-[0_16px_40px_rgba(28,27,24,0.20)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h3 className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)]">{title}</h3>
          <button onClick={onClose} className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l12 12M14 2L2 14" /></svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-[var(--color-border)] flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────────

function Toast({ type, message, visible }: { type: "success" | "error" | "info"; message: string; visible: boolean }) {
  const s = {
    success: { bg: "bg-[var(--color-green)]", icon: "✓" },
    error:   { bg: "bg-[var(--color-red)]", icon: "✕" },
    info:    { bg: "bg-[var(--color-navy)]", icon: "ℹ" },
  }[type];
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-sm shadow-[0_8px_24px_rgba(28,27,24,0.20)] text-white text-sm font-[500] transition-all duration-300 ${s.bg} ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
      <span className="font-[var(--font-mono)] text-xs">{s.icon}</span>
      {message}
    </div>
  );
}

// ── Data Table ───────────────────────────────────────────────────────────────

function DataTable() {
  const [sortCol, setSortCol] = useState<string>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const rows = [
    { id: "#ORD-0081", product: "Handmade Rug", customer: "Maria Santos", date: "Aug 14, 2026", amount: 4200, status: "processing" as StatusType },
    { id: "#ORD-0080", product: "USB-C Hub Pro", customer: "Jose Reyes", date: "Aug 13, 2026", amount: 1850, status: "shipped" as StatusType },
    { id: "#ORD-0079", product: "Ceramic Bowl Set", customer: "Ana Lim", date: "Aug 12, 2026", amount: 980, status: "delivered" as StatusType },
    { id: "#ORD-0078", product: "White Sneakers", customer: "Pedro Cruz", date: "Aug 11, 2026", amount: 3200, status: "cancelled" as StatusType },
    { id: "#ORD-0077", product: "Leather Handbag", customer: "Rosa Dela Cruz", date: "Aug 10, 2026", amount: 5600, status: "delivered" as StatusType },
  ];
  const cols = ["ID", "Product", "Customer", "Date", "Amount", "Status"];
  const toggle = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-[var(--color-border)]">
            {cols.map(col => (
              <th key={col} className="text-left py-2.5 px-3 first:pl-0" onClick={() => toggle(col.toLowerCase())}>
                <div className="flex items-center gap-1 cursor-pointer select-none font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase hover:text-[var(--color-ink)] transition-colors">
                  {col}
                  {sortCol === col.toLowerCase() && <span className="text-[var(--color-navy)]">{sortDir === "asc" ? "↑" : "↓"}</span>}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-ground)] transition-colors">
              <td className="py-2.5 px-3 pl-0 font-[var(--font-mono)] text-xs text-[var(--color-navy)]">{row.id}</td>
              <td className="py-2.5 px-3 text-[var(--color-ink)]">{row.product}</td>
              <td className="py-2.5 px-3 text-[var(--color-ink-muted)]">{row.customer}</td>
              <td className="py-2.5 px-3 font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)]">{row.date}</td>
              <td className="py-2.5 px-3 font-[600] text-[var(--color-ink)]">₱{row.amount.toLocaleString()}</td>
              <td className="py-2.5 px-3"><StatusBadge status={row.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ options, active, onChange }: {
  options: string[]; active: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    onChange(active.includes(opt) ? active.filter(a => a !== opt) : [...active, opt]);
  };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase">Filter:</span>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => toggle(opt)}
          className={`px-3 py-1 text-xs rounded-full border font-[var(--font-mono)] transition-all cursor-pointer ${
            active.includes(opt)
              ? "bg-[var(--color-navy)] border-[var(--color-navy)] text-white"
              : "bg-white border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"
          }`}>
          {opt}
        </button>
      ))}
      {active.length > 0 && (
        <button onClick={() => onChange([])} className="text-xs text-[var(--color-red)] hover:underline cursor-pointer">Clear</button>
      )}
    </div>
  );
}

// ── Color swatch ─────────────────────────────────────────────────────────────

function Swatch({ token, hex, text = "dark" }: { token: string; hex: string; text?: "dark" | "light" }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="h-10 rounded-sm border border-[var(--color-border)]" style={{ background: hex }} />
      <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{token}</p>
      <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink)]">{hex}</p>
    </div>
  );
}

// ── PART 03 MAIN ─────────────────────────────────────────────────────────────

export default function Part03() {
  const [activeSection, setActiveSection] = useState("tokens-color");

  // Interactive state
  const [qty, setQty] = useState(1);
  const [qty2, setQty2] = useState(2);
  const [cartItems, setCartItems] = useState([
    { id: 1, image: "https://images.unsplash.com/photo-1628911774602-74a0cfee9b0d", name: "Minimalist Chronograph Watch", seller: "Artisan Goods Co.", variant: "Silver / Leather strap", price: 4200, qty: 1 },
    { id: 2, image: "https://images.unsplash.com/photo-1616529484745-85f885b9889a", name: "Leather Tote Bag", seller: "StyleHouse PH", variant: "Burgundy Red", price: 2800, qty: 2 },
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [page, setPage] = useState(3);
  const [activeFilters, setActiveFilters] = useState<string[]>(["Processing"]);
  const [searchVal, setSearchVal] = useState("");
  const [selectVal, setSelectVal] = useState("ph");
  const [checks, setChecks] = useState({ inStock: true, discount: false, verified: true });
  const [radio, setRadio] = useState("standard");
  const [switches, setSwitches] = useState({ notifications: true, newsletter: false });

  const showToast = () => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(`p3-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex">
      <aside className="hidden lg:block w-56 xl:w-64 shrink-0 sticky top-[88px] h-[calc(100vh-88px)] overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] py-6">
        <div className="px-5 mb-4">
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase">Sections</p>
        </div>
        <nav>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => scrollTo(s.id)}
              className={`w-full text-left px-5 py-2 text-xs font-[var(--font-mono)] transition-colors ${activeSection === s.id ? "text-[var(--color-navy)] bg-white border-r-2 border-[var(--color-navy)] font-[500]" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-white/60"}`}>
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 px-6 md:px-10 xl:px-16 py-10 max-w-5xl">

        {/* Hero */}
        <div className="mb-14">
          <div className="mb-2"><Tag color="muted">DESIGN SYSTEM</Tag></div>
          <h1 className="font-[var(--font-display)] text-5xl md:text-6xl font-[300] text-[var(--color-ink)] leading-[1.05] mb-4">
            Component<br /><em className="font-[300] italic text-[var(--color-navy)]">Library</em>
          </h1>
          <p className="text-base text-[var(--color-ink-muted)] font-[300] max-w-xl leading-relaxed">
            Tokens, typography, spacing, and reusable components for the marketplace web platform. All components are interactive and reflect production-ready states.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Tag color="navy">62 Tokens</Tag>
            <Tag color="amber">30+ Components</Tag>
            <Tag color="violet">All States</Tag>
            <Tag color="green">WCAG AA</Tag>
          </div>
        </div>

        {/* ── 01 COLOR TOKENS ──────────────────────────────── */}
        <section id="p3-tokens-color" className="mb-14 scroll-mt-24">
          <SectionHeader num="01" title="Color Tokens" />

          <div className="space-y-6">
            <ShowCard label="Brand — Primary">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <Swatch token="--color-navy" hex="#1A3550" />
                <Swatch token="--color-navy-hover" hex="#243E5E" />
                <Swatch token="--color-navy-active" hex="#122840" />
                <Swatch token="--color-navy-surface" hex="#E0EAF4" text="dark" />
                <Swatch token="--color-navy-border" hex="#B8CEDF" />
                <Swatch token="--color-navy-light" hex="#2A527A" />
              </div>
            </ShowCard>

            <ShowCard label="Brand — Accent">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                <Swatch token="--color-amber" hex="#B8782A" />
                <Swatch token="--color-amber-hover" hex="#A06825" />
                <Swatch token="--color-amber-active" hex="#8A581E" />
                <Swatch token="--color-amber-light" hex="#F5E8D0" text="dark" />
                <Swatch token="--color-amber-border" hex="#D9BC8A" />
              </div>
            </ShowCard>

            <ShowCard label="Surface">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                <Swatch token="--color-ground" hex="#F8F7F3" />
                <Swatch token="--color-surface" hex="#EFEDE7" />
                <Swatch token="surface-elevated" hex="#FFFFFF" />
                <Swatch token="--color-border" hex="#DDD9CE" />
                <Swatch token="--color-border-strong" hex="#B8B4A8" />
              </div>
            </ShowCard>

            <ShowCard label="Text">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                <Swatch token="--color-ink" hex="#1C1B18" />
                <Swatch token="--color-ink-secondary" hex="#3D3C38" />
                <Swatch token="--color-ink-muted" hex="#6B6860" />
                <Swatch token="--color-ink-disabled" hex="#A8A69E" />
                <Swatch token="text-inverse" hex="#FFFFFF" />
              </div>
            </ShowCard>

            <ShowCard label="Status">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] tracking-widest">SUCCESS</p>
                  <Swatch token="--color-green" hex="#2D6A4F" />
                  <Swatch token="--color-green-light" hex="#D8EDD6" text="dark" />
                </div>
                <div className="space-y-2">
                  <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] tracking-widest">WARNING</p>
                  <Swatch token="--color-warning" hex="#9A6018" />
                  <Swatch token="--color-warning-light" hex="#FEF3C7" text="dark" />
                </div>
                <div className="space-y-2">
                  <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] tracking-widest">ERROR</p>
                  <Swatch token="--color-red" hex="#8B2C2C" />
                  <Swatch token="--color-red-light" hex="#F5DADA" text="dark" />
                </div>
                <div className="space-y-2">
                  <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] tracking-widest">INFO</p>
                  <Swatch token="--color-navy" hex="#1A3550" />
                  <Swatch token="--color-navy-surface" hex="#E0EAF4" text="dark" />
                </div>
              </div>
            </ShowCard>
          </div>
        </section>

        {/* ── 02 TYPOGRAPHY ────────────────────────────────── */}
        <section id="p3-tokens-type" className="mb-14 scroll-mt-24">
          <SectionHeader num="02" title="Typography" />
          <ShowCard>
            <div className="space-y-6">
              {[
                { role: "Display", sample: "Commerce, refined.", style: "font-[var(--font-display)] text-[52px] font-[300] leading-[1.05]", spec: "Fraunces · 52px · 300 · 1.05" },
                { role: "H1", sample: "Marketplace headline", style: "font-[var(--font-display)] text-4xl font-[400] leading-[1.1]", spec: "Fraunces · 36px · 400 · 1.1" },
                { role: "H2", sample: "Section heading", style: "font-[var(--font-display)] text-2xl font-[400] leading-[1.2]", spec: "Fraunces · 24px · 400 · 1.2" },
                { role: "H3", sample: "Subsection heading", style: "font-[var(--font-body)] text-xl font-[600] leading-[1.3]", spec: "Outfit · 20px · 600 · 1.3" },
                { role: "H4", sample: "Component heading", style: "font-[var(--font-body)] text-base font-[600] leading-[1.4]", spec: "Outfit · 16px · 600 · 1.4" },
                { role: "Body", sample: "Product descriptions, help text, and general content. Comfortable for extended reading at all sizes.", style: "font-[var(--font-body)] text-sm font-[400] leading-[1.6] text-[var(--color-ink-secondary)]", spec: "Outfit · 14px · 400 · 1.6" },
                { role: "Small", sample: "Supporting text, secondary information, metadata.", style: "font-[var(--font-body)] text-xs font-[400] leading-[1.5] text-[var(--color-ink-muted)]", spec: "Outfit · 12px · 400 · 1.5" },
                { role: "Label", sample: "ORDER STATUS · FILTER · CATEGORY", style: "font-[var(--font-mono)] text-[10px] font-[500] tracking-widest text-[var(--color-ink-muted)]", spec: "JetBrains Mono · 10px · 500 · widest" },
                { role: "Button", sample: "Add to Cart  •  Proceed to Checkout", style: "font-[var(--font-body)] text-sm font-[500] leading-none", spec: "Outfit · 14px · 500 · none" },
                { role: "Code / Mono", sample: "#ORD-2024-0081  /products/:slug", style: "font-[var(--font-mono)] text-xs text-[var(--color-navy)]", spec: "JetBrains Mono · 12px · 400" },
              ].map(({ role, sample, style, spec }) => (
                <div key={role} className="flex gap-5 items-baseline border-b border-[var(--color-border)] pb-5 last:border-0 last:pb-0 flex-wrap">
                  <div className="w-16 shrink-0">
                    <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest">{role}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={style}>{sample}</p>
                  </div>
                  <div className="shrink-0">
                    <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] whitespace-nowrap">{spec}</span>
                  </div>
                </div>
              ))}
            </div>
          </ShowCard>
        </section>

        {/* ── 03 SPACING ───────────────────────────────────── */}
        <section id="p3-tokens-space" className="mb-14 scroll-mt-24">
          <SectionHeader num="03" title="Spacing Scale" />
          <p className="text-sm text-[var(--color-ink-muted)] mb-4 leading-relaxed">Base unit: 4px. All spacing uses multiples of this unit. Components use consistent spacing from this scale.</p>
          <ShowCard>
            <div className="space-y-3">
              {[
                { token: "1", px: "4px", tw: "p-1" },
                { token: "2", px: "8px", tw: "p-2" },
                { token: "3", px: "12px", tw: "p-3" },
                { token: "4", px: "16px", tw: "p-4" },
                { token: "5", px: "20px", tw: "p-5" },
                { token: "6", px: "24px", tw: "p-6" },
                { token: "8", px: "32px", tw: "p-8" },
                { token: "10", px: "40px", tw: "p-10" },
                { token: "12", px: "48px", tw: "p-12" },
                { token: "16", px: "64px", tw: "p-16" },
                { token: "20", px: "80px", tw: "p-20" },
              ].map(({ token, px, tw }) => (
                <div key={token} className="flex items-center gap-4">
                  <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] w-8">{token}</span>
                  <div className="h-5 bg-[var(--color-amber-light)] border-r-2 border-[var(--color-amber)] rounded-l-sm" style={{ width: px }} />
                  <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">{px}</span>
                  <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">{tw}</span>
                </div>
              ))}
            </div>
          </ShowCard>
        </section>

        {/* ── 04 BUTTONS ───────────────────────────────────── */}
        <section id="p3-comp-buttons" className="mb-14 scroll-mt-24">
          <SectionHeader num="04" title="Buttons" />
          <div className="space-y-4">
            <ShowCard label="Variants">
              <div className="flex flex-wrap gap-3 items-center">
                <BtnPrimary>Primary</BtnPrimary>
                <BtnSecondary>Secondary</BtnSecondary>
                <BtnOutline>Outline</BtnOutline>
                <BtnGhost>Ghost</BtnGhost>
                <BtnDestructive>Destructive</BtnDestructive>
                <BtnPrimary loading>Loading</BtnPrimary>
                <BtnPrimary disabled>Disabled</BtnPrimary>
              </div>
            </ShowCard>
            <ShowCard label="Sizes">
              <div className="flex flex-wrap gap-3 items-center">
                <BtnPrimary size="sm">Small</BtnPrimary>
                <BtnPrimary size="md">Medium</BtnPrimary>
                <BtnPrimary size="lg">Large</BtnPrimary>
              </div>
            </ShowCard>
            <ShowCard label="With icons">
              <div className="flex flex-wrap gap-3 items-center">
                <BtnPrimary>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="5.5" cy="5.5" r="4" /><path d="M8 8l4 4" /></svg>
                  Search
                </BtnPrimary>
                <BtnSecondary>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 1v6l3 3M7 13a6 6 0 100-12" /></svg>
                  Export
                </BtnSecondary>
                <BtnOutline>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 1v10M2 8l5 5 5-5" /></svg>
                  Download
                </BtnOutline>
                <BtnDestructive>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 3.5h12M4.5 3.5V2h5v1.5M5.5 6v5M8.5 6v5M2.5 3.5l.7 8h7.6l.7-8" /></svg>
                  Delete
                </BtnDestructive>
              </div>
            </ShowCard>

            {/* Status badges */}
            <ShowCard label="Status badges">
              <div className="flex flex-wrap gap-2">
                {(["pending","processing","shipped","delivered","cancelled","refunded","approved","rejected","active","inactive","draft","review"] as StatusType[]).map(s => (
                  <StatusBadge key={s} status={s} />
                ))}
              </div>
            </ShowCard>
          </div>
        </section>

        {/* ── 05 FORMS ─────────────────────────────────────── */}
        <section id="p3-comp-forms" className="mb-14 scroll-mt-24">
          <SectionHeader num="05" title="Form Elements" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ShowCard label="Text input — states">
              <div className="space-y-4">
                <Input label="Default" placeholder="Enter your email address" hint="We'll never share your email." />
                <Input label="With error" placeholder="username" error="This username is already taken." />
                <Input label="Disabled" placeholder="Not editable" disabled />
              </div>
            </ShowCard>
            <ShowCard label="Search & Select">
              <div className="space-y-4">
                <div>
                  <Label>Search input</Label>
                  <SearchInput placeholder="Search products…" value={searchVal} onChange={setSearchVal} />
                </div>
                <Select
                  label="Country"
                  value={selectVal}
                  onChange={setSelectVal}
                  options={[
                    { value: "ph", label: "Philippines" },
                    { value: "sg", label: "Singapore" },
                    { value: "my", label: "Malaysia" },
                    { value: "id", label: "Indonesia" },
                  ]}
                />
              </div>
            </ShowCard>
            <ShowCard label="Checkboxes">
              <div className="space-y-3">
                <Checkbox label="In stock only" checked={checks.inStock} onChange={v => setChecks(c => ({ ...c, inStock: v }))} />
                <Checkbox label="On sale / discounted" checked={checks.discount} onChange={v => setChecks(c => ({ ...c, discount: v }))} />
                <Checkbox label="Verified sellers only" checked={checks.verified} onChange={v => setChecks(c => ({ ...c, verified: v }))} />
                <Checkbox label="This option is disabled" checked={false} onChange={() => {}} disabled />
              </div>
            </ShowCard>
            <ShowCard label="Radio & Switch">
              <div className="space-y-5">
                <RadioGroup
                  label="Delivery option"
                  value={radio}
                  onChange={setRadio}
                  options={[
                    { value: "standard", label: "Standard (3-5 days) — Free" },
                    { value: "express", label: "Express (1-2 days) — ₱150" },
                    { value: "sameday", label: "Same day — ₱250" },
                  ]}
                />
                <div className="border-t border-[var(--color-border)] pt-4 space-y-3">
                  <Switch label="Order notifications" sublabel="Get updates for your orders" checked={switches.notifications} onChange={v => setSwitches(s => ({ ...s, notifications: v }))} />
                  <Switch label="Newsletter" sublabel="Weekly deals and recommendations" checked={switches.newsletter} onChange={v => setSwitches(s => ({ ...s, newsletter: v }))} />
                </div>
              </div>
            </ShowCard>
            <ShowCard label="File upload" className="md:col-span-2">
              <div className="border-2 border-dashed border-[var(--color-border)] rounded-sm p-8 flex flex-col items-center justify-center text-center hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)]/30 transition-all cursor-pointer">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-[var(--color-ink-muted)] mb-3">
                  <path d="M16 4v16M8 12l8-8 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 24v2a2 2 0 002 2h20a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="text-sm font-[500] text-[var(--color-ink)] mb-1">Drop files here or click to upload</p>
                <p className="text-xs text-[var(--color-ink-muted)]">PNG, JPG, WEBP up to 10 MB · Max 8 product images</p>
              </div>
            </ShowCard>
          </div>
        </section>

        {/* ── 06 NAVIGATION ────────────────────────────────── */}
        <section id="p3-comp-nav" className="mb-14 scroll-mt-24">
          <SectionHeader num="06" title="Navigation" />
          <div className="space-y-4">

            {/* Marketplace header */}
            <ShowCard label="Marketplace header (public)">
              <div className="border border-[var(--color-border)] rounded-sm overflow-hidden">
                <div className="flex items-center gap-4 px-4 py-3 bg-white">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-[var(--color-navy)] rounded-sm" />
                    <span className="font-[var(--font-display)] text-base font-[400] text-[var(--color-ink)]">Marketo</span>
                  </div>
                  <div className="flex gap-4 text-sm text-[var(--color-ink-muted)] hidden sm:flex">
                    <span className="hover:text-[var(--color-navy)] cursor-pointer">Electronics</span>
                    <span className="hover:text-[var(--color-navy)] cursor-pointer">Fashion</span>
                    <span className="hover:text-[var(--color-navy)] cursor-pointer">Home</span>
                    <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] self-center">+ categories</span>
                  </div>
                  <div className="flex-1 max-w-xs hidden md:block">
                    <SearchInput placeholder="Search products…" value="" onChange={() => {}} />
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <button className="relative text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 2h2l2.5 9.5h8L17 6H5" /><circle cx="8" cy="15.5" r="1.5" fill="currentColor" stroke="none" /><circle cx="14.5" cy="15.5" r="1.5" fill="currentColor" stroke="none" /></svg>
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--color-amber)] text-white text-[9px] font-[var(--font-mono)] rounded-full flex items-center justify-center">3</span>
                    </button>
                    <BtnPrimary size="sm">Log In</BtnPrimary>
                  </div>
                </div>
              </div>
            </ShowCard>

            {/* Breadcrumb */}
            <ShowCard label="Breadcrumb">
              <div className="space-y-3">
                <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Electronics", href: "/categories/electronics" }, { label: "Cameras & Photography" }]} />
                <Breadcrumb items={[{ label: "Home" }, { label: "My Account" }, { label: "Orders" }, { label: "#ORD-2024-0081" }]} />
              </div>
            </ShowCard>

            {/* Tabs */}
            <ShowCard label="Tabs">
              <Tabs tabs={["Overview", "Products", "Orders", "Analytics", "Reviews"]} active={activeTab} onChange={setActiveTab} />
              <div className="pt-4">
                <p className="text-sm text-[var(--color-ink-muted)]">Active tab: <span className="font-[500] text-[var(--color-navy)]">{activeTab}</span></p>
              </div>
            </ShowCard>

            {/* Pagination */}
            <ShowCard label="Pagination">
              <Pagination current={page} total={12} onChange={setPage} />
            </ShowCard>
          </div>
        </section>

        {/* ── 07 COMMERCE ──────────────────────────────────── */}
        <section id="p3-comp-commerce" className="mb-14 scroll-mt-24">
          <SectionHeader num="07" title="Commerce Components" />
          <div className="space-y-4">

            {/* Product grid */}
            <ShowCard label="Product cards">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ProductCard
                  image="https://images.unsplash.com/photo-1628911774602-74a0cfee9b0d"
                  name="Minimalist Chronograph Watch"
                  seller="Artisan Goods Co."
                  price={4200}
                  originalPrice={5800}
                  rating={4.7}
                  ratingCount={218}
                  badge="SALE"
                />
                <ProductCard
                  image="https://images.unsplash.com/photo-1544441893-675973e31985"
                  name="Low-Top Canvas Sneakers"
                  seller="SoleSource PH"
                  price={2350}
                  rating={4.4}
                  ratingCount={89}
                />
                <ProductCard
                  image="https://images.unsplash.com/photo-1616529484745-85f885b9889a"
                  name="Genuine Leather Tote Bag"
                  seller="StyleHouse PH"
                  price={2800}
                  originalPrice={3400}
                  rating={4.9}
                  ratingCount={341}
                  badge="NEW"
                />
              </div>
            </ShowCard>

            {/* Seller cards */}
            <ShowCard label="Seller cards">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SellerCard name="Artisan Goods Co." category="Home & Lifestyle" rating={4.8} productCount={142} initials="AG" />
                <SellerCard name="TechSource PH" category="Electronics & Gadgets" rating={4.6} productCount={87} initials="TS" />
              </div>
            </ShowCard>

            {/* Rating & Price */}
            <ShowCard label="Rating · Price · Quantity">
              <div className="space-y-5">
                <div>
                  <Label>Rating</Label>
                  <div className="space-y-2">
                    <Rating value={4.7} count={218} size="md" />
                    <Rating value={3.5} count={42} />
                    <Rating value={5.0} count={7} size="sm" />
                  </div>
                </div>
                <div>
                  <Label>Price display</Label>
                  <div className="space-y-2">
                    <Price amount={4200} original={5800} size="lg" />
                    <Price amount={2350} size="md" />
                    <Price amount={980} original={1200} size="sm" />
                  </div>
                </div>
                <div>
                  <Label>Quantity selector</Label>
                  <div className="space-y-2">
                    <QuantitySelector value={qty} onChange={setQty} />
                    <QuantitySelector value={qty2} min={1} max={5} onChange={setQty2} />
                  </div>
                </div>
              </div>
            </ShowCard>

            {/* Cart items */}
            <ShowCard label="Cart items">
              <div>
                {cartItems.map(item => (
                  <CartItem
                    key={item.id}
                    {...item}
                    onQtyChange={qty => setCartItems(c => c.map(ci => ci.id === item.id ? { ...ci, qty } : ci))}
                    onRemove={() => setCartItems(c => c.filter(ci => ci.id !== item.id))}
                  />
                ))}
                <div className="pt-3 flex items-center justify-between">
                  <span className="text-sm text-[var(--color-ink-muted)]">Total ({cartItems.reduce((s, i) => s + i.qty, 0)} items)</span>
                  <Price amount={cartItems.reduce((s, i) => s + i.price * i.qty, 0)} size="md" />
                </div>
              </div>
            </ShowCard>

            {/* Order cards */}
            <ShowCard label="Order cards">
              <div className="space-y-3">
                <OrderCard orderId="#ORD-2026-0081" date="Aug 14, 2026" seller="Artisan Goods Co." itemCount={3} total={7980} status="processing" />
                <OrderCard orderId="#ORD-2026-0080" date="Aug 13, 2026" seller="TechSource PH" itemCount={1} total={1850} status="shipped" />
                <OrderCard orderId="#ORD-2026-0079" date="Aug 10, 2026" seller="StyleHouse PH" itemCount={2} total={5600} status="delivered" />
              </div>
            </ShowCard>
          </div>
        </section>

        {/* ── 08 DATA DISPLAY ──────────────────────────────── */}
        <section id="p3-comp-data" className="mb-14 scroll-mt-24">
          <SectionHeader num="08" title="Data Display" />
          <div className="space-y-4">

            {/* Stats */}
            <ShowCard label="Statistics cards">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatsCard label="Total Revenue" value="₱284,200" delta={12.4} deltaLabel="vs last month" accent />
                <StatsCard label="Total Orders" value="1,842" delta={8.1} deltaLabel="vs last month" />
                <StatsCard label="Active Sellers" value="342" delta={-2.3} deltaLabel="vs last month" />
                <StatsCard label="Avg Order Value" value="₱1,542" delta={5.7} deltaLabel="vs last month" />
              </div>
            </ShowCard>

            {/* Filter bar */}
            <ShowCard label="Filter bar">
              <FilterBar
                options={["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"]}
                active={activeFilters}
                onChange={setActiveFilters}
              />
            </ShowCard>

            {/* Table */}
            <ShowCard label="Data table (sortable)">
              <DataTable />
              <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                <p className="text-xs text-[var(--color-ink-muted)] font-[var(--font-mono)]">Showing 1–5 of 842 orders</p>
                <Pagination current={1} total={9} onChange={() => {}} />
              </div>
            </ShowCard>
          </div>
        </section>

        {/* ── 09 FEEDBACK ──────────────────────────────────── */}
        <section id="p3-comp-feedback" className="mb-14 scroll-mt-24">
          <SectionHeader num="09" title="Feedback Components" />
          <div className="space-y-4">

            {/* Alerts */}
            <ShowCard label="Alerts">
              <div className="space-y-3">
                <Alert type="info" title="Verification required">Your seller account is under review. This typically takes 1–2 business days.</Alert>
                <Alert type="success" title="Order placed successfully" dismissible>Your order #ORD-2026-0082 has been placed. Track it in My Orders.</Alert>
                <Alert type="warning" title="Low inventory" dismissible>3 products have fewer than 5 units remaining. Update your inventory.</Alert>
                <Alert type="error" title="Payment failed">Your card was declined. Please check your details or use a different card.</Alert>
              </div>
            </ShowCard>

            {/* Toast */}
            <ShowCard label="Toast notification">
              <div className="flex gap-3 flex-wrap">
                <BtnPrimary size="sm" onClick={showToast}>Show success toast</BtnPrimary>
                <BtnSecondary size="sm" onClick={() => setModalOpen(true)}>Open modal</BtnSecondary>
              </div>
            </ShowCard>

            {/* Skeleton */}
            <ShowCard label="Skeleton loaders">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ProductCardSkeleton />
                <ProductCardSkeleton />
                <ProductCardSkeleton />
              </div>
            </ShowCard>

            {/* Empty state */}
            <ShowCard label="Empty state">
              <EmptyState
                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="16" rx="2" /><path d="M8 21h8M12 17v4" /></svg>}
                title="No orders yet"
                description="When you place your first order, it will appear here. Start browsing our marketplace."
                action={<BtnPrimary>Browse Products</BtnPrimary>}
              />
            </ShowCard>

            {/* Error state */}
            <ShowCard label="Error state">
              <div className="flex flex-col items-center justify-center text-center py-10 px-6">
                <div className="w-14 h-14 rounded-full bg-[var(--color-red-light)] flex items-center justify-center mb-4">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="var(--color-red)" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="9" /><path d="M11 7v5M11 15h.01" />
                  </svg>
                </div>
                <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] mb-2">Something went wrong</p>
                <p className="text-sm text-[var(--color-ink-muted)] max-w-xs mb-5">We couldn't load this page. This might be a temporary issue.</p>
                <div className="flex gap-2">
                  <BtnPrimary size="sm">Try Again</BtnPrimary>
                  <BtnGhost size="sm">Go Home</BtnGhost>
                </div>
              </div>
            </ShowCard>
          </div>
        </section>

        {/* ── 10 RESPONSIVE RULES ──────────────────────────── */}
        <section id="p3-comp-responsive" className="mb-14 scroll-mt-24">
          <SectionHeader num="10" title="Responsive Rules" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
              <thead>
                <tr className="bg-[var(--color-surface)] border-b-2 border-[var(--color-border)]">
                  <th className="text-left font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase py-3 px-4">Breakpoint</th>
                  <th className="text-left font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase py-3 px-4">Width</th>
                  <th className="text-left font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase py-3 px-4">Layout</th>
                  <th className="text-left font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase py-3 px-4">Navigation</th>
                  <th className="text-left font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase py-3 px-4">Product Grid</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { bp: "Mobile", tw: "default", w: "< 640px", layout: "Single column, full-width", nav: "Bottom tab bar + hamburger", grid: "2 columns" },
                  { bp: "Tablet sm:", tw: "sm:", w: "640px+", layout: "2-column with stacking", nav: "Header + category mega menu", grid: "2–3 columns" },
                  { bp: "Tablet md:", tw: "md:", w: "768px+", layout: "2-column with sidebar", nav: "Full header", grid: "3 columns" },
                  { bp: "Desktop lg:", tw: "lg:", w: "1024px+", layout: "Fixed sidebar + content area", nav: "Full header + hover dropdowns", grid: "4 columns" },
                  { bp: "Wide xl:", tw: "xl:", w: "1280px+", layout: "Wide content, max-width containers", nav: "Full header + expanded mega menu", grid: "5 columns" },
                ].map(row => (
                  <tr key={row.bp} className="border-b border-[var(--color-border)] hover:bg-[var(--color-ground)] transition-colors">
                    <td className="py-2.5 px-4 font-[600] text-[var(--color-ink)]">{row.bp}</td>
                    <td className="py-2.5 px-4 font-[var(--font-mono)] text-[11px] text-[var(--color-navy)]">{row.tw} <span className="text-[var(--color-ink-muted)] ml-1">{row.w}</span></td>
                    <td className="py-2.5 px-4 text-sm text-[var(--color-ink-muted)]">{row.layout}</td>
                    <td className="py-2.5 px-4 text-sm text-[var(--color-ink-muted)]">{row.nav}</td>
                    <td className="py-2.5 px-4 text-sm text-[var(--color-ink-muted)]">{row.grid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 11 ACCESSIBILITY ─────────────────────────────── */}
        <section id="p3-comp-a11y" className="mb-14 scroll-mt-24">
          <SectionHeader num="11" title="Accessibility" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { check: "Color contrast", detail: "Body text (#1C1B18 on #F8F7F3): 16.1:1 — AAA. Muted text (#6B6860): 4.8:1 — AA. Primary button (white on #1A3550): 9.1:1 — AAA.", pass: true },
              { check: "Focus indicators", detail: "All interactive elements have a 2px navy outline on :focus-visible. Focus rings offset by 2px from the element boundary.", pass: true },
              { check: "Touch targets", detail: "Minimum 44×44px touch target for all interactive elements on mobile. Quantity selectors and icon buttons meet this requirement.", pass: true },
              { check: "Semantic HTML", detail: "Buttons use <button>, forms use <label> associations, navigation uses <nav>, dialogs use role='dialog' with aria-modal.", pass: true },
              { check: "Keyboard navigation", detail: "All modals trap focus using FocusTrap. Tabs, pagination, and dropdowns navigate with Arrow keys. Escape closes all dismissible elements.", pass: true },
              { check: "Form labels", detail: "All inputs have explicit <label> elements or aria-label. Error messages are associated via aria-describedby. Required fields indicate required state.", pass: true },
              { check: "State without color alone", detail: "Status badges use both color and a text label. Errors show icons + text. Focus rings use outline, not just color change.", pass: true },
              { check: "Reduced motion", detail: "Respect prefers-reduced-motion for transitions, skeletons, and animations. All functional behavior preserved without motion.", pass: true },
            ].map(({ check, detail, pass }) => (
              <div key={check} className="bg-white border border-[var(--color-border)] rounded-sm p-4 flex gap-3">
                <span className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-[var(--font-mono)] ${pass ? "bg-[var(--color-green-light)] text-[var(--color-green)]" : "bg-[var(--color-red-light)] text-[var(--color-red)]"}`}>
                  {pass ? "✓" : "✕"}
                </span>
                <div>
                  <p className="text-sm font-[600] text-[var(--color-ink)] mb-0.5">{check}</p>
                  <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-[var(--color-border)] pt-8 pb-4">
          <p className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] tracking-wide">MARKETPLACE·OS — PART 03 of N — DESIGN SYSTEM — 2026-08-15</p>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">Component library and design token foundation for all application screens. Part 04 will begin building public marketplace screens.</p>
        </div>
      </main>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm action"
        footer={<>
          <BtnGhost size="sm" onClick={() => setModalOpen(false)}>Cancel</BtnGhost>
          <BtnDestructive size="sm" onClick={() => { setModalOpen(false); showToast(); }}>Confirm</BtnDestructive>
        </>}
      >
        <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
          This action cannot be undone. The selected items will be permanently removed from your account.
        </p>
      </Modal>

      {/* Toast */}
      <Toast type="success" message="Action completed successfully" visible={toastVisible} />
    </div>
  );
}
