import { Link } from "react-router"
import { ShoppingBag, Truck } from "lucide-react"
import AuthLayout from "./AuthLayout"

type Option = {
  key: string
  label: string
  description: string
  href: string
  icon: typeof ShoppingBag
  enabled: boolean
}

/**
 * Phase 2.6 registration entry point.
 *
 * Seller is deliberately absent: it is an additive capability an existing
 * marketplace identity applies for through "Become a Seller", not a separate
 * mutually exclusive account type.
 */
const OPTIONS: Option[] = [
  {
    key: "user",
    label: "User",
    description: "Shop and use the marketplace",
    href: "/register/user",
    icon: ShoppingBag,
    enabled: true,
  },
  {
    key: "logistics",
    label: "Logistics",
    description: "Register a logistics business",
    href: "/register/logistics",
    icon: Truck,
    enabled: true,
  },
]

export default function RegisterSelectPage() {
  const options = OPTIONS.filter(option => option.enabled)

  return (
    <AuthLayout
      title="Create your Maketo account"
      subtitle="How would you like to join Maketo?"
      footer={
        <span>
          Already have an account?{" "}
          <Link
            to="/auth/login"
            className="text-[var(--color-navy)] font-[500] hover:underline"
          >
            Sign in
          </Link>
        </span>
      }
    >
      <div className="space-y-3">
        {options.map(option => {
          const Icon = option.icon
          return (
            <Link
              key={option.key}
              to={option.href}
              className="flex items-center gap-4 w-full px-4 py-4 rounded-sm border border-[var(--color-border)] bg-white text-left transition-colors hover:border-[var(--color-navy)] focus:outline-none focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10"
            >
              <span className="w-10 h-10 shrink-0 rounded-sm bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-navy)]">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-[600] text-[var(--color-ink)]">
                  {option.label}
                </span>
                <span className="block text-xs text-[var(--color-ink-muted)] mt-0.5">
                  {option.description}
                </span>
              </span>
            </Link>
          )
        })}
      </div>

      <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
        Selling on Maketo? Create a User account first, then apply through
        Become a Seller from your account menu.
      </p>
      <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
        Rider registration is available only through the Maketo Rider App.
      </p>
    </AuthLayout>
  )
}
