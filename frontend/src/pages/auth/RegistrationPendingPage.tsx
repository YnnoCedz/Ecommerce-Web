import { Link, useSearchParams } from "react-router"
import AuthLayout from "./AuthLayout"

type State = "verify-email" | "awaiting-approval" | "approved" | "rejected"

const COPY: Record<State, { title: string; body: string; note?: string }> = {
  "verify-email": {
    title: "Verify your email",
    body: "We sent a verification code to your email address. Enter it to continue.",
    note: "Verifying your email confirms the address is yours. A Marketo administrator still needs to review your registration afterwards.",
  },
  "awaiting-approval": {
    title: "Marketplace application under review",
    body: "Your shared Marketo identity is active and your email is verified. A Marketo administrator is reviewing your Marketplace application and ID.",
    note: "You may sign in now, but shopping and Seller application access remain unavailable until Marketplace approval.",
  },
  approved: {
    title: "Marketplace access approved",
    body: "A Marketo administrator approved your Marketplace application. You can sign in and start shopping.",
  },
  rejected: {
    title: "Marketplace application not approved",
    body: "Your Marketplace capability application was reviewed and was not approved. Your shared identity remains separate.",
    note: "If you believe this is a mistake, contact Marketo support.",
  },
}

function resolveState(raw: string | null): State {
  if (raw === "awaiting-approval" || raw === "approved" || raw === "rejected") {
    return raw
  }

  return "verify-email"
}

/**
 * Deliberately never says "Registration successful — start shopping now" while
 * Marketo Admin approval is still outstanding.
 */
export default function RegistrationPendingPage() {
  const [searchParams] = useSearchParams()
  const state = resolveState(searchParams.get("state"))
  const copy = COPY[state]
  const email = searchParams.get("email")

  return (
    <AuthLayout
      title={copy.title}
      subtitle={copy.body}
      footer={
        <span>
          <Link
            to="/auth/login"
            className="text-[var(--color-navy)] font-[500] hover:underline"
          >
            Go to sign in
          </Link>
        </span>
      }
    >
      {email && (
        <p className="text-sm text-[var(--color-ink)]">
          <span className="text-[var(--color-ink-muted)]">Account:</span> {email}
        </p>
      )}

      {copy.note && (
        <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
          {copy.note}
        </p>
      )}

      {state === "verify-email" && email && (
        <Link
          to={`/auth/verify-email?email=${encodeURIComponent(email)}`}
          className="block w-full text-center bg-[var(--color-navy)] text-white text-sm font-[500] py-2.5 rounded-sm hover:opacity-90 transition-opacity"
        >
          Enter verification code
        </Link>
      )}
    </AuthLayout>
  )
}
