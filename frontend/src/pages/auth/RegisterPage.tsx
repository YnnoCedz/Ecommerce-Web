import { useState } from "react";
import AuthLayout, { Field, PasswordStrength, AuthAlert } from "./AuthLayout";

type NavFn = (page: string, params?: Record<string, string>) => void;

export default function RegisterPage({ onNavigate }: { onNavigate: NavFn }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required";
    if (!lastName.trim()) e.lastName = "Last name is required";
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Must be at least 8 characters";
    if (password !== confirm) e.confirm = "Passwords do not match";
    if (!agreed) e.agreed = "You must agree to the Terms and Privacy Policy";
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    setTimeout(() => { setLoading(false); setSuccess(true); }, 1400);
  };

  if (success) {
    return (
      <AuthLayout title="Check your inbox" subtitle={`We sent a verification link to ${email}`}>
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-6">
            Your account has been created. Click the link in your email to verify your account and start shopping.
          </p>
          <button onClick={() => onNavigate("verify-email")}
            className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
            Enter verification code instead
          </button>
          <p className="text-xs text-[var(--color-ink-muted)] mt-4">
            Already verified?{" "}
            <button onClick={() => onNavigate("login")} className="text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">Sign in</button>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join 1.2 million buyers on Marketo"
      footer={
        <span>
          Already have an account?{" "}
          <button onClick={() => onNavigate("login")} className="text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">
            Sign in
          </button>
        </span>
      }>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" value={firstName} onChange={setFirstName}
          placeholder="Ana" error={errors.firstName} required />
        <Field label="Last name" value={lastName} onChange={setLastName}
          placeholder="Reyes" error={errors.lastName} required />
      </div>

      <Field label="Email address" type="email" value={email} onChange={setEmail}
        placeholder="you@example.com" error={errors.email} required />

      <div className="space-y-2">
        <Field label="Password" type="password" value={password} onChange={setPassword}
          placeholder="Create a strong password" error={errors.password} required
          hint={!errors.password ? "At least 8 characters" : undefined} />
        <PasswordStrength password={password} />
      </div>

      <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm}
        placeholder="Repeat your password" error={errors.confirm} required />

      {/* Terms */}
      <div>
        <label className="flex items-start gap-2.5 cursor-pointer group">
          <div onClick={() => setAgreed(a => !a)}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${agreed ? "bg-[var(--color-navy)] border-[var(--color-navy)]" : errors.agreed ? "border-[var(--color-red)]" : "border-[var(--color-border-strong)] group-hover:border-[var(--color-navy)]"}`}>
            {agreed && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>
          <span className="text-sm text-[var(--color-ink-muted)] leading-snug">
            I agree to Marketo's{" "}
            <span className="text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">Terms of Service</span>
            {" "}and{" "}
            <span className="text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">Privacy Policy</span>
          </span>
        </label>
        {errors.agreed && <p className="text-xs text-[var(--color-red)] mt-1.5 ml-6">{errors.agreed}</p>}
      </div>

      <button
        onClick={submit}
        disabled={loading}
        className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2">
        {loading ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5" strokeOpacity="0.3" /><path d="M7 2a5 5 0 015 5" strokeLinecap="round" />
            </svg>
            Creating account…
          </>
        ) : "Create account"}
      </button>
    </AuthLayout>
  );
}
