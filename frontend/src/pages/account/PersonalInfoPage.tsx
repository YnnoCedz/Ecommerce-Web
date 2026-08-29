import { useEffect, useRef, useState } from "react";
import { updateAccountProfile } from "../../api/account";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/ToastProvider";

const INPUT = "w-full rounded-sm border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-navy)]";

export default function PersonalInfoPage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFirstName(user?.first_name ?? "");
    setLastName(user?.last_name ?? "");
    setPhone((user?.phone ?? user?.mobile ?? "").replace(/^\+63/, ""));
  }, [user]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const response = await updateAccountProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
        avatar_file: avatarFile,
        remove_avatar: removeAvatar,
      });
      await refreshUser();
      setAvatarFile(null);
      setRemoveAvatar(false);
      showToast({ title: "Profile updated", message: response.message });
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        setErrors(Object.fromEntries(Object.entries(error.errors).map(([key, messages]) => [key, messages[0]])));
      }
      showToast({ kind: "error", title: "Profile not saved", error, errorContext: "profile" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 md:px-8 lg:px-12">
      <div className="mb-5">
        <h1 className="font-[var(--font-display)] text-2xl text-[var(--color-ink)]">Personal information</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">Update the contact information saved to your Maketo account.</p>
      </div>
      <form onSubmit={submit} className="overflow-hidden rounded-sm border border-[var(--color-border)] bg-white">
        <div className="flex flex-wrap items-center gap-4 border-b border-[var(--color-border)] p-6">
          <div className="h-20 w-20 overflow-hidden rounded bg-[var(--color-navy)] flex items-center justify-center shrink-0">
            {!removeAvatar && (avatarPreview || user?.avatar_url) ? (
              <img src={avatarPreview ?? user?.avatar_url ?? ""} alt="Profile avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="font-[var(--font-display)] text-2xl text-white">
                {(firstName[0] ?? "U").toUpperCase()}{(lastName[0] ?? "").toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-[600] text-[var(--color-ink)]">Profile photo</p>
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">PNG, JPG, or WebP up to 5 MB.</p>
            <div className="mt-3 flex items-center gap-3">
              <button type="button" onClick={() => avatarInputRef.current?.click()} className="rounded-sm border border-[var(--color-border)] px-3 py-2 text-xs font-[500] hover:bg-[var(--color-surface)]">
                Upload photo
              </button>
              {(user?.avatar_url || avatarFile) && !removeAvatar && (
                <button type="button" onClick={() => { setAvatarFile(null); setRemoveAvatar(true); }} className="text-xs font-[500] text-[var(--color-red)] hover:underline">
                  Remove
                </button>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setAvatarFile(file);
                  setRemoveAvatar(false);
                  event.currentTarget.value = "";
                }}
              />
            </div>
            {errors.avatar_file && <span className="mt-1 block text-xs text-[var(--color-red)]">{errors.avatar_file}</span>}
          </div>
        </div>
        <div className="grid gap-5 p-6 md:grid-cols-2">
          <label className="text-sm font-[500]">First name
            <input className={`${INPUT} mt-1.5`} value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} required />
            {errors.first_name && <span className="mt-1 block text-xs text-[var(--color-red)]">{errors.first_name}</span>}
          </label>
          <label className="text-sm font-[500]">Last name
            <input className={`${INPUT} mt-1.5`} value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} required />
            {errors.last_name && <span className="mt-1 block text-xs text-[var(--color-red)]">{errors.last_name}</span>}
          </label>
          <label className="text-sm font-[500]">Email address
            <input className={`${INPUT} mt-1.5 bg-[var(--color-surface)] text-[var(--color-ink-muted)]`} value={user?.email ?? ""} readOnly />
            <span className="mt-1 block text-xs text-[var(--color-ink-muted)]">Email changes require a separate verification flow and are not available here.</span>
          </label>
          <label className="text-sm font-[500]">Mobile number
            <div className="mt-1.5 flex rounded-sm border border-[var(--color-border)] focus-within:border-[var(--color-navy)]">
              <span className="flex items-center border-r border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm">+63</span>
              <input className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9XXXXXXXXX" required />
            </div>
            {errors.phone && <span className="mt-1 block text-xs text-[var(--color-red)]">{errors.phone}</span>}
          </label>
        </div>
        <div className="flex justify-end border-t border-[var(--color-border)] px-6 py-4">
          <button disabled={saving} className="rounded-sm bg-[var(--color-navy)] px-5 py-2.5 text-sm font-[500] text-white disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
}
