function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden shadow-[0_1px_10px_rgba(28,27,24,0.04)]">
      <div className="px-6 py-4 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-[600] text-[var(--color-ink)]">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function PrefRow({ label, description, value }: { label: string; description?: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-[var(--color-border-subtle)] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-[500] text-[var(--color-ink)]">{label}</p>
        {description && <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="shrink-0 text-sm text-[var(--color-ink-muted)]">{value}</div>
    </div>
  );
}

export default function PreferencesPage() {
  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6 space-y-5">
        <div className="flex items-center gap-2 mb-5">
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">Home</span>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]">
            <path d="M3 2l3 2.5-3 2.5" />
          </svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">Preferences</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Preferences</h1>
            <p className="text-sm text-[var(--color-ink-muted)] mt-1">
              These values are currently UI-only. The backend does not yet store account preference records.
            </p>
          </div>
        </div>

        <div className="bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] rounded-sm px-4 py-3 text-sm text-[var(--color-warning)]">
          We removed the fake save confirmation so this page no longer pretends preferences are persisted server-side.
        </div>

        <SectionCard title="Display">
          <PrefRow label="Theme" value="Light" description="Theme selection is currently local to the UI." />
          <PrefRow label="Display density" value="Comfortable" description="Density changes are not persisted yet." />
        </SectionCard>

        <SectionCard title="Language & Region">
          <PrefRow label="Language" value="English (Philippines)" />
          <PrefRow label="Currency" value="PHP - Philippine Peso" description="Currency formatting follows the frontend defaults." />
          <PrefRow label="Number format" value="1,000.00" />
        </SectionCard>

        <SectionCard title="Shopping Preferences">
          <PrefRow label="Personalized recommendations" value="Enabled" />
          <PrefRow label="Recently viewed" value="Enabled" />
          <PrefRow label="Price drop alerts" value="Enabled" />
        </SectionCard>

        <SectionCard title="Privacy & Data">
          <PrefRow label="Analytics cookies" value="Enabled" />
          <PrefRow label="Marketing cookies" value="Disabled" />
        </SectionCard>
      </div>
    </div>
  );
}
