import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router"
import { ApiError, clearToken, context, getToken, login, logout, me, storeToken, verifyTwoFactor, type AuthUser, type LogisticsContext } from "./api"
import { logisticsDestination } from "./access"
import AuthLayout, { Alert } from "./components/AuthLayout"
import { forgotPasswordUrl, logisticsRegistrationUrl } from "./config"

function PasswordInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false)

  return (
    <span className="password-wrap">
      <input
        id="logistics-password"
        type={visible ? "text" : "password"}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="Enter your password"
        autoComplete="current-password"
        required
      />
      <button type="button" className="password-toggle" onClick={() => setVisible(shown => !shown)}
        aria-label={visible ? "Hide password" : "Show password"}>
        {visible ? "Hide" : "Show"}
      </button>
    </span>
  )
}

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
      title={challenge ? "Verify your identity" : "Sign in to Logistics"}
      subtitle={challenge
        ? "Enter the 6-digit verification code sent to your registered contact method."
        : "Use your Maketo identity to access your Logistics Partner workspace."}
      footnote={challenge ? undefined : (
        <span>
          Not yet a Logistics partner?{" "}
          <a href={logisticsRegistrationUrl()}>Register as a Logistics Provider</a>
        </span>
      )}
    >
      {error && <Alert>{error}</Alert>}

      <form onSubmit={submit}>
        {challenge ? (
          <label htmlFor="logistics-code">
            Verification code<span className="req"> *</span>
            <input
              id="logistics-code"
              value={code}
              onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              required
            />
          </label>
        ) : (
          <>
            <label htmlFor="logistics-email">
              Email address<span className="req"> *</span>
              <input
                id="logistics-email"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="username"
                required
              />
            </label>
            <label htmlFor="logistics-password">
              Password<span className="req"> *</span>
              <PasswordInput value={password} onChange={setPassword} />
              <a className="field-hint" href={forgotPasswordUrl()}>Forgot password?</a>
            </label>
          </>
        )}

        <button type="submit" className="primary" disabled={busy}>
          {busy ? "Please wait..." : challenge ? "Verify and continue" : "Sign in"}
        </button>
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
      title="Logistics access unavailable"
      subtitle={`Signed in as ${user?.email ?? "this Maketo identity"}.`}
    >
      <Alert tone="info">
        This Maketo identity does not currently have Logistics access. Sign-in succeeded;
        Logistics capability is approved separately by a Maketo administrator.
      </Alert>
      <p className="muted">
        If your provider application is still under review, you will be able to sign in here
        once it is approved.
      </p>
      <div className="actions">
        <button type="button" className="secondary" onClick={() => navigate("/login", { replace: true })}>
          Return to sign in
        </button>
        <a href={logisticsRegistrationUrl()}>Register as a Logistics Provider</a>
      </div>
    </AuthLayout>
  )
}

function Dashboard({ user, signOut }: { user: AuthUser; signOut: () => void }) {
  const [data, setData] = useState<LogisticsContext | null>(null); const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void context().then(response => setData(response.data))
      .catch(reason => setError(reason instanceof Error ? reason.message : "Unable to load context."))
  }, [])

  return (
    <AuthLayout title="Logistics dashboard" subtitle={`Signed in as ${user.email}.`}>
      {error && <Alert>{error}</Alert>}
      {data ? (
        <dl className="details">
          <div>
            <dt>Provider</dt>
            <dd>{data.provider.company_name} ({data.provider.code})</dd>
          </div>
          <div>
            <dt>Staff</dt>
            <dd>{data.staff.name}</dd>
          </div>
          <div>
            <dt>Staff type</dt>
            <dd>{data.staff.type.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt>Primary hub</dt>
            <dd>{data.staff.primary_hub?.name ?? "Provider-wide"}</dd>
          </div>
          <div>
            <dt>Authorized hubs</dt>
            <dd>{data.authorized_hubs.map(hub => hub.name).join(", ") || "No hubs configured"}</dd>
          </div>
        </dl>
      ) : !error && <p className="muted">Loading provider context...</p>}
      <div className="actions">
        <button type="button" className="secondary" onClick={signOut}>Sign out</button>
      </div>
    </AuthLayout>
  )
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null); const [loading, setLoading] = useState(Boolean(getToken()))
  const navigate = useNavigate()

  useEffect(() => {
    if (!getToken()) return
    void me().then(response => setUser(response.user))
      .catch(reason => { if (reason instanceof ApiError && reason.status === 401) clearToken() })
      .finally(() => setLoading(false))
  }, [])

  async function signOut() { try { await logout() } catch { /* the local session is cleared regardless */ } clearToken(); setUser(null); navigate("/login", { replace: true }) }

  if (loading) {
    return (
      <AuthLayout title="Restoring session">
        <p className="muted">Checking your Maketo identity...</p>
      </AuthLayout>
    )
  }

  return <Routes>
    <Route path="/login" element={<LoginPage onAuthenticated={setUser} />} />
    <Route path="/access-denied" element={<AccessDenied user={user} />} />
    <Route path="/dashboard" element={!user ? <Navigate to="/login" replace /> : !user.capabilities.logistics ? <Navigate to="/access-denied" replace /> : <Dashboard user={user} signOut={signOut} />} />
    <Route path="*" element={<Navigate to={logisticsDestination(user)} replace />} />
  </Routes>
}
