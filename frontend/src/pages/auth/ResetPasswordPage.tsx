import { useState } from "react";
import AuthLayout, { Field, PasswordStrength, AuthAlert } from "./AuthLayout";

type NavFn = (page: string, params?: Record<string, string>) => void;

export default function ResetPasswordPage({ onNavigate }: { onNavigate: NavFn }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (!password) e.password = "New password is required";
    else if (password.length < 8) e.password = "Password must be at least 8 characters";
    if (!confirm) e.confirm = "Please confirm your password";
    else if (password !== confirm) e.confirm = "Passwords do not match";
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    setTimeout(() => { setLoading(false); setSuccess(true); }, 1200);
  };

  if (success) {
    return (
      <AuthLayout title="Password updated" subtitle="Your password has been changed successfully">
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-ink-muted)] mb-6 leading-relaxed">
            You can now sign in with your new password. For security, you've been signed out of all other devices.
          </p>
          <button onClick={() => onNavigate("login")}
            className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
            Sign in now
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Choose a new password for your account"
      footer={
        <span>
          <button onClick={() => onNavigate("login")} className="text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">
            ← Back to sign in
          </button>
        </span>
      }>

      {/* Token indicator */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm">
        <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="var(--color-green)" strokeWidth="1.5"><path d="M9 4H7V3a2 2 0 00-4 0v1H1v7h10V4zM5 7.5V9" strokeLinecap="round" /></svg>
        <p className="text-xs text-[var(--color-green)] font-[500]">Reset link valid — expires in <span className="font-[var(--font-mono)]">12:48</span></p>
      </div>

      <div className="space-y-2">
        <Field label="New password" type="password" value={password} onChange={setPassword}
          placeholder="Create a strong password" error={errors.password} required />
        <PasswordStrength password={password} />
      </div>

      <Field label="Confirm new password" type="password" value={confirm} onChange={setConfirm}
        placeholder="Repeat your password" error={errors.confirm} required />

      <button
        onClick={submit}
        disabled={loading}
        className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2">
        {loading ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5" strokeOpacity="0.3" /><path d="M7 2a5 5 0 015 5" strokeLinecap="round" /></svg>
            Updating password…
          </>
        ) : "Set new password"}
      </button>
    </AuthLayout>
  );
}
