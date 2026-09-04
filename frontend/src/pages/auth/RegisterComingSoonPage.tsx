import { Link } from "react-router"
import AuthLayout from "./AuthLayout"
import {
  LOGISTICS_REGISTRATION_ENABLED,
  RIDER_REGISTRATION_ENABLED,
} from "./registrationFlags"

/** Unrouted compatibility component retained for older local imports. */
export default function RegisterComingSoonPage({
  variant,
}: {
  variant: "rider" | "logistics"
}) {
  const enabled =
    variant === "rider"
      ? RIDER_REGISTRATION_ENABLED
      : LOGISTICS_REGISTRATION_ENABLED

  const title =
    variant === "rider" ? "Rider registration" : "Logistics registration"

  const body =
    variant === "rider"
      ? "Rider registration is available only through the Marketo Rider App."
      : "Logistics business registration is available on the dedicated web form."

  return (
    <AuthLayout
      title={title}
      subtitle={enabled ? body : "This registration type is not available yet."}
      footer={
        <span>
          <Link
            to="/register"
            className="text-[var(--color-navy)] font-[500] hover:underline"
          >
            Choose a different account type
          </Link>
          {" · "}
          <Link
            to="/auth/login"
            className="text-[var(--color-navy)] font-[500] hover:underline"
          >
            Sign in
          </Link>
        </span>
      }
    >
      <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
        {variant === "rider"
          ? "Use the Rider App to create or reuse one Marketo identity, select an approved provider, and submit the provider-owned application."
          : "Logistics registration creates or reuses one Marketo identity and does not require Marketplace Buyer access."}
      </p>

      <Link
        to={variant === "rider" ? "/courier/apply" : "/register/logistics"}
        className="block w-full text-center bg-[var(--color-navy)] text-white text-sm font-[500] py-2.5 rounded-sm hover:opacity-90 transition-opacity"
      >
        {variant === "rider" ? "View Rider App information" : "Open Logistics registration"}
      </Link>
    </AuthLayout>
  )
}
