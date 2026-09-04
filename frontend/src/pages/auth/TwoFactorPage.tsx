import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { ApiError } from "../../api/client";
import AuthLayout, { AuthAlert } from "./AuthLayout";

const CODE_LENGTH = 6;

function formatCountdown(targetIso: string | null) {
  if (!targetIso) return null;

  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) return null;

  const seconds = Math.max(0, Math.floor((target - Date.now()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (minutes <= 0) {
    return `${remainder}s`;
  }

  return `${minutes}m ${remainder.toString().padStart(2, "0")}s`;
}

export default function TwoFactorPage() {
  const { pendingTwoFactor, verifyTwoFactor, resendTwoFactor, clearPendingTwoFactor } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [now, setNow] = useState(Date.now());
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const verifyInFlight = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!pendingTwoFactor) {
      navigate("/auth/login", { replace: true });
    }
  }, [navigate, pendingTwoFactor]);

  const expiresAt = pendingTwoFactor?.expiresAt ?? null;
  const resendAt = pendingTwoFactor?.resendAvailableAt ?? null;
  const isExpired = useMemo(() => {
    if (!expiresAt) return false;
    const expiry = new Date(expiresAt).getTime();
    return !Number.isNaN(expiry) && expiry <= now;
  }, [expiresAt, now]);

  const resendCountdown = useMemo(() => {
    if (!resendAt) return null;
    const target = new Date(resendAt).getTime();
    if (Number.isNaN(target)) return null;
    return Math.max(0, Math.floor((target - now) / 1000));
  }, [now, resendAt]);

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
      pasted.split("").forEach((char, index) => {
        next[index] = char;
      });
      setDigits(next);
      inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    }
    e.preventDefault();
  };

  const verify = async () => {
    if (verifyInFlight.current) return;
    if (!pendingTwoFactor) {
      navigate("/auth/login", { replace: true });
      return;
    }

    if (digits.some((digit) => !digit)) {
      setError("Please enter all 6 digits of your code.");
      return;
    }

    if (isExpired) {
      setError("This code has expired. Please request a new one.");
      return;
    }

    verifyInFlight.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await verifyTwoFactor({
        challengeId: pendingTwoFactor.challengeId,
        code: digits.join(""),
      });
      setSuccess(true);
      clearPendingTwoFactor();
      const requestedReturn = searchParams.get("returnTo") ?? "";
      const safeReturn = requestedReturn.startsWith("/") && !requestedReturn.startsWith("//") ? requestedReturn : null;
      navigate(safeReturn ?? response.redirectTo ?? "/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to verify your code right now. Please try again.");
      }
    } finally {
      verifyInFlight.current = false;
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!pendingTwoFactor) {
      navigate("/auth/login", { replace: true });
      return;
    }

    setResending(true);
    setError(null);

    try {
      await resendTwoFactor();
      setDigits(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to resend the code right now.");
      }
    } finally {
      setResending(false);
    }
  };

  if (!pendingTwoFactor) {
    return null;
  }

  if (success) {
    return (
      <AuthLayout title="Verified" subtitle="Your sign-in has been approved.">
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
            You were successfully signed in. Redirecting to the homepage now.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Two-factor verification"
      subtitle={
        <span>
          We sent a 6-digit code to <strong className="text-[var(--color-ink)]">{pendingTwoFactor.email}</strong>. Enter it below to continue.
        </span>
      }
      footer={
        <span>
          Wrong account?{" "}
          <button
            onClick={() => {
              clearPendingTwoFactor();
              navigate("/auth/login");
            }}
            className="text-[var(--color-navy)] font-[500] hover:underline cursor-pointer"
          >
            Go back to login
          </button>
        </span>
      }
    >
      {error && <AuthAlert type="error" message={error} />}
      {isExpired && <AuthAlert type="warning" message="This code has expired. Please request a new one." />}

      <form onSubmit={event => { event.preventDefault(); void verify(); }} className="space-y-5">
      <div>
        <label className="block text-xs font-[600] text-[var(--color-ink)] mb-3">Verification code</label>
        <div className="flex gap-2" onPaste={handlePaste}>
          {Array.from({ length: CODE_LENGTH }).map((_, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digits[index]}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-full aspect-square text-center text-xl font-[600] text-[var(--color-ink)] bg-white border-2 rounded-sm outline-none transition-all ${
                digits[index]
                  ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)]"
                  : "border-[var(--color-border)] focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10"
              }`}
            />
          ))}
        </div>
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] mt-2">
          Enter the six-digit code from your email.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || digits.some((digit) => !digit) || isExpired}
        className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5" strokeOpacity="0.3" />
              <path d="M7 2a5 5 0 015 5" strokeLinecap="round" />
            </svg>
            Verifying...
          </>
        ) : "Verify code"}
      </button>
      </form>

      <div className="space-y-2 text-center">
        <p className="text-sm text-[var(--color-ink-muted)]">
          {isExpired ? "This code has expired." : "Still waiting for your code?"}
        </p>
        {resendCountdown && resendCountdown > 0 ? (
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] tracking-wide uppercase">
            Resend available in {formatCountdown(resendAt)}
          </p>
        ) : (
          <button
            onClick={resend}
            disabled={resending}
            className="text-sm text-[var(--color-navy)] font-[500] hover:underline cursor-pointer disabled:opacity-60"
          >
            {resending ? "Sending new code..." : "Resend code"}
          </button>
        )}
      </div>
    </AuthLayout>
  );
}
