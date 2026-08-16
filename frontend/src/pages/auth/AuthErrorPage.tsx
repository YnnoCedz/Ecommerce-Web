import { useState } from "react";
import { AuthAlert } from "./AuthLayout";

// Standalone demo showing all auth error states

const ERROR_STATES = [
  {
    id: "wrong-credentials",
    label: "Wrong credentials",
    title: "Sign in",
    alertType: "error" as const,
    alert: "Incorrect email or password. Please check your credentials and try again.",
    fieldErrors: { email: "", password: "Password doesn't match this account" },
    hint: null,
  },
  {
    id: "account-locked",
    label: "Account locked",
    title: "Account locked",
    alertType: "error" as const,
    alert: "Your account has been temporarily locked after 5 failed attempts. Try again in 15 minutes or reset your password.",
    fieldErrors: {},
    hint: "Too many failed sign-in attempts",
  },
  {
    id: "email-not-found",
    label: "Email not found",
    title: "Sign in",
    alertType: "warning" as const,
    alert: "No account found with this email address. Did you use a different email?",
    fieldErrors: { email: "We don't recognize this email" },
    hint: null,
  },
  {
    id: "account-suspended",
    label: "Account suspended",
    title: "Account suspended",
    alertType: "error" as const,
    alert: "Your account has been suspended due to a violation of our Terms of Service. Contact support if you believe this is an error.",
    fieldErrors: {},
    hint: null,
  },
  {
    id: "unverified-email",
    label: "Unverified email",
    title: "Verify your email",
    alertType: "warning" as const,
    alert: "Your email address hasn't been verified. Check your inbox for the verification link, or request a new one below.",
    fieldErrors: {},
    hint: null,
  },
  {
    id: "server-error",
    label: "Server error",
    title: "Sign in",
    alertType: "error" as const,
    alert: "Something went wrong on our end. Please try again in a moment. If the problem persists, contact support.",
    fieldErrors: {},
    hint: "Error code: 500 — Internal server error",
  },
];

function MockField({ label, error, placeholder, isLocked }: { label: string; error?: string; placeholder?: string; isLocked?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-[600] text-[var(--color-ink)] mb-1.5">{label}</label>
      <div className={`w-full px-3.5 py-2.5 text-sm rounded-sm border flex items-center gap-2 ${error ? "border-[var(--color-red)] bg-[var(--color-red-light)]/30" : "border-[var(--color-border)] bg-white"} ${isLocked ? "opacity-50" : ""}`}>
        <span className="text-[var(--color-ink-disabled)] flex-1">{placeholder}</span>
        {error && <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="var(--color-red)" strokeWidth="1.4"><circle cx="6" cy="6" r="5" /><path d="M6 4v2M6 8.5v.5" strokeLinecap="round" /></svg>}
      </div>
      {error && <p className="text-xs text-[var(--color-red)] mt-1.5 flex items-center gap-1">{error}</p>}
    </div>
  );
}

export default function AuthErrorPage() {
  const [active, setActive] = useState(ERROR_STATES[0].id);
  const state = ERROR_STATES.find(s => s.id === active) ?? ERROR_STATES[0];

  return (
    <div className="min-h-screen bg-[var(--color-ground)] py-10 px-4">
      <div className="max-w-screen-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-widest uppercase mb-2">Auth Error States</p>
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Authentication Errors</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">All possible error states in the auth flow</p>
        </div>

        {/* Error type selector */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {ERROR_STATES.map(s => (
            <button key={s.id} onClick={() => setActive(s.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-[500] border transition-all cursor-pointer ${active === s.id ? "bg-[var(--color-navy)] text-white border-transparent" : "border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-navy)]"}`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Mock auth card */}
        <div className="max-w-md mx-auto">
          <div className="flex flex-col items-center mb-6">
            <div className="w-10 h-10 bg-[var(--color-navy)] rounded-sm flex items-center justify-center mb-2">
              <span className="font-[var(--font-display)] text-xl text-white font-[400]">M</span>
            </div>
            <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] tracking-[0.22em]">MARKETO</span>
          </div>

          <div className="bg-white border border-[var(--color-border)] rounded-sm shadow-[0_4px_32px_rgba(28,27,24,0.08)]">
            <div className="px-8 pt-7 pb-6 border-b border-[var(--color-border)]">
              <h2 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">{state.title}</h2>
              {state.hint && <p className="text-sm text-[var(--color-ink-muted)] mt-1">{state.hint}</p>}
            </div>
            <div className="px-8 py-7 space-y-4">
              <AuthAlert type={state.alertType} message={state.alert} />

              {state.id !== "account-locked" && state.id !== "account-suspended" && (
                <>
                  <MockField label="Email address" error={state.fieldErrors.email} placeholder="you@example.com" />
                  {state.id !== "unverified-email" && (
                    <MockField label="Password" error={state.fieldErrors.password} placeholder="••••••••" />
                  )}
                </>
              )}

              {state.id === "account-suspended" && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-4 space-y-2">
                  <p className="text-xs font-[600] text-[var(--color-ink)]">What can I do?</p>
                  <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                    Review our{" "}
                    <span className="text-[var(--color-navy)] cursor-pointer hover:underline">Terms of Service</span>
                    {" "}to understand the reason, then{" "}
                    <span className="text-[var(--color-navy)] cursor-pointer hover:underline">contact support</span>
                    {" "}with your account details.
                  </p>
                </div>
              )}

              {state.id === "unverified-email" && (
                <div className="grid grid-cols-2 gap-2">
                  <button className="py-2.5 border border-[var(--color-border)] text-xs font-[500] text-[var(--color-ink)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">Resend link</button>
                  <button className="py-2.5 bg-[var(--color-navy)] text-xs font-[500] text-white rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">Enter code</button>
                </div>
              )}

              {(state.id === "wrong-credentials" || state.id === "email-not-found" || state.id === "server-error") && (
                <button className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
                  Try again
                </button>
              )}

              {state.id === "account-locked" && (
                <div className="space-y-2">
                  <button className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer opacity-50 cursor-not-allowed">
                    Sign in (locked)
                  </button>
                  <button className="w-full py-3 border border-[var(--color-border)] text-sm font-[500] text-[var(--color-navy)] rounded-sm hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] transition-colors cursor-pointer">
                    Reset password instead
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Error metadata */}
          <div className="mt-4 px-4 py-3 bg-white border border-[var(--color-border)] rounded-sm">
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] tracking-widest uppercase mb-2">Error context</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {[
                ["Type", state.alertType.toUpperCase()],
                ["ID", state.id],
                ["HTTP", state.id === "server-error" ? "500" : state.id === "account-locked" ? "429" : state.id === "account-suspended" ? "403" : "401"],
                ["Recovery", state.id === "account-suspended" ? "Support" : state.id === "account-locked" ? "Wait / Reset" : "Self-serve"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">{k}:</span>
                  <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] font-[500]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
