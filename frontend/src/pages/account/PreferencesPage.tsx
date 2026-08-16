import { useState } from "react";

type Option = { value: string; label: string };

function PrefSelect({
  label,
  description,
  value,
  onChange,
  options,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-[var(--color-border-subtle)] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-[500] text-[var(--color-ink)]">{label}</p>
        {description && <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-sm border border-[var(--color-border)] rounded-sm px-3 py-1.5 bg-white text-[var(--color-ink)] cursor-pointer outline-none focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10 transition-all shrink-0 min-w-[140px]"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PrefToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-[var(--color-border-subtle)] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-[500] text-[var(--color-ink)]">{label}</p>
        {description && <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer shrink-0 mt-0.5 ${value ? "bg-[var(--color-navy)]" : "bg-[var(--color-border-strong)]"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${value ? "left-5" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden shadow-[0_1px_10px_rgba(28,27,24,0.04)]">
      <div className="px-6 py-4 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-[600] text-[var(--color-ink)]">{title}</h3>
      </div>
      <div className="px-6">{children}</div>
    </div>
  );
}

export default function PreferencesPage() {
  const [language, setLanguage] = useState("en-PH");
  const [currency, setCurrency] = useState("PHP");
  const [theme, setTheme] = useState("light");
  const [density, setDensity] = useState("comfortable");
  const [numberFormat, setNumberFormat] = useState("dot");
  const [recentlyViewed, setRecentlyViewed] = useState(true);
  const [priceDropAlerts, setPriceDropAlerts] = useState(true);
  const [cookieAnalytics, setCookieAnalytics] = useState(true);
  const [cookiePersonal, setCookiePersonal] = useState(true);
  const [cookieMarketing, setCookieMarketing] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6 space-y-5">
        <div className="flex items-center gap-2 mb-5">
          <button className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Home</button>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]">
            <path d="M3 2l3 2.5-3 2.5" />
          </svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">Preferences</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Preferences</h1>
            <p className="text-sm text-[var(--color-ink-muted)] mt-1">Control how the account area looks, behaves, and remembers your settings.</p>
          </div>
          <button
            onClick={save}
            className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer shrink-0"
          >
            Save preferences
          </button>
        </div>

        {saved && (
          <div className="flex items-center gap-2 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm px-4 py-3 text-sm text-[var(--color-green)]">
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6" cy="6" r="5" />
              <path d="M3.5 6l2 2 3.5-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Preferences saved.
          </div>
        )}

        <SectionCard title="Display">
          <div className="py-4 border-b border-[var(--color-border-subtle)]">
            <p className="text-sm font-[500] text-[var(--color-ink)] mb-3">Theme</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: "light", label: "Light", bg: "#F8F7F3" },
                { value: "dark", label: "Dark", bg: "#1A3550" },
                { value: "system", label: "System", bg: "linear-gradient(135deg, #F8F7F3 50%, #1A3550 50%)" },
              ].map(t => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`flex-1 py-3 rounded-sm border-2 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                    theme === t.value ? "border-[var(--color-navy)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <div className="w-12 h-8 rounded-sm border border-[var(--color-border)] overflow-hidden" style={{ background: t.bg }} />
                  <span className="text-xs font-[500] text-[var(--color-ink)]">{t.label}</span>
                </button>
              ))}
            </div>
            <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] mt-2">Dark mode - design preview only</p>
          </div>

          <PrefSelect
            label="Display density"
            description="Controls spacing and information density"
            value={density}
            onChange={setDensity}
            options={[
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Comfortable" },
              { value: "spacious", label: "Spacious" },
            ]}
          />
        </SectionCard>

        <SectionCard title="Language & Region">
          <PrefSelect
            label="Language"
            value={language}
            onChange={setLanguage}
            options={[
              { value: "en-PH", label: "English (Philippines)" },
              { value: "fil", label: "Filipino" },
              { value: "ceb", label: "Cebuano" },
            ]}
          />
          <PrefSelect
            label="Currency"
            description="Prices will be shown in this currency"
            value={currency}
            onChange={setCurrency}
            options={[
              { value: "PHP", label: "PHP - Philippine Peso" },
              { value: "USD", label: "USD - US Dollar" },
              { value: "SGD", label: "SGD - Singapore Dollar" },
            ]}
          />
          <PrefSelect
            label="Number format"
            value={numberFormat}
            onChange={setNumberFormat}
            options={[
              { value: "dot", label: "1,000.00 (dot decimal)" },
              { value: "comma", label: "1.000,00 (comma decimal)" },
            ]}
          />
        </SectionCard>

        <SectionCard title="Shopping Preferences">
          <PrefToggle
            label="Personalized recommendations"
            description="Show products tailored to your browsing and purchase history"
            value={cookiePersonal}
            onChange={setCookiePersonal}
          />
          <PrefToggle
            label="Recently viewed"
            description="Keep track of products you've viewed for easy access"
            value={recentlyViewed}
            onChange={setRecentlyViewed}
          />
          <PrefToggle
            label="Price drop alerts"
            description="Get notified when wishlist items drop in price"
            value={priceDropAlerts}
            onChange={setPriceDropAlerts}
          />
        </SectionCard>

        <SectionCard title="Privacy & Data">
          <PrefToggle
            label="Analytics cookies"
            description="Help us improve by allowing usage data collection"
            value={cookieAnalytics}
            onChange={setCookieAnalytics}
          />
          <PrefToggle
            label="Marketing cookies"
            description="Allow personalized ads based on your activity"
            value={cookieMarketing}
            onChange={setCookieMarketing}
          />
        </SectionCard>
      </div>
    </div>
  );
}
