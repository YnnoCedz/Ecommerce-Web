import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { Link, Navigate, Route, Routes, useNavigate } from "react-router"
import { ApiError, clearToken, context, getToken, login, logout, me, storeToken, verifyTwoFactor, type AuthUser, type LogisticsContext } from "./api"
import { logisticsDestination } from "./access"

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return <main className="page"><section className="card"><div className="brand">MAKETO <span>LOGISTICS</span></div><h1>{title}</h1>{children}</section></main>
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
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to sign in.") } finally { setBusy(false) }
  }
  return <Shell title={challenge ? "Verify your identity" : "Logistics Partner sign in"}>{error && <p className="alert">{error}</p>}<form onSubmit={submit}>
    {challenge ? <label>Verification code<input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" required /></label> : <><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label></>}
    <button disabled={busy}>{busy ? "Please wait..." : challenge ? "Verify and continue" : "Sign in"}</button>
  </form></Shell>
}

function AccessDenied({ user }: { user: AuthUser | null }) {
  return <Shell title="Access unavailable"><p>This Maketo identity does not have access to the Logistics Partner Portal.</p><p className="muted">Authentication succeeded for {user?.email ?? "this identity"}; Logistics capability approval is separate.</p><Link to="/login">Use another identity</Link></Shell>
}

function Dashboard({ user, signOut }: { user: AuthUser; signOut: () => void }) {
  const [data, setData] = useState<LogisticsContext | null>(null); const [error, setError] = useState<string | null>(null)
  useEffect(() => { void context().then(response => setData(response.data)).catch(reason => setError(reason instanceof Error ? reason.message : "Unable to load context.")) }, [])
  return <Shell title="Logistics dashboard">{error && <p className="alert">{error}</p>}{data ? <div className="details"><p><strong>Provider</strong><span>{data.provider.company_name} ({data.provider.code})</span></p><p><strong>Staff</strong><span>{data.staff.name}</span></p><p><strong>Staff type</strong><span>{data.staff.type.replaceAll("_", " ")}</span></p><p><strong>Primary hub</strong><span>{data.staff.primary_hub?.name ?? "Provider-wide"}</span></p><p><strong>Authorized hubs</strong><span>{data.authorized_hubs.map(hub => hub.name).join(", ") || "No hubs configured"}</span></p></div> : !error && <p>Loading provider context...</p>}<button className="secondary" onClick={signOut}>Sign out</button></Shell>
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null); const [loading, setLoading] = useState(Boolean(getToken()))
  const navigate = useNavigate()
  useEffect(() => {
    if (!getToken()) return
    void me().then(response => setUser(response.user)).catch(reason => { if (reason instanceof ApiError && reason.status === 401) clearToken() }).finally(() => setLoading(false))
  }, [])
  async function signOut() { try { await logout() } catch {} clearToken(); setUser(null); navigate("/login", { replace: true }) }
  if (loading) return <Shell title="Restoring session"><p>Checking your Maketo identity...</p></Shell>
  return <Routes>
    <Route path="/login" element={<LoginPage onAuthenticated={setUser} />} />
    <Route path="/access-denied" element={<AccessDenied user={user} />} />
    <Route path="/dashboard" element={!user ? <Navigate to="/login" replace /> : !user.capabilities.logistics ? <Navigate to="/access-denied" replace /> : <Dashboard user={user} signOut={signOut} />} />
    <Route path="*" element={<Navigate to={logisticsDestination(user)} replace />} />
  </Routes>
}
