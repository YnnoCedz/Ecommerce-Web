import AuthLayout from "./AuthLayout";

type NavFn = (page: string, params?: Record<string, string>) => void;

export default function SessionExpiredPage({ onNavigate }: { onNavigate: NavFn }) {
  return (
    <AuthLayout
      title="Session expired"
      subtitle="For your security, you were signed out after a period of inactivity.">
      <div className="text-center py-2">
        <div className="w-16 h-16 bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] rounded-full flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <div className="bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] rounded-sm px-4 py-3 mb-6 text-left">
          <p className="text-xs font-[600] text-[var(--color-warning)] mb-1">Why was I signed out?</p>
          <p className="text-xs text-[var(--color-warning)]/80 leading-relaxed">
            Marketo automatically signs you out after 2 hours of inactivity to protect your account and personal data.
          </p>
        </div>

        <button onClick={() => onNavigate("login")}
          className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer mb-3">
          Sign in again
        </button>

        <button onClick={() => onNavigate("home")}
          className="w-full py-3 border border-[var(--color-border)] text-sm font-[500] text-[var(--color-ink-muted)] rounded-sm hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)] transition-colors cursor-pointer">
          Continue as guest
        </button>

        <p className="text-xs text-[var(--color-ink-disabled)] mt-5">
          Your cart and saved items are still here — they won't be lost.
        </p>
      </div>
    </AuthLayout>
  );
}
