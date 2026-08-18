import { useEffect, useMemo, useState } from "react";
import { fetchSellerProfile, type SellerProfile } from "../../api/seller";

type StoreTab = "profile" | "branding" | "policies" | "preview";

const INPUT = "w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none focus:border-[var(--color-navy)] bg-white transition-colors font-[var(--font-body)]";
const LABEL = "block text-sm font-[500] text-[var(--color-ink)] mb-1.5";

function SectionCard({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm mb-5">
      <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-[600] text-[var(--color-ink)]">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function ProfileTab({ profile }: { profile: SellerProfile | null }) {
  const storeCats = profile?.categories ?? [];
  const available = useMemo(() => storeCats, [storeCats]);

  return (
    <div>
      <SectionCard title="Store identity">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LABEL}>Store name <span className="text-[var(--color-red)]">*</span></label>
            <input type="text" defaultValue={profile?.business_name ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Store URL slug <span className="text-[var(--color-red)]">*</span></label>
            <div className="flex items-center border border-[var(--color-border)] rounded-sm bg-white focus-within:border-[var(--color-navy)] overflow-hidden">
              <span className="px-3 py-2.5 text-xs text-[var(--color-ink-disabled)] bg-[var(--color-surface)] border-r border-[var(--color-border)] whitespace-nowrap">marketo.ph/store/</span>
              <input type="text" defaultValue={profile?.slug ?? ""} className="flex-1 px-3 py-2.5 text-sm text-[var(--color-ink)] focus:outline-none bg-white font-[var(--font-body)]" />
            </div>
          </div>
        </div>
        <div className="mb-4">
          <label className={LABEL}>Tagline</label>
          <input type="text" defaultValue={profile?.tagline ?? ""} className={INPUT} maxLength={80} />
        </div>
        <div>
          <label className={LABEL}>Store description</label>
          <textarea rows={5} defaultValue={profile?.description ?? ""} className={INPUT + " resize-none"} maxLength={1000} />
          <p className="text-xs text-[var(--color-ink-disabled)] mt-1">Shown on your public store page. Max 1000 characters.</p>
        </div>
      </SectionCard>

      <SectionCard title="Categories & specializations">
        <p className="text-sm text-[var(--color-ink-muted)] mb-3">Selected categories appear in search filters and help buyers discover your store.</p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {storeCats.length > 0 ? storeCats.map((category) => (
            <span key={category.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-navy-surface)] text-[var(--color-navy)] text-xs rounded border border-[var(--color-navy)]/20">
              {category.name}
            </span>
          )) : (
            <span className="text-sm text-[var(--color-ink-muted)]">No seller categories assigned yet.</span>
          )}
          {available.length > 0 && (
            <button className="px-3 py-1.5 border border-dashed border-[var(--color-border)] text-xs text-[var(--color-ink-muted)] rounded hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] cursor-pointer">+ Add category</button>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Contact & location">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LABEL}>Public email</label>
            <input type="email" defaultValue={profile?.public_email ?? profile?.contact_email ?? ""} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Public phone / Viber</label>
            <input type="tel" defaultValue={profile?.messaging_phone ?? profile?.contact_phone ?? ""} className={INPUT} />
          </div>
        </div>
        <div className="mb-4">
          <label className={LABEL}>Business address</label>
          <input type="text" defaultValue={[profile?.address_line1, profile?.address_line2, profile?.city, profile?.province].filter(Boolean).join(", ")} className={INPUT} />
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">Shown on your store page. Only include information you are comfortable making public.</p>
        </div>
      </SectionCard>

      <SectionCard title="Operating hours" subtitle="Helps buyers know when to expect replies and updates.">
        <div className="space-y-2">
          {[["Monday - Friday", "9:00 AM - 6:00 PM"], ["Saturday", "10:00 AM - 4:00 PM"], ["Sunday", "Closed"]].map(([day, hours]) => (
            <div key={day} className="flex items-center gap-4">
              <span className="w-36 text-sm text-[var(--color-ink-muted)] shrink-0">{day}</span>
              <input type="text" defaultValue={hours} className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] font-[var(--font-body)]" />
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">Save changes</button>
      </div>
    </div>
  );
}

function BrandingTab() {
  return (
    <div>
      <SectionCard title="Store logo" subtitle="Shown in search results, your store page header, and order confirmations.">
        <div className="text-sm text-[var(--color-ink-muted)]">Brand asset management remains a UI flow until the media upload endpoint is wired in.</div>
      </SectionCard>
      <SectionCard title="Store banner" subtitle="Displayed at the top of your store page.">
        <div className="text-sm text-[var(--color-ink-muted)]">Banner upload is pending backend storage wiring.</div>
      </SectionCard>
      <SectionCard title="Brand colors" subtitle="Used for subtle accent elements on your store page.">
        <div className="text-sm text-[var(--color-ink-muted)]">Brand color editing remains local for now.</div>
      </SectionCard>
    </div>
  );
}

function PoliciesTab() {
  return (
    <div className="space-y-5">
      {["Return & refund policy", "Shipping policy", "Privacy policy"].map((title) => (
        <div key={title} className="bg-white border border-[var(--color-border)] rounded-sm">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-[600] text-[var(--color-ink)]">{title}</h2>
          </div>
          <div className="px-6 py-5">
            <textarea rows={5} className={INPUT + " resize-none"} placeholder={`Add your ${title.toLowerCase()}...`} />
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <button className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">Save policies</button>
      </div>
    </div>
  );
}

function PreviewTab({ profile }: { profile: SellerProfile | null }) {
  const categoryName = profile?.categories?.[0]?.name ?? "Store";

  return (
    <div>
      <div className="border border-[var(--color-border)] rounded-sm overflow-hidden bg-white">
        <div className="h-36 bg-[var(--color-navy)] relative overflow-hidden" />
        <div className="px-6 py-5 border-b border-[var(--color-border)]">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 rounded-sm bg-[var(--color-navy)] flex items-center justify-center border-4 border-white shadow shrink-0">
              <span className="font-[var(--font-display)] text-3xl text-white font-[400]">{(profile?.business_name ?? "S").slice(0, 2).toUpperCase()}</span>
            </div>
            <div className="pb-1">
              <h2 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">{profile?.business_name ?? "Seller store"}</h2>
              <p className="text-sm text-[var(--color-ink-muted)]">{profile?.tagline ?? "No tagline yet."}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-[var(--color-ink-muted)]">
            <span>{categoryName}</span>
            <span>{profile?.city ?? "Unknown location"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoreManagementPage() {
  const [tab, setTab] = useState<StoreTab>("profile");
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

  const TABS: { id: StoreTab; label: string }[] = [
    { id: "profile", label: "Store profile" },
    { id: "branding", label: "Branding" },
    { id: "policies", label: "Policies" },
    { id: "preview", label: "Public preview" },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Store management</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">Customize your store's public presence on Marketo</p>
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border)] mb-6">
        {TABS.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`px-5 py-2.5 text-sm font-[500] border-b-2 -mb-px cursor-pointer transition-colors ${tab === item.id ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab profile={profile} />}
      {tab === "branding" && <BrandingTab />}
      {tab === "policies" && <PoliciesTab />}
      {tab === "preview" && <PreviewTab profile={profile} />}
    </div>
  );
}
