import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { updatePasswordRequest } from "../../api/auth";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/ToastProvider";
import { PasswordStrength } from "../auth/AuthLayout";

const INPUT = "w-full rounded-sm border border-[var(--color-border)] bg-white px-3 py-2.5 pr-11 text-sm outline-none focus:border-[var(--color-navy)]";

export default function SecurityPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [values, setValues] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const valid = values.password.length >= 8 && values.password.length <= 16 && /[A-Z]/.test(values.password) && /\d/.test(values.password) && /[^A-Za-z0-9]/.test(values.password) && values.password === values.password_confirmation && !!values.current_password;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      const response = await updatePasswordRequest(values);
      setValues({ current_password: "", password: "", password_confirmation: "" });
      showToast({ title: "Password changed", message: response.message });
    } catch (error) {
      showToast({ kind: "error", title: "Password not changed", error, errorContext: "profile" });
    } finally { setSaving(false); }
  };

  const field = (name: keyof typeof values, label: string) => (
    <label className="block text-sm font-[500]">{label}
      <div className="relative mt-1.5">
        <input type={visible[name] ? "text" : "password"} maxLength={16} className={INPUT} value={values[name]} onChange={(e) => setValues({ ...values, [name]: e.target.value })} required />
        <button type="button" aria-label={`${visible[name] ? "Hide" : "Show"} ${label.toLowerCase()}`} onClick={() => setVisible({ ...visible, [name]: !visible[name] })} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[var(--color-ink-muted)]">
          {visible[name] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );

  return (
    <div className="mx-auto max-w-screen-xl space-y-5 px-4 py-6 md:px-8 lg:px-12">
      <div><h1 className="font-[var(--font-display)] text-2xl">Security</h1><p className="mt-1 text-sm text-[var(--color-ink-muted)]">Manage your password and review backend security status.</p></div>
      <form onSubmit={submit} className="rounded-sm border border-[var(--color-border)] bg-white p-6">
        <h2 className="mb-5 text-sm font-[600]">Change password</h2>
        <div className="max-w-md space-y-4">
          {field("current_password", "Current password")}
          {field("password", "New password")}
          <PasswordStrength password={values.password} />
          <p className="text-xs text-[var(--color-ink-muted)]">Use 8-16 characters with one uppercase letter, one number, and one symbol.</p>
          {field("password_confirmation", "Confirm new password")}
          {values.password_confirmation && values.password !== values.password_confirmation && <p className="text-xs text-[var(--color-red)]">Passwords do not match.</p>}
          <button disabled={!valid || saving} className="rounded-sm bg-[var(--color-navy)] px-5 py-2.5 text-sm font-[500] text-white disabled:opacity-50">{saving ? "Updating..." : "Update password"}</button>
        </div>
      </form>
      <div className="rounded-sm border border-[var(--color-border)] bg-white p-6">
        <h2 className="text-sm font-[600]">Two-factor authentication</h2>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">Current status: {user?.two_factor_enabled ? "Enabled" : "Not enabled"}. This page does not show a fake toggle because no account 2FA settings endpoint exists yet.</p>
      </div>
    </div>
  );
}
