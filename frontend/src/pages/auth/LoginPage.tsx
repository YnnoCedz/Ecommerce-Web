import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Check, Loader2 } from "lucide-react"
import { useAuth } from "../../auth/AuthContext"
import { ApiError } from "../../api/client"
import { cancelInFlight } from "../../api/requestCache"
import { isAdmin, isMarketplaceShopper } from "../../auth/capabilities"
import AuthLayout, { Field, AuthAlert, FormDivider } from "./AuthLayout"

type NavFn = (page: string, params?: Record<string, string>) => void

export default function LoginPage({ onNavigate }: { onNavigate: NavFn }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedReturn = searchParams.get("returnTo") ?? ""
  const safeReturn =
    requestedReturn.startsWith("/") && !requestedReturn.startsWith("//")
      ? requestedReturn
      : null
  const isCapabilityApplicationReturn = safeReturn === "/register/logistics"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
  }>({})
  const submissionInFlightRef = useRef(false)

  useEffect(() => {
    cancelInFlight([
      "catalog:categories",
      "catalog:products",
      "catalog:sellers",
    ])
  }, [])

  const submit = async () => {
    if (submissionInFlightRef.current) return

    const fe: typeof fieldErrors = {}
    if (!email.trim()) fe.email = "Email address is required"
    else if (!/\S+@\S+\.\S+/.test(email))
      fe.email = "Enter a valid email address"
    if (!password) fe.password = "Password is required"
    if (Object.keys(fe).length) {
      setFieldErrors(fe)
      return
    }

    submissionInFlightRef.current = true
    setFieldErrors({})
    setLoading(true)
    setError(null)

    try {
      const response = await login({ email, password, remember })
      if (response.requiresTwoFactor) {
        navigate(
          safeReturn
            ? `/auth/two-factor?returnTo=${encodeURIComponent(safeReturn)}`
            : "/auth/two-factor",
          { replace: true },
        )
        return
      }
      // Marketplace login stays marketplace-first for every capability; only a
      // platform administrator is routed away. The backend sends the same rule
      // in redirect_to, this is the offline fallback.
      const redirectTo =
        (safeReturn && (isCapabilityApplicationReturn || isMarketplaceShopper(response.user)) ? safeReturn : null) ??
        response.redirectTo ??
        (isAdmin(response.user) ? "/admin" : isMarketplaceShopper(response.user) ? "/" : "/marketplace-unavailable")
      navigate(redirectTo)
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setFieldErrors({
          email: err.errors.email?.[0],
          password: err.errors.password?.[0],
        })
      }

      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to sign in right now. Please try again.",
      )
    } finally {
      submissionInFlightRef.current = false
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Maketo account"
      footer={
        <span>
          New to Maketo?{" "}
          <button
            onClick={() =>
              isCapabilityApplicationReturn
                ? navigate("/register/logistics")
                : safeReturn
                ? navigate(
                    `/auth/register?returnTo=${encodeURIComponent(safeReturn)}`,
                  )
                : onNavigate("register")
            }
            className="text-[var(--color-navy)] font-[500] hover:underline cursor-pointer"
          >
            {safeReturn === "/courier/apply"
              ? "Create Maketo Account"
              : isCapabilityApplicationReturn
                ? "Start Logistics registration"
              : "Create an account"}
          </button>
        </span>
      }
    >
      {error && <AuthAlert type="error" message={error} />}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
        className="space-y-5"
      >
        <Field
          label="Email address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          error={fieldErrors.email}
          required
        />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-[600] text-[var(--color-ink)]">
              Password <span className="text-[var(--color-red)]">*</span>
            </label>
            <button
              type="button"
              onClick={() => onNavigate("forgot-password")}
              className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer font-[500]"
            >
              Forgot password?
            </button>
          </div>
          <Field
            label=""
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Enter your password"
            error={fieldErrors.password}
          />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="sr-only"
          />
          <span
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
              remember
                ? "bg-[var(--color-navy)] border-[var(--color-navy)]"
                : "border-[var(--color-border-strong)] group-hover:border-[var(--color-navy)]"
            }`}
          >
            {remember && (
              <Check size={8} className="text-white" aria-hidden="true" />
            )}
          </span>
          <span className="text-sm text-[var(--color-ink-muted)]">
            Remember me for 30 days
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>

        <FormDivider label="or continue with" />

        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "Google",
              icon: (
                <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                    fill="#4285F4"
                  />
                  <path
                    d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
                    fill="#34A853"
                  />
                  <path
                    d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                    fill="#EA4335"
                  />
                </svg>
              ),
            },
            {
              label: "Facebook",
              icon: (
                <svg width="15" height="15" viewBox="0 0 18 18" fill="#1877F2">
                  <path d="M18 9a9 9 0 10-10.406 8.89v-6.288H5.309V9h2.285V7.01c0-2.257 1.344-3.503 3.4-3.503.985 0 2.015.175 2.015.175V5.91h-1.135c-1.118 0-1.467.694-1.467 1.406V9h2.496l-.399 2.602h-2.097v6.287A9.003 9.003 0 0018 9z" />
                </svg>
              ),
            },
          ].map(({ label, icon }) => (
            <button
              key={label}
              disabled
              className="flex items-center justify-center gap-2.5 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink-muted)] cursor-not-allowed opacity-60"
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>

        <p className="text-center font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] tracking-wide">
          SOCIAL AUTH - DESIGN PREVIEW ONLY
        </p>
      </form>
    </AuthLayout>
  )
}
