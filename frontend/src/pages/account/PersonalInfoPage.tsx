import { useState } from "react";
import { AccountUser } from "./AccountLayout";

function EditableField({ label, value, onSave, type = "text", options }: {
  label: string; value: string; onSave: (v: string) => void;
  type?: "text" | "select" | "tel" | "date"; options?: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  return (
    <div className="flex items-start gap-3 py-4 border-b border-[var(--color-border-subtle)] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide mb-1">{label}</p>
        {editing ? (
          <div className="flex items-center gap-2 mt-1">
            {type === "select" && options ? (
              <select value={draft} onChange={e => setDraft(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-[var(--color-navy)] rounded-sm bg-white outline-none focus:ring-2 focus:ring-[var(--color-navy)]/10">
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type={type} value={draft} onChange={e => setDraft(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-[var(--color-navy)] rounded-sm bg-white outline-none focus:ring-2 focus:ring-[var(--color-navy)]/10"
                autoFocus />
            )}
            <button onClick={save} className="px-3 py-1.5 bg-[var(--color-navy)] text-white text-xs font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">Save</button>
            <button onClick={cancel} className="px-3 py-1.5 border border-[var(--color-border)] text-xs text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">Cancel</button>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-ink)] font-[500] mt-0.5">{value || <span className="text-[var(--color-ink-disabled)]">Not set</span>}</p>
        )}
      </div>
      {!editing && (
        <button onClick={() => { setDraft(value); setEditing(true); }}
          className="text-xs text-[var(--color-navy)] font-[500] hover:underline cursor-pointer mt-5 shrink-0">
          Edit
        </button>
      )}
    </div>
  );
}

export default function PersonalInfoPage({ user, onUserChange }: {
  user: AccountUser;
  onUserChange: (u: AccountUser) => void;
}) {
  const update = (key: keyof AccountUser) => (val: string) =>
    onUserChange({ ...user, [key]: val });

  const [gender, setGender] = useState("Prefer not to say");
  const [birthday, setBirthday] = useState("1994-03-15");
  const [language, setLanguage] = useState("English (Philippines)");

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-[600] text-[var(--color-ink)]">Personal Information</h3>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">Manage your name, contact info, and profile details</p>
        </div>
        <div className="px-6">
          <EditableField label="First name" value={user.firstName} onSave={update("firstName")} />
          <EditableField label="Last name" value={user.lastName} onSave={update("lastName")} />
          <EditableField label="Email address" type="text" value={user.email} onSave={update("email")} />
          <EditableField label="Phone number" type="tel" value={user.phone} onSave={update("phone")} />
          <EditableField label="Date of birth" type="date" value={birthday} onSave={setBirthday} />
          <EditableField label="Gender" type="select" value={gender} onSave={setGender}
            options={["Male", "Female", "Non-binary", "Prefer not to say"]} />
          <EditableField label="Language" type="select" value={language} onSave={setLanguage}
            options={["English (Philippines)", "Filipino", "Cebuano"]} />
        </div>
      </div>

      {/* Email change warning */}
      <div className="bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] rounded-sm px-4 py-3">
        <p className="text-xs font-[600] text-[var(--color-warning)] mb-0.5">Changing your email</p>
        <p className="text-xs text-[var(--color-warning)]/80 leading-relaxed">
          If you change your email address, you'll need to verify the new address before it becomes active. You'll continue using your current email to sign in until verification is complete.
        </p>
      </div>

      {/* Delete account */}
      <div className="bg-white border border-[var(--color-red-border)] rounded-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-red-border)] bg-[var(--color-red-light)]">
          <h3 className="text-sm font-[600] text-[var(--color-red)]">Delete Account</h3>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-4">
            Permanently delete your account and all associated data. This action cannot be undone. All orders, reviews, and saved items will be removed.
          </p>
          <button className="px-4 py-2 text-sm font-[500] text-[var(--color-red)] border border-[var(--color-red-border)] rounded-sm hover:bg-[var(--color-red-light)] transition-colors cursor-pointer">
            Delete my account
          </button>
        </div>
      </div>
    </div>
  );
}
