import { useEffect, useState, type FormEvent } from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router"
import { Building2, ShieldCheck, Warehouse } from "lucide-react"
import { ApiError, clearToken, context, getToken, login, logout, me, storeToken, verifyTwoFactor, type AuthUser, type LogisticsContext } from "./api"
import { logisticsDestination } from "./access"
import AuthLayout from "./components/AuthLayout"
import AppShell from "./components/AppShell"
import {
  Alert, Button, Card, DetailRow, EmptyState, Field, LoadingRows, PageHeader, StatusBadge,
} from "./components/ui"
import { forgotPasswordUrl, logisticsRegistrationUrl } from "./config"

function LoginPage({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("")
  const [challenge, setChallenge] = useState<{ id: number; token: string } | null>(null); const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null)

  const finish = (user: AuthUser, token: string) => {
    storeToken(token); onAuthenticated(user)
    navigate(logisticsDestination(user), { replace: true })
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null)
    try {
      if (challenge) {
        const response = await verifyTwoFactor(challenge.id, challenge.token, code)
        if (!response.user || !response.token) throw new Error("Authentication response was incomplete.")
        finish(response.user, response.token)
      } else {
        const response = await login(email, password)
        if (response.requires_two_factor) {
          if (!response.two_factor_challenge_id || !response.two_factor_challenge_token) throw new Error("Two-factor challenge was incomplete.")
          setChallenge({ id: response.two_factor_challenge_id, token: response.two_factor_challenge_token })
        } else {
          if (!response.user || !response.token) throw new Error("Authentication response was incomplete.")
          finish(response.user, response.token)
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.")
    } finally { setBusy(false) }
  }

  // The two-factor challenge stays inside the same branded card; only the
  // fields change, never the surrounding layout.
  return (
    <AuthLayout
      title={challenge ? "Verify your identity" : "Sign in"}
      subtitle={challenge
        ? "Enter the 6-digit verification code sent to your registered contact method."
        : "Use your Marketo identity to access your Logistics Partner workspace."}
      footnote={challenge ? undefined : (
        <span>
          Not yet a Logistics partner?{" "}
          <a href={logisticsRegistrationUrl()} className="text-[var(--color-navy)] font-[500] hover:underline">
            Register as a Logistics Provider
          </a>
        </span>
      )}
    >
      {error && <Alert>{error}</Alert>}

      <form onSubmit={submit} className="space-y-5">
        {challenge ? (
          <Field
            id="logistics-code"
            label="Verification code"
            value={code}
            onChange={value => setCode(value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            required
          />
        ) : (
          <>
            <Field
              id="logistics-email"
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="username"
              required
            />
            <Field
              id="logistics-password"
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              hint={
                <a href={forgotPasswordUrl()} className="text-[var(--color-navy)] font-[500] hover:underline">
                  Forgot password?
                </a>
              }
            />
          </>
        )}

        <Button type="submit" fullWidth loading={busy}>
          {busy ? "Please wait..." : challenge ? "Verify and continue" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  )
}

function AccessDenied({ user }: { user: AuthUser | null }) {
  const navigate = useNavigate()

  // Authentication succeeded here; only the Logistics capability is missing, so
  // the copy must never suggest a credential problem.
  return (
    <AuthLayout
      title="Access unavailable"
      subtitle={user ? `Signed in as ${user.email}.` : "You are signed in with a Marketo identity."}
    >
      <Alert type="warning">
        This Marketo identity does not currently have access to the Logistics Partner Portal.
        Sign-in succeeded; Logistics access is approved separately by a Marketo administrator.
      </Alert>
      <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
        If your provider application is still under review, you will be able to sign in here once it is approved.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => navigate("/login", { replace: true })}>
          Return to sign in
        </Button>
        <a
          href={logisticsRegistrationUrl()}
          className="py-3 px-4 text-sm font-[500] rounded-sm text-[var(--color-navy)] hover:bg-[var(--color-surface)] transition-colors flex items-center"
        >
          Register as a Logistics Provider
        </a>
      </div>
    </AuthLayout>
  )
}

function Dashboard({ user }: { user: AuthUser }) {
  const [data, setData] = useState<LogisticsContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void context()
      .then(response => setData(response.data))
      .catch(reason => setError(reason instanceof Error ? reason.message : "Unable to load provider context."))
      .finally(() => setLoading(false))
  }, [])

  // Every value below comes from /api/logistics/context. No metric is invented.
  return (
    <>
      <PageHeader
        title="Logistics dashboard"
        subtitle={data ? `${data.provider.company_name} workspace` : `Signed in as ${user.display_name || user.email}`}
      />

      {error && <Alert>{error}</Alert>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card title="Provider" icon={<Building2 size={15} />}>
          {loading ? <LoadingRows rows={3} /> : data ? (
            <dl className="space-y-4">
              <DetailRow label="Company">{data.provider.company_name}</DetailRow>
              <DetailRow label="Provider code">
                <span className="font-[var(--font-mono)] text-xs">{data.provider.code}</span>
              </DetailRow>
              <DetailRow label="Status"><StatusBadge status={data.provider.status} /></DetailRow>
            </dl>
          ) : <p className="text-sm text-[var(--color-ink-muted)]">Provider details are unavailable.</p>}
        </Card>

        <Card title="Your access" icon={<ShieldCheck size={15} />}>
          {loading ? <LoadingRows rows={3} /> : data ? (
            <dl className="space-y-4">
              <DetailRow label="Staff">{data.staff.name}</DetailRow>
              <DetailRow label="Staff type">{data.staff.type.replaceAll("_", " ")}</DetailRow>
              <DetailRow label="Status"><StatusBadge status={data.staff.status} /></DetailRow>
            </dl>
          ) : <p className="text-sm text-[var(--color-ink-muted)]">Staff details are unavailable.</p>}
        </Card>

        <Card title="Hubs" icon={<Warehouse size={15} />}>
          {loading ? <LoadingRows rows={3} /> : data ? (
            data.authorized_hubs.length > 0 ? (
              <dl className="space-y-4">
                <DetailRow label="Primary hub">{data.staff.primary_hub?.name ?? "Provider-wide"}</DetailRow>
                <DetailRow label="Authorized">
                  {data.authorized_hubs.map(hub => hub.name).join(", ")}
                </DetailRow>
              </dl>
            ) : (
              <EmptyState
                icon={<Warehouse size={18} aria-hidden="true" />}
                title="No hubs configured"
                description="This provider has no active hubs yet. Hubs appear here once they are set up."
              />
            )
          ) : <p className="text-sm text-[var(--color-ink-muted)]">Hub details are unavailable.</p>}
        </Card>
      </div>
    </>
  )
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(Boolean(getToken()))
  const navigate = useNavigate()

  useEffect(() => {
    if (!getToken()) return
    void me().then(response => setUser(response.user))
      .catch(reason => { if (reason instanceof ApiError && reason.status === 401) clearToken() })
      .finally(() => setLoading(false))
  }, [])

  async function signOut() {
    try { await logout() } catch { /* the local session is cleared regardless */ }
    clearToken(); setUser(null); navigate("/login", { replace: true })
  }

  // Session restore renders the branded shell with skeletons rather than a blank page.
  if (loading) {
    return (
      <AuthLayout title="Restoring session" subtitle="Checking your Marketo identity...">
        <LoadingRows rows={3} />
      </AuthLayout>
    )
  }

  return <Routes>
    <Route path="/login" element={<LoginPage onAuthenticated={setUser} />} />
    <Route path="/access-denied" element={<AccessDenied user={user} />} />
    <Route path="/dashboard" element={
      !user ? <Navigate to="/login" replace />
        : !user.capabilities.logistics ? <Navigate to="/access-denied" replace />
        : <AppShell user={user} onSignOut={signOut}><Dashboard user={user} /></AppShell>
    } />
    <Route path="*" element={<Navigate to={logisticsDestination(user)} replace />} />
  </Routes>
}
