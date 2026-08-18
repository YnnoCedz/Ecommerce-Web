import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { fetchSellerProfile, type SellerProfile } from "../../api/seller";

type SettingsTab = "account" | "payouts" | "notifications" | "security";

const INPUT = "w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none focus:border-[var(--color-navy)] bg-white transition-colors font-[var(--font-body)]";
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

function AccountTab({ profile }: { profile: SellerProfile | null }) {
  const { user } = useAuth();
  const firstName = user?.first_name ?? user?.display_name.split(" ")[0] ?? "";
  const lastName = user?.last_name ?? user?.display_name.split(" ").slice(1).join(" ") ?? "";

  return (
    <div>
      <SectionCard title="Personal information">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LABEL}>First name</label>
            <input type="text" defaultValue={firstName} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Last name</label>
            <input type="text" defaultValue={lastName} className={INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LABEL}>Email address</label>
            <input type="email" defaultValue={user?.email ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Mobile number</label>
            <input type="tel" defaultValue={user?.phone ?? user?.mobile ?? ""} className={INPUT} />
          </div>
        </div>
        <div className="flex justify-end">
          <button className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">Save</button>
        </div>
      </SectionCard>

      <SectionCard title="Store identity" subtitle="Pulled from the active seller profile.">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Business name</label>
            <input type="text" defaultValue={profile?.business_name ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Seller slug</label>
            <input type="text" defaultValue={profile?.slug ?? ""} className={INPUT} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function PayoutsTab() {
  return (
    <div>
      <SectionCard title="Payout method" subtitle="Where Marketo sends your earnings.">
        <p className="text-sm text-[var(--color-ink-muted)]">Payout preferences remain a settings-only flow until the payout API is enabled.</p>
      </SectionCard>
      <SectionCard title="Payout schedule">
        <p className="text-sm text-[var(--color-ink-muted)]">Weekly payout scheduling is currently displayed as a UI placeholder.</p>
      </SectionCard>
    </div>
  );
}

function NotificationsTab() {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
      <div className="p-6 text-sm text-[var(--color-ink-muted)]">Notification toggles remain local until notification preferences are stored server-side.</div>
    </div>
  );
}

function SecurityTab() {
  return (
    <div>
      <SectionCard title="Two-factor authentication" subtitle="Add an extra layer of security to your account.">
        <p className="text-sm text-[var(--color-ink-muted)]">Security controls are already handled by the auth flow and backend challenge endpoints.</p>
      </SectionCard>
      <SectionCard title="Active sessions" subtitle="Devices currently signed into your seller account.">
        <p className="text-sm text-[var(--color-ink-muted)]">Session listing remains a UI view for now.</p>
      </SectionCard>
    </div>
  );
}

export default function SellerSettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("account");
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

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: "account", label: "Account" },
    { id: "payouts", label: "Payouts" },
    { id: "notifications", label: "Notifications" },
    { id: "security", label: "Security" },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Settings</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">Manage your account, payouts, and security preferences</p>
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border)] mb-6">
        {TABS.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`px-5 py-2.5 text-sm font-[500] border-b-2 -mb-px cursor-pointer transition-colors ${tab === item.id ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "account" && <AccountTab profile={profile} />}
      {tab === "payouts" && <PayoutsTab />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "security" && <SecurityTab />}
    </div>
  );
}
