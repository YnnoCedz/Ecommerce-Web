import { useState } from "react";
import PublicShell from "./shells/PublicShell";
import SellerShell from "./shells/SellerShell";
import MessagingPage from "./pages/messaging/MessagingPage";
import NotificationCenter from "./pages/notifications/NotificationCenter";
import ReportDialog, { ReportTargetType } from "./components/ReportDialog";

type Section = "messaging" | "notifications" | "reporting";
type MsgPerspective = "buyer" | "seller";

const SECTIONS: { id: Section; label: string; sublabel: string }[] = [
  { id: "messaging",      label: "Messaging",      sublabel: "Buyer · Seller · Courier" },
  { id: "notifications",  label: "Notifications",  sublabel: "Center · Categories · States" },
  { id: "reporting",      label: "Reporting",       sublabel: "Dialog · All target types" },
];

type ReportTarget = { type: ReportTargetType; name: string };

const REPORT_TARGETS: ReportTarget[] = [
  { type: "seller",       name: "Verde Botanics" },
  { type: "buyer",        name: "Ana Reyes" },
  { type: "courier",      name: "J&T Express — Rider #4921" },
  { type: "product",      name: "Natural Botanical Skincare Set" },
  { type: "conversation", name: "Conversation with Verde Botanics" },
];

const REPORT_TYPE_ICONS: Record<ReportTargetType, string> = {
  seller:       "🏪",
  buyer:        "👤",
  courier:      "🚚",
  product:      "📦",
  conversation: "💬",
};

function ReportingSection() {
  const [activeTarget, setActiveTarget] = useState<ReportTarget>(REPORT_TARGETS[0]);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">

        <div className="flex items-center gap-2 mb-5">
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">Home</span>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]"><path d="M3 2l3 2.5-3 2.5" /></svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">Reporting</span>
        </div>

        <div className="mb-6">
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Reporting</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">Reusable report dialog — supports all target types.</p>
        </div>

        <div className="max-w-2xl space-y-4">

          {/* Target selector */}
          <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <p className="text-sm font-[600] text-[var(--color-ink)]">Select report target type</p>
              <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">Choose what type of entity you want to report, then launch the dialog.</p>
            </div>
            <div className="p-5 space-y-2">
              {REPORT_TARGETS.map(t => (
                <label key={t.type} className={`flex items-center gap-3.5 p-3.5 rounded-sm border cursor-pointer transition-all ${activeTarget.type === t.type ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)]" : "border-[var(--color-border)] hover:border-[var(--color-navy)]/50 hover:bg-[var(--color-surface)]"}`}>
                  <input
                    type="radio"
                    name="report-target"
                    checked={activeTarget.type === t.type}
                    onChange={() => setActiveTarget(t)}
                    className="accent-[var(--color-navy)]"
                  />
                  <span className="text-xl">{REPORT_TYPE_ICONS[t.type]}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-[500] ${activeTarget.type === t.type ? "text-[var(--color-navy)]" : "text-[var(--color-ink)]"}`}>
                      Report {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                    </p>
                    <p className="text-xs text-[var(--color-ink-muted)]">{t.name}</p>
                  </div>
                  <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] uppercase px-2 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded">{t.type}</span>
                </label>
              ))}
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => setDialogOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M8 2L1.5 13h13L8 2z" /><path d="M8 7v3M8 11.5v.5" />
                </svg>
                Launch report dialog — {REPORT_TYPE_ICONS[activeTarget.type]} {activeTarget.type}
              </button>
            </div>
          </div>

          {/* Feature notes */}
          <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <p className="text-sm font-[600] text-[var(--color-ink)]">Dialog features</p>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-2.5">
              {[
                "4-step flow with progress indicator",
                "Reason options tailored per target type",
                "Free-text description with character count",
                "Evidence file upload (up to 5 files)",
                "Review & confirm step before submit",
                "Submission loading animation",
                "Success screen with reference ID",
                "False-report warning notice",
              ].map(f => (
                <div key={f} className="flex items-start gap-2">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--color-green)" strokeWidth="1.8" strokeLinecap="round" className="shrink-0 mt-0.5"><path d="M2 7l3.5 3.5 6.5-6" /></svg>
                  <span className="text-xs text-[var(--color-ink-muted)]">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {dialogOpen && (
        <ReportDialog
          targetType={activeTarget.type}
          targetName={activeTarget.name}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}

export default function Part09() {
  const [section, setSection] = useState<Section>("messaging");
  const [msgPerspective, setMsgPerspective] = useState<MsgPerspective>("buyer");
  const [showMsgError, setShowMsgError] = useState(false);

  const renderContent = () => {
    switch (section) {
      case "messaging":
        if (msgPerspective === "seller") {
          return (
            <SellerShell>
              <div className="h-full overflow-hidden">
                <MessagingPage perspective="seller" showError={showMsgError} />
              </div>
            </SellerShell>
          );
        }
        return (
          <PublicShell isLoggedIn cartCount={3} wishlistCount={34}>
            <div className="h-[calc(100vh-130px)] overflow-hidden">
              <MessagingPage perspective="buyer" showError={showMsgError} />
            </div>
          </PublicShell>
        );

      case "notifications":
        return (
          <PublicShell isLoggedIn cartCount={3} wishlistCount={34}>
            <NotificationCenter />
          </PublicShell>
        );

      case "reporting":
        return (
          <PublicShell isLoggedIn cartCount={3} wishlistCount={34}>
            <ReportingSection />
          </PublicShell>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--color-ground)]">

      {/* ── CONTROL STRIP ──────────────────────────────────── */}
      <div className="shrink-0 bg-[#0F2030] border-b border-white/10 flex items-center gap-3 px-4 py-2 overflow-x-auto">
        <span className="font-[var(--font-mono)] text-[9px] text-white/30 tracking-widest shrink-0">PART 09 — MESSAGING · NOTIFICATIONS · REPORTING</span>

        <div className="flex items-center gap-1 shrink-0">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`shrink-0 font-[var(--font-mono)] text-[10px] px-2.5 py-1 rounded-sm transition-colors cursor-pointer ${section === s.id ? "bg-[var(--color-amber)] text-white" : "bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/90"}`}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-white/15 shrink-0" />

        {section === "messaging" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="font-[var(--font-mono)] text-[9px] text-white/30">perspective:</span>
              {(["buyer", "seller"] as MsgPerspective[]).map(p => (
                <button key={p} onClick={() => setMsgPerspective(p)}
                  className={`font-[var(--font-mono)] text-[9px] px-2 py-0.5 rounded-sm capitalize cursor-pointer transition-colors ${msgPerspective === p ? "bg-white/20 text-white" : "text-white/35 hover:text-white/60"}`}>
                  {p}
                </button>
              ))}
            </div>
            <div className="w-px h-3 bg-white/15" />
            <div className="flex items-center gap-1.5">
              <span className="font-[var(--font-mono)] text-[9px] text-white/30">error:</span>
              <button
                onClick={() => setShowMsgError(v => !v)}
                className={`font-[var(--font-mono)] text-[9px] px-2 py-0.5 rounded-sm cursor-pointer transition-colors ${showMsgError ? "bg-white/20 text-white" : "text-white/35 hover:text-white/60"}`}>
                {showMsgError ? "on" : "off"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── CONTENT ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
}
