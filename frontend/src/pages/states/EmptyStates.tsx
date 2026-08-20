import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import PublicShell from "../../shells/PublicShell";
import SellerShell from "../../shells/SellerShell";
import AdminShell from "../../shells/AdminShell";

// ── Shared empty state layout ─────────────────────────────────
function EmptyPane({
  illustration, heading, body, cta, secondaryCta, note,
}: {
  illustration: React.ReactNode;
  heading: string;
  body: string;
  cta?: { label: string; onClick?: () => void };
  secondaryCta?: { label: string; onClick?: () => void };
  note?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 max-w-sm mx-auto">
      <div className="mb-6 opacity-90">{illustration}</div>
      <h2 className="font-[var(--font-display)] text-[1.4rem] font-[400] text-[var(--color-ink)] mb-3 leading-snug">{heading}</h2>
      <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-6">{body}</p>
      {cta && (
        <button onClick={cta.onClick} className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer mb-3">
          {cta.label}
        </button>
      )}
      {secondaryCta && (
        <button onClick={secondaryCta.onClick} className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] underline cursor-pointer">
          {secondaryCta.label}
        </button>
      )}
      {note && <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)] mt-4">{note}</p>}
    </div>
  );
}

// ── SVG illustrations ─────────────────────────────────────────
const CartIllustration = () => (
  <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
    <rect x="18" y="32" width="60" height="46" rx="3" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.35"/>
    <path d="M32 32V26a16 16 0 0132 0v6" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.35"/>
    <line x1="32" y1="52" x2="64" y2="52" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="5 4"/>
    <line x1="36" y1="63" x2="60" y2="63" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="5 4"/>
    <circle cx="72" cy="22" r="8" fill="var(--color-amber-light)" stroke="var(--color-amber)" strokeWidth="1.5"/>
    <path d="M69 22h6M72 19v6" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const HeartIllustration = () => (
  <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
    <path d="M48 76s-32-22-32-44a20 20 0 0132-16 20 20 0 0132 16c0 22-32 44-32 44z" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.35" strokeDasharray="6 4"/>
    <path d="M48 62s-16-11-16-22a10 10 0 0116-8 10 10 0 0116 8c0 11-16 22-16 22z" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.6"/>
    <circle cx="62" cy="30" r="4" fill="var(--color-amber-light)" stroke="var(--color-amber)" strokeWidth="1"/>
  </svg>
);

const ReceiptIllustration = () => (
  <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
    <path d="M24 16h48v64l-8-6-8 6-8-6-8 6-8-6-8 6V16z" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.35"/>
    <line x1="34" y1="32" x2="62" y2="32" stroke="var(--color-border)" strokeWidth="1.5"/>
    <line x1="34" y1="42" x2="56" y2="42" stroke="var(--color-border)" strokeWidth="1.5"/>
    <line x1="34" y1="52" x2="62" y2="52" stroke="var(--color-border)" strokeWidth="1.5"/>
    <line x1="34" y1="62" x2="50" y2="62" stroke="var(--color-border)" strokeWidth="1.5"/>
    <circle cx="70" cy="26" r="7" fill="var(--color-amber-light)" stroke="var(--color-amber)" strokeWidth="1.2"/>
    <path d="M70 23v4l2 1.5" stroke="var(--color-amber)" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

const BoxIllustration = () => (
  <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
    <path d="M16 36l32-16 32 16v32l-32 16-32-16V36z" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.35"/>
    <path d="M16 36l32 16 32-16M48 52v28" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.35"/>
    <path d="M32 28l16 8 16-8" stroke="var(--color-navy)" strokeWidth="1.2" strokeOpacity="0.25"/>
    <path d="M42 48h12M48 42v12" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const ChatIllustration = () => (
  <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
    <rect x="12" y="20" width="52" height="38" rx="4" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.35"/>
    <path d="M18 58l6 10 6-10" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.35" strokeLinejoin="round"/>
    <rect x="36" y="36" width="48" height="32" rx="4" fill="var(--color-ground)" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.5"/>
    <path d="M78 68l-6 10-6-10" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.5" strokeLinejoin="round"/>
    <circle cx="52" cy="52" r="2.5" fill="var(--color-navy)" fillOpacity="0.25"/>
    <circle cx="60" cy="52" r="2.5" fill="var(--color-navy)" fillOpacity="0.25"/>
    <circle cx="68" cy="52" r="2.5" fill="var(--color-navy)" fillOpacity="0.25"/>
  </svg>
);

const BellIllustration = () => (
  <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
    <path d="M48 20a24 24 0 0124 24v16l8 8H16l8-8V44A24 24 0 0148 20z" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.35"/>
    <path d="M41 68a7 7 0 0014 0" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.35"/>
    <text x="58" y="32" fontFamily="monospace" fontSize="14" fill="var(--color-ink-disabled)" opacity="0.6">z</text>
    <text x="64" y="22" fontFamily="monospace" fontSize="11" fill="var(--color-ink-disabled)" opacity="0.4">z</text>
    <text x="70" y="14" fontFamily="monospace" fontSize="9" fill="var(--color-ink-disabled)" opacity="0.3">z</text>
  </svg>
);

const SearchIllustration = () => (
  <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
    <circle cx="42" cy="42" r="26" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.35"/>
    <line x1="62" y1="62" x2="80" y2="80" stroke="var(--color-navy)" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.5"/>
    <path d="M35 36c3-5 9-7 14-5" stroke="var(--color-navy)" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4"/>
    <circle cx="42" cy="46" r="3" fill="none" stroke="var(--color-amber)" strokeWidth="1.5"/>
    <path d="M39 43l6 6M45 43l-6 6" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const ShieldIllustration = () => (
  <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
    <path d="M48 14l28 10v22c0 18-14 30-28 36-14-6-28-18-28-36V24L48 14z" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.35"/>
    <path d="M36 48l8 8 16-16" stroke="var(--color-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PeopleIllustration = () => (
  <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
    <circle cx="48" cy="30" r="14" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.35"/>
    <path d="M22 76c0-14 12-24 26-24s26 10 26 24" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.35"/>
    <circle cx="20" cy="36" r="9" stroke="var(--color-navy)" strokeWidth="1.2" strokeOpacity="0.2"/>
    <path d="M4 68c0-10 7-17 16-17" stroke="var(--color-navy)" strokeWidth="1.2" strokeOpacity="0.2"/>
    <circle cx="76" cy="36" r="9" stroke="var(--color-navy)" strokeWidth="1.2" strokeOpacity="0.2"/>
    <path d="M92 68c0-10-7-17-16-17" stroke="var(--color-navy)" strokeWidth="1.2" strokeOpacity="0.2"/>
    <path d="M42 30h12M48 24v12" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const WarehouseIllustration = () => (
  <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
    <rect x="12" y="40" width="72" height="44" rx="2" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.35"/>
    <path d="M8 40l40-28 40 28" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.35"/>
    <rect x="24" y="54" width="18" height="30" rx="1" stroke="var(--color-navy)" strokeWidth="1.2" strokeOpacity="0.25"/>
    <rect x="54" y="54" width="18" height="30" rx="1" stroke="var(--color-navy)" strokeWidth="1.2" strokeOpacity="0.25"/>
    <path d="M38 57v24M60 57v24" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 3"/>
    <path d="M44 42h8M48 38v8" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const GridIllustration = () => (
  <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
    <rect x="14" y="14" width="28" height="28" rx="2" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.3"/>
    <rect x="54" y="14" width="28" height="28" rx="2" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.3"/>
    <rect x="14" y="54" width="28" height="28" rx="2" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.3"/>
    <rect x="54" y="54" width="28" height="28" rx="2" stroke="var(--color-navy)" strokeWidth="1.5" strokeOpacity="0.3"/>
    <path d="M62 68h12M68 62v12" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// ── Empty states ──────────────────────────────────────────────

export function EmptyCart() {
  const navigate = useNavigate();
  return (
    <PublicShell isLoggedIn cartCount={0}>
      <div className="max-w-screen-xl mx-auto px-6 py-4">
        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-8">Your cart</h1>
        <EmptyPane
          illustration={<CartIllustration />}
          heading="Your cart is empty"
          body="Add items to your cart to get started. Browse thousands of products from verified sellers across the Philippines."
          cta={{ label: "Start shopping", onClick: () => navigate("/") }}
          note="Free delivery on orders over ₱500"
        />
      </div>
    </PublicShell>
  );
}

export function EmptyWishlist() {
  const navigate = useNavigate();
  return (
    <PublicShell isLoggedIn>
      <div className="max-w-screen-xl mx-auto px-6 py-4">
        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-8">Wishlist</h1>
        <EmptyPane
          illustration={<HeartIllustration />}
          heading="Nothing saved yet"
          body="Tap the heart on any product to save it here. Your wishlist is private and syncs across devices."
          cta={{ label: "Explore products", onClick: () => navigate("/search") }}
          secondaryCta={{ label: "See recommended picks", onClick: () => navigate("/account/profile") }}
        />
      </div>
    </PublicShell>
  );
}

export function NoOrders() {
  const navigate = useNavigate();
  return (
    <PublicShell isLoggedIn>
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="flex items-baseline justify-between mb-8">
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Your orders</h1>
          <div className="flex gap-1">
            {["All","Active","Completed","Cancelled"].map((t, i) => (
              <button key={t} className={`px-3 py-1.5 text-xs rounded-sm ${i === 0 ? "bg-[var(--color-navy)] text-white" : "text-[var(--color-ink-muted)]"}`}>{t}</button>
            ))}
          </div>
        </div>
        <EmptyPane
          illustration={<ReceiptIllustration />}
          heading="No orders yet"
          body="Once you place your first order, it will appear here. Track deliveries, request returns, and reorder easily."
          cta={{ label: "Browse the marketplace", onClick: () => navigate("/") }}
          note="All orders are protected by Buyer Protection"
        />
      </div>
    </PublicShell>
  );
}

export function NoSellerProducts() {
  const navigate = useNavigate();
  const csvInputRef = useRef<HTMLInputElement>(null);
  return (
    <SellerShell activeNav="products" storeName="My Store" storeInitials="MS">
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Products</h1>
            <p className="text-sm text-[var(--color-ink-muted)]">0 listings</p>
          </div>
          <button onClick={() => navigate("/seller-center/products/new")} className="px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer">+ Add product</button>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-sm py-4">
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={() => navigate("/seller-center/products")} />
          <EmptyPane
            illustration={<BoxIllustration />}
            heading="List your first product"
            body="Start selling by adding a product. Complete your listing with photos, description, pricing, and inventory — it only takes a few minutes."
            cta={{ label: "Create your first listing", onClick: () => navigate("/seller-center/products/new") }}
            secondaryCta={{ label: "Import from CSV", onClick: () => csvInputRef.current?.click() }}
            note="Products are reviewed within 24 hours before going live"
          />
        </div>
      </div>
    </SellerShell>
  );
}

export function NoMessages() {
  return (
    <PublicShell isLoggedIn>
      <div className="flex h-[calc(100vh-64px)]">
        <div className="w-80 shrink-0 border-r border-[var(--color-border)] bg-white flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <input placeholder="Search messages..." className="w-full px-3 py-2 border border-[var(--color-border)] rounded-full text-sm focus:outline-none" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
            <p className="text-xs text-[var(--color-ink-muted)]">No conversations yet</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center bg-[var(--color-ground)]">
          <EmptyPane
            illustration={<ChatIllustration />}
            heading="Messages will appear here"
            body="When you contact a seller or receive a message about an order, your conversations will show up here."
            note="Messages are end-to-end encrypted"
          />
        </div>
      </div>
    </PublicShell>
  );
}

export function NoNotifications() {
  return (
    <PublicShell isLoggedIn>
      <div className="max-w-screen-md mx-auto px-6 py-8">
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Notifications</h1>
          <button className="text-xs text-[var(--color-ink-muted)] cursor-pointer">Mark all read</button>
        </div>
        {/* Category tabs */}
        <div className="flex gap-1 mb-8 border-b border-[var(--color-border)]">
          {["All","Orders","Messages","Promotions"].map((t, i) => (
            <button key={t} className={`px-4 py-2 text-xs border-b-2 -mb-px ${i === 0 ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)]"}`}>{t}</button>
          ))}
        </div>
        <EmptyPane
          illustration={<BellIllustration />}
          heading="All caught up"
          body="You have no new notifications. We'll let you know when something needs your attention — order updates, messages, and promotions."
          note="Notification preferences can be updated in Account Settings"
        />
      </div>
    </PublicShell>
  );
}

export function NoSearchResults() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("vintage rattan chair");
  return (
    <PublicShell isLoggedIn cartCount={1}>
      <div className="bg-[var(--color-navy)] py-6">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <input value={query} onChange={e => setQuery(e.target.value)} className="flex-1 px-5 py-3 rounded-full text-sm bg-white text-[var(--color-ink)] focus:outline-none" />
              <button onClick={() => navigate(`/search?q=${encodeURIComponent(query.trim() || "vintage rattan chair")}`)} className="px-5 py-3 bg-[var(--color-amber)] text-white rounded-full text-sm font-[500] cursor-pointer">Search</button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <EmptyPane
          illustration={<SearchIllustration />}
          heading={`No results for ${query}`}
          body="Try different keywords, check your spelling, or browse by category. You can also set up a search alert to be notified when matching items are listed."
          cta={{ label: "Browse categories", onClick: () => navigate("/c/all") }}
          secondaryCta={{ label: "Create search alert", onClick: () => navigate("/account/preferences") }}
          note="Try: rattan chair, wicker furniture, vintage furniture"
        />
      </div>
    </PublicShell>
  );
}

export function NoAdminProducts() {
  return (
    <AdminShell activeNav="products">
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Products</h1>
          <div className="flex gap-2">
            <input placeholder="Search products..." className="px-3 py-2 border border-[var(--color-border)] rounded-sm text-xs w-48 focus:outline-none" />
          </div>
        </div>
        <div className="flex gap-2 mb-6">
          {["flagged","under-review"].map(f => (
            <button key={f} className="px-3 py-1.5 bg-[var(--color-navy)] text-white text-xs rounded-sm cursor-pointer capitalize">{f.replace("-", " ")}</button>
          ))}
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-sm py-4">
          <EmptyPane
            illustration={<GridIllustration />}
            heading="No products flagged"
            body="All products in this filter are clear. Flagged and under-review items appear here when the automated system or a user report triggers a review."
            note="Auto-flagging runs on every new listing and update"
          />
        </div>
      </div>
    </AdminShell>
  );
}

export function NoReports() {
  return (
    <AdminShell activeNav="reports">
      <div className="h-full flex flex-col">
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-white">
          <h1 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">Reports & Moderation</h1>
        </div>
        <div className="px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex gap-3">
          {["all","pending","reviewing"].map(f => (
            <button key={f} className={`px-3 py-1.5 rounded-sm text-xs cursor-pointer ${f === "pending" ? "bg-[var(--color-navy)] text-white" : "bg-white border border-[var(--color-border)] text-[var(--color-ink-muted)]"}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <EmptyPane
            illustration={<ShieldIllustration />}
            heading="No pending reports"
            body="The moderation queue is clear. When users submit reports, they appear here for review. Critical reports are automatically escalated."
            note="Reports are anonymized to protect reporter identity"
          />
        </div>
      </div>
    </AdminShell>
  );
}

export function NoCustomers() {
  const navigate = useNavigate();
  return (
    <SellerShell activeNav="customers" storeName="My Store" storeInitials="MS">
      <div className="h-full flex flex-col">
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-white flex items-center justify-between">
          <div>
            <h1 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">Customers</h1>
            <p className="text-xs text-[var(--color-ink-muted)]">0 customers</p>
          </div>
          <input placeholder="Search customers..." className="px-3 py-2 border border-[var(--color-border)] rounded-sm text-xs w-48 focus:outline-none" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <EmptyPane
            illustration={<PeopleIllustration />}
            heading="No customers yet"
            body="Customers who place orders from your store will appear here. You'll see purchase history, lifetime spend, and basic contact info."
            cta={{ label: "View your products", onClick: () => navigate("/seller-center/products") }}
            note="Customer details are subject to platform privacy policy"
          />
        </div>
      </div>
    </SellerShell>
  );
}

export function NoInventory() {
  const navigate = useNavigate();
  return (
    <SellerShell activeNav="inventory" storeName="My Store" storeInitials="MS">
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Inventory</h1>
          <button onClick={() => navigate("/seller-center/products/new")} className="px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm cursor-pointer">+ Add product</button>
        </div>
        {/* Summary cards empty */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[["Total SKUs","0"],["In stock","0"],["Low stock","0"],["Out of stock","0"]].map(([l, v]) => (
            <div key={l} className="bg-white border border-[var(--color-border)] rounded-sm p-4">
              <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">{l}</p>
              <p className="font-[var(--font-display)] text-2xl font-[600] text-[var(--color-ink)]">{v}</p>
            </div>
          ))}
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-sm py-4">
          <EmptyPane
            illustration={<WarehouseIllustration />}
            heading="No inventory to manage"
            body="Add products and set their stock quantities here. You'll be able to track levels, adjust stock, and get alerts when items run low."
            cta={{ label: "Add your first product", onClick: () => navigate("/seller-center/products/new") }}
            note="Low stock alerts fire at 5 units by default — configurable per SKU"
          />
        </div>
      </div>
    </SellerShell>
  );
}
