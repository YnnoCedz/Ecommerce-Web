import { useState } from "react";

type SellerStatus = "active" | "suspended" | "under-review" | "rejected";
type AppStatus = "pending" | "reviewing" | "approved" | "rejected" | "flagged";

type Seller = {
  id: string; storeName: string; ownerName: string; email: string;
  category: string; status: SellerStatus; joinedDate: string;
  products: number; orders: number; revenue: number; rating: number;
  verified: boolean; location: string; flags: number;
};

type Application = {
  id: string; applicant: string; email: string; businessName: string;
  category: string; status: AppStatus; submittedDate: string;
  businessType: string; tin: string; ownerId: string; certificate: string;
  phone?: string; reviewedBy?: string; notes?: string;
};

const STATUS_CFG: Record<SellerStatus, { label: string; color: string; bg: string }> = {
  "active":       { label: "Active",        color: "var(--color-green)", bg: "var(--color-green-light)"  },
  "suspended":    { label: "Suspended",     color: "var(--color-amber)", bg: "var(--color-amber-light)"  },
  "under-review": { label: "Under review",  color: "var(--color-navy)",  bg: "var(--color-navy-surface)" },
  "rejected":     { label: "Rejected",      color: "var(--color-red)",   bg: "var(--color-red-light)"    },
};

const APP_CFG: Record<AppStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: "Pending",    color: "var(--color-amber)",      bg: "var(--color-amber-light)"  },
  reviewing: { label: "Reviewing",  color: "var(--color-navy)",       bg: "var(--color-navy-surface)" },
  approved:  { label: "Approved",   color: "var(--color-green)",      bg: "var(--color-green-light)"  },
  rejected:  { label: "Rejected",   color: "var(--color-red)",        bg: "var(--color-red-light)"    },
  flagged:   { label: "Flagged",    color: "var(--color-violet)",     bg: "var(--color-violet-light)" },
};

const SELLERS: Seller[] = [
  { id: "s001", storeName: "Verde Botanics",       ownerName: "Maria Santos",    email: "maria@verdebotanics.com",   category: "Health and Beauty", status: "active",       joinedDate: "Jan 2026",  products: 34, orders: 1240, revenue: 2840000, rating: 4.8, verified: true,  location: "Pasig",     flags: 0 },
  { id: "s002", storeName: "Atelier Manila",        ownerName: "David Reyes",     email: "d.reyes@atelier.ph",        category: "Women's Apparel",       status: "active",       joinedDate: "Mar 2026",  products: 48, orders: 891,  revenue: 1620000, rating: 4.9, verified: true,  location: "Makati",    flags: 0 },
  { id: "s003", storeName: "Techwave PH",           ownerName: "Jun Santos",      email: "j.santos@techwave.ph",      category: "Electronics and Gadgets",   status: "active",       joinedDate: "Nov 2025",  products: 120, orders: 3210, revenue: 8900000, rating: 4.6, verified: true, location: "QC",        flags: 1 },
  { id: "s004", storeName: "Homecraft Goods",       ownerName: "Ana Flores",      email: "a.flores@homecraft.ph",     category: "Home and Garden", status: "suspended",    joinedDate: "Feb 2026",  products: 22, orders: 340,  revenue: 482000,  rating: 3.9, verified: true,  location: "Cebu",      flags: 3 },
  { id: "s005", storeName: "Fresh Finds PH",        ownerName: "Leo Cruz",        email: "l.cruz@freshfinds.ph",      category: "Food and Gourmet", status: "under-review", joinedDate: "Aug 2026",  products: 0,  orders: 0,    revenue: 0,       rating: 0,   verified: false, location: "Davao",     flags: 0 },
  { id: "s006", storeName: "Quick Deals Online",    ownerName: "Unknown",         email: "quickdeals@yopmail.com",    category: "Electronics and Gadgets",       status: "rejected",     joinedDate: "Jul 2026",  products: 0,  orders: 0,    revenue: 0,       rating: 0,   verified: false, location: "Unknown",   flags: 5 },
];

const INITIAL_APPLICATIONS: Application[] = [
  { id: "APP-2026-08-004821", applicant: "Maria Lim",      email: "m.lim@business.ph",    phone: "+63 917 555 0110", businessName: "Lim Organics",         category: "Health and Beauty",  status: "pending",   submittedDate: "Aug 15, 2026", businessType: "Sole Proprietorship", tin: "123-456-001", ownerId: "1234-5678-9012", certificate: "lim-organics-certificate.pdf" },
  { id: "APP-2026-08-004820", applicant: "Roberto Salazar", email: "r.salazar@salazar.ph", phone: "+63 917 555 0142", businessName: "Salazar Tech Solutions",category: "Electronics and Gadgets",   status: "pending",   submittedDate: "Aug 14, 2026", businessType: "Corporation",         tin: "123-456-002", ownerId: "2345-6789-0123", certificate: "salazar-tech-permit.pdf" },
  { id: "APP-2026-08-004818", applicant: "Carmen Ocampo",  email: "c.ocampo@crafts.ph",   phone: "+63 918 555 0177", businessName: "Ocampo Crafts",        category: "Home and Garden",  status: "reviewing", submittedDate: "Aug 13, 2026", businessType: "Sole Proprietorship", tin: "123-456-003", ownerId: "3456-7890-1234", certificate: "ocampo-crafts-dti.jpg", reviewedBy: "Admin" },
  { id: "APP-2026-08-004815", applicant: "Jay Castillo",   email: "j.castillo@yopmail.com",phone: "+63 900 000 0000", businessName: "JC General Trading",  category: "Furniture and Office Equipment",       status: "flagged",   submittedDate: "Aug 12, 2026", businessType: "Partnership",         tin: "000-000-000", ownerId: "0000-0000-0000", certificate: "jc-certificate.pdf", notes: "TIN format invalid. Docs appear fraudulent." },
  { id: "APP-2026-08-004810", applicant: "Pia Ramos",      email: "p.ramos@piecare.ph",   phone: "+63 917 555 0199", businessName: "PieCare Wellness",     category: "Health and Beauty",        status: "approved",  submittedDate: "Aug 10, 2026", businessType: "Sole Proprietorship", tin: "123-456-004", ownerId: "4567-8901-2345", certificate: "piecare-certificate.pdf", reviewedBy: "Admin" },
  { id: "APP-2026-08-004802", applicant: "Ron dela Cruz",  email: "r.delacruz@email.com", phone: "+63 917 555 0130", businessName: "RD Electronics",       category: "Electronics and Gadgets",   status: "rejected",  submittedDate: "Aug 8, 2026",  businessType: "Sole Proprietorship", tin: "123-456-005", ownerId: "5678-9012-3456", certificate: "rd-electronics-permit.pdf", notes: "DTI certificate expired.", reviewedBy: "Admin" },
];

function SellerDetailPanel({ seller, onClose }: { seller: Seller; onClose: () => void }) {
  const cfg = STATUS_CFG[seller.status];
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-[600] text-[var(--color-ink)]">{seller.storeName}</p>
            {seller.flags > 0 && <span className="font-[var(--font-mono)] text-[9px] bg-[var(--color-red-light)] text-[var(--color-red)] px-1.5 py-0.5 rounded">{seller.flags} flags</span>}
          </div>
          <p className="text-xs text-[var(--color-ink-muted)]">{seller.ownerName} · {seller.email}</p>
        </div>
        <button onClick={onClose} className="text-[var(--color-ink-disabled)] hover:text-[var(--color-ink)] cursor-pointer">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
          {seller.verified && <span className="font-[var(--font-mono)] text-[9px] bg-[var(--color-green-light)] text-[var(--color-green)] px-2 py-1 rounded">✓ Verified</span>}
          <span className="font-[var(--font-mono)] text-[9px] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink-muted)] px-2 py-1 rounded">{seller.category}</span>
        </div>
        <div className="space-y-2">
          {[
            ["Seller ID", seller.id],
            ["Location", seller.location],
            ["Joined", seller.joinedDate],
            ["Products", `${seller.products}`],
            ["Total orders", `${seller.orders.toLocaleString()}`],
            ["GMV", seller.revenue > 0 ? `₱${(seller.revenue/1000000).toFixed(2)}M` : "—"],
            ["Rating", seller.rating > 0 ? `★ ${seller.rating}` : "—"],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between py-1.5 border-b border-[var(--color-border-subtle)] last:border-0">
              <span className="text-xs text-[var(--color-ink-muted)]">{l}</span>
              <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">{v}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">Admin actions</p>
          <div className="grid grid-cols-2 gap-2">
            {seller.status === "active" && <button className="py-2 text-xs border border-[var(--color-amber-border)] text-[var(--color-amber)] rounded-sm hover:bg-[var(--color-amber-light)] cursor-pointer">Suspend store</button>}
            {seller.status === "suspended" && <button className="py-2 text-xs border border-[var(--color-green-border)] text-[var(--color-green)] rounded-sm hover:bg-[var(--color-green-light)] cursor-pointer">Restore store</button>}
            <button className="py-2 text-xs border border-[var(--color-border)] text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">View products</button>
            <button className="py-2 text-xs border border-[var(--color-border)] text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">View orders</button>
            <button className="py-2 text-xs border border-[var(--color-red-border)] text-[var(--color-red)] rounded-sm hover:bg-[var(--color-red-light)] cursor-pointer">Flag account</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApplicationRow({ app, onSelect, selected }: { app: Application; onSelect: () => void; selected: boolean }) {
  const cfg = APP_CFG[app.status];
  return (
    <tr onClick={onSelect} className={`border-b border-[var(--color-border-subtle)] cursor-pointer transition-colors ${selected ? "bg-[var(--color-navy-surface)]" : "hover:bg-[var(--color-surface)]"}`}>
      <td className="px-4 py-3">
        <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-navy)]">{app.id}</p>
        <p className="text-xs font-[500] text-[var(--color-ink)]">{app.applicant}</p>
        <p className="text-[10px] text-[var(--color-ink-muted)]">{app.email}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs font-[500] text-[var(--color-ink)]">{app.businessName}</p>
        <p className="text-[10px] text-[var(--color-ink-muted)]">{app.category}</p>
      </td>
      <td className="px-4 py-3 text-[10px] text-[var(--color-ink-muted)]">{app.businessType}</td>
      <td className="px-4 py-3 font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)]">{app.submittedDate}</td>
      <td className="px-4 py-3"><span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span></td>
    </tr>
  );
}

function ApplicationDetail({ app, onClose, onDecision }: { app: Application; onClose: () => void; onDecision: (id: string, status: AppStatus) => void }) {
  const cfg = APP_CFG[app.status];
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
        <div>
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">{app.id}</p>
          <p className="text-sm font-[600] text-[var(--color-ink)]">{app.businessName}</p>
        </div>
        <button onClick={onClose} className="text-[var(--color-ink-disabled)] hover:text-[var(--color-ink)] cursor-pointer">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
        <div className="space-y-2">
          {[
            ["Applicant", app.applicant],
            ["Email", app.email],
            ["Phone", app.phone ?? "—"],
            ["Category", app.category],
            ["Business type", app.businessType],
            ["Owner ID", app.ownerId],
            ["TIN", app.tin],
            ["Submitted", app.submittedDate],
            ["Reviewed by", app.reviewedBy ?? "—"],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between py-1.5 border-b border-[var(--color-border-subtle)] last:border-0">
              <span className="text-xs text-[var(--color-ink-muted)]">{l}</span>
              <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">{v}</span>
            </div>
          ))}
        </div>
        {app.notes && (
          <div className="px-3 py-3 bg-[var(--color-amber-light)] border border-[var(--color-amber-border)] rounded-sm">
            <p className="text-xs text-[var(--color-amber)] font-[500] mb-1">Review notes</p>
            <p className="text-xs text-[var(--color-ink)]">{app.notes}</p>
          </div>
        )}
        <div>
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">Verification documents</p>
          {[
            { name: "Government ID (front & back)", file: "government-id.pdf" },
            { name: "Seller Certificate", file: app.certificate },
          ].map(doc => (
            <div key={doc.name} className="flex items-center justify-between px-3 py-2.5 border border-[var(--color-border)] rounded-sm mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="var(--color-navy)" strokeWidth="1.3" strokeLinecap="round" className="shrink-0"><rect x="2" y="1" width="10" height="12" rx="1.5" /><path d="M4 5h6M4 7.5h6M4 10h3" /></svg>
                <div className="min-w-0">
                  <p className="text-xs text-[var(--color-ink)] truncate">{doc.name}</p>
                  <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] truncate">{doc.file}</p>
                </div>
              </div>
              <button className="text-[10px] text-[var(--color-navy)] hover:underline cursor-pointer shrink-0 ml-2">View</button>
            </div>
          ))}
          <p className="flex items-center gap-1.5 text-[10px] text-[var(--color-ink-muted)] mt-1">
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="3" y="6" width="8" height="6" rx="1" /><path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" /></svg>
            Private — visible to administrators only.
          </p>
        </div>
        {(app.status === "pending" || app.status === "reviewing" || app.status === "flagged") && (
          <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
            <textarea rows={3} placeholder="Add review note (optional)..." className="w-full px-3 py-2 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] resize-none font-[var(--font-body)]" />
            <div className="flex gap-2">
              <button onClick={() => onDecision(app.id, "approved")} className="flex-1 py-2 bg-[var(--color-green)] text-white text-xs font-[500] rounded-sm hover:opacity-90 cursor-pointer">Approve</button>
              <button onClick={() => onDecision(app.id, "rejected")} className="flex-1 py-2 bg-[var(--color-red)] text-white text-xs font-[500] rounded-sm hover:opacity-90 cursor-pointer">Reject</button>
              <button onClick={() => onDecision(app.id, "flagged")} className="flex-1 py-2 border border-[var(--color-violet)]/30 text-[var(--color-violet)] text-xs font-[500] rounded-sm hover:bg-[var(--color-violet-light)] cursor-pointer">Flag</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SellerManagementPage() {
  const [tab, setTab] = useState<"sellers" | "applications">("sellers");
  const [applications, setApplications] = useState<Application[]>(INITIAL_APPLICATIONS);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [appStatusFilter, setAppStatusFilter] = useState("all");

  const handleDecision = (id: string, status: AppStatus) => {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status, reviewedBy: "Admin" } : a));
    setSelectedApp(prev => prev && prev.id === id ? { ...prev, status, reviewedBy: "Admin" } : prev);
  };

  const filteredSellers = SELLERS.filter(s => {
    if (search && !s.storeName.toLowerCase().includes(search.toLowerCase()) && !s.ownerName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });
  const filteredApps = applications.filter(a => {
    if (appStatusFilter !== "all" && a.status !== appStatusFilter) return false;
    if (search && !a.businessName.toLowerCase().includes(search.toLowerCase()) && !a.applicant.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const appPendingCount = applications.filter(a => a.status === "pending" || a.status === "reviewing" || a.status === "flagged").length;

  return (
    <div className="flex h-full overflow-hidden">
      <div className={`flex flex-col ${selectedSeller || selectedApp ? "hidden lg:flex lg:flex-1" : "flex-1"} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-[var(--color-border)] bg-white shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">Sellers</h1>
          </div>
          <div className="flex gap-1 border-b border-[var(--color-border)] -mx-5 px-5 mb-3">
            {(["sellers", "applications"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-[500] border-b-2 -mb-px cursor-pointer capitalize transition-colors ${tab === t ? "border-[var(--color-navy)] text-[var(--color-navy)]" : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
                {t === "applications" ? `Applications${appPendingCount > 0 ? ` (${appPendingCount})` : ""}` : "Sellers"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 flex-1 border border-[var(--color-border)] rounded-sm bg-[var(--color-surface)] px-3 py-2 focus-within:border-[var(--color-navy)] transition-colors">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="4.5" /><path d="M10 10l2.5 2.5" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === "sellers" ? "Search stores or owners" : "Search applications"} className="text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none bg-transparent flex-1 font-[var(--font-body)]" />
            </div>
            {tab === "sellers" && (
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-2.5 py-2 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink)] bg-white focus:outline-none cursor-pointer font-[var(--font-body)]">
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="under-review">Under review</option>
                <option value="rejected">Rejected</option>
              </select>
            )}
            {tab === "applications" && (
              <select value={appStatusFilter} onChange={e => setAppStatusFilter(e.target.value)} className="px-2.5 py-2 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink)] bg-white focus:outline-none cursor-pointer font-[var(--font-body)]">
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="flagged">Flagged</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          {tab === "sellers" ? (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] z-10">
                <tr>
                  {["Store", "Category", "Status", "Products", "Orders", "GMV", "Rating", ""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSellers.map(s => {
                  const cfg = STATUS_CFG[s.status];
                  return (
                    <tr key={s.id} onClick={() => setSelectedSeller(s)} className={`border-b border-[var(--color-border-subtle)] cursor-pointer transition-colors ${selectedSeller?.id === s.id ? "bg-[var(--color-navy-surface)]" : "hover:bg-[var(--color-surface)]"}`}>
                      <td className="px-4 py-3">
                        <p className="text-xs font-[500] text-[var(--color-ink)]">{s.storeName}</p>
                        <p className="text-[10px] text-[var(--color-ink-muted)]">{s.ownerName}</p>
                        {s.flags > 0 && <span className="font-[var(--font-mono)] text-[8px] bg-[var(--color-red-light)] text-[var(--color-red)] px-1 py-0.5 rounded">{s.flags} flags</span>}
                      </td>
                      <td className="px-4 py-3 text-[10px] text-[var(--color-ink-muted)]">{s.category}</td>
                      <td className="px-4 py-3"><span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span></td>
                      <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)]">{s.products}</td>
                      <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)]">{s.orders.toLocaleString()}</td>
                      <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[var(--color-ink)]">{s.revenue > 0 ? `₱${(s.revenue/1000000).toFixed(1)}M` : "—"}</td>
                      <td className="px-4 py-3 text-xs text-[var(--color-amber)]">{s.rating > 0 ? `★ ${s.rating}` : "—"}</td>
                      <td className="px-4 py-3"><button className="text-[10px] text-[var(--color-navy)] hover:underline cursor-pointer">View</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] z-10">
                <tr>
                  {["Application", "Business", "Type", "Submitted", "Status"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredApps.map(a => (
                  <ApplicationRow key={a.id} app={a} onSelect={() => setSelectedApp(a)} selected={selectedApp?.id === a.id} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedSeller && (
        <div className="w-80 shrink-0 border-l border-[var(--color-border)] bg-white flex flex-col overflow-hidden">
          <SellerDetailPanel seller={selectedSeller} onClose={() => setSelectedSeller(null)} />
        </div>
      )}
      {selectedApp && (
        <div className="w-80 shrink-0 border-l border-[var(--color-border)] bg-white flex flex-col overflow-hidden">
          <ApplicationDetail app={selectedApp} onClose={() => setSelectedApp(null)} onDecision={handleDecision} />
        </div>
      )}
    </div>
  );
}
