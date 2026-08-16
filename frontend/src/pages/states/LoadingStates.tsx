import PublicShell from "../../shells/PublicShell";
import SellerShell from "../../shells/SellerShell";
import AdminShell from "../../shells/AdminShell";
import {
  Sk, SkLine, SkCircle, SkText, SkProductCard, SkTableRow,
  SkKpiCard, SkConversationRow, SkMessageBubble,
} from "../../components/Skeletons";

// ── Product grid ─────────────────────────────────────────────
export function ProductGridSkeleton() {
  return (
    <PublicShell isLoggedIn cartCount={2}>
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Sk w={40} h={10} /><Sk w={6} h={10} /><Sk w={80} h={10} />
        </div>
        {/* Page title + count */}
        <div className="flex items-baseline justify-between mb-5">
          <Sk w={180} h={28} />
          <Sk w={80} h={12} />
        </div>
        {/* Filter bar */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {[120, 100, 100, 90, 90].map((w, i) => <Sk key={i} w={w} h={34} className="rounded-full" />)}
          <div className="ml-auto flex gap-2">
            <Sk w={90} h={34} /><Sk w={90} h={34} />
          </div>
        </div>
        {/* Product grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {Array.from({ length: 12 }).map((_, i) => <SkProductCard key={i} imageH={220} />)}
        </div>
        {/* Pagination */}
        <div className="flex justify-center gap-2 mt-10">
          {[1, 2, 3, 4, 5].map(n => <Sk key={n} w={36} h={36} />)}
        </div>
      </div>
    </PublicShell>
  );
}

// ── Product detail ────────────────────────────────────────────
export function ProductDetailSkeleton() {
  return (
    <PublicShell isLoggedIn cartCount={2}>
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Sk w={40} h={10} /><Sk w={6} h={10} /><Sk w={80} h={10} /><Sk w={6} h={10} /><Sk w={120} h={10} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Images */}
          <div className="space-y-3">
            <Sk w="100%" h={480} />
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => <Sk key={n} w={80} h={80} />)}
            </div>
          </div>
          {/* Info */}
          <div className="space-y-5">
            <div className="space-y-2">
              <Sk w="30%" h={11} />
              <Sk w="85%" h={32} />
              <Sk w="70%" h={32} />
            </div>
            <div className="flex items-center gap-3">
              <Sk w={80} h={28} /><Sk w={60} h={18} className="rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              {[1,2,3,4,5].map(i=><Sk key={i} w={16} h={16} />)}
              <Sk w={60} h={12} />
            </div>
            <div className="py-4 border-t border-b border-[var(--color-border-subtle)]">
              <SkText lines={4} lastWidth="40%" />
            </div>
            {/* Variants */}
            <div className="space-y-3">
              <Sk w={60} h={12} />
              <div className="flex gap-2">
                {[1,2,3,4].map(i=><Sk key={i} w={56} h={34} />)}
              </div>
            </div>
            {/* Quantity + Add to cart */}
            <div className="flex gap-3 pt-2">
              <Sk w={100} h={48} />
              <Sk w="100%" h={48} />
            </div>
            <Sk w="100%" h={48} />
            {/* Seller card */}
            <div className="flex items-center gap-3 p-4 bg-[var(--color-surface)] rounded-sm">
              <SkCircle size={48} />
              <div className="flex-1 space-y-2">
                <Sk w="50%" h={14} />
                <Sk w="35%" h={11} />
              </div>
              <Sk w={80} h={34} />
            </div>
          </div>
        </div>
        {/* Reviews section skeleton */}
        <div className="mt-12">
          <Sk w={160} h={24} className="mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 border border-[var(--color-border)] rounded-sm space-y-3">
                <div className="flex items-center gap-3">
                  <SkCircle size={36} />
                  <div className="space-y-1.5">
                    <Sk w={100} h={12} />
                    <div className="flex gap-1">{[1,2,3,4,5].map(j=><Sk key={j} w={12} h={12} />)}</div>
                  </div>
                  <Sk w={60} h={10} className="ml-auto" />
                </div>
                <SkText lines={2} lastWidth="70%" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

// ── Seller dashboard ──────────────────────────────────────────
export function SellerDashboardSkeleton() {
  return (
    <SellerShell activeNav="dashboard" storeName="Loading..." storeInitials="…">
      <div className="p-6 max-w-screen-xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Sk w={200} h={28} />
            <Sk w={160} h={12} />
          </div>
          <div className="flex gap-2">
            <Sk w={100} h={36} /><Sk w={120} h={36} />
          </div>
        </div>
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <SkKpiCard key={i} />)}
        </div>
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
              <div className="flex justify-between mb-4">
                <Sk w={100} h={12} />
                <Sk w={80} h={20} />
              </div>
              <Sk w="100%" h={120} />
            </div>
          </div>
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-5">
            <Sk w={80} h={12} className="mb-4" />
            <Sk w="100%" h={120} />
          </div>
        </div>
        {/* Recent orders table */}
        <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex justify-between">
            <Sk w={120} h={16} />
            <Sk w={60} h={12} />
          </div>
          {[1,2,3,4,5].map(i => <SkTableRow key={i} cols={6} />)}
        </div>
      </div>
    </SellerShell>
  );
}

// ── Admin table / orders ──────────────────────────────────────
export function AdminTableSkeleton() {
  return (
    <AdminShell activeNav="orders">
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <Sk w={180} h={26} />
            <Sk w={140} h={12} />
          </div>
          <Sk w={120} h={36} />
        </div>
        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <Sk w={200} h={34} />
          {[1,2,3,4,5].map(i => <Sk key={i} w={80} h={34} />)}
          <Sk w={120} h={34} className="ml-auto" />
        </div>
        {/* Table */}
        <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <Sk w={16} h={16} />{["20%","14%","18%","14%","12%","9%"].map((w,i)=><Sk key={i} w={w} h={10} />)}
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--color-border-subtle)]">
              <Sk w={16} h={16} />
              <Sk w="20%" h={13} />
              <Sk w="14%" h={12} />
              <Sk w="18%" h={12} />
              <Sk w="14%" h={12} />
              <Sk w={60} h={22} className="rounded-full" />
              <Sk w={40} h={12} />
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

// ── Messages ──────────────────────────────────────────────────
export function MessagesSkeleton() {
  return (
    <PublicShell isLoggedIn>
      <div className="flex h-[calc(100vh-64px)]">
        {/* Conversation list */}
        <div className="w-80 shrink-0 border-r border-[var(--color-border)] bg-white flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <Sk w="100%" h={36} className="rounded-full" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={i === 0 ? "bg-[var(--color-surface)]" : ""}>
                <SkConversationRow />
              </div>
            ))}
          </div>
        </div>
        {/* Message thread */}
        <div className="flex-1 flex flex-col">
          {/* Thread header */}
          <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-white flex items-center gap-3">
            <SkCircle size={40} />
            <div className="space-y-1.5 flex-1">
              <Sk w={120} h={14} />
              <Sk w={80} h={10} />
            </div>
            <Sk w={80} h={30} />
          </div>
          {/* Messages */}
          <div className="flex-1 p-5 space-y-4 bg-[var(--color-ground)]">
            <div className="text-center"><Sk w={80} h={10} className="mx-auto" /></div>
            <SkMessageBubble align="left" width="45%" />
            <SkMessageBubble align="right" width="55%" />
            <SkMessageBubble align="left" width="60%" />
            {/* System message */}
            <div className="flex justify-center"><Sk w="50%" h={28} className="rounded-full" /></div>
            <SkMessageBubble align="right" width="40%" />
            <SkMessageBubble align="left" width="50%" />
            <SkMessageBubble align="right" width="45%" />
          </div>
          {/* Input */}
          <div className="px-4 py-3 border-t border-[var(--color-border)] bg-white flex gap-2">
            <Sk w="100%" h={42} />
            <Sk w={42} h={42} />
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

// ── Search results ────────────────────────────────────────────
export function SearchSkeleton() {
  return (
    <PublicShell isLoggedIn cartCount={1}>
      <div className="bg-[var(--color-navy)] py-6">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <Sk w="100%" h={48} className="rounded-full" />
              <Sk w={48} h={48} className="rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-screen-xl mx-auto px-6 py-6">
        <div className="flex items-center gap-2 mb-5">
          <Sk w={140} h={13} />
          <div className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
          <Sk w={60} h={10} className="animate-pulse opacity-60" />
        </div>
        {/* Filter chips */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[100, 80, 110, 90, 80].map((w, i) => <Sk key={i} w={w} h={30} className="rounded-full" />)}
        </div>
        {/* Two-column layout */}
        <div className="flex gap-6">
          {/* Left filter sidebar */}
          <div className="w-56 shrink-0 space-y-5">
            {[1, 2, 3].map(group => (
              <div key={group} className="space-y-3">
                <Sk w="60%" h={13} />
                {[1,2,3,4].map(i=><Sk key={i} w="80%" h={12} />)}
              </div>
            ))}
          </div>
          {/* Results */}
          <div className="flex-1">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {Array.from({ length: 9 }).map((_, i) => <SkProductCard key={i} imageH={180} />)}
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

// ── Checkout ──────────────────────────────────────────────────
export function CheckoutSkeleton() {
  return (
    <PublicShell isLoggedIn cartCount={3}>
      <div className="max-w-screen-lg mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-8">
          {["Bag","Delivery","Payment","Review"].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <Sk w={24} h={24} pill className={i === 1 ? "opacity-100" : "opacity-30"} />
              <Sk w={step.length * 7} h={11} className={i === 1 ? "opacity-100" : "opacity-30"} />
              {i < 3 && <Sk w={20} h={2} className="opacity-20" />}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5 space-y-4">
              <Sk w={150} h={18} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Sk w="50%" h={11} /><Sk w="100%" h={42} /></div>
                <div className="space-y-2"><Sk w="50%" h={11} /><Sk w="100%" h={42} /></div>
              </div>
              <div className="space-y-2"><Sk w="40%" h={11} /><Sk w="100%" h={42} /></div>
              <div className="grid grid-cols-3 gap-4">
                {[1,2,3].map(i=>(
                  <div key={i} className="space-y-2"><Sk w="60%" h={11} /><Sk w="100%" h={42} /></div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5 space-y-4">
              <Sk w={120} h={18} />
              {[1,2].map(i=>(
                <div key={i} className="flex items-center gap-3 p-3 border border-[var(--color-border)] rounded-sm">
                  <Sk w={20} h={20} pill /><Sk w="60%" h={13} /><Sk w={40} h={13} className="ml-auto" />
                </div>
              ))}
            </div>
            <Sk w="100%" h={48} />
          </div>
          {/* Order summary */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-[var(--color-border)] rounded-sm p-5 space-y-4 sticky top-4">
              <Sk w={130} h={18} />
              <div className="space-y-3">
                {[1,2,3].map(i=>(
                  <div key={i} className="flex items-center gap-3">
                    <Sk w={56} h={56} /><div className="flex-1 space-y-2"><Sk w="80%" h={13} /><Sk w="50%" h={11} /></div><Sk w={40} h={13} />
                  </div>
                ))}
              </div>
              <div className="border-t border-[var(--color-border-subtle)] pt-4 space-y-2.5">
                {[1,2,3].map(i=>(
                  <div key={i} className="flex justify-between"><Sk w="35%" h={11} /><Sk w="20%" h={11} /></div>
                ))}
              </div>
              <div className="border-t border-[var(--color-border)] pt-4 flex justify-between">
                <Sk w="30%" h={16} /><Sk w="25%" h={20} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

// ── Order history ─────────────────────────────────────────────
export function OrderHistorySkeleton() {
  return (
    <PublicShell isLoggedIn>
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="flex items-baseline justify-between mb-6">
          <Sk w={140} h={26} />
          <Sk w={100} h={34} />
        </div>
        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 border-b border-[var(--color-border)] pb-0">
          {[80, 80, 90, 90, 80, 90].map((w, i) => (
            <Sk key={i} w={w} h={36} className={`rounded-t-sm ${i === 0 ? "" : "opacity-50"}`} />
          ))}
        </div>
        {/* Order cards */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
              {/* Order header */}
              <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)] flex items-center gap-4">
                <Sk w={100} h={13} />
                <Sk w={80} h={13} />
                <Sk w={60} h={22} className="rounded-full ml-auto" />
              </div>
              {/* Order items */}
              <div className="p-5 space-y-4">
                {[1, 2].map(j => (
                  <div key={j} className="flex items-center gap-4">
                    <Sk w={64} h={64} />
                    <div className="flex-1 space-y-2">
                      <Sk w="60%" h={13} />
                      <Sk w="35%" h={11} />
                    </div>
                    <Sk w={60} h={14} />
                  </div>
                ))}
              </div>
              {/* Order footer */}
              <div className="px-5 py-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
                <Sk w={100} h={12} />
                <div className="flex gap-2">
                  <Sk w={80} h={34} /><Sk w={100} h={34} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
