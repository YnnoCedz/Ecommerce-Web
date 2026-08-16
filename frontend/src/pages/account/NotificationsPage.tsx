import { useState } from "react";

type Channel = "email" | "sms" | "push";

type NotifPref = {
  id: string;
  label: string;
  description: string;
  email: boolean;
  sms: boolean;
  push: boolean;
};

type NotifGroup = { group: string; items: NotifPref[] };

const INITIAL_PREFS: NotifGroup[] = [
  {
    group: "Orders",
    items: [
      { id: "order-confirmed", label: "Order confirmed", description: "When your order is successfully placed", email: true, sms: true, push: true },
      { id: "order-shipped", label: "Order shipped", description: "When your order is picked up by courier", email: true, sms: false, push: true },
      { id: "order-delivered", label: "Order delivered", description: "When your order is marked as delivered", email: true, sms: true, push: true },
      { id: "order-returns", label: "Returns & refunds", description: "Status updates on your return requests", email: true, sms: false, push: false },
    ],
  },
  {
    group: "Promotions",
    items: [
      { id: "promo-deals", label: "Daily deals", description: "Flash sales and time-limited discounts", email: false, sms: false, push: true },
      { id: "promo-recs", label: "Personalized recommendations", description: "Products curated based on your activity", email: true, sms: false, push: false },
      { id: "promo-newsletter", label: "Newsletter", description: "Weekly digest of new arrivals and sellers", email: true, sms: false, push: false },
    ],
  },
  {
    group: "Account",
    items: [
      { id: "acct-security", label: "Security alerts", description: "Sign-ins from new devices or locations", email: true, sms: true, push: true },
      { id: "acct-login", label: "Login notifications", description: "Every time you sign in to Marketo", email: false, sms: false, push: false },
      { id: "acct-updates", label: "Account updates", description: "Changes to your profile or settings", email: true, sms: false, push: false },
    ],
  },
  {
    group: "Sellers & Messages",
    items: [
      { id: "msg-replies", label: "Seller replies", description: "When a seller responds to your message", email: true, sms: false, push: true },
      { id: "seller-updates", label: "Followed seller updates", description: "New products from sellers you follow", email: false, sms: false, push: true },
    ],
  },
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer shrink-0 ${on ? "bg-[var(--color-navy)]" : "bg-[var(--color-border-strong)]"}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

const CHANNEL_ICONS: Record<Channel, React.ReactNode> = {
  email: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="1" y="3" width="12" height="9" rx="1" /><path d="M1 4l6 4 6-4" /></svg>,
  sms: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="2" y="1" width="10" height="13" rx="1.5" /><circle cx="7" cy="11" r="0.5" fill="currentColor" /></svg>,
  push: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M7 1a4 4 0 014 4v3l1.5 2h-11L3 8V5a4 4 0 014-4zM5.5 11a1.5 1.5 0 003 0" /></svg>,
};

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<NotifGroup[]>(INITIAL_PREFS);
  const [saved, setSaved] = useState(false);

  const toggle = (groupIndex: number, itemIndex: number, channel: Channel) => {
    setSaved(false);
    setPrefs(p => p.map((g, gi) =>
      gi !== groupIndex ? g : {
        ...g,
        items: g.items.map((item, ii) =>
          ii !== itemIndex ? item : { ...item, [channel]: !item[channel] }
        ),
      }
    ));
  };

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const CHANNELS: Channel[] = ["email", "sms", "push"];

  return (
    <div className="space-y-4">
      {/* Save banner */}
      {saved && (
        <div className="flex items-center gap-2 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm px-4 py-3 text-sm text-[var(--color-green)]">
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="5" /><path d="M3.5 6l2 2 3.5-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Notification preferences saved.
        </div>
      )}

      {/* Channel legend */}
      <div className="bg-white border border-[var(--color-border)] rounded-sm px-5 py-4 flex items-center gap-6">
        <p className="text-xs font-[600] text-[var(--color-ink)] mr-2">Channels:</p>
        {CHANNELS.map(ch => (
          <div key={ch} className="flex items-center gap-1.5">
            <span className="text-[var(--color-ink-muted)]">{CHANNEL_ICONS[ch]}</span>
            <span className="text-xs text-[var(--color-ink-muted)] capitalize">{ch === "sms" ? "SMS" : ch.charAt(0).toUpperCase() + ch.slice(1)}</span>
          </div>
        ))}
      </div>

      {prefs.map((group, gi) => (
        <div key={group.group} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
          {/* Group header */}
          <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <h4 className="text-xs font-[600] text-[var(--color-ink)]">{group.group}</h4>
            <div className="flex gap-5 text-[var(--color-ink-muted)]">
              {CHANNELS.map(ch => (
                <span key={ch} className="w-9 text-center text-xs font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] tracking-wide uppercase">{ch === "sms" ? "SMS" : ch.charAt(0).toUpperCase()}</span>
              ))}
            </div>
          </div>

          {group.items.map((item, ii) => (
            <div key={item.id} className={`flex items-center gap-4 px-5 py-4 ${ii < group.items.length - 1 ? "border-b border-[var(--color-border-subtle)]" : ""}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-[500] text-[var(--color-ink)]">{item.label}</p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{item.description}</p>
              </div>
              <div className="flex gap-5 shrink-0">
                {CHANNELS.map(ch => (
                  <div key={ch} className="w-9 flex justify-center">
                    <Toggle on={item[ch]} onChange={() => toggle(gi, ii, ch)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="flex items-center justify-between pt-1">
        <button onClick={() => setPrefs(INITIAL_PREFS)} className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer hover:underline">
          Reset to defaults
        </button>
        <button onClick={save} className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
          Save preferences
        </button>
      </div>
    </div>
  );
}
