import { useEffect, useState, type FormEvent } from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router"
import { ApiError, clearToken, context, getToken, login, logout, me, storeToken, verifyTwoFactor, type AuthUser, type LogisticsContext } from "./api"
import { logisticsDestination } from "./access"
import AuthLayout from "./components/AuthLayout"
import AppShell from "./components/AppShell"
import ApplyPage from "./pages/ApplyPage"
import ApplicationStatusPage from "./pages/ApplicationStatusPage"
import {
  Alert, Button, Field, LoadingRows,
} from "./components/ui"
import { forgotPasswordUrl, logisticsRegistrationUrl } from "./config"
import {
  AssignmentsPage, DashboardPage, HubsPage, HubDetailPage, IncomingParcelsPage,
  MessagesPage, PickupRequestsPage, ProviderPage, ReportsPage, RiderDetailPage,
  RidersPage, SettingsPage, ShipmentDetailPage, ShipmentsPage, SortingPage, StaffPage,
} from "./pages/PortalPages"

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
          No Marketo account yet?{" "}
          <a href={logisticsRegistrationUrl()} className="text-[var(--color-navy)] font-[500] hover:underline">
            Register as a Logistics Provider
          </a>
          <span className="block mt-1 text-xs">
            Already have a Marketo account? Sign in above to apply.
          </span>
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
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => navigate("/application-status", { replace: true })}>
          View application status
        </Button>
        <Button variant="ghost" onClick={() => navigate("/login", { replace: true })}>
          Return to sign in
        </Button>
      </div>
    </AuthLayout>
  )
}

function Workspace({ user, onSignOut }: { user: AuthUser; onSignOut: () => void }) {
  const navigate = useNavigate()
  const [data, setData] = useState<LogisticsContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void context()
      .then(response => setData(response.data))
      .catch(reason => {
        if (reason instanceof ApiError && reason.status === 403) {
          navigate("/access-denied", { replace: true })
          return
        }
        setError(reason instanceof Error ? reason.message : "Unable to load provider context.")
      })
      .finally(() => setLoading(false))
  }, [navigate])

  if (loading) return <AuthLayout title="Loading workspace" subtitle="Verifying your provider and hub access..."><LoadingRows rows={4} /></AuthLayout>
  if (error || !data) return <AuthLayout title="Workspace unavailable" subtitle="The Logistics context could not be loaded."><Alert>{error ?? "Provider context is unavailable."}</Alert><Button variant="secondary" onClick={() => window.location.reload()}>Try again</Button></AuthLayout>

  return <AppShell user={user} context={data} onSignOut={onSignOut}>
    <Routes>
      <Route path="/dashboard" element={<DashboardPage user={user} context={data} />} />
      <Route path="/operations/pickups" element={<PickupRequestsPage />} />
      <Route path="/operations/incoming" element={<IncomingParcelsPage context={data} />} />
      <Route path="/operations/sorting" element={<SortingPage />} />
      <Route path="/operations/assignments" element={<AssignmentsPage />} />
      <Route path="/operations/shipments" element={<ShipmentsPage />} />
      <Route path="/operations/shipments/:id" element={<ShipmentDetailPage />} />
      <Route path="/riders" element={<RidersPage context={data} />} />
      <Route path="/riders/:id" element={<RiderDetailPage context={data} />} />
      <Route path="/hubs" element={<HubsPage />} />
      <Route path="/hubs/:id" element={<HubDetailPage context={data} />} />
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/provider" element={<ProviderPage context={data} />} />
      <Route path="/staff" element={<StaffPage user={user} context={data} />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </AppShell>
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
    <Route path="/application-status" element={
      !user ? <Navigate to="/login" replace />
        : user.capabilities.logistics ? <Navigate to="/dashboard" replace />
        : <ApplicationStatusPage user={user} isAdmin={user.capabilities.admin} />
    } />
    <Route path="/apply" element={
      !user ? <Navigate to="/login" replace />
        : user.capabilities.logistics ? <Navigate to="/dashboard" replace />
        : <ApplyPage user={user} />
    } />
    <Route path="/*" element={!user ? <Navigate to="/login" replace />
      : !user.capabilities.logistics ? <Navigate to="/access-denied" replace />
        : <Workspace user={user} onSignOut={signOut} />} />
  </Routes>
}
