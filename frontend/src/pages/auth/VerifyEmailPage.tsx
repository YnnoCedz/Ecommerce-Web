import { useState, useRef, useEffect } from "react";
import AuthLayout, { AuthAlert } from "./AuthLayout";

type NavFn = (page: string, params?: Record<string, string>) => void;

const CODE_LENGTH = 6;

export default function VerifyEmailPage({ onNavigate }: { onNavigate: NavFn }) {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (index: number, raw: string) => {
    const val = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    if (val && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (pasted.length) {
      const next = Array(CODE_LENGTH).fill("");
      pasted.split("").forEach((c, i) => { next[i] = c; });
      setDigits(next);
      inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    }
    e.preventDefault();
  };

  const verify = () => {
    if (digits.some(d => !d)) { setError("Please enter all 6 digits of your code."); return; }
    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const code = digits.join("");
      if (code === "123456") setSuccess(true);
      else setError("That code is incorrect or has expired. Please try again.");
    }, 1200);
  };

  const resend = () => {
    setResending(true);
    setCountdown(60);
    setDigits(Array(CODE_LENGTH).fill(""));
    setError(null);
    setTimeout(() => setResending(false), 800);
  };

  if (success) {
    return (
      <AuthLayout title="Email verified" subtitle="Your account is now active">
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-ink-muted)] mb-6 leading-relaxed">
            Your email has been verified successfully. You can now access all features of your Marketo account.
          </p>
          <button onClick={() => onNavigate("login")}
            className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
            Continue to sign in
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={<>We sent a 6-digit code to <strong className="text-[var(--color-ink)]">ana.reyes@example.com</strong>. Check your inbox.</>}
      footer={
        <span>
          Wrong email?{" "}
          <button onClick={() => onNavigate("register")} className="text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">
            Go back
          </button>
        </span>
      }>

      {error && <AuthAlert type="error" message={error} />}
      {resending && <AuthAlert type="success" message="A new code has been sent to your email." />}

      <div>
        <label className="block text-xs font-[600] text-[var(--color-ink)] mb-3">Verification code</label>
        <div className="flex gap-2" onPaste={handlePaste}>
          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digits[i]}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className={`w-full aspect-square text-center text-xl font-[600] text-[var(--color-ink)] bg-white border-2 rounded-sm outline-none transition-all ${
                digits[i] ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)]" : "border-[var(--color-border)] focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10"
              }`}
            />
          ))}
        </div>
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] mt-2">
          Demo: enter <strong>123456</strong> to verify
        </p>
      </div>

      <button
        onClick={verify}
        disabled={loading || digits.some(d => !d)}
        className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2">
        {loading ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5" strokeOpacity="0.3" /><path d="M7 2a5 5 0 015 5" strokeLinecap="round" /></svg>
            Verifying…
          </>
        ) : "Verify email"}
      </button>

      <div className="text-center">
        {countdown > 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">
            Resend code in <span className="font-[var(--font-mono)] text-[var(--color-ink)] font-[500]">{countdown}s</span>
          </p>
        ) : (
          <button onClick={resend} disabled={resending}
            className="text-sm text-[var(--color-navy)] font-[500] hover:underline cursor-pointer disabled:opacity-60">
            Resend code
          </button>
        )}
      </div>
    </AuthLayout>
  );
}
