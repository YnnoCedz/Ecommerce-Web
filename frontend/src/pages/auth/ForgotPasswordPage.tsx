import { useState } from "react";
import { requestPasswordResetLink } from "../../api/auth";
import { ApiError } from "../../api/client";
import AuthLayout, { AuthAlert, Field } from "./AuthLayout";

type NavFn = (page: string, params?: Record<string, string>) => void;

export default function ForgotPasswordPage({ onNavigate }: { onNavigate: NavFn }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const submit = async () => {
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setError(null);
    setStatusMessage(null);
    setLoading(true);

    try {
      const response = await requestPasswordResetLink({ email });
      setStatusMessage(response.message);
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError("Please wait before requesting another reset link.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Unable to send a password reset link right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle={
          <>
            We sent a password reset link to <strong className="text-[var(--color-ink)]">{email}</strong>
          </>
        }
        footer={
          <span>
            <button onClick={() => onNavigate("login")} className="text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">
              Back to sign in
            </button>
          </span>
        }
      >
        <div className="text-center py-2">
          <div className="w-14 h-14 bg-[var(--color-navy-surface)] border border-[var(--color-navy-border)] rounded-full flex items-center justify-center mx-auto mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-navy)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>

          {statusMessage && (
            <div className="mb-4">
              <AuthAlert type="success" message={statusMessage} />
            </div>
          )}

          <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-6">
            The link expires in 15 minutes. If you don't see it, check your spam folder.
          </p>

          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-3 border border-[var(--color-border)] text-sm font-[500] text-[var(--color-navy)] rounded-sm hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {loading ? "Sending..." : "Send another link"}
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <span>
          <button onClick={() => onNavigate("login")} className="text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">
            Back to sign in
          </button>
        </span>
      }
    >
      {error && <AuthAlert type="error" message={error} />}

      <Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />

      <button
        onClick={submit}
        disabled={loading}
        className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5" strokeOpacity="0.3" />
              <path d="M7 2a5 5 0 015 5" strokeLinecap="round" />
            </svg>
            Sending...
          </>
        ) : (
          "Send reset link"
        )}
      </button>
    </AuthLayout>
  );
}
