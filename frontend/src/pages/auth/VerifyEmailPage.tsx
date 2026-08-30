import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { ApiError } from "../../api/client";
import { resendEmailVerificationRequest } from "../../api/auth";
import AuthLayout, { AuthAlert, Field } from "./AuthLayout";

type NavFn = (page: string, params?: Record<string, string>) => void;

export default function VerifyEmailPage({ onNavigate }: { onNavigate: NavFn }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const registrationState = location.state as {
    registrationMessage?: string;
    verificationEmailSent?: boolean;
  } | null;
  const { user, verifyEmail, pendingVerificationEmail } = useAuth();
  const [email, setEmail] = useState(searchParams.get("email") ?? pendingVerificationEmail ?? user?.email ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const resendInFlight = useRef(false);
  const verifyInFlight = useRef(false);
  const [message, setMessage] = useState<string | null>(() =>
    registrationState?.verificationEmailSent === false ? null : registrationState?.registrationMessage ?? null
  );
  const [error, setError] = useState<string | null>(() =>
    registrationState?.verificationEmailSent === false || searchParams.get("delivery") === "pending"
      ? registrationState?.registrationMessage ?? "Your account was created, but the verification email could not be sent. Please use Resend code."
      : null
  );
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!email && (pendingVerificationEmail || user?.email)) {
      setEmail(pendingVerificationEmail ?? user?.email ?? "");
      return;
    }

    if (!email && user?.email) {
      setEmail(user.email);
    }
  }, [email, pendingVerificationEmail, user?.email]);

  const displayEmail = useMemo(() => email || user?.email || "your email address", [email, user?.email]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const verify = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (verifyInFlight.current) {
      return;
    }

    if (!email.trim()) {
      setError("Enter the email address that received the code.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    verifyInFlight.current = true;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await verifyEmail({
        email: email.trim(),
        code,
      });

      setMessage(response.message ?? "Email verified successfully.");
      navigate(response.redirectTo ?? "/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setError(Object.values(err.errors).flat().find(Boolean) ?? err.message);
      } else {
        setError(err instanceof ApiError ? err.message : "Unable to verify your email right now.");
      }
    } finally {
      verifyInFlight.current = false;
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resendInFlight.current || resending || resendCooldown > 0) {
      return;
    }

    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    resendInFlight.current = true;
    setResending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await resendEmailVerificationRequest({ email: email.trim() });
      setMessage(response.message);
      setResendCooldown(response.retry_after ?? 30);
    } catch (err) {
      if (err instanceof ApiError) {
        const retryAfter =
          err.payload && typeof err.payload === "object" && "retry_after" in err.payload
            ? Number((err.payload as { retry_after?: unknown }).retry_after)
            : 0;
        if (retryAfter > 0) {
          setResendCooldown(Math.ceil(retryAfter));
        }
        setError(err.message);
      } else {
        setError("Unable to resend the verification code right now.");
      }
    } finally {
      resendInFlight.current = false;
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Enter the 6-digit code we sent to your inbox to continue inside Maketo."
      footer={
        <span>
          Need to sign in instead?{" "}
          <button onClick={() => onNavigate("login")} className="text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">
            Go to login
          </button>
        </span>
      }
    >
      {message && <AuthAlert type="success" message={message} />}
      {error && <AuthAlert type="error" message={error} />}

      <form onSubmit={verify} className="space-y-5">
        <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-sm text-[var(--color-ink-muted)] leading-relaxed space-y-2">
          <p>
            We sent a verification code to <strong className="text-[var(--color-ink)]">{displayEmail}</strong>.
          </p>
          <p>Open the email, copy the code, and enter it below. You do not need to leave the website.</p>
        </div>

        <Field
          label="Email address"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            setError(null);
          }}
          placeholder="you@example.com"
          required
        />

        <Field
          label="Verification code"
          value={code}
          onChange={(value) => {
            setCode(value.replace(/\D/g, "").slice(0, 6));
            setError(null);
          }}
          placeholder="123456"
          required
          hint="Enter the 6-digit code from your email."
        />

        <button
          type="submit"
          disabled={loading || code.length !== 6 || !email.trim()}
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
          ) : "Verify email"}
        </button>

        <button
          type="button"
          onClick={resend}
          disabled={resending || resendCooldown > 0}
          className="w-full py-3 border border-[var(--color-border)] text-[var(--color-ink)] text-sm font-[500] rounded-sm hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {resending ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="7" cy="7" r="5" strokeOpacity="0.3" />
                <path d="M7 2a5 5 0 015 5" strokeLinecap="round" />
              </svg>
              Sending...
            </>
          ) : resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
        </button>
      </form>
    </AuthLayout>
  );
}
