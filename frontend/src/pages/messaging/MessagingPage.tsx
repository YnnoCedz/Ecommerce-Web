import { useState, useRef, useEffect } from "react";

// ── Types ────────────────────────────────────────────────
type ParticipantType = "buyer" | "seller" | "courier" | "support";
type ConversationType = "buyer-seller" | "buyer-courier" | "seller-courier";
type MessageStatus = "sending" | "sent" | "delivered" | "read";

type Participant = {
  id: string;
  name: string;
  type: ParticipantType;
  initials: string;
  online?: boolean;
};

type Attachment = {
  id: string;
  name: string;
  kind: "image" | "file";
  size: string;
  url?: string;
};

type Message = {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  fullTime: string;
  status?: MessageStatus;
  attachments?: Attachment[];
  orderRef?: string;
  isSystem?: boolean;
};

type Conversation = {
  id: string;
  type: ConversationType;
  subject?: string;
  orderRef?: string;
  orderProduct?: string;
  participants: Participant[];
  messages: Message[];
  unread: number;
  lastMessage: string;
  lastTime: string;
  muted?: boolean;
  archived?: boolean;
};

// ── Demo data ────────────────────────────────────────────
const BUYER: Participant  = { id: "buyer-1",   name: "Ana Reyes",      type: "buyer",   initials: "AR", online: true };
const SELLER_V: Participant = { id: "seller-1",  name: "Verde Botanics",  type: "seller",  initials: "VB", online: true };
const SELLER_A: Participant = { id: "seller-2",  name: "Atelier Manila",  type: "seller",  initials: "AM", online: false };
const COURIER_J: Participant = { id: "courier-1", name: "J&T Express",     type: "courier", initials: "JT", online: true };
const COURIER_L: Participant = { id: "courier-2", name: "LBC Courier",     type: "courier", initials: "LC", online: false };

const CONVOS: Conversation[] = [
  {
    id: "c1",
    type: "buyer-seller",
    orderRef: "ORD-2831",
    orderProduct: "Natural Botanical Skincare Set",
    participants: [BUYER, SELLER_V],
    unread: 2,
    lastMessage: "Thank you! Let me check the current stock on the lavender variant.",
    lastTime: "10:41 AM",
    messages: [
      { id: "m1", senderId: "buyer-1",  content: "Hi! I just placed an order for the Botanical Skincare Set. I wanted to ask — is the lavender variant currently in stock, or will there be a delay?", timestamp: "Yesterday", fullTime: "Aug 14, 9:15 AM", status: "read" },
      { id: "m2", senderId: "seller-1", content: "Hello Ana! Thanks for your order. Great choice — the lavender is our most popular scent. Let me verify the current stock levels for you.", timestamp: "Yesterday", fullTime: "Aug 14, 9:28 AM" },
      { id: "m3", senderId: "seller-1", content: "Good news — we have 8 units available and yours is already packed. We'll be handing it to J&T Express by tomorrow morning.", timestamp: "Yesterday", fullTime: "Aug 14, 9:31 AM" },
      { id: "m4", senderId: "buyer-1",  content: "That's great to hear! Any chance of expedited shipping? I'd love to get it by the weekend.", timestamp: "Yesterday", fullTime: "Aug 14, 2:04 PM", status: "read" },
      { id: "m5", senderId: "system", isSystem: true, content: "Order ORD-2831 status updated: Picked up by J&T Express", timestamp: "Today", fullTime: "Aug 15, 8:00 AM" },
      { id: "m6", senderId: "seller-1", content: "Hi Ana! Your order was picked up this morning. Standard delivery should reach you by tomorrow. For future orders, we offer express at checkout. 😊", timestamp: "Today", fullTime: "Aug 15, 8:10 AM" },
      { id: "m7", senderId: "buyer-1",  content: "Perfect, thank you! Also — quick question: can I request a gift message be included for a future order?", timestamp: "Today", fullTime: "Aug 15, 10:38 AM", status: "delivered" },
      { id: "m8", senderId: "seller-1", content: "Thank you! Let me check the current stock on the lavender variant.", timestamp: "Today", fullTime: "Aug 15, 10:41 AM" },
    ],
  },
  {
    id: "c2",
    type: "buyer-seller",
    orderRef: "ORD-2849",
    orderProduct: "Minimalist Chronograph Watch",
    participants: [BUYER, SELLER_A],
    unread: 0,
    lastMessage: "We're so glad you love it! Enjoy every wear.",
    lastTime: "Aug 13",
    messages: [
      { id: "m1", senderId: "buyer-1",  content: "Hi Atelier Manila! My watch arrived today and it's absolutely beautiful. The packaging was immaculate. Thank you!", timestamp: "Aug 13", fullTime: "Aug 13, 3:00 PM", status: "read" },
      { id: "m2", senderId: "seller-2", content: "Thank you so much, Ana! We're thrilled to hear that. The chronograph really does age beautifully — enjoy every wear. 🕰", timestamp: "Aug 13", fullTime: "Aug 13, 3:45 PM" },
      { id: "m3", senderId: "buyer-1",  content: "One more thing — the leather strap is slightly stiff. Is that normal, and does it soften with use?", timestamp: "Aug 13", fullTime: "Aug 13, 3:47 PM", status: "read" },
      { id: "m4", senderId: "seller-2", content: "Completely normal! Genuine leather straps need a short break-in period. A few days of regular wear and you'll notice it softening. You can also lightly condition it with a neutral leather cream.", timestamp: "Aug 13", fullTime: "Aug 13, 4:02 PM" },
      {
        id: "m5", senderId: "buyer-1",  content: "Wonderful — thank you for the tip! I'll leave a review shortly.", timestamp: "Aug 13", fullTime: "Aug 13, 4:10 PM", status: "read",
        attachments: [{ id: "a1", name: "watch_photo.jpg", kind: "image", size: "1.2 MB", url: "https://images.unsplash.com/photo-1548171915-e79a380a2a4b?w=300&h=200&fit=crop&auto=format" }],
      },
      { id: "m6", senderId: "seller-2", content: "We're so glad you love it! Enjoy every wear.", timestamp: "Aug 13", fullTime: "Aug 13, 4:18 PM" },
    ],
  },
  {
    id: "c3",
    type: "buyer-courier",
    orderRef: "ORD-2831",
    orderProduct: "Natural Botanical Skincare Set",
    participants: [BUYER, COURIER_J],
    unread: 1,
    lastMessage: "Hi! Your package is at our Makati hub. Estimated delivery today between 2–6 PM.",
    lastTime: "11:02 AM",
    messages: [
      { id: "m1", senderId: "system", isSystem: true, content: "J&T Express has been assigned to deliver your order ORD-2831", timestamp: "Today", fullTime: "Aug 15, 8:00 AM" },
      { id: "m2", senderId: "courier-1", content: "Good morning! This is your delivery notification for ORD-2831. Your package is out for delivery today.", timestamp: "Today", fullTime: "Aug 15, 8:30 AM" },
      { id: "m3", senderId: "buyer-1",   content: "Hi! Will someone need to be home to sign for the package?", timestamp: "Today", fullTime: "Aug 15, 9:45 AM", status: "read" },
      { id: "m4", senderId: "courier-1", content: "Hi! Your package is at our Makati hub. Estimated delivery today between 2–6 PM.", timestamp: "Today", fullTime: "Aug 15, 11:02 AM" },
    ],
  },
  {
    id: "c4",
    type: "seller-courier",
    participants: [SELLER_A, COURIER_L],
    subject: "Pickup coordination — Aug 15 batch",
    unread: 0,
    lastMessage: "We'll have 6 packages ready at the Makati store by 10 AM.",
    lastTime: "Aug 14",
    messages: [
      { id: "m1", senderId: "seller-2",  content: "Hi LBC team! We have a batch pickup scheduled for tomorrow morning. Will the regular route driver be available?", timestamp: "Aug 14", fullTime: "Aug 14, 5:00 PM" },
      { id: "m2", senderId: "courier-2", content: "Hello Atelier Manila! Yes, the route driver for Makati will be doing rounds from 10 AM. Please have parcels ready at your store entrance.", timestamp: "Aug 14", fullTime: "Aug 14, 5:22 PM" },
      { id: "m3", senderId: "seller-2",  content: "Perfect. We'll have 6 packages ready at the Makati store by 10 AM.", timestamp: "Aug 14", fullTime: "Aug 14, 5:24 PM" },
    ],
  },
];

// ── Avatar ───────────────────────────────────────────────
function Avatar({ participant, size = "md", showOnline = false }: { participant: Participant; size?: "sm" | "md" | "lg"; showOnline?: boolean }) {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-xs", lg: "w-11 h-11 text-sm" };
  const colors: Record<ParticipantType, string> = {
    buyer:   "bg-[var(--color-navy)]",
    seller:  "bg-[var(--color-amber)]",
    courier: "bg-[var(--color-violet)]",
    support: "bg-[var(--color-green)]",
  };
  return (
    <div className="relative shrink-0">
      <div className={`${sizes[size]} ${colors[participant.type]} rounded-full flex items-center justify-center font-[var(--font-display)] font-[400] text-white`}>
        {participant.initials}
      </div>
      {showOnline && participant.online && (
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[var(--color-green)] rounded-full border-2 border-white" />
      )}
    </div>
  );
}

// ── Conversation list item ────────────────────────────────
function ConvoListItem({ convo, isActive, viewerId, onClick }: { convo: Conversation; isActive: boolean; viewerId: string; onClick: () => void }) {
  const other = convo.participants.find(p => p.id !== viewerId) ?? convo.participants[0];
  const TYPE_LABELS: Record<ConversationType, string> = {
    "buyer-seller": "Seller",
    "buyer-courier": "Courier",
    "seller-courier": "Courier",
  };
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left border-b border-[var(--color-border-subtle)] transition-colors cursor-pointer ${isActive ? "bg-[var(--color-navy-surface)]" : "hover:bg-[var(--color-surface)]"}`}>
      <Avatar participant={other} size="md" showOnline />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className={`text-sm truncate ${convo.unread > 0 ? "font-[600] text-[var(--color-ink)]" : "font-[500] text-[var(--color-ink)]"}`}>{other.name}</p>
          <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] shrink-0 ml-2">{convo.lastTime}</span>
        </div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] bg-[var(--color-surface)] px-1.5 py-0.5 rounded border border-[var(--color-border-subtle)]">{TYPE_LABELS[convo.type]}</span>
          {convo.orderRef && <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-navy)]">{convo.orderRef}</span>}
          {convo.muted && <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">Muted</span>}
        </div>
        <p className={`text-xs truncate ${convo.unread > 0 ? "text-[var(--color-ink-secondary)]" : "text-[var(--color-ink-muted)]"}`}>{convo.lastMessage}</p>
      </div>
      {convo.unread > 0 && (
        <div className="shrink-0 w-4 h-4 bg-[var(--color-navy)] rounded-full flex items-center justify-center mt-1">
          <span className="font-[var(--font-mono)] text-[9px] text-white">{convo.unread}</span>
        </div>
      )}
    </button>
  );
}

// ── Message bubble ────────────────────────────────────────
function MessageBubble({ msg, isOwn, sender }: { msg: Message; isOwn: boolean; sender?: Participant }) {
  if (msg.isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.4" strokeLinecap="round"><circle cx="6" cy="6" r="4.5" /><path d="M6 4v2.5l1.5 1.5" /></svg>
          <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{msg.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}>
      {!isOwn && sender && <Avatar participant={sender} size="sm" />}

      <div className={`flex flex-col gap-1 max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? "bg-[var(--color-navy)] text-white rounded-br-sm"
            : "bg-white border border-[var(--color-border)] text-[var(--color-ink)] rounded-bl-sm"
        }`}>
          {msg.content}
        </div>

        {msg.attachments && msg.attachments.map(att => (
          <div key={att.id} className={`rounded-xl overflow-hidden border border-[var(--color-border)] ${isOwn ? "rounded-br-sm" : "rounded-bl-sm"}`}>
            {att.kind === "image" && att.url ? (
              <img src={att.url} alt={att.name} className="max-w-[220px] max-h-[160px] object-cover block" />
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 bg-white">
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M4 4h7l3 3v9H4V4z" /><path d="M11 4v3h3" /></svg>
                <div>
                  <p className="text-xs font-[500] text-[var(--color-ink)]">{att.name}</p>
                  <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)]">{att.size}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="flex items-center gap-1.5">
          <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">{msg.fullTime}</span>
          {isOwn && msg.status && (
            <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">
              {msg.status === "read" ? "✓✓" : msg.status === "delivered" ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Order context card ────────────────────────────────────
function OrderContextCard({ orderRef, product }: { orderRef: string; product: string }) {
  return (
    <div className="mx-4 mb-2 flex items-center gap-3 px-4 py-2.5 bg-[var(--color-navy-surface)] border border-[var(--color-navy-border)] rounded-sm">
      <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="var(--color-navy)" strokeWidth="1.4" strokeLinecap="round"><rect x="3" y="3" width="12" height="14" rx="1" /><path d="M6 7h6M6 10h4" /></svg>
      <div className="flex-1 min-w-0">
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-navy)] font-[600]">{orderRef}</p>
        <p className="text-xs text-[var(--color-navy)]/70 truncate">{product}</p>
      </div>
      <button className="text-xs text-[var(--color-navy)] hover:underline cursor-pointer font-[500] shrink-0">View order</button>
    </div>
  );
}

// ── Composer ─────────────────────────────────────────────
function Composer({ onSend, disabled }: { onSend: (text: string, attachments?: Attachment[]) => void; disabled?: boolean }) {
  const [text, setText] = useState("");
  const [pendingAttach, setPendingAttach] = useState<Attachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!text.trim() && pendingAttach.length === 0) return;
    onSend(text.trim(), pendingAttach.length > 0 ? pendingAttach : undefined);
    setText("");
    setPendingAttach([]);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const kind: Attachment["kind"] = file.type.startsWith("image/") ? "image" : "file";
    const url = kind === "image" ? URL.createObjectURL(file) : undefined;
    setPendingAttach(prev => [...prev, { id: Date.now().toString(), name: file.name, kind, size: `${(file.size / 1024).toFixed(0)} KB`, url }]);
    e.target.value = "";
  };

  return (
    <div className="border-t border-[var(--color-border)] bg-white">
      {pendingAttach.length > 0 && (
        <div className="flex gap-2 px-4 pt-3 flex-wrap">
          {pendingAttach.map(att => (
            <div key={att.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm">
              {att.kind === "image" && att.url ? (
                <img src={att.url} alt="" className="w-6 h-6 object-cover rounded-sm" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M3 3h5l3 3v7H3V3z" /></svg>
              )}
              <span className="text-xs text-[var(--color-ink)] max-w-[100px] truncate">{att.name}</span>
              <button onClick={() => setPendingAttach(p => p.filter(a => a.id !== att.id))} className="text-[var(--color-ink-muted)] hover:text-[var(--color-red)] cursor-pointer ml-1">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2L2 10" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 p-3">
        <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-8 h-8 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] hover:bg-[var(--color-surface)] rounded-sm transition-colors cursor-pointer shrink-0 mb-0.5">
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M9 2v10M4 7l5-5 5 5" /><path d="M3 14h12" /></svg>
        </button>
        <textarea
          ref={textRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          maxLength={2000}
          disabled={disabled}
          placeholder={disabled ? "This conversation is unavailable." : "Type a message… (Enter to send, Shift+Enter for new line)"}
          className="flex-1 resize-none bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none focus:border-[var(--color-navy)] transition-colors leading-relaxed max-h-32 overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ height: "40px" }}
          onInput={e => {
            const el = e.currentTarget;
            el.style.height = "40px";
            el.style.height = Math.min(el.scrollHeight, 128) + "px";
          }}
        />
        <button
          onClick={handleSend}
          disabled={(!text.trim() && pendingAttach.length === 0) || disabled}
          className="w-9 h-9 flex items-center justify-center bg-[var(--color-navy)] text-white rounded-full hover:bg-[var(--color-navy-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 14L14 8 2 2v4.5l8 1.5-8 1.5V14z" fill="currentColor" /></svg>
        </button>
      </div>
      {text.length > 1800 && (
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-warning)] px-4 pb-2">{2000 - text.length} characters remaining</p>
      )}
    </div>
  );
}

// ── Error state ───────────────────────────────────────────
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-[var(--color-red-light)] border border-[var(--color-red-border)] flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--color-red)" strokeWidth="1.5" strokeLinecap="round"><path d="M10 4v6M10 13v1M4 18h12L10 4 4 18z" /></svg>
      </div>
      <div>
        <p className="text-sm font-[600] text-[var(--color-ink)] mb-1">Couldn't load messages</p>
        <p className="text-xs text-[var(--color-ink-muted)]">There was a problem connecting to the server.</p>
      </div>
      <button onClick={onRetry} className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">Try again</button>
    </div>
  );
}

// ── Report menu ───────────────────────────────────────────
function ConvoActionMenu({ convo, onClose }: { convo: Conversation; onClose: () => void }) {
  return (
    <div className="absolute right-4 top-full mt-1 w-48 bg-white border border-[var(--color-border)] rounded-sm shadow-[0_8px_24px_rgba(28,27,24,0.12)] z-30">
      {[
        { label: "View order", icon: "📦" },
        { label: "Mute conversation", icon: "🔕" },
        { label: "Archive", icon: "📁" },
        { label: "Mark as unread", icon: "●" },
        { label: "Report conversation", icon: "🚩", danger: true },
      ].map(({ label, icon, danger }) => (
        <button key={label} onClick={onClose} className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm cursor-pointer transition-colors text-left ${danger ? "text-[var(--color-red)] hover:bg-[var(--color-red-light)]" : "text-[var(--color-ink)] hover:bg-[var(--color-surface)]"}`}>
          <span>{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Date separator ────────────────────────────────────────
function DateSep({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-[var(--color-border-subtle)]" />
      <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] px-2">{label}</span>
      <div className="flex-1 h-px bg-[var(--color-border-subtle)]" />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────
type FilterType = "all" | "buyer-seller" | "buyer-courier" | "seller-courier";
type Perspective = "buyer" | "seller";

interface MessagingPageProps {
  perspective?: Perspective;
  showError?: boolean;
}

export default function MessagingPage({ perspective = "buyer", showError = false }: MessagingPageProps) {
  const viewerId = perspective === "buyer" ? "buyer-1" : "seller-2";
  const [conversations, setConversations] = useState(CONVOS.filter(c => c.participants.some(p => p.id === viewerId)));
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [error] = useState(showError);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConvo = conversations.find(c => c.id === activeId) ?? null;

  // Scroll to bottom on new messages or convo change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, activeConvo?.messages.length]);

  const openConvo = (id: string) => {
    setActiveId(id);
    setMenuOpen(false);
    // mark as read
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
  };

  const sendMessage = (convoId: string, text: string, attachments?: Attachment[]) => {
    if (!text && !attachments?.length) return;
    const now = new Date();
    const newMsg: Message = {
      id: `m${Date.now()}`,
      senderId: viewerId,
      content: text,
      timestamp: "Today",
      fullTime: `Aug 15, ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")} ${now.getHours() < 12 ? "AM" : "PM"}`,
      status: "sending",
      attachments,
    };
    setConversations(prev => prev.map(c =>
      c.id === convoId
        ? { ...c, messages: [...c.messages, newMsg], lastMessage: text || "Attachment", lastTime: "Just now" }
        : c
    ));
    // simulate sent
    setTimeout(() => {
      setConversations(prev => prev.map(c =>
        c.id === convoId
          ? { ...c, messages: c.messages.map(m => m.id === newMsg.id ? { ...m, status: "sent" } : m) }
          : c
      ));
    }, 800);
  };

  const filtered = conversations.filter(c => {
    if (filter !== "all" && c.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const other = c.participants.find(p => p.id !== viewerId);
      return other?.name.toLowerCase().includes(q) || c.orderRef?.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q);
    }
    return true;
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);
  const other = activeConvo?.participants.find(p => p.id !== viewerId);

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  activeConvo?.messages.forEach(msg => {
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === msg.timestamp) last.messages.push(msg);
    else groupedMessages.push({ date: msg.timestamp, messages: [msg] });
  });

  const TYPE_LABELS: Record<ConversationType, string> = {
    "buyer-seller": "Seller conversation",
    "buyer-courier": "Courier contact",
    "seller-courier": "Courier coordination",
  };

  const FILTER_OPTS: { id: FilterType; label: string }[] = [
    { id: "all", label: `All (${conversations.length})` },
    { id: "buyer-seller", label: "Sellers" },
    { id: "buyer-courier", label: "Couriers" },
  ];

  return (
    <div className="flex h-full bg-[var(--color-ground)] overflow-hidden">

      {/* ── LEFT: Conversation list ──────────────────────── */}
      <div className={`flex flex-col bg-white border-r border-[var(--color-border)] ${activeId ? "hidden md:flex" : "flex"} w-full md:w-80 xl:w-96 shrink-0`}>
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">
              Messages
              {totalUnread > 0 && (
                <span className="ml-2 font-[var(--font-mono)] text-[11px] px-1.5 py-0.5 bg-[var(--color-navy)] text-white rounded-full">{totalUnread}</span>
              )}
            </h1>
            <button className="w-8 h-8 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] hover:bg-[var(--color-surface)] rounded-sm cursor-pointer transition-colors">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M9 4v10M4 9h10" /></svg>
            </button>
          </div>
          {/* Search */}
          <div className="relative mb-3">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"><circle cx="7" cy="7" r="4.5" /><path d="M11 11l2.5 2.5" /></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none focus:border-[var(--color-navy)] transition-colors"
            />
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1">
            {FILTER_OPTS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-1 text-[10px] font-[var(--font-mono)] py-1 rounded-sm transition-colors cursor-pointer ${filter === f.id ? "bg-[var(--color-navy)] text-white" : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg width="36" height="36" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="mx-auto mb-3 text-[var(--color-ink-disabled)]">
                <path d="M8 8h24a2 2 0 012 2v16a2 2 0 01-2 2H12l-6 4V10a2 2 0 012-2z" />
              </svg>
              <p className="text-sm text-[var(--color-ink-muted)]">{search ? "No conversations match your search." : "No conversations yet."}</p>
            </div>
          ) : (
            filtered.map(c => (
              <ConvoListItem key={c.id} convo={c} isActive={activeId === c.id} viewerId={viewerId} onClick={() => openConvo(c.id)} />
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Conversation ──────────────────────────── */}
      <div className={`flex flex-col flex-1 min-w-0 ${!activeId ? "hidden md:flex" : "flex"}`}>
        {!activeConvo ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.2" strokeLinecap="round">
                <path d="M5 5h22a2 2 0 012 2v14a2 2 0 01-2 2H10l-7 4V7a2 2 0 012-2z" />
              </svg>
            </div>
            <div>
              <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-1">Select a conversation</p>
              <p className="text-sm text-[var(--color-ink-muted)]">Choose from the list on the left to start reading.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div className="shrink-0 bg-white border-b border-[var(--color-border)] px-5 py-3.5 flex items-center gap-3 relative">
              {/* Mobile back */}
              <button onClick={() => setActiveId(null)} className="md:hidden text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer mr-1">
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M11 5L7 9l4 4" /></svg>
              </button>

              {other && <Avatar participant={other} size="md" showOnline />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-[600] text-[var(--color-ink)]">{other?.name}</p>
                  {other?.online && <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-green)]">● Online</span>}
                </div>
                <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{TYPE_LABELS[activeConvo.type]}{activeConvo.subject ? ` — ${activeConvo.subject}` : ""}</p>
              </div>

              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] hover:bg-[var(--color-surface)] rounded-sm cursor-pointer transition-colors">
                  <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="9" cy="9" r="3" /><circle cx="9" cy="9" r="7" /></svg>
                </button>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="w-8 h-8 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] hover:bg-[var(--color-surface)] rounded-sm cursor-pointer transition-colors">
                  <svg width="15" height="15" viewBox="0 0 18 18" fill="currentColor"><circle cx="9" cy="4" r="1.2" /><circle cx="9" cy="9" r="1.2" /><circle cx="9" cy="14" r="1.2" /></svg>
                </button>
              </div>

              {menuOpen && <ConvoActionMenu convo={activeConvo} onClose={() => setMenuOpen(false)} />}
            </div>

            {/* Order context */}
            {activeConvo.orderRef && activeConvo.orderProduct && (
              <div className="shrink-0 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-ground)]">
                <OrderContextCard orderRef={activeConvo.orderRef} product={activeConvo.orderProduct} />
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 bg-[var(--color-ground)] space-y-3">
              {error ? (
                <ErrorState onRetry={() => {}} />
              ) : (
                groupedMessages.map(group => (
                  <div key={group.date}>
                    <DateSep label={group.date} />
                    <div className="space-y-3">
                      {group.messages.map(msg => {
                        const isOwn = msg.senderId === viewerId;
                        const senderParticipant = activeConvo.participants.find(p => p.id === msg.senderId);
                        return <MessageBubble key={msg.id} msg={msg} isOwn={isOwn} sender={senderParticipant} />;
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <Composer
              onSend={(text, attachments) => sendMessage(activeConvo.id, text, attachments)}
              disabled={error || activeConvo.archived}
            />
          </>
        )}
      </div>
    </div>
  );
}
