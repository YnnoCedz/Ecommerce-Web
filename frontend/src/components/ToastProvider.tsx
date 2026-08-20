import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, CircleAlert, Heart, ShoppingCart, X } from "lucide-react";

export type ToastKind = "success" | "error" | "cart" | "wishlist";

export type ToastInput = {
  kind?: ToastKind;
  title: string;
  message?: string;
  duration?: number;
};

type ToastRecord = ToastInput & { id: number; exiting?: boolean };
type ToastContextValue = { showToast: (toast: ToastInput) => number; dismissToast: (id: number) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

const KIND_STYLES: Record<ToastKind, { accent: string; icon: string }> = {
  success: { accent: "border-l-[var(--color-green)]", icon: "text-[var(--color-green)]" },
  error: { accent: "border-l-[var(--color-red)]", icon: "text-[var(--color-red)]" },
  cart: { accent: "border-l-[var(--color-navy)]", icon: "text-[var(--color-navy)]" },
  wishlist: { accent: "border-l-[var(--color-red)]", icon: "text-[var(--color-red)]" },
};

function ToastIcon({ kind }: { kind: ToastKind }) {
  const className = KIND_STYLES[kind].icon;
  if (kind === "cart") return <ShoppingCart size={18} className={className} aria-hidden="true" />;
  if (kind === "wishlist") return <Heart size={18} className={className} aria-hidden="true" />;
  if (kind === "error") return <CircleAlert size={18} className={className} aria-hidden="true" />;
  return <CheckCircle2 size={18} className={className} aria-hidden="true" />;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const exitTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const exitingIds = useRef(new Set<number>());

  const dismissToast = useCallback((id: number) => {
    if (exitingIds.current.has(id)) return;

    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);

    exitingIds.current.add(id);
    setToasts((current) => current.map((toast) => toast.id === id ? { ...toast, exiting: true } : toast));
    exitTimers.current.set(id, setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      exitingIds.current.delete(id);
      exitTimers.current.delete(id);
    }, 180));
  }, []);

  const showToast = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    const duration = input.duration ?? (input.kind === "error" ? 5000 : 3500);
    setToasts((current) => [...current.slice(-3), { ...input, id }]);
    timers.current.set(id, setTimeout(() => dismissToast(id), duration));
    return id;
  }, [dismissToast]);

  useEffect(() => () => {
    timers.current.forEach((timer) => clearTimeout(timer));
    exitTimers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    exitTimers.current.clear();
    exitingIds.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div
        className="pointer-events-none fixed top-[4.75rem] lg:top-[7rem] right-3 sm:right-5 lg:right-8 z-[60] flex w-[calc(100vw-1.5rem)] sm:w-[360px] flex-col gap-2"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const kind = toast.kind ?? "success";
          return (
            <div
              key={toast.id}
              role={kind === "error" ? "alert" : "status"}
              className={`pointer-events-auto ${toast.exiting ? "toast-exit" : "toast-enter"} flex items-start gap-3 border border-[var(--color-border)] border-l-4 ${KIND_STYLES[kind].accent} bg-white px-4 py-3 shadow-[0_10px_30px_rgba(28,27,24,0.16)] rounded-sm`}
            >
              <div className="mt-0.5 shrink-0"><ToastIcon kind={kind} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-[600] text-[var(--color-ink)]">{toast.title}</p>
                {toast.message && <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-ink-muted)]">{toast.message}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
