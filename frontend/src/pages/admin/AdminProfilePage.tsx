import { useEffect, useState } from "react";
import { fetchAdminMe, updateAdminProfile } from "../../api/admin";
import type { AuthUser } from "../../api/auth";
import { ApiError } from "../../api/client";

export default function AdminProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => { void fetchAdminMe().then(response => { setUser(response.user); setForm({ first_name: response.user.first_name ?? "", last_name: response.user.last_name ?? "", phone: response.user.phone ?? response.user.mobile ?? "" }); }); }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving) return; setSaving(true); setMessage(null); setErrors({});
    try { const response = await updateAdminProfile(form); setMessage(response.message); const refreshed = await fetchAdminMe(); setUser(refreshed.user); }
    catch (error) { if (error instanceof ApiError && error.errors) setErrors(error.errors); setMessage(error instanceof Error ? error.message : "Unable to update profile."); }
    finally { setSaving(false); }
  };

  if (!user) return <p className="p-6 text-sm text-[var(--color-ink-muted)]">Loading administrator profile...</p>;
  return <div className="mx-auto max-w-4xl p-6"><h1 className="font-[var(--font-display)] text-2xl">Administrator profile</h1><p className="mt-1 text-sm text-[var(--color-ink-muted)]">Manage your own administrator identity and contact information.</p>
    <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_280px]"><form onSubmit={submit} className="space-y-4 border bg-white p-6"><div className="grid gap-4 sm:grid-cols-2">{([['first_name','First name'],['last_name','Last name'],['phone','Phone / mobile']] as const).map(([key,label]) => <label key={key} className="text-xs font-[600]">{label}<input value={form[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} className="mt-1 w-full border px-3 py-2.5 text-sm" required />{errors[key]?.[0] && <span className="mt-1 block text-xs text-[var(--color-red)]">{errors[key][0]}</span>}</label>)}</div>{message && <p className="text-sm text-[var(--color-ink-muted)]">{message}</p>}<button type="submit" disabled={saving} className="bg-[var(--color-navy)] px-5 py-2.5 text-sm text-white disabled:opacity-60">{saving ? "Saving..." : "Save profile"}</button></form>
      <aside className="border bg-white p-5 text-sm"><h2 className="font-[600]">Account details</h2><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-[var(--color-ink-muted)]">Email</dt><dd>{user.email}</dd></div><div><dt className="text-[var(--color-ink-muted)]">Role</dt><dd className="capitalize">{user.role}</dd></div><div><dt className="text-[var(--color-ink-muted)]">Status</dt><dd className="capitalize">{user.status}</dd></div><div><dt className="text-[var(--color-ink-muted)]">Email verification</dt><dd>{user.email_verified_at ? "Verified" : "Not verified"}</dd></div><div><dt className="text-[var(--color-ink-muted)]">Last active</dt><dd>{user.last_active_at ? new Date(user.last_active_at).toLocaleString() : "Not recorded"}</dd></div><div><dt className="text-[var(--color-ink-muted)]">Joined</dt><dd>{user.joined_at ? new Date(user.joined_at).toLocaleDateString() : "Not recorded"}</dd></div></dl></aside></div>
  </div>;
}
