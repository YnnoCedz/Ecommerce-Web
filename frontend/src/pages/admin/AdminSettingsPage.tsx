import { useEffect, useMemo, useState } from "react"
import { LockKeyhole, Settings2 } from "lucide-react"
import { changeAdminPassword, fetchAdminMe, fetchAdminSettings, requestAdminPasswordChallenge, updateAdminSettings, type AdminPlatformSettings } from "../../api/admin"

const INPUT = "mt-1.5 w-full border px-3 py-2.5 text-sm outline-none"
const EMPTY: AdminPlatformSettings = { platform_name: "", support_email: "", seller_document_expiry_warning_days: 30 }

function PlatformSettingsSection() {
  const [original, setOriginal] = useState<AdminPlatformSettings | null>(null)
  const [draft, setDraft] = useState(EMPTY)
  const [isPlatformLoading, setIsPlatformLoading] = useState(true)
  const [isPlatformEditing, setIsPlatformEditing] = useState(false)
  const [isPlatformSaving, setIsPlatformSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => { fetchAdminSettings().then(({ data }) => { setOriginal(data); setDraft(data) }).catch((error: Error) => setNotice(error.message)).finally(() => setIsPlatformLoading(false)) }, [])
  const changed = useMemo(() => original ? (Object.keys(draft) as Array<keyof AdminPlatformSettings>).filter((key) => draft[key] !== original[key]) : [], [draft, original])
  const valid = Boolean(draft.platform_name.trim() && /^\S+@\S+\.\S+$/.test(draft.support_email) && draft.seller_document_expiry_warning_days >= 1 && draft.seller_document_expiry_warning_days <= 180)
  const cancel = () => { if (original) setDraft(original); setIsPlatformEditing(false); setNotice(null) }
  const save = async () => {
    if (!original || !valid || !changed.length || isPlatformSaving) return
    const payload = Object.fromEntries(changed.map((key) => [key, draft[key]])) as Partial<AdminPlatformSettings>
    setIsPlatformSaving(true); setNotice(null)
    try { const response = await updateAdminSettings(payload); setOriginal(response.data); setDraft(response.data); setIsPlatformEditing(false); setNotice(response.message) }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save platform settings.") }
    finally { setIsPlatformSaving(false) }
  }
  const locked = isPlatformEditing ? "border-[var(--color-border)] bg-white focus:border-[var(--color-navy)]" : "cursor-not-allowed border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-ink-muted)]"

  return <section className="border border-[var(--color-border)] bg-white">
    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] p-4"><div className="flex items-center gap-2"><Settings2 size={18}/><div><h2 className="font-[600]">Platform</h2><p className="text-xs text-[var(--color-ink-muted)]">Configuration is locked until you explicitly edit it.</p></div></div>{!isPlatformLoading && !isPlatformEditing && <button onClick={() => { setIsPlatformEditing(true); setNotice(null) }} className="border border-[var(--color-border)] px-4 py-2 text-sm">Edit</button>}</div>
    {notice && <p className="mx-5 mt-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm">{notice}</p>}
    {isPlatformLoading ? <p className="p-5 text-sm text-[var(--color-ink-muted)]">Loading platform settings...</p> : <div className="grid gap-4 p-5 md:grid-cols-2">
      <label className="text-sm">Platform name<input autoComplete="off" readOnly={!isPlatformEditing} className={`${INPUT} ${locked}`} value={draft.platform_name} onChange={(event) => setDraft({ ...draft, platform_name: event.target.value })}/></label>
      <label className="text-sm">Support email<input type="email" autoComplete="off" readOnly={!isPlatformEditing} className={`${INPUT} ${locked}`} value={draft.support_email} onChange={(event) => setDraft({ ...draft, support_email: event.target.value })}/></label>
      <label className="text-sm">Document expiry warning (days)<input type="number" min={1} max={180} autoComplete="off" readOnly={!isPlatformEditing} className={`${INPUT} ${locked}`} value={draft.seller_document_expiry_warning_days} onChange={(event) => setDraft({ ...draft, seller_document_expiry_warning_days: Number(event.target.value) })}/></label>
      {isPlatformEditing && <div className="flex items-end gap-2"><button onClick={cancel} disabled={isPlatformSaving} className="border border-[var(--color-border)] px-4 py-2.5 text-sm disabled:opacity-50">Cancel</button><button onClick={() => void save()} disabled={isPlatformSaving || !changed.length || !valid} className="bg-[var(--color-navy)] px-4 py-2.5 text-sm text-white disabled:opacity-50">{isPlatformSaving ? "Saving Platform..." : "Save Changes"}</button></div>}
    </div>}
  </section>
}

function ChangePasswordForm({ mfaEnabled }: { mfaEnabled: boolean }) {
  const [currentPassword, setCurrentPassword] = useState(""); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [code, setCode] = useState("")
  const [challenge, setChallenge] = useState<{ challenge_id: number; challenge_token: string; expires_at: string } | null>(null)
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false); const [isMfaChallengeSending, setIsMfaChallengeSending] = useState(false); const [isMfaVerifying, setIsMfaVerifying] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const valid = currentPassword.length > 0 && password.length >= 8 && password === confirmation
  const submit = async () => {
    if (!valid) return
    setNotice(null)
    if (mfaEnabled && !challenge) {
      setIsMfaChallengeSending(true)
      try { const response = await requestAdminPasswordChallenge(currentPassword); setChallenge(response.data); setNotice(response.message) } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to send verification code.") } finally { setIsMfaChallengeSending(false) }
      return
    }
    challenge ? setIsMfaVerifying(true) : setIsPasswordSubmitting(true)
    try { const response = await changeAdminPassword({ current_password: currentPassword, password, password_confirmation: confirmation, challenge_id: challenge?.challenge_id, challenge_token: challenge?.challenge_token, code: challenge ? code : undefined }); setNotice(response.message); setCurrentPassword(""); setPassword(""); setConfirmation(""); setCode(""); setChallenge(null) }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to update password.") } finally { setIsPasswordSubmitting(false); setIsMfaVerifying(false) }
  }
  const busy = isPasswordSubmitting || isMfaChallengeSending || isMfaVerifying
  return <div className="max-w-lg space-y-4 p-5">
    {notice && <p className="border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm">{notice}</p>}
    <label className="block text-sm">Current password<input type="password" autoComplete="current-password" className={`${INPUT} border-[var(--color-border)] bg-white`} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)}/></label>
    <label className="block text-sm">New password<input type="password" autoComplete="new-password" maxLength={16} className={`${INPUT} border-[var(--color-border)] bg-white`} value={password} onChange={(event) => setPassword(event.target.value)}/><span className="mt-1 block text-xs text-[var(--color-ink-muted)]">8–16 characters with uppercase, lowercase, number, and symbol.</span></label>
    <label className="block text-sm">Confirm new password<input type="password" autoComplete="new-password" maxLength={16} className={`${INPUT} border-[var(--color-border)] bg-white`} value={confirmation} onChange={(event) => setConfirmation(event.target.value)}/></label>
    {challenge && <label className="block text-sm">MFA verification code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={`${INPUT} border-[var(--color-border)] bg-white`} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}/><span className="mt-1 block text-xs text-[var(--color-ink-muted)]">Single-use code expires {new Date(challenge.expires_at).toLocaleString()}.</span></label>}
    <button onClick={() => void submit()} disabled={busy || !valid || Boolean(challenge && code.length !== 6)} className="bg-[var(--color-navy)] px-4 py-2.5 text-sm text-white disabled:opacity-50">{isMfaChallengeSending ? "Sending Verification Code..." : isMfaVerifying ? "Verifying..." : isPasswordSubmitting ? "Changing Password..." : challenge ? "Verify and Change Password" : mfaEnabled ? "Send Verification Code" : "Change Password"}</button>
  </div>
}

function AdminSecuritySection() {
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null); const [error, setError] = useState<string | null>(null)
  useEffect(() => { fetchAdminMe().then(({ user }) => setMfaEnabled(Boolean(user.two_factor_enabled))).catch((reason: Error) => setError(reason.message)) }, [])
  return <section className="border border-[var(--color-border)] bg-white"><div className="flex items-center gap-2 border-b border-[var(--color-border)] p-4"><LockKeyhole size={18}/><div><h2 className="font-[600]">Administrator password</h2><p className="text-xs text-[var(--color-ink-muted)]">This security workflow is isolated from platform configuration.</p></div></div>{error ? <p className="p-5 text-sm text-red-700">{error}</p> : mfaEnabled === null ? <p className="p-5 text-sm text-[var(--color-ink-muted)]">Loading account security...</p> : <><p className="px-5 pt-5 text-xs text-[var(--color-ink-muted)]">{mfaEnabled ? "MFA verification is enabled and mandatory." : "MFA is not enabled for this administrator."}</p><ChangePasswordForm mfaEnabled={mfaEnabled}/></>}</section>
}

export default function AdminSettingsPage() {
  return <div className="mx-auto max-w-4xl space-y-5 p-6"><div><h1 className="font-[var(--font-display)] text-2xl">Platform settings</h1><p className="text-sm text-[var(--color-ink-muted)]">Manage allowlisted configuration and administrator security independently.</p></div><PlatformSettingsSection/><AdminSecuritySection/></div>
}
