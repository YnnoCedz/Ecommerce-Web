import { useEffect, useState } from "react";
import { fetchAccountPreferences, updateAccountPreferences, type AccountPreferences } from "../../api/account";
import { useToast } from "../../components/ToastProvider";

const defaults: AccountPreferences = { language: "en-PH", currency: "PHP", number_format: "1,000.00", recommendations_enabled: true, recently_viewed_enabled: true, price_drop_alerts_enabled: true, analytics_cookies_enabled: true, marketing_cookies_enabled: false };

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${checked ? "bg-[var(--color-navy)]" : "bg-[var(--color-border)]"}`}><span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} /></button>;
}

export default function PreferencesPage() {
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState<AccountPreferences>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { void fetchAccountPreferences().then((response) => setPrefs(response.data)).catch((error) => showToast({ kind: "error", title: "Preferences unavailable", error, errorContext: "profile" })).finally(() => setLoading(false)); }, [showToast]);

  const save = async () => {
    setSaving(true);
    try {
      const response = await updateAccountPreferences(prefs);
      setPrefs(response.data);
      showToast({ title: "Preferences saved", message: response.message });
    } catch (error) {
      showToast({ kind: "error", title: "Preferences not saved", error, errorContext: "profile" });
    } finally { setSaving(false); }
  };

  const booleanRow = (key: keyof AccountPreferences, label: string, description: string) => (
    <div className="flex items-center justify-between gap-5 border-b border-[var(--color-border-subtle)] py-4 last:border-0"><div><p className="text-sm font-[500]">{label}</p><p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{description}</p></div><Toggle label={label} checked={Boolean(prefs[key])} onChange={(checked) => setPrefs({ ...prefs, [key]: checked })} /></div>
  );

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 md:px-8 lg:px-12">
      <div className="mb-5 flex items-end justify-between gap-4"><div><h1 className="font-[var(--font-display)] text-2xl">Preferences</h1><p className="mt-1 text-sm text-[var(--color-ink-muted)]">Your choices are saved to your account in the database.</p></div><button onClick={() => void save()} disabled={loading || saving} className="rounded-sm bg-[var(--color-navy)] px-5 py-2.5 text-sm font-[500] text-white disabled:opacity-50">{saving ? "Saving..." : "Save preferences"}</button></div>
      {loading ? <div className="rounded-sm border border-[var(--color-border)] bg-white p-8 text-sm text-[var(--color-ink-muted)]">Loading preferences...</div> : <div className="space-y-5">
        <section className="rounded-sm border border-[var(--color-border)] bg-white p-6"><h2 className="mb-4 text-sm font-[600]">Language and region</h2><div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm">Language<select value={prefs.language} onChange={(e) => setPrefs({ ...prefs, language: e.target.value as AccountPreferences["language"] })} className="mt-1.5 w-full rounded-sm border border-[var(--color-border)] px-3 py-2.5"><option value="en-PH">English (Philippines)</option><option value="fil-PH">Filipino</option><option value="ceb-PH">Cebuano</option></select></label>
          <label className="text-sm">Currency<select value={prefs.currency} disabled className="mt-1.5 w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5"><option value="PHP">PHP - Philippine Peso</option></select></label>
          <label className="text-sm">Number format<select value={prefs.number_format} onChange={(e) => setPrefs({ ...prefs, number_format: e.target.value as AccountPreferences["number_format"] })} className="mt-1.5 w-full rounded-sm border border-[var(--color-border)] px-3 py-2.5"><option value="1,000.00">1,000.00</option><option value="1.000,00">1.000,00</option></select></label>
        </div></section>
        <section className="rounded-sm border border-[var(--color-border)] bg-white px-6 py-2"><h2 className="pt-4 text-sm font-[600]">Shopping</h2>{booleanRow("recommendations_enabled", "Personalized recommendations", "Use your shopping activity to improve product suggestions.")}{booleanRow("recently_viewed_enabled", "Recently viewed", "Keep a history of products you recently opened.")}{booleanRow("price_drop_alerts_enabled", "Price drop alerts", "Allow alerts for saved products whose prices change.")}</section>
        <section className="rounded-sm border border-[var(--color-border)] bg-white px-6 py-2"><h2 className="pt-4 text-sm font-[600]">Privacy and data</h2>{booleanRow("analytics_cookies_enabled", "Analytics cookies", "Help improve Maketo using aggregated usage data.")}{booleanRow("marketing_cookies_enabled", "Marketing cookies", "Allow personalized marketing measurement.")}</section>
      </div>}
    </div>
  );
}
