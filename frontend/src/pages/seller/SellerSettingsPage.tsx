import { useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Banknote, UserRound, TriangleAlert } from "lucide-react";
import { createPortal } from "react-dom";
import { useAuth } from "../../auth/AuthContext";
import { changeSellerPassword, fetchSellerPayouts, fetchSellerProfile, fetchSellerSecurity, requestSellerDangerChallenge, requestSellerMfaChallenge, requestSellerPasswordChallenge, revokeSellerSession, updateSellerProfile, verifySellerDangerChallenge, verifySellerMfaChallenge, type SellerPayout, type SellerProfile, type SellerSecurityChallenge, type SellerSecurityState } from "../../api/seller";
import { updateAccountProfile } from "../../api/account";
import { PasswordStrength } from "../auth/AuthLayout";
import { useUrlTab } from "../../hooks/useUrlTab";

type SettingsTab = "profile" | "payouts" | "security" | "danger-zone";

const SETTINGS_TABS: readonly SettingsTab[] = ["profile", "payouts", "security", "danger-zone"];

const INPUT =
  "w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] focus:outline-none focus:border-[var(--color-navy)] bg-white transition-colors font-[var(--font-body)]";
const LABEL = "block text-sm font-[500] text-[var(--color-ink)] mb-1.5";

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm mb-5">
      <div className="px-6 py-4 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-[600] text-[var(--color-ink)]">{title}</h2>
        {subtitle && <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Toggle({ checked }: { checked: boolean }) {
  return <span className={`inline-block h-5 w-9 rounded-full ${checked ? "bg-[var(--color-navy)]" : "bg-[var(--color-border)]"}`} />;
}

function DangerZone() {
  const [action, setAction] = useState<"deactivate" | "close" | null>(null)
  const [confirmation, setConfirmation] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [challenge, setChallenge] = useState<{ challenge_id: number; challenge_token: string; expires_at: string; action: "deactivate" | "close" } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const phrase = action === "close" ? "CLOSE SELLER ACCOUNT" : "DEACTIVATE STORE"
  const reset = () => { setAction(null); setConfirmation(""); setPassword(""); setCode(""); setChallenge(null); setNotice(null); setBusy(false) }
  const send = async () => {
    if (!action || confirmation !== phrase || !password || busy) return
    setBusy(true); setNotice(null)
    try { const response = await requestSellerDangerChallenge({ action, confirmation, password }); setChallenge(response.data); setNotice(response.message); setPassword("") }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to send verification code.") }
    finally { setBusy(false) }
  }
  const verify = async () => {
    if (!challenge || code.length !== 6 || busy) return
    setBusy(true); setNotice(null)
    try { await verifySellerDangerChallenge({ action: challenge.action, challenge_id: challenge.challenge_id, challenge_token: challenge.challenge_token, code }); reset(); window.location.assign("/") }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to complete account action.") }
    finally { setBusy(false) }
  }
  return <SectionCard title="Danger zone" subtitle="Security-sensitive actions preserve orders, transactions, disputes, and audit history.">
    <div className="space-y-3"><div className="flex items-center justify-between gap-4 border border-[var(--color-border)] px-4 py-3.5"><div><p className="text-sm font-[500]">Deactivate store</p><p className="text-xs text-[var(--color-ink-muted)]">Hide the store from buyers while preserving marketplace history.</p></div><button onClick={() => { reset(); setAction("deactivate") }} className="border border-[var(--color-amber-border)] px-3 py-2 text-xs text-[var(--color-amber)]">Deactivate</button></div>
      <div className="flex items-center justify-between gap-4 border border-[var(--color-red-border)] bg-[var(--color-red-light)] px-4 py-3.5"><div><p className="text-sm font-[500] text-[var(--color-red)]">Close seller account</p><p className="text-xs text-[var(--color-red)]/70">Close seller access without deleting financial or order records.</p></div><button onClick={() => { reset(); setAction("close") }} className="bg-[var(--color-red)] px-3 py-2 text-xs text-white">Close account</button></div></div>
    {action && createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) reset() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="danger-title" className="w-full max-w-lg rounded-sm border border-[var(--color-border)] bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3 mb-4"><TriangleAlert className="text-[var(--color-red)] shrink-0" size={22}/><div><h2 id="danger-title" className="text-lg font-[600]">{action === "close" ? "Close Seller Account?" : "Deactivate Store?"}</h2><p className="mt-1 text-sm text-[var(--color-ink-muted)]">{action === "close" ? "Seller access will close, but marketplace, financial, order, review, and audit history will remain." : "Your store and active products will be hidden from buyers while all marketplace history remains."}</p></div></div>
        <ul className="mb-4 list-disc pl-5 text-xs text-[var(--color-ink-muted)] space-y-1"><li>Open fulfillment, returns, disputes, renewals, or unsettled payments can block this action.</li><li>Email verification is action-scoped, expires after ten minutes, and can be used once.</li></ul>
        <div className="space-y-3">{!challenge ? <><label className={LABEL}>Type {phrase}</label><input autoFocus className={INPUT} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={phrase}/><label className={LABEL}>Current password</label><input type="password" autoComplete="current-password" className={INPUT} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Account password"/></> : <><label className={LABEL}>Email verification code</label><input autoFocus inputMode="numeric" maxLength={6} className={INPUT} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code"/><p className="text-xs text-[var(--color-ink-muted)]">Expires {new Date(challenge.expires_at).toLocaleString()}.</p></>}
          {notice && <p role="status" className="text-xs text-[var(--color-ink-muted)]">{notice}</p>}
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={reset} className="border border-[var(--color-border)] px-4 py-2 text-sm">Cancel</button>{!challenge ? <button type="button" onClick={() => void send()} disabled={busy || confirmation !== phrase || !password} className="bg-[var(--color-red)] px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? "Sending..." : "Send email code"}</button> : <button type="button" onClick={() => void verify()} disabled={busy || code.length !== 6} className="bg-[var(--color-red)] px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? "Verifying..." : action === "close" ? "Confirm closure" : "Confirm deactivation"}</button>}</div>
        </div>
      </div>
    </div>, document.body)}
  </SectionCard>
}

function AccountTab() {
  const { user, refreshUser } = useAuth();
  const displayName = user?.display_name ?? user?.name ?? "";
  const nameParts = displayName.trim().split(/\s+/).filter(Boolean);
  const firstName = user?.first_name ?? nameParts[0] ?? "";
  const lastName = user?.last_name ?? nameParts.slice(1).join(" ") ?? "";
  const saved = { firstName, lastName, phone: user?.phone ?? user?.mobile ?? "" };
  const [draft, setDraft] = useState(saved);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => { if (!editing) setDraft(saved) }, [firstName, lastName, saved.phone, editing]);
  const cancel = () => { setDraft(saved); setEditing(false); setNotice(null) };
  const save = async () => {
    if (saving) return;
    setSaving(true); setNotice(null);
    try {
      const response = await updateAccountProfile({ first_name: draft.firstName.trim(), last_name: draft.lastName.trim(), phone: draft.phone.trim() });
      setNotice(response.message); setEditing(false); await refreshUser();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save personal information.") }
    finally { setSaving(false) }
  };

  return (
    <div>
      <SectionCard title="Personal information" subtitle="Your verified email stays read-only until a secure email-change flow is available.">
        <div className="flex justify-end mb-4">{!editing ? <button type="button" onClick={() => { setEditing(true); setNotice(null) }} className="px-4 py-2 border border-[var(--color-border)] text-sm">Edit</button> : <div className="flex gap-2"><button type="button" onClick={cancel} className="px-4 py-2 border border-[var(--color-border)] text-sm">Cancel</button><button type="button" onClick={() => void save()} disabled={saving || !draft.firstName.trim() || !draft.lastName.trim() || !draft.phone.trim()} className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm disabled:opacity-50">{saving ? "Saving..." : "Save changes"}</button></div>}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LABEL}>First name</label>
            <input type="text" value={draft.firstName} readOnly={!editing} onChange={(event) => setDraft(current => ({ ...current, firstName: event.target.value }))} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Last name</label>
            <input type="text" value={draft.lastName} readOnly={!editing} onChange={(event) => setDraft(current => ({ ...current, lastName: event.target.value }))} className={INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LABEL}>Email address</label>
            <input type="email" value={user?.email ?? ""} readOnly className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Mobile number</label>
            <input type="tel" value={draft.phone} readOnly={!editing} onChange={(event) => setDraft(current => ({ ...current, phone: event.target.value }))} className={INPUT} />
          </div>
        </div>
        {notice && <p role="status" className="text-xs text-[var(--color-ink-muted)]">{notice}</p>}
      </SectionCard>
    </div>
  );
}

function PayoutsTab({ profile }: { profile: SellerProfile | null }) {
  const [method, setMethod] = useState(profile?.payout_method ?? "");
  const [schedule, setSchedule] = useState(profile?.payout_schedule ?? "");
  const [bankName, setBankName] = useState(profile?.bank_name ?? "");
  const [accountType, setAccountType] = useState(profile?.account_type ?? "");
  const [accountNumber, setAccountNumber] = useState(profile?.bank_account_number ?? "");
  const [gcashNumber, setGcashNumber] = useState(profile?.gcash_number ?? "");
  const [mayaNumber, setMayaNumber] = useState(profile?.maya_number ?? "");
  const [accountName, setAccountName] = useState(profile?.account_name ?? "");
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutNotice, setPayoutNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState<SellerPayout[]>([]);
  const [historyError, setHistoryError] = useState("");
  useEffect(() => { fetchSellerPayouts().then((response) => setHistory(response.data)).catch((error: Error) => setHistoryError(error.message)) }, []);
  const normalizeDigits = (value: string, maxLength: number) =>
    value.replace(/\D/g, "").slice(0, maxLength);
  const formatAccountNumber = (value: string) =>
    value
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(\d{4})(?=\d)/g, "$1-");
  const formatWalletNumber = (value: string) => normalizeDigits(value, 10);
  const formatWalletDisplay = (value: string) => {
    const digits = normalizeDigits(value, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  };
  const markEditing = () => setEditing(true);

  useEffect(() => {
    setMethod(profile?.payout_method ?? "");
    setSchedule(profile?.payout_schedule ?? "");
    setBankName(profile?.bank_name ?? "");
    setAccountType(profile?.account_type ?? "");
    setAccountNumber(profile?.bank_account_number ?? "");
    setGcashNumber(profile?.gcash_number ?? "");
    setMayaNumber(profile?.maya_number ?? "");
    setAccountName(profile?.account_name ?? "");
    setEditing(false);
  }, [profile]);

  const isBankTransfer = method === "bank";

  const handleSavePayout = async () => {
    if (!profile?.business_name || savingPayout) {
      return;
    }

    setSavingPayout(true);
    setPayoutNotice(null);

    try {
      const response = await updateSellerProfile({
        business_name: profile.business_name,
        trade_name: profile.trade_name,
        tagline: profile.tagline,
        description: profile.description,
        contact_email: profile.contact_email,
        public_email: profile.public_email,
        contact_phone: profile.contact_phone,
        messaging_phone: profile.messaging_phone,
        address_line1: profile.address_line1,
        address_line2: profile.address_line2,
        province: profile.province,
        city: profile.city,
        postal_code: profile.postal_code,
        payout_method: method || null,
        payout_schedule: schedule || null,
        bank_name: bankName || null,
        account_type: accountType || profile.account_type || null,
        bank_account_number: accountNumber || null,
        gcash_number: gcashNumber || null,
        maya_number: mayaNumber || null,
        account_name: accountName || null,
        operating_hours: profile.operating_hours?.filter((item) => item.day || item.hours).map((item) => ({
          day: item.day ?? "",
          hours: item.hours ?? "",
        })),
      });

      setPayoutNotice(response.message);
      setEditing(false);
    } catch (error) {
      setPayoutNotice(error instanceof Error ? error.message : "Unable to save payout details right now.");
    } finally {
      setSavingPayout(false);
    }
  };

  const handleCancelEdit = () => {
    if (!profile) {
      return;
    }

    setMethod(profile.payout_method ?? "");
    setSchedule(profile.payout_schedule ?? "");
    setBankName(profile.bank_name ?? "");
    setAccountType(profile.account_type ?? "");
    setAccountNumber(profile.bank_account_number ?? "");
    setGcashNumber(profile.gcash_number ?? "");
    setMayaNumber(profile.maya_number ?? "");
    setAccountName(profile.account_name ?? "");
    setEditing(false);
    setPayoutNotice(null);
  };

  return (
    <div>
      <SectionCard title="Payout method" subtitle="Where Marketo sends your earnings.">
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-xs text-[var(--color-ink-muted)]">
            {editing ? "Editing payout details" : "Viewing saved payout details"}
          </p>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-3 py-2 text-xs font-[500] rounded-sm border border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] cursor-pointer"
            >
              Edit payout details
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-2 text-xs font-[500] rounded-sm border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSavePayout()}
                disabled={savingPayout}
                className={`px-3 py-2 text-xs font-[500] rounded-sm bg-[var(--color-navy)] text-white transition-colors ${savingPayout ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--color-navy-hover)] cursor-pointer"}`}
              >
                {savingPayout ? "Saving..." : "Save changes"}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {[
            { id: "bank", label: "Bank transfer", icon: "🏦" },
            { id: "gcash", label: "GCash", icon: "📱" },
            { id: "maya", label: "Maya", icon: "💳" },
          ].map((item) => (
            <label
              key={item.id}
              className={`flex gap-2.5 p-3.5 rounded-sm border cursor-pointer transition-all ${
                method === item.id ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)]" : "border-[var(--color-border)] hover:border-[var(--color-navy)]/40"
              }`}
            >
              <input
                type="radio"
                name="payout-method"
                value={item.id}
                checked={method === item.id}
                onChange={() => {
                  setMethod(item.id);
                  markEditing();
                }}
                className="accent-[var(--color-navy)] mt-0.5"
                disabled={!editing}
              />
              <div>
                <span className="text-xl">{item.icon}</span>
                <p className={`text-sm font-[500] mt-1 ${method === item.id ? "text-[var(--color-navy)]" : "text-[var(--color-ink)]"}`}>{item.label}</p>
              </div>
            </label>
          ))}
        </div>

        {method === "bank" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Bank name</label>
              <select className={INPUT + " cursor-pointer"} value={bankName} onChange={(event) => { setBankName(event.target.value); markEditing(); }} disabled={!editing}>
                <option value="">Select bank</option>
                <option value="BDO Unibank">BDO Unibank</option>
                <option value="BPI (Bank of the Philippine Islands)">BPI (Bank of the Philippine Islands)</option>
                <option value="Metrobank">Metrobank</option>
                <option value="UnionBank">UnionBank</option>
                <option value="Land Bank">Land Bank</option>
                <option value="Security Bank">Security Bank</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Account type</label>
              <select className={INPUT + " cursor-pointer"} value={accountType} onChange={(event) => { setAccountType(event.target.value); markEditing(); }} disabled={!editing}>
                <option value="">Select type</option>
                <option value="Savings">Savings</option>
                <option value="Checking">Checking</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Account number</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={19}
                placeholder="xxxx-xxxx-xxxx-xxxx"
                value={formatAccountNumber(accountNumber)}
                disabled={!editing}
                onChange={(event) => {
                  setAccountNumber(normalizeDigits(event.target.value, 16));
                  markEditing();
                }}
                className={INPUT + " font-[var(--font-mono)] tracking-[0.12em]"}
              />
              <p className="mt-1 text-[11px] text-[var(--color-ink-muted)]">
                Digits only, shown as groups of four.
              </p>
            </div>
            <div>
              <label className={LABEL}>Account name</label>
              <input type="text" value={accountName} onChange={(event) => { setAccountName(event.target.value); markEditing(); }} className={INPUT} />
            </div>
          </div>
        )}

        {method === "gcash" && (
          <div className="max-w-md">
            <label className={LABEL}>GCash number</label>
            <div className={`flex items-center rounded-sm border bg-white transition-all border-[var(--color-border)] focus-within:border-[var(--color-navy)] focus-within:ring-2 focus-within:ring-[var(--color-navy)]/10`}>
              <span className="px-3.5 py-2.5 text-sm text-[var(--color-ink-muted)] border-r border-[var(--color-border)] bg-[var(--color-surface)] select-none">
                +63
              </span>
              <input
                type="tel"
                inputMode="numeric"
                value={formatWalletDisplay(gcashNumber)}
                disabled={!editing}
                onChange={(event) => { setGcashNumber(formatWalletNumber(event.target.value)); markEditing(); }}
                placeholder="917 555 0182"
                className="flex-1 px-3.5 py-2.5 text-sm outline-none bg-transparent text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)]"
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--color-ink-muted)]">
              Enter the 10-digit GCash number without +63.
            </p>
            <p className="mt-1 text-[11px] text-[var(--color-ink-muted)]">
              This number is saved separately from Maya.
            </p>
          </div>
        )}

        {method === "maya" && (
          <div className="max-w-md">
            <label className={LABEL}>Maya number</label>
            <div className={`flex items-center rounded-sm border bg-white transition-all border-[var(--color-border)] focus-within:border-[var(--color-navy)] focus-within:ring-2 focus-within:ring-[var(--color-navy)]/10`}>
              <span className="px-3.5 py-2.5 text-sm text-[var(--color-ink-muted)] border-r border-[var(--color-border)] bg-[var(--color-surface)] select-none">
                +63
              </span>
              <input
                type="tel"
                inputMode="numeric"
                value={formatWalletDisplay(mayaNumber)}
                disabled={!editing}
                onChange={(event) => { setMayaNumber(formatWalletNumber(event.target.value)); markEditing(); }}
                placeholder="917 555 0182"
                className="flex-1 px-3.5 py-2.5 text-sm outline-none bg-transparent text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)]"
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--color-ink-muted)]">
              Enter the 10-digit Maya number without +63.
            </p>
          </div>
        )}

        {payoutNotice && (
          <p className={`mt-4 text-xs ${payoutNotice.toLowerCase().includes("unable") ? "text-[var(--color-red)]" : "text-[var(--color-green)]"}`}>
            {payoutNotice}
          </p>
        )}

        <div className="mt-5 flex justify-end">
          {editing ? (
            <button
              type="button"
              onClick={() => void handleSavePayout()}
              disabled={savingPayout}
              className={`px-4 py-2 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm transition-colors ${savingPayout ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--color-navy-hover)] cursor-pointer"}`}
            >
              {savingPayout ? "Saving..." : "Save payout method"}
            </button>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Payout schedule">
        <div className="space-y-3 mb-5">
          {[
            { id: "daily", label: "Daily payouts", desc: "Settled on the next business day after order completion." },
            { id: "weekly", label: "Weekly payouts", desc: "Settled every Monday for the prior week's completed orders." },
          ].map((item) => (
            <label
              key={item.id}
              className={`flex gap-3 p-3.5 border rounded-sm cursor-pointer transition-colors ${
                schedule === item.id ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)]" : "border-[var(--color-border)] hover:border-[var(--color-navy)]/40"
              }`}
            >
              <input type="radio" name="schedule" value={item.id} checked={schedule === item.id} onChange={() => { setSchedule(item.id); markEditing(); }} className="mt-0.5 accent-[var(--color-navy)]" />
              <div>
                <p className="text-sm font-[500] text-[var(--color-ink)]">{item.label}</p>
                <p className="text-xs text-[var(--color-ink-muted)]">{item.desc}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-4 px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm">
          <div className="flex-1">
            <p className="text-xs text-[var(--color-ink-muted)]">Pending payout</p>
            <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-green)]" />
            <p className="text-xs text-[var(--color-ink-disabled)]" />
          </div>
          <button disabled className="px-4 py-2 border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] rounded-sm opacity-60 cursor-not-allowed">
            Request now
          </button>
        </div>
      </SectionCard>
      <SectionCard title="Payout history" subtitle="Authoritative settlements created by Maketo administration.">
        {historyError && <p className="text-sm text-[var(--color-red)]">{historyError}</p>}
        {!historyError && history.length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">No payout records yet.</p>}
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Reference","Period","Gross","Commission","Net","Status"].map((heading) => <th key={heading} className="border-b p-3">{heading}</th>)}</tr></thead><tbody>{history.map((payout) => <tr key={payout.id} className="border-b"><td className="p-3 font-medium">{payout.payout_number}</td><td className="p-3">{payout.period_start} – {payout.period_end}</td><td className="p-3">₱{Number(payout.gross_amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td><td className="p-3">₱{Number(payout.commission_amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td><td className="p-3 font-semibold">₱{Number(payout.net_amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td><td className="p-3 uppercase">{payout.status}</td></tr>)}</tbody></table></div>
      </SectionCard>
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    "new-order-email": false,
    "new-order-sms": false,
    "new-order-push": false,
    "low-stock-email": false,
    "low-stock-sms": false,
    "low-stock-push": false,
    "review-email": false,
    "review-sms": false,
    "review-push": false,
    "payout-email": false,
    "payout-sms": false,
    "payout-push": false,
    "promo-email": false,
    "promo-sms": false,
    "promo-push": false,
    "security-email": false,
    "security-sms": false,
    "security-push": false,
  });

  const rows = [
    { key: "new-order", label: "New order received", desc: "When a buyer places an order in your store" },
    { key: "low-stock", label: "Low stock alert", desc: "When a product drops below its threshold" },
    { key: "review", label: "New review", desc: "When a buyer leaves a review on your product" },
    { key: "payout", label: "Payout confirmation", desc: "When a payout is processed to your account" },
    { key: "promo", label: "Promotional tips", desc: "Suggestions to improve your store visibility" },
    { key: "security", label: "Security alerts", desc: "Login from new device, password changes" },
  ];

  const toggle = (key: string) => {
    setPrefs((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <th className="px-5 py-3 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Notification</th>
            <th className="px-5 py-3 text-center font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Email</th>
            <th className="px-5 py-3 text-center font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">SMS</th>
            <th className="px-5 py-3 text-center font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">Push</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-surface)] transition-colors">
              <td className="px-5 py-4">
                <p className="text-sm font-[500] text-[var(--color-ink)]">{row.label}</p>
                <p className="text-xs text-[var(--color-ink-muted)]">{row.desc}</p>
              </td>
              {(["email", "sms", "push"] as const).map((channel) => (
                <td key={channel} className="px-5 py-4 text-center">
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => toggle(`${row.key}-${channel}`)}
                      aria-label={`${row.label} ${channel}`}
                      className="cursor-not-allowed"
                      disabled
                    >
                      <Toggle checked={prefs[`${row.key}-${channel}`] ?? false} />
                    </button>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SecurityTab({ profile }: { profile: SellerProfile | null }) {
  const [twofa, setTwofa] = useState(Boolean(profile?.verified));

  return (
    <div>
      <SectionCard title="Two-factor authentication" subtitle="Add an extra layer of security to your account.">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm text-[var(--color-ink-muted)] mb-2">Two-factor authentication requires a verification code each time you log in, in addition to your password.</p>
            <span className={`font-[var(--font-mono)] text-[10px] px-2 py-1 rounded ${twofa ? "bg-[var(--color-green-light)] text-[var(--color-green)]" : "bg-[var(--color-surface)] text-[var(--color-ink-disabled)]"}`}>
              {twofa ? "Enabled" : "Disabled"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setTwofa((current) => !current)}
            className={`px-4 py-2 text-sm font-[500] rounded-sm cursor-not-allowed transition-colors opacity-60 ${
              twofa ? "border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]" : "bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-hover)]"
            }`}
            disabled
          >
            {twofa ? "Disable 2FA" : "Enable 2FA"}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Active sessions" subtitle="Devices currently signed into your seller account.">
        <div className="space-y-3">
          <div className="min-h-28 rounded-sm border border-[var(--color-border)] bg-[var(--color-ground)]" />
        </div>
        <div className="mt-4">
          <button disabled className="text-sm text-[var(--color-red)] hover:underline cursor-not-allowed opacity-60">
            Sign out of all other sessions
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Login activity" subtitle="Recent account access events.">
        <div className="space-y-2 min-h-20 rounded-sm border border-[var(--color-border)] bg-[var(--color-ground)]" />
      </SectionCard>
    </div>
  );
}

function SellerSecurityTab({ state, loading, onReload }: { state: SellerSecurityState | null; loading: boolean; onReload: () => Promise<void> }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordCode, setPasswordCode] = useState("");
  const [passwordChallenge, setPasswordChallenge] = useState<SellerSecurityChallenge | null>(null);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [mfaPassword, setMfaPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaChallenge, setMfaChallenge] = useState<SellerSecurityChallenge | null>(null);
  const [isMfaEnabling, setIsMfaEnabling] = useState(false);
  const [isMfaDisabling, setIsMfaDisabling] = useState(false);
  const [isMfaVerifying, setIsMfaVerifying] = useState(false);
  const [mfaNotice, setMfaNotice] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const passwordValid = newPassword.length >= 8 && newPassword.length <= 16 && /[A-Z]/.test(newPassword) && /\d/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword) && newPassword === confirmPassword;
  const mfaAction = state?.mfa.enabled ? "disable" : "enable";

  const submitPassword = async () => {
    if (!state || !currentPassword || !passwordValid || isPasswordSubmitting) return;
    setIsPasswordSubmitting(true); setPasswordNotice(null);
    try {
      if (state.mfa.enabled && !passwordChallenge) {
        const response = await requestSellerPasswordChallenge(currentPassword);
        setPasswordChallenge(response.data); setPasswordNotice(response.message); return;
      }
      const response = await changeSellerPassword({ current_password: currentPassword, password: newPassword, password_confirmation: confirmPassword, ...(passwordChallenge ? { challenge_id: passwordChallenge.challenge_id, challenge_token: passwordChallenge.challenge_token, code: passwordCode } : {}) });
      setPasswordNotice(response.message); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordCode(""); setPasswordChallenge(null); await onReload();
    } catch (error) { setPasswordNotice(error instanceof Error ? error.message : "Unable to update the password.") }
    finally { setIsPasswordSubmitting(false) }
  };

  const sendMfaCode = async () => {
    if (!mfaPassword || isMfaEnabling || isMfaDisabling) return;
    mfaAction === "enable" ? setIsMfaEnabling(true) : setIsMfaDisabling(true); setMfaNotice(null);
    try { const response = await requestSellerMfaChallenge({ action: mfaAction, current_password: mfaPassword }); setMfaChallenge(response.data); setMfaPassword(""); setMfaNotice(response.message) }
    catch (error) { setMfaNotice(error instanceof Error ? error.message : "Unable to send the MFA code.") }
    finally { setIsMfaEnabling(false); setIsMfaDisabling(false) }
  };

  const verifyMfa = async () => {
    if (!mfaChallenge || mfaCode.length !== 6 || isMfaVerifying) return;
    setIsMfaVerifying(true); setMfaNotice(null);
    try { const response = await verifySellerMfaChallenge({ action: mfaAction, challenge_id: mfaChallenge.challenge_id, challenge_token: mfaChallenge.challenge_token, code: mfaCode }); setMfaNotice(response.message); setMfaCode(""); setMfaChallenge(null); await onReload() }
    catch (error) { setMfaNotice(error instanceof Error ? error.message : "Unable to verify the MFA code.") }
    finally { setIsMfaVerifying(false) }
  };

  const revoke = async (id: number) => {
    setRevokingId(id);
    try { await revokeSellerSession(id); await onReload() }
    catch (error) { setMfaNotice(error instanceof Error ? error.message : "Unable to revoke the session.") }
    finally { setRevokingId(null) }
  };

  if (loading) return <div className="py-12 text-sm text-[var(--color-ink-muted)]">Loading security settings...</div>;
  if (!state) return <SectionFailure label="Security settings" />;

  return <div>
    <SectionCard title="Change password" subtitle={state.mfa.enabled ? "Email MFA verification is required before your password can change." : "Other access tokens are revoked after a successful change."}>
      <div className="max-w-md space-y-3">
        <label className={LABEL}>Current password</label><input type={showPasswords ? "text" : "password"} autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className={INPUT}/>
        <label className={LABEL}>New password</label><input type={showPasswords ? "text" : "password"} autoComplete="new-password" maxLength={16} value={newPassword} onChange={event => setNewPassword(event.target.value)} className={INPUT}/><PasswordStrength password={newPassword}/>
        <label className={LABEL}>Confirm new password</label><input type={showPasswords ? "text" : "password"} autoComplete="new-password" maxLength={16} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className={INPUT}/>
        <button type="button" onClick={() => setShowPasswords(current => !current)} className="flex items-center gap-1 text-xs text-[var(--color-ink-muted)]">{showPasswords ? <EyeOff size={14}/> : <Eye size={14}/>} {showPasswords ? "Hide passwords" : "Show passwords"}</button>
        {passwordChallenge && <><label className={LABEL}>Email verification code</label><input inputMode="numeric" maxLength={6} value={passwordCode} onChange={event => setPasswordCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className={INPUT}/></>}
        {passwordNotice && <p role="status" className="text-xs text-[var(--color-ink-muted)]">{passwordNotice}</p>}
        <button type="button" onClick={() => void submitPassword()} disabled={!passwordValid || !currentPassword || isPasswordSubmitting || Boolean(passwordChallenge && passwordCode.length !== 6)} className="bg-[var(--color-navy)] px-4 py-2 text-sm text-white disabled:opacity-50">{isPasswordSubmitting ? "Submitting..." : passwordChallenge ? "Verify and change password" : state.mfa.enabled ? "Send MFA code" : "Change password"}</button>
      </div>
    </SectionCard>

    <SectionCard title="Email multi-factor authentication" subtitle="Uses the existing one-time email verification challenge at sign-in.">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><span className={`text-xs font-[600] ${state.mfa.enabled ? "text-[var(--color-green)]" : "text-[var(--color-ink-muted)]"}`}>{state.mfa.enabled ? "Enabled" : "Disabled"}</span>{state.mfa.confirmed_at && <p className="text-xs text-[var(--color-ink-muted)] mt-1">Confirmed {new Date(state.mfa.confirmed_at).toLocaleString()}</p>}</div></div>
      <div className="mt-4 max-w-md space-y-3">{!mfaChallenge ? <><label className={LABEL}>Current password</label><input type="password" autoComplete="current-password" value={mfaPassword} onChange={event => setMfaPassword(event.target.value)} className={INPUT}/><button type="button" onClick={() => void sendMfaCode()} disabled={!mfaPassword || isMfaEnabling || isMfaDisabling} className={`${state.mfa.enabled ? "bg-[var(--color-red)]" : "bg-[var(--color-navy)]"} px-4 py-2 text-sm text-white disabled:opacity-50`}>{isMfaEnabling || isMfaDisabling ? "Sending..." : `${state.mfa.enabled ? "Disable" : "Enable"} MFA`}</button></> : <><label className={LABEL}>Email verification code</label><input inputMode="numeric" maxLength={6} value={mfaCode} onChange={event => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className={INPUT}/><div className="flex gap-2"><button type="button" onClick={() => void verifyMfa()} disabled={mfaCode.length !== 6 || isMfaVerifying} className="bg-[var(--color-navy)] px-4 py-2 text-sm text-white disabled:opacity-50">{isMfaVerifying ? "Verifying..." : `Verify and ${mfaAction}`}</button><button type="button" onClick={() => { setMfaChallenge(null); setMfaCode(""); setMfaNotice(null) }} className="border border-[var(--color-border)] px-4 py-2 text-sm">Cancel</button></div></>}{mfaNotice && <p role="status" className="text-xs text-[var(--color-ink-muted)]">{mfaNotice}</p>}</div>
    </SectionCard>

    <SectionCard title="Sessions and access tokens" subtitle="Only server-recorded Sanctum access tokens are shown.">
      <div className="space-y-2">{state.sessions.map(session => <div key={session.id} className="flex items-center justify-between gap-4 border border-[var(--color-border)] p-3"><div><p className="text-sm font-[500]">{session.name} {session.is_current && <span className="text-xs text-[var(--color-green)]">Current</span>}</p><p className="text-xs text-[var(--color-ink-muted)]">Last used {session.last_used_at ? new Date(session.last_used_at).toLocaleString() : "not recorded"} · Created {session.created_at ? new Date(session.created_at).toLocaleDateString() : "unknown"}</p></div>{!session.is_current && <button type="button" onClick={() => void revoke(session.id)} disabled={revokingId === session.id} className="text-xs text-[var(--color-red)] disabled:opacity-50">{revokingId === session.id ? "Revoking..." : "Revoke"}</button>}</div>)}{state.sessions.length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">No persistent access tokens are recorded for this session.</p>}</div>
      <p className="mt-4 text-xs text-[var(--color-ink-muted)]">Last password change: {state.last_password_changed_at ? new Date(state.last_password_changed_at).toLocaleString() : "Not recorded"}</p>
    </SectionCard>
  </div>;
}

export default function SellerSettingsPage() {
  const { activeTab: tab, setActiveTab: setTab } = useUrlTab(SETTINGS_TABS, "profile");
  const [profile, setProfile] = useState<SellerProfile | null | undefined>(undefined);
  const [security, setSecurity] = useState<SellerSecurityState | null>(null);
  const [isSecurityLoading, setIsSecurityLoading] = useState(false);

  useEffect(() => {
    if (tab !== "payouts" || profile !== undefined) return;
    let active = true;

    void (async () => {
      try {
        const response = await fetchSellerProfile();
        if (!active) return;
        setProfile(response.data);
      } catch {
        if (active) setProfile(null);
      }
    })();

    return () => {
      active = false;
    };
  }, [profile, tab]);

  const loadSecurity = async () => {
    setIsSecurityLoading(true);
    try { const response = await fetchSellerSecurity(); setSecurity(response.data) }
    catch { setSecurity(null) }
    finally { setIsSecurityLoading(false) }
  };

  useEffect(() => {
    if (tab === "security" && !security && !isSecurityLoading) void loadSecurity();
  }, [tab]);

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { id: "profile", label: "Profile", icon: UserRound },
    { id: "payouts", label: "Payouts", icon: Banknote },
    { id: "security", label: "Security", icon: LockKeyhole },
    { id: "danger-zone", label: "Danger Zone", icon: TriangleAlert },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Settings</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">Manage your account, payouts, and security preferences</p>
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border)] mb-6 overflow-x-auto">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-5 py-2.5 text-sm font-[500] border-b-2 -mb-px cursor-pointer transition-colors whitespace-nowrap flex items-center gap-2 ${
                active
                  ? "border-[var(--color-navy)] text-[var(--color-navy)]"
                  : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              <Icon size={15} />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "profile" && <AccountTab />}
      {tab === "payouts" && (profile === undefined ? <div className="py-12 text-sm text-[var(--color-ink-muted)]">Loading payout settings...</div> : <PayoutsTab profile={profile} />)}
      {tab === "security" && <SellerSecurityTab state={security} loading={isSecurityLoading} onReload={loadSecurity} />}
      {tab === "danger-zone" && <DangerZone />}
    </div>
  );
}
