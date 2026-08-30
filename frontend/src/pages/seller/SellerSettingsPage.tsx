import { useEffect, useState } from "react";
import { Bell, Eye, EyeOff, LockKeyhole, Banknote, UserRound } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { fetchSellerProfile, updateSellerProfile, type SellerProfile } from "../../api/seller";
import { updatePasswordRequest } from "../../api/auth";
import { PasswordStrength } from "../auth/AuthLayout";
import { useUrlTab } from "../../hooks/useUrlTab";

type SettingsTab = "account" | "payouts" | "notifications" | "security";

const SETTINGS_TABS: readonly SettingsTab[] = ["account", "payouts", "notifications", "security"];

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
  return (
    <div className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${checked ? "bg-[var(--color-navy)]" : "bg-[var(--color-border)]"}`}>
      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
    </div>
  );
}

function AccountTab() {
  const { user } = useAuth();
  const displayName = user?.display_name ?? user?.name ?? "";
  const nameParts = displayName.trim().split(/\s+/).filter(Boolean);
  const firstName = user?.first_name ?? nameParts[0] ?? "";
  const lastName = user?.last_name ?? nameParts.slice(1).join(" ") ?? "";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const passwordRequirements = {
    length: newPassword.length >= 8,
    maxLength: newPassword.length <= 16,
    uppercase: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    symbol: /[^A-Za-z0-9]/.test(newPassword),
  };
  const passwordMeetsRequirements =
    passwordRequirements.length &&
    passwordRequirements.maxLength &&
    passwordRequirements.uppercase &&
    passwordRequirements.number &&
    passwordRequirements.symbol;
  const passwordsMatch = !confirmPassword || newPassword === confirmPassword;
  const canReviewPasswordChange =
    Boolean(currentPassword.trim()) &&
    Boolean(newPassword.trim()) &&
    Boolean(confirmPassword.trim()) &&
    passwordMeetsRequirements &&
    newPassword === confirmPassword;

  const handlePasswordSave = async () => {
    if (!canReviewPasswordChange || savingPassword) {
      return;
    }

    setSavingPassword(true);
    setPasswordNotice(null);

    try {
      const response = await updatePasswordRequest({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      setPasswordNotice(response.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordNotice(error instanceof Error ? error.message : "Unable to update your password right now.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div>
      <SectionCard title="Personal information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LABEL}>First name</label>
            <input type="text" value={firstName} readOnly className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Last name</label>
            <input type="text" value={lastName} readOnly className={INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LABEL}>Email address</label>
            <input type="email" value={user?.email ?? ""} readOnly className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Mobile number</label>
            <input type="tel" value={user?.phone ?? user?.mobile ?? ""} readOnly className={INPUT} />
          </div>
        </div>
        <div className="flex justify-end">
          <button disabled className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm opacity-60 cursor-not-allowed">
            Save
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Change password">
        <div className="space-y-4 max-w-md">
          <div>
            <label className={LABEL}>Current password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Enter current password"
                maxLength={16}
                className={`${INPUT} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((current) => !current)}
                aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[var(--color-ink-disabled)] hover:text-[var(--color-ink)] cursor-pointer rounded-sm"
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-[var(--color-ink-muted)]">
              Enter your existing password before setting a new one.
            </p>
          </div>
          <div>
            <label className={LABEL}>New password</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 8 characters"
                maxLength={16}
                className={`${INPUT} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((current) => !current)}
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[var(--color-ink-disabled)] hover:text-[var(--color-ink)] cursor-pointer rounded-sm"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-[var(--color-ink-muted)]">
              Use 8-16 characters with one uppercase letter, one number, and one symbol.
            </p>
            <div className="mt-2">
              <PasswordStrength password={newPassword} />
            </div>
            <p className="mt-1.5 text-xs text-[var(--color-ink-muted)]">
              {canReviewPasswordChange
                ? "Password meets the current registration rules."
                : "Password must include 8-16 characters, one uppercase letter, one number, and one symbol."}
            </p>
          </div>
          <div>
            <label className={LABEL}>Confirm new password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat new password"
                maxLength={16}
                className={`${INPUT} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[var(--color-ink-disabled)] hover:text-[var(--color-ink)] cursor-pointer rounded-sm"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="mt-1.5 text-xs text-[var(--color-red)]">
                Passwords do not match.
              </p>
            )}
            {confirmPassword && passwordsMatch && (
              <p className="mt-1.5 text-xs text-[var(--color-ink-muted)]">
                Re-enter the same password to confirm the change.
              </p>
            )}
          </div>
          {passwordNotice && (
            <p className={`text-xs ${passwordNotice.toLowerCase().includes("unable") || passwordNotice.toLowerCase().includes("incorrect") ? "text-[var(--color-red)]" : "text-[var(--color-green)]"}`}>
              {passwordNotice}
            </p>
          )}
          <button
            type="button"
            onClick={() => void handlePasswordSave()}
            disabled={!canReviewPasswordChange || savingPassword}
            className={`px-4 py-2 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm transition-colors ${!canReviewPasswordChange || savingPassword ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--color-navy-hover)] cursor-pointer"}`}
          >
            {savingPassword ? "Updating..." : "Update password"}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Danger zone" subtitle="These actions are irreversible.">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-4 py-3.5 border border-[var(--color-border)] rounded-sm">
            <div>
              <p className="text-sm font-[500] text-[var(--color-ink)]">Deactivate store</p>
              <p className="text-xs text-[var(--color-ink-muted)]">Your store and listings will be hidden from buyers. You can reactivate at any time.</p>
            </div>
            <button disabled className="px-3 py-2 border border-[var(--color-amber-border)] text-xs text-[var(--color-amber)] rounded-sm opacity-60 cursor-not-allowed whitespace-nowrap ml-4">
              Deactivate
            </button>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5 border border-[var(--color-red-border)] rounded-sm bg-[var(--color-red-light)]">
            <div>
              <p className="text-sm font-[500] text-[var(--color-red)]">Delete seller account</p>
              <p className="text-xs text-[var(--color-red)]/70">Permanently delete your store, products, and transaction history. This cannot be undone.</p>
            </div>
            <button disabled className="px-3 py-2 bg-[var(--color-red)] text-white text-xs font-[500] rounded-sm opacity-60 cursor-not-allowed whitespace-nowrap ml-4">
              Delete account
            </button>
          </div>
        </div>
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

export default function SellerSettingsPage() {
  const { activeTab: tab, setActiveTab: setTab } = useUrlTab(SETTINGS_TABS, "account");
  const [profile, setProfile] = useState<SellerProfile | null>(null);

  useEffect(() => {
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
  }, []);

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { id: "account", label: "Account", icon: UserRound },
    { id: "payouts", label: "Payouts", icon: Banknote },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: LockKeyhole },
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

      {tab === "account" && <AccountTab />}
      {tab === "payouts" && <PayoutsTab profile={profile} />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "security" && <SecurityTab profile={profile} />}
    </div>
  );
}
