import { useAuth } from "../../auth/AuthContext";

function SectionCard({ title, subtitle, children, danger }: { title: string; subtitle?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`bg-white border rounded-sm overflow-hidden ${danger ? "border-[var(--color-red-border)]" : "border-[var(--color-border)]"}`}>
      <div className={`px-6 py-4 border-b ${danger ? "border-[var(--color-red-border)] bg-[var(--color-red-light)]" : "border-[var(--color-border)]"}`}>
        <h3 className={`text-sm font-[600] ${danger ? "text-[var(--color-red)]" : "text-[var(--color-ink)]"}`}>{title}</h3>
        {subtitle && <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function SecurityPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <SectionCard title="Account security" subtitle="This page reflects the real auth state from the backend.">
        <div className="space-y-3">
          {[
            { label: "Email verified", value: user?.email_verified_at ? "Verified" : "Verification pending", ok: !!user?.email_verified_at },
            { label: "Two-factor authentication", value: user?.two_factor_enabled ? "Enabled" : "Not enabled", ok: !!user?.two_factor_enabled },
            { label: "Last active", value: user?.last_active_at ? new Date(user.last_active_at).toLocaleString() : "Unknown", ok: true },
          ].map(({ label, value, ok }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${ok ? "bg-[var(--color-green)]" : "bg-[var(--color-amber)]"}`} />
              <div className="flex-1">
                <p className="text-sm font-[500] text-[var(--color-ink)]">{label}</p>
                <p className={`text-xs ${ok ? "text-[var(--color-ink-muted)]" : "text-[var(--color-amber)]"}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Password changes" subtitle="Password change and active-session controls are backend-driven and are not simulated here.">
        <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
          The UI no longer shows a fake success state or local session list. If you need password change or session revocation, we should wire the backend endpoint before exposing the action.
        </p>
      </SectionCard>

      <SectionCard title="Two-factor authentication" subtitle="Managed by the backend auth flow.">
        <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
          {user?.two_factor_enabled
            ? "2FA is currently enabled on this account."
            : "2FA is currently disabled on this account."}
        </p>
      </SectionCard>
    </div>
  );
}
