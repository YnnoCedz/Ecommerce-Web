import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import AuthLayout, { AuthAlert } from "./AuthLayout";

export default function EmailVerifiedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>("Verifying your session...");
  const [verified, setVerified] = useState(searchParams.get("verified") === "1");

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      const user = await refreshUser();

      if (cancelled) {
        return;
      }

      if (user?.email_verified_at) {
        const redirectTo =
          user.role === "seller"
            ? "/seller-center"
            : user.role === "admin"
              ? "/admin"
              : "/account/profile";

        navigate(redirectTo, { replace: true });
        return;
      }

      setVerified(true);
      setMessage("Your email has been verified. Please sign in to continue.");
      setLoading(false);
    };

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [navigate, refreshUser]);

  return (
    <AuthLayout
      title={loading ? "Verifying session" : verified ? "Email verified" : "Email verified"}
      subtitle={loading ? "Restoring your Maketo session..." : "Your email address was verified successfully."}
    >
      {loading ? (
        <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 text-sm text-[var(--color-ink-muted)] leading-relaxed">
          <div className="flex items-center gap-3">
            <svg className="animate-spin shrink-0" width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5" strokeOpacity="0.3" />
              <path d="M7 2a5 5 0 015 5" strokeLinecap="round" />
            </svg>
            <span>{message}</span>
          </div>
        </div>
      ) : (
        <>
          <AuthAlert type="success" message="Your email address has been verified successfully." />
          <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 text-sm text-[var(--color-ink-muted)] leading-relaxed space-y-3">
            <p>Your email is verified. If your session is still active, Maketo will take you to the right page automatically.</p>
            <p>If you were signed out, please sign in again to continue.</p>
          </div>
          <button
            onClick={() => navigate("/auth/login", { replace: true })}
            className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer"
          >
            Go to login
          </button>
        </>
      )}
    </AuthLayout>
  );
}
